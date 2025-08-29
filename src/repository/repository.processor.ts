import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { EmbeddingService } from '../common/services/embedding.service';
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import * as git from 'simple-git';
import * as fs from 'fs';
import * as path from 'path';
import * as AdmZip from 'adm-zip';
import { v4 as uuidv4 } from 'uuid';

interface CloneRepositoryJob {
  projectId: string;
  repoUrl: string;
  branch: string;
  githubToken?: string;
  s3Bucket: string;
  s3KeyPrefix: string;
}

interface ProcessZipJob {
  projectId: string;
  s3Bucket: string;
  s3ZipKey: string;
  s3KeyPrefix: string;
}

@Processor('repository-processing')
export class RepositoryProcessor {
  private readonly logger = new Logger(RepositoryProcessor.name);
  private readonly s3Client: S3Client;

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly embeddingService: EmbeddingService,
  ) {
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
    
    if (!accessKeyId || !secretAccessKey) {
      throw new Error('AWS credentials are required');
    }

    this.s3Client = new S3Client({
      region: process.env.AWS_REGION || 'ap-south-1',
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
    
    this.logger.log(`Repository Processor S3 configured with region: ${process.env.AWS_REGION || 'ap-south-1'}`);
  }

  @Process('clone-repository')
  async cloneRepository(job: Job<CloneRepositoryJob>) {
    const { projectId, repoUrl, branch, githubToken, s3Bucket, s3KeyPrefix } = job.data;
    
    this.logger.log(`Starting repository clone for project ${projectId}`);
    
    const tempDir = path.join(process.cwd(), 'temp', projectId);
    
    try {
      // Update project status
      await this.databaseService.project.update({
        where: { id: projectId },
        data: { status: 'DOWNLOADING' },
      });

      // Ensure temp directory exists
      await fs.promises.mkdir(tempDir, { recursive: true });

      // Clone repository
      const gitInstance = git.gitP(tempDir);
      
      let cloneUrl = repoUrl;
      if (githubToken && repoUrl.includes('github.com')) {
        cloneUrl = repoUrl.replace('https://github.com/', `https://${githubToken}@github.com/`);
      }

      await gitInstance.clone(cloneUrl, '.', ['--branch', branch, '--single-branch', '--depth', '1']);

      this.logger.log(`Repository cloned successfully for project ${projectId}`);

      // Create ZIP and upload to S3
      const zipBuffer = await this.createZipFromDirectory(tempDir);
      const zipKey = `${s3KeyPrefix}/repository.zip`;

      await this.uploadToS3(s3Bucket, zipKey, zipBuffer);

      // Update project with S3 info
      await this.databaseService.project.update({
        where: { id: projectId },
        data: { 
          status: 'PROCESSING',
          s3ZipKey: zipKey,
        },
      });

      // Process the repository files
      await this.processRepositoryFiles(projectId, tempDir, s3Bucket, s3KeyPrefix);

      // Clean up temp directory
      await fs.promises.rmdir(tempDir, { recursive: true });

      this.logger.log(`Repository processing completed for project ${projectId}`);

    } catch (error) {
      this.logger.error(`Error processing repository for project ${projectId}:`, error);
      
      await this.databaseService.project.update({
        where: { id: projectId },
        data: { 
          status: 'FAILED',
          statusMessage: error.message,
        },
      });

      // Clean up temp directory on error
      try {
        await fs.promises.rmdir(tempDir, { recursive: true });
      } catch (cleanupError) {
        this.logger.warn(`Failed to clean up temp directory: ${cleanupError.message}`);
      }
    }
  }

  @Process('process-uploaded-zip')
  async processUploadedZip(job: Job<ProcessZipJob>) {
    const { projectId, s3Bucket, s3ZipKey, s3KeyPrefix } = job.data;
    
    this.logger.log(`Starting ZIP processing for project ${projectId}`);
    
    const tempDir = path.join(process.cwd(), 'temp', projectId);
    
    try {
      // Update project status
      await this.databaseService.project.update({
        where: { id: projectId },
        data: { status: 'PROCESSING' },
      });

      // Download ZIP from S3
      const zipBuffer = await this.downloadFromS3(s3Bucket, s3ZipKey);

      // Extract ZIP
      await this.extractZip(zipBuffer, tempDir);

      // Process the repository files
      await this.processRepositoryFiles(projectId, tempDir, s3Bucket, s3KeyPrefix);

      // Clean up temp directory
      await fs.promises.rmdir(tempDir, { recursive: true });

      this.logger.log(`ZIP processing completed for project ${projectId}`);

    } catch (error) {
      this.logger.error(`Error processing ZIP for project ${projectId}:`, error);
      
      await this.databaseService.project.update({
        where: { id: projectId },
        data: { 
          status: 'FAILED',
          statusMessage: error.message,
        },
      });

      // Clean up temp directory on error
      try {
        await fs.promises.rmdir(tempDir, { recursive: true });
      } catch (cleanupError) {
        this.logger.warn(`Failed to clean up temp directory: ${cleanupError.message}`);
      }
    }
  }

  private async processRepositoryFiles(projectId: string, repoPath: string, s3Bucket: string, s3KeyPrefix: string) {
    this.logger.log(`Processing files for project ${projectId}`);

    const files = await this.getAllFiles(repoPath);
    const totalFiles = files.length;
    let processedFiles = 0;

    // Detect primary language and framework
    const { language, framework } = this.detectLanguageAndFramework(files);

    // Update project metadata
    await this.databaseService.project.update({
      where: { id: projectId },
      data: {
        language,
        framework,
        totalFiles,
      },
    });

    // Process files in batches to avoid memory issues
    const batchSize = 10;
    for (let i = 0; i < files.length; i += batchSize) {
      const batch = files.slice(i, i + batchSize);
      
      await Promise.all(
        batch.map(async (filePath) => {
          try {
            await this.processFile(projectId, filePath, repoPath, s3Bucket, s3KeyPrefix);
            processedFiles++;
            
            // Update progress every 10 files
            if (processedFiles % 10 === 0) {
              this.logger.log(`Processed ${processedFiles}/${totalFiles} files for project ${projectId}`);
            }
          } catch (error) {
            this.logger.warn(`Failed to process file ${filePath}: ${error.message}`);
          }
        })
      );
    }

    // Final project update
    await this.databaseService.project.update({
      where: { id: projectId },
      data: {
        status: 'READY',
        processedAt: new Date(),
      },
    });

    this.logger.log(`Completed processing ${processedFiles} files for project ${projectId}`);
  }

  private async processFile(projectId: string, filePath: string, repoPath: string, s3Bucket: string, s3KeyPrefix: string) {
    const fullPath = path.join(repoPath, filePath);
    const stats = await fs.promises.stat(fullPath);
    
    // Skip large files (> 10MB)
    if (stats.size > 10 * 1024 * 1024) {
      this.logger.warn(`Skipping large file: ${filePath} (${(stats.size / 1024 / 1024).toFixed(2)}MB)`);
      return;
    }

    // Skip files based on extension (binary files)
    const fileExtension = path.extname(filePath).toLowerCase();
    const binaryExtensions = [
      '.ttf', '.otf', '.woff', '.woff2', '.eot', '.fon',
      '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.ico', '.svg', '.webp',
      '.mp3', '.wav', '.mp4', '.avi', '.mov', '.wmv', '.flv', '.ogg', '.aac',
      '.zip', '.rar', '.7z', '.tar', '.gz', '.bz2',
      '.exe', '.dll', '.so', '.dylib', '.app',
      '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
      '.db', '.sqlite', '.sqlite3'
    ];

    if (binaryExtensions.includes(fileExtension)) {
      this.logger.debug(`Skipping binary file by extension: ${filePath}`);
      return;
    }

    let content: string;
    try {
      const buffer = await fs.promises.readFile(fullPath);
      
      // Check for null bytes (binary indicator)
      if (buffer.indexOf(0) !== -1) {
        this.logger.debug(`Skipping binary file (contains null bytes): ${filePath}`);
        return;
      }
      
      // Try to decode as UTF-8
      content = buffer.toString('utf-8');
      
      // Additional check for binary content - look for non-printable characters
      const nonPrintableRatio = (content.match(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g) || []).length / content.length;
      if (nonPrintableRatio > 0.3) {
        this.logger.debug(`Skipping binary file (high non-printable ratio): ${filePath}`);
        return;
      }
      
    } catch (error) {
      // Skip files that can't be read as text
      this.logger.debug(`Skipping unreadable file: ${filePath}`);
      return;
    }

    const fileName = path.basename(filePath);
    const relativePath = filePath.replace(/\\/g, '/'); // Normalize path separators
    
    // Detect file language
    const language = this.detectFileLanguage(fileExtension, fileName);
    const lineCount = content.split('\n').length;

    // Upload file to S3
    const s3Key = `${s3KeyPrefix}/files/${relativePath}`;
    await this.uploadToS3(s3Bucket, s3Key, Buffer.from(content, 'utf-8'));

    // Create file record
    const fileRecord = await this.databaseService.file.create({
      data: {
        projectId,
        relativePath,
        fileName,
        extension: fileExtension,
        s3Key,
        language,
        size: stats.size,
        lineCount,
        content: content.length < 50000 ? content : null, // Store content for small files only
      },
    });

    // Create chunks for the file
    await this.createFileChunks(fileRecord.id, content);
  }

  private async createFileChunks(fileId: string, content: string) {
    // Additional safety check for binary content
    if (content.indexOf('\0') !== -1) {
      this.logger.warn(`Skipping chunking for file ${fileId} - contains null bytes`);
      return;
    }
    
    const chunkSize = 1000; // 1000 characters per chunk
    const chunks: string[] = [];
    
    for (let i = 0; i < content.length; i += chunkSize) {
      const chunkContent = content.substring(i, i + chunkSize);
      // Additional safety check for each chunk
      if (chunkContent.indexOf('\0') === -1) {
        chunks.push(chunkContent);
      }
    }

    if (chunks.length === 0) {
      this.logger.warn(`No valid chunks created for file ${fileId}`);
      return;
    }

    this.logger.debug(`Processing ${chunks.length} chunks for file ${fileId} with embedding generation`);

    // Check if Ollama is available for embeddings
    const isOllamaAvailable = await this.embeddingService.isOllamaAvailable();
    
    if (!isOllamaAvailable) {
      this.logger.warn('Ollama service not available - chunks will be created without embeddings');
    }

    // Generate embeddings for chunks (in batches to avoid overwhelming the API)
    let embeddingResponses: any[] = [];
    
    if (isOllamaAvailable) {
      try {
        this.logger.debug(`Generating embeddings for ${chunks.length} chunks using Ollama`);
        embeddingResponses = await this.embeddingService.generateBatchEmbeddings(chunks);
      } catch (error) {
        this.logger.error(`Failed to generate embeddings for file ${fileId}: ${error.message}`);
        // Continue without embeddings rather than failing
        embeddingResponses = chunks.map(() => ({ embedding: [] }));
      }
    } else {
      // Create empty embeddings if service is not available
      embeddingResponses = chunks.map(() => ({ embedding: [] }));
    }

    // Create chunk records with embeddings
    const chunkRecords = chunks.map((chunkContent, index) => {
      const lines = content.substring(0, chunkSize * index).split('\n').length;
      const endLines = content.substring(0, chunkSize * (index + 1)).split('\n').length;
      const embedding = embeddingResponses[index]?.embedding || [];
      
      return {
        fileId,
        chunkIndex: index,
        content: chunkContent,
        startLine: lines,
        endLine: endLines,
        embedding: embedding,
      };
    });

    // Insert chunks in batches to avoid database limits
    const batchSize = 50; // Reduced batch size due to larger data with embeddings
    for (let i = 0; i < chunkRecords.length; i += batchSize) {
      const batch = chunkRecords.slice(i, i + batchSize);
      try {
        await this.databaseService.chunk.createMany({
          data: batch,
        });
        
        const embedCount = batch.filter(record => record.embedding.length > 0).length;
        this.logger.debug(`Inserted batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(chunkRecords.length/batchSize)} - ${batch.length} chunks (${embedCount} with embeddings)`);
        
      } catch (error) {
        this.logger.error(`Failed to create chunks for file ${fileId}, batch ${i}-${i + batchSize}: ${error.message}`);
        // Continue with next batch instead of failing completely
      }
    }

    const totalEmbeddings = chunkRecords.filter(record => record.embedding.length > 0).length;
    this.logger.log(`Created ${chunks.length} chunks for file ${fileId} (${totalEmbeddings} with embeddings)`);
  }

  private async getAllFiles(dirPath: string): Promise<string[]> {
    const files: string[] = [];
    
    // Comprehensive list of folders and files to skip
    const skipDirs = [
      // Version control
      '.git', '.svn', '.hg', '.bzr',
      // Dependencies
      'node_modules', 'vendor', 'packages', 'bower_components',
      // Build outputs
      'dist', 'build', 'out', 'target', 'bin', 'obj', 'release', 'debug',
      // Cache directories
      '.cache', '.tmp', 'tmp', 'temp', '.temp',
      // IDE/Editor directories
      '.vscode', '.idea', '.vs', '.sublime-text', '.atom',
      // Language-specific
      '__pycache__', '.pytest_cache', 'venv', 'env', '.env',
      '.next', '.nuxt', 'coverage', '.nyc_output',
      // OS-specific
      '.DS_Store', 'Thumbs.db', 'Desktop.ini',
      // Logs
      'logs', 'log',
      // Documentation build
      '_site', '.jekyll-cache', 'public'
    ];
    
    const skipFiles = [
      // OS files
      '.DS_Store', 'Thumbs.db', 'Desktop.ini',
      // Lock files
      'package-lock.json', 'yarn.lock', 'composer.lock', 'Pipfile.lock',
      // Environment files (security)
      '.env', '.env.local', '.env.production', '.env.development',
      // Large binary files
      '*.exe', '*.dll', '*.so', '*.dylib', '*.a', '*.lib',
      // Font files (binary)
      '*.ttf', '*.otf', '*.woff', '*.woff2', '*.eot', '*.fon',
      // Images (large files)
      '*.png', '*.jpg', '*.jpeg', '*.gif', '*.bmp', '*.ico', '*.svg',
      // Videos
      '*.mp4', '*.avi', '*.mov', '*.wmv', '*.flv',
      // Audio files
      '*.mp3', '*.wav', '*.ogg', '*.aac', '*.flac',
      // Archives
      '*.zip', '*.tar', '*.gz', '*.rar', '*.7z',
      // Documents
      '*.pdf', '*.doc', '*.docx', '*.ppt', '*.pptx', '*.xls', '*.xlsx',
      // Databases
      '*.db', '*.sqlite', '*.sqlite3'
    ];

    const shouldSkipFile = (fileName: string): boolean => {
      // Check exact matches
      if (skipFiles.includes(fileName.toLowerCase())) {
        return true;
      }
      
      // Check patterns (simple wildcard matching)
      for (const pattern of skipFiles) {
        if (pattern.includes('*')) {
          const regexPattern = pattern.replace(/\*/g, '.*');
          const regex = new RegExp(`^${regexPattern}$`, 'i');
          if (regex.test(fileName)) {
            return true;
          }
        }
      }
      
      return false;
    };

    const processDirectory = async (currentPath: string, relativePath = '') => {
      try {
        const entries = await fs.promises.readdir(currentPath, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = path.join(currentPath, entry.name);
          const entryRelativePath = path.join(relativePath, entry.name);

          if (entry.isDirectory()) {
            // Skip excluded directories
            if (!skipDirs.includes(entry.name.toLowerCase()) && !entry.name.startsWith('.')) {
              await processDirectory(fullPath, entryRelativePath);
            } else {
              this.logger.debug(`Skipping directory: ${entryRelativePath}`);
            }
          } else if (entry.isFile()) {
            // Skip excluded files and check file size
            if (!shouldSkipFile(entry.name)) {
              try {
                const stats = await fs.promises.stat(fullPath);
                // Skip files larger than 50MB
                if (stats.size <= 50 * 1024 * 1024) {
                  files.push(entryRelativePath);
                } else {
                  this.logger.warn(`Skipping large file: ${entryRelativePath} (${(stats.size / 1024 / 1024).toFixed(2)}MB)`);
                }
              } catch (statError) {
                this.logger.warn(`Could not stat file: ${entryRelativePath}`);
              }
            } else {
              this.logger.debug(`Skipping file: ${entryRelativePath}`);
            }
          }
        }
      } catch (error) {
        this.logger.warn(`Error reading directory ${currentPath}: ${error.message}`);
      }
    };

    await processDirectory(dirPath);
    
    this.logger.log(`Found ${files.length} files to process (excluded dependencies and large files)`);
    return files;
  }

  private detectLanguageAndFramework(files: string[]): { language?: string; framework?: string } {
    const extensions = files.map(f => path.extname(f).toLowerCase());
    const fileNames = files.map(f => path.basename(f).toLowerCase());

    // Count file extensions
    const extCounts: Record<string, number> = {};
    extensions.forEach(ext => {
      if (ext) extCounts[ext] = (extCounts[ext] || 0) + 1;
    });

    // Determine primary language
    let language: string | undefined;
    const sortedExts = Object.entries(extCounts).sort(([,a], [,b]) => b - a);
    
    if (sortedExts.length > 0) {
      const [topExt] = sortedExts[0];
      language = this.extensionToLanguage(topExt);
    }

    // Detect framework
    let framework: string | undefined;
    if (fileNames.includes('package.json')) {
      if (fileNames.includes('next.config.js') || files.some(f => f.includes('pages/') || f.includes('app/'))) {
        framework = 'Next.js';
      } else if (fileNames.includes('angular.json')) {
        framework = 'Angular';
      } else if (files.some(f => f.includes('src/') && f.endsWith('.jsx'))) {
        framework = 'React';
      } else {
        framework = 'Node.js';
      }
    } else if (fileNames.includes('requirements.txt') || fileNames.includes('pyproject.toml')) {
      if (fileNames.includes('manage.py')) {
        framework = 'Django';
      } else if (files.some(f => f.includes('flask'))) {
        framework = 'Flask';
      } else {
        framework = 'Python';
      }
    } else if (fileNames.includes('composer.json')) {
      if (files.some(f => f.includes('laravel'))) {
        framework = 'Laravel';
      } else {
        framework = 'PHP';
      }
    }

    return { language, framework };
  }

  private detectFileLanguage(extension: string, fileName: string): string | undefined {
    return this.extensionToLanguage(extension.toLowerCase());
  }

  private extensionToLanguage(ext: string): string | undefined {
    const languageMap: Record<string, string> = {
      '.js': 'JavaScript',
      '.jsx': 'JavaScript',
      '.ts': 'TypeScript',
      '.tsx': 'TypeScript',
      '.py': 'Python',
      '.java': 'Java',
      '.kt': 'Kotlin',
      '.cs': 'C#',
      '.cpp': 'C++',
      '.cc': 'C++',
      '.c': 'C',
      '.h': 'C',
      '.hpp': 'C++',
      '.php': 'PHP',
      '.rb': 'Ruby',
      '.go': 'Go',
      '.rs': 'Rust',
      '.swift': 'Swift',
      '.scala': 'Scala',
      '.html': 'HTML',
      '.css': 'CSS',
      '.scss': 'SCSS',
      '.less': 'LESS',
      '.sql': 'SQL',
      '.json': 'JSON',
      '.xml': 'XML',
      '.yaml': 'YAML',
      '.yml': 'YAML',
      '.md': 'Markdown',
      '.sh': 'Shell',
      '.ps1': 'PowerShell',
    };

    return languageMap[ext];
  }

  private async createZipFromDirectory(dirPath: string): Promise<Buffer> {
    const zip = new AdmZip();
    
    // Same exclusion logic as getAllFiles
    const skipDirs = [
      '.git', '.svn', '.hg', '.bzr',
      'node_modules', 'vendor', 'packages', 'bower_components',
      'dist', 'build', 'out', 'target', 'bin', 'obj', 'release', 'debug',
      '.cache', '.tmp', 'tmp', 'temp', '.temp',
      '.vscode', '.idea', '.vs', '.sublime-text', '.atom',
      '__pycache__', '.pytest_cache', 'venv', 'env', '.env',
      '.next', '.nuxt', 'coverage', '.nyc_output',
      'logs', 'log', '_site', '.jekyll-cache', 'public'
    ];
    
    const shouldSkipFile = (fileName: string): boolean => {
      const skipFilePatterns = [
        // OS files
        '.DS_Store', 'Thumbs.db', 'Desktop.ini',
        // Lock files
        'package-lock.json', 'yarn.lock', 'composer.lock', 'Pipfile.lock',
        // Environment files (security)
        '.env', '.env.local', '.env.production', '.env.development',
        // Font files (binary)
        '.ttf', '.otf', '.woff', '.woff2', '.eot', '.fon',
        // Images (large files)
        '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.ico', '.svg',
        // Videos and audio
        '.mp4', '.avi', '.mov', '.wmv', '.flv', '.mp3', '.wav', '.ogg',
        // Archives and docs
        '.zip', '.tar', '.gz', '.rar', '.7z', '.pdf', '.doc', '.docx',
        // Executables
        '.exe', '.dll', '.so', '.dylib'
      ];
      
      return skipFilePatterns.some(pattern => 
        fileName.toLowerCase().includes(pattern.toLowerCase())
      );
    };
    
    const addToZip = async (currentPath: string, relativePath = '') => {
      try {
        const entries = await fs.promises.readdir(currentPath, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = path.join(currentPath, entry.name);
          const entryRelativePath = path.join(relativePath, entry.name);

          if (entry.isDirectory()) {
            if (!skipDirs.includes(entry.name.toLowerCase()) && !entry.name.startsWith('.')) {
              await addToZip(fullPath, entryRelativePath);
            }
          } else if (entry.isFile()) {
            if (!shouldSkipFile(entry.name)) {
              try {
                const stats = await fs.promises.stat(fullPath);
                // Only include files smaller than 10MB in ZIP
                if (stats.size <= 10 * 1024 * 1024) {
                  const content = await fs.promises.readFile(fullPath);
                  zip.addFile(entryRelativePath.replace(/\\/g, '/'), content);
                }
              } catch (fileError) {
                this.logger.warn(`Could not add file to ZIP: ${entryRelativePath}`);
              }
            }
          }
        }
      } catch (error) {
        this.logger.warn(`Error processing directory for ZIP: ${currentPath}`);
      }
    };

    await addToZip(dirPath);
    this.logger.log('Created ZIP archive excluding dependencies and large files');
    return zip.toBuffer();
  }

  private async extractZip(zipBuffer: Buffer, extractPath: string): Promise<void> {
    await fs.promises.mkdir(extractPath, { recursive: true });
    
    const zip = new AdmZip(zipBuffer);
    zip.extractAllTo(extractPath, true);
  }

  private async uploadToS3(bucket: string, key: string, buffer: Buffer): Promise<void> {
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
    });

    await this.s3Client.send(command);
  }

  private async downloadFromS3(bucket: string, key: string): Promise<Buffer> {
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    const response = await this.s3Client.send(command);
    
    if (response.Body) {
      const chunks: Buffer[] = [];
      const stream = response.Body as any;
      
      return new Promise((resolve, reject) => {
        stream.on('data', (chunk: Buffer) => chunks.push(chunk));
        stream.on('end', () => resolve(Buffer.concat(chunks)));
        stream.on('error', reject);
      });
    }
    
    throw new Error('No body in S3 response');
  }
}
