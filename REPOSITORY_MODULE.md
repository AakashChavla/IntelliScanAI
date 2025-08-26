# Repository Module Documentation

## Overview

The Repository Module allows users to upload and process GitHub repositories in two ways:
1. **URL Upload**: Provide a GitHub/GitLab repository URL
2. **Direct Upload**: Upload a ZIP file containing the repository

The module handles large repositories efficiently using:
- Background processing with Bull Queue
- AWS S3 for file storage
- Chunked file processing
- Asynchronous file analysis

## Features

### 🚀 Repository Upload Methods
- **GitHub URL**: Clone public/private repositories
- **ZIP Upload**: Direct file upload with presigned URLs
- **Large File Support**: Handles repositories up to 1GB
- **Background Processing**: Non-blocking upload and processing

### 📁 File Processing
- **Automatic Language Detection**: Detects primary language and framework
- **File Metadata**: Stores path, size, type, line count
- **Content Chunking**: Splits files into 1000-character chunks
- **S3 Storage**: Files stored in AWS S3 with organized structure

### 🔄 Background Processing
- **Bull Queue**: Redis-based job queue
- **Parallel Processing**: Multiple files processed simultaneously
- **Error Handling**: Robust error recovery
- **Progress Tracking**: Real-time status updates

## API Endpoints

### 1. Upload Repository from URL
```http
POST /repository/upload-from-url
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "name": "My Security Project",
  "description": "Security analysis project",
  "sourceType": "GITHUB_URL",
  "repoUrl": "https://github.com/username/repo.git",
  "branch": "main",
  "githubToken": "ghp_1234567890abcdef" // Optional for private repos
}
```

### 2. Generate Presigned URL for ZIP Upload
```http
POST /repository/generate-presigned-url
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "projectName": "My Upload Project",
  "description": "Project uploaded via ZIP",
  "fileName": "my-project.zip"
}
```

### 3. Confirm ZIP Upload
```http
POST /repository/confirm-upload/{projectId}
Authorization: Bearer <jwt_token>
```

### 4. Get Project Status
```http
GET /repository/status/{projectId}
Authorization: Bearer <jwt_token>
```

### 5. Get User Projects
```http
GET /repository/projects
Authorization: Bearer <jwt_token>
```

### 6. Delete Project
```http
DELETE /repository/{projectId}
Authorization: Bearer <jwt_token>
```

## Processing Workflow

### URL Upload Flow
1. User submits repository URL
2. Project created with status `DOWNLOADING`
3. Background job clones repository
4. Repository zipped and uploaded to S3
5. Files extracted and processed
6. File metadata and chunks stored in database
7. Project status updated to `READY`

### ZIP Upload Flow
1. User requests presigned URL
2. Project created with status `PENDING`
3. User uploads ZIP directly to S3
4. User confirms upload completion
5. Background job downloads and extracts ZIP
6. Files processed and metadata stored
7. Project status updated to `READY`

## File Processing Details

### Supported File Types
- **Programming Languages**: JavaScript, TypeScript, Python, Java, C#, PHP, Go, Rust, etc.
- **Web Technologies**: HTML, CSS, SCSS, JSON, XML, YAML
- **Scripts**: Shell, PowerShell, SQL
- **Documentation**: Markdown, Text files

### Language Detection
- **Primary Language**: Based on file extension frequency
- **Framework Detection**: React, Next.js, Django, Laravel, etc.
- **File Classification**: Language assigned per file

### Chunking Strategy
- **Chunk Size**: 1000 characters per chunk
- **Line Tracking**: Start and end line numbers
- **Content Preservation**: Full content for files < 50KB
- **Embedding Ready**: Prepared for AI vector embeddings

## AWS S3 Structure

```
intelliscan-repos/
├── projects/
│   └── {userId}/
│       └── {projectId}/
│           ├── repository.zip         # Original repository ZIP
│           └── files/
│               ├── src/
│               │   ├── index.js
│               │   └── components/
│               └── README.md
```

## Database Schema

### Project Model
```typescript
model Project {
  id: string
  name: string
  description?: string
  sourceType: SourceType
  repoUrl?: string
  branch?: string
  githubToken?: string
  s3Bucket?: string
  s3KeyPrefix?: string
  s3ZipKey?: string
  presignedUrl?: string
  language?: string
  framework?: string
  totalFiles?: number
  totalLines?: number
  status: ProjectStatus
  statusMessage?: string
  ownerId: string
  files: File[]
  // ... timestamps
}
```

### File Model
```typescript
model File {
  id: string
  projectId: string
  relativePath: string
  fileName: string
  extension?: string
  s3Key: string
  language?: string
  size: number
  lineCount?: number
  content?: string // For small files
  chunks: Chunk[]
  // ... timestamps
}
```

### Chunk Model
```typescript
model Chunk {
  id: string
  fileId: string
  chunkIndex: number
  content: string
  startLine: number
  endLine: number
  embedding: Float[] // For AI embeddings
  // ... timestamps
}
```

## Environment Variables

```bash
# AWS Configuration
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_S3_BUCKET_NAME=intelliscan-repos

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=optional_password

# Database
DATABASE_URL=postgresql://user:pass@host:port/dbname
```

## Installation & Setup

### 1. Install Dependencies
```bash
npm install aws-sdk @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
npm install simple-git adm-zip bull @nestjs/bull redis
```

### 2. Setup Redis
```bash
# Using Docker
docker run -d --name redis-intelliscan -p 6379:6379 redis:alpine

# Or install locally
# Windows: Download from GitHub releases
# Linux: sudo apt-get install redis-server
# Mac: brew install redis
```

### 3. Configure AWS S3
1. Create S3 bucket: `intelliscan-repos`
2. Set appropriate IAM permissions
3. Configure CORS for presigned URLs

### 4. Update Environment Variables
Add required variables to `.env` file

### 5. Run Migrations
```bash
npx prisma db push
npx prisma generate
```

## Error Handling

### Common Errors
- **Repository Not Found**: Invalid URL or private repo without token
- **S3 Upload Failed**: Check AWS credentials and bucket permissions
- **Redis Connection**: Ensure Redis server is running
- **File Too Large**: Files > 10MB are skipped
- **Processing Timeout**: Large repositories may need longer processing time

### Error Recovery
- Failed jobs are retried automatically
- Project status includes error messages
- Temp directories are cleaned up on failure
- Partial processing is handled gracefully

## Performance Considerations

### Large Repository Handling
- **Streaming**: Files streamed instead of loaded into memory
- **Batch Processing**: Files processed in batches of 10
- **Memory Management**: Large files (>10MB) are skipped
- **Async Processing**: Non-blocking background jobs

### Optimization Tips
- Use `.gitignore` patterns to exclude unnecessary files
- Avoid repositories with large binary files
- Consider repository size limits for better performance
- Monitor Redis memory usage for large-scale deployments

## Security Features

### Access Control
- JWT authentication required for all endpoints
- User can only access their own projects
- Private repository support with secure token handling

### Data Protection
- Presigned URLs expire after 1 hour
- File content encrypted in transit to S3
- Sensitive data (tokens) not logged
- Soft deletion for data recovery

## Monitoring & Debugging

### Logging
- Comprehensive logging for all operations
- Progress tracking for large repositories
- Error details for failed processing
- Performance metrics collection

### Queue Monitoring
```typescript
// Check queue status
GET /admin/queues/repository-processing
```

### Health Checks
- S3 connectivity
- Redis connectivity
- Database connectivity
- Queue processing status

## Future Enhancements

### Planned Features
- **AI Embeddings**: Vector embeddings for semantic search
- **Incremental Updates**: Process only changed files
- **Multi-language Support**: Enhanced language detection
- **Repository Analytics**: Code quality metrics
- **Batch Operations**: Process multiple repositories
- **Webhook Integration**: GitHub webhook support

### Scalability Improvements
- **Horizontal Scaling**: Multiple worker instances
- **Caching Layer**: Redis caching for metadata
- **CDN Integration**: CloudFront for file delivery
- **Database Optimization**: Partitioning for large datasets
