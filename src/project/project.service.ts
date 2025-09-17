import { Injectable, Logger, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { DatabaseService } from 'src/common/database/database.service';
import { ResponseService } from 'src/common/services/response.service';
import { v4 as uuidv4 } from 'uuid';
import { GeneratePresignedUrlDto } from './dto/project.dto';

@Injectable()
export class ProjectService {
  private readonly logger = new Logger(ProjectService.name);
  private readonly s3Client: S3Client;
  private readonly bucketName = process.env.AWS_BUCKET_NAME || 'simplcase';

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly responseService: ResponseService,
  ) {
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
    if (!accessKeyId || !secretAccessKey) {
      throw new Error('AWS credentials are required');
    }
    this.s3Client = new S3Client({
      region: process.env.AWS_REGION || 'ap-south-1',
      credentials: { accessKeyId, secretAccessKey },
    });
    this.logger.log(`S3 configured with bucket: ${this.bucketName}`);
  }

  async generatePresignedUploadUrl(
    res: Response,
    userId: string,
    dto: GeneratePresignedUrlDto,
  ) {
    try {
      const s3KeyPrefix = `projects/${userId}/${uuidv4()}`;
      const s3ZipKey = `${s3KeyPrefix}/${dto.fileName}`;

      // Create project record (without presignedUrl)
      const project = await this.databaseService.project.create({
        data: {
          name: dto.projectName,
          description: dto.description,
          sourceType: 'FILE_UPLOAD',
          status: 'PENDING',
          ownerId: userId,
          s3Bucket: this.bucketName,
          s3KeyPrefix,
        },
      });

      // Generate presigned URL for direct upload
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: s3ZipKey,
        ContentType: 'application/zip',
        Metadata: {
          projectId: project.id,
          userId,
        },
      });

      const presignedUrl = await getSignedUrl(this.s3Client, command, {
        expiresIn: 3600, // 1 hour
      });

      return this.responseService.sendSuccess(
        res,
        HttpStatus.OK,
        'Presigned upload URL generated successfully',
        {
          projectId: project.id,
          presignedUrl,
          s3Key: s3ZipKey,
          expiresIn: 3600,
        },
      );
    } catch (error) {
      this.logger.error('Error generating presigned upload URL:', error);
      return this.responseService.sendError(
        res,
        HttpStatus.INTERNAL_SERVER_ERROR,
        'Failed to generate presigned upload URL',
      );
    }
  }
}