import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { EmbeddingService } from './embedding.service';

export interface SemanticSearchResult {
  chunkId: string;
  fileId: string;
  fileName: string;
  filePath: string;
  content: string;
  similarity: number;
  startLine: number;
  endLine: number;
  project?: {
    id: string;
    name: string;
  };
}

export interface SearchOptions {
  projectId?: string;
  fileTypes?: string[];
  languages?: string[];
  minSimilarity?: number;
  limit?: number;
}

@Injectable()
export class SemanticSearchService {
  private readonly logger = new Logger(SemanticSearchService.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly embeddingService: EmbeddingService,
  ) {}

  /**
   * Perform semantic search across code chunks
   */
  async searchCode(query: string, options: SearchOptions = {}): Promise<SemanticSearchResult[]> {
    const {
      projectId,
      fileTypes = [],
      languages = [],
      minSimilarity = 0.7,
      limit = 20
    } = options;

    try {
      // Generate embedding for the search query
      const queryEmbedding = await this.embeddingService.generateEmbedding(query);
      
      if (queryEmbedding.embedding.length === 0) {
        this.logger.warn('Could not generate embedding for search query');
        return [];
      }

      // Build database filters
      const whereClause: any = {
        embedding: {
          not: []
        }
      };

      if (projectId) {
        whereClause.file = {
          projectId: projectId
        };
      }

      if (fileTypes.length > 0) {
        whereClause.file = {
          ...whereClause.file,
          extension: {
            in: fileTypes
          }
        };
      }

      if (languages.length > 0) {
        whereClause.file = {
          ...whereClause.file,
          language: {
            in: languages
          }
        };
      }

      // Fetch chunks with embeddings
      const chunks = await this.databaseService.chunk.findMany({
        where: whereClause,
        include: {
          file: {
            include: {
              project: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          }
        },
        take: limit * 5, // Get more to filter by similarity later
      });

      if (chunks.length === 0) {
        this.logger.debug('No chunks with embeddings found for search');
        return [];
      }

      // Calculate similarity scores
      const results: SemanticSearchResult[] = [];

      for (const chunk of chunks) {
        if (chunk.embedding.length === 0) {
          continue; // Skip chunks without embeddings
        }

        const similarity = this.embeddingService.calculateSimilarity(
          queryEmbedding.embedding,
          chunk.embedding
        );

        if (similarity >= minSimilarity) {
          results.push({
            chunkId: chunk.id,
            fileId: chunk.fileId,
            fileName: chunk.file.fileName,
            filePath: chunk.file.relativePath,
            content: chunk.content,
            similarity: similarity,
            startLine: chunk.startLine,
            endLine: chunk.endLine,
            project: chunk.file.project ? {
              id: chunk.file.project.id,
              name: chunk.file.project.name
            } : undefined
          });
        }
      }

      // Sort by similarity (highest first) and limit results
      results.sort((a, b) => b.similarity - a.similarity);
      
      const limitedResults = results.slice(0, limit);
      
      this.logger.debug(`Semantic search for "${query}" returned ${limitedResults.length} results (min similarity: ${minSimilarity})`);
      
      return limitedResults;

    } catch (error) {
      this.logger.error(`Semantic search failed: ${error.message}`);
      return [];
    }
  }

  /**
   * Find similar code chunks to a given chunk
   */
  async findSimilarChunks(chunkId: string, options: SearchOptions = {}): Promise<SemanticSearchResult[]> {
    try {
      // Get the reference chunk
      const referenceChunk = await this.databaseService.chunk.findUnique({
        where: { id: chunkId },
        include: {
          file: {
            include: {
              project: true
            }
          }
        }
      });

      if (!referenceChunk || referenceChunk.embedding.length === 0) {
        this.logger.warn(`Reference chunk ${chunkId} not found or has no embedding`);
        return [];
      }

      return this.searchByEmbedding(referenceChunk.embedding, {
        ...options,
        excludeChunkId: chunkId
      });

    } catch (error) {
      this.logger.error(`Failed to find similar chunks: ${error.message}`);
      return [];
    }
  }

  /**
   * Search by existing embedding vector
   */
  private async searchByEmbedding(
    embedding: number[], 
    options: SearchOptions & { excludeChunkId?: string } = {}
  ): Promise<SemanticSearchResult[]> {
    const {
      projectId,
      fileTypes = [],
      languages = [],
      minSimilarity = 0.7,
      limit = 20,
      excludeChunkId
    } = options;

    // Build database filters
    const whereClause: any = {
      embedding: {
        not: []
      }
    };

    if (excludeChunkId) {
      whereClause.id = {
        not: excludeChunkId
      };
    }

    if (projectId) {
      whereClause.file = {
        projectId: projectId
      };
    }

    if (fileTypes.length > 0) {
      whereClause.file = {
        ...whereClause.file,
        extension: {
          in: fileTypes
        }
      };
    }

    if (languages.length > 0) {
      whereClause.file = {
        ...whereClause.file,
        language: {
          in: languages
        }
      };
    }

    // Fetch chunks with embeddings
    const chunks = await this.databaseService.chunk.findMany({
      where: whereClause,
      include: {
        file: {
          include: {
            project: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      },
      take: limit * 5, // Get more to filter by similarity later
    });

    // Calculate similarity scores
    const results: SemanticSearchResult[] = [];

    for (const chunk of chunks) {
      if (chunk.embedding.length === 0) {
        continue;
      }

      const similarity = this.embeddingService.calculateSimilarity(
        embedding,
        chunk.embedding
      );

      if (similarity >= minSimilarity) {
        results.push({
          chunkId: chunk.id,
          fileId: chunk.fileId,
          fileName: chunk.file.fileName,
          filePath: chunk.file.relativePath,
          content: chunk.content,
          similarity: similarity,
          startLine: chunk.startLine,
          endLine: chunk.endLine,
          project: chunk.file.project ? {
            id: chunk.file.project.id,
            name: chunk.file.project.name
          } : undefined
        });
      }
    }

    // Sort by similarity (highest first) and limit results
    results.sort((a, b) => b.similarity - a.similarity);
    return results.slice(0, limit);
  }

  /**
   * Get embedding statistics for a project
   */
  async getEmbeddingStats(projectId: string): Promise<{
    totalChunks: number;
    chunksWithEmbeddings: number;
    embeddingCoverage: number;
    filesCovered: number;
  }> {
    try {
      const totalChunks = await this.databaseService.chunk.count({
        where: {
          file: {
            projectId: projectId
          }
        }
      });

      const chunksWithEmbeddings = await this.databaseService.chunk.count({
        where: {
          file: {
            projectId: projectId
          },
          NOT: {
            embedding: {
              equals: []
            }
          }
        }
      });

      const filesCovered = await this.databaseService.chunk.groupBy({
        by: ['fileId'],
        where: {
          file: {
            projectId: projectId
          },
          NOT: {
            embedding: {
              equals: []
            }
          }
        }
      });

      const embeddingCoverage = totalChunks > 0 ? (chunksWithEmbeddings / totalChunks) * 100 : 0;

      return {
        totalChunks,
        chunksWithEmbeddings,
        embeddingCoverage: Math.round(embeddingCoverage * 100) / 100,
        filesCovered: filesCovered.length
      };

    } catch (error) {
      this.logger.error(`Failed to get embedding stats: ${error.message}`);
      return {
        totalChunks: 0,
        chunksWithEmbeddings: 0,
        embeddingCoverage: 0,
        filesCovered: 0
      };
    }
  }
}
