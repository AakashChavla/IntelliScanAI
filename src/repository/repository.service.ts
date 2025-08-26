import { Injectable, Logger, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { DatabaseService } from '../database/database.service';
import { ResponseService } from '../common/services/response.service';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import * as git from 'simple-git';
import * as fs from 'fs';
import * as path from 'path';
import * as AdmZip from 'adm-zip';
import { v4 as uuidv4 } from 'uuid';
import { CreateProjectDto, UploadZipDto, GeneratePresignedUrlDto } from './dto/repository.dto';

@Injectable()
export class RepositoryService {
  private readonly logger = new Logger(RepositoryService.name);
  private readonly s3Client: S3Client;
  private readonly bucketName = process.env.AWS_S3_BUCKET_NAME || process.env.AWS_BUCKET_NAME || 'simplcase';

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly responseService: ResponseService,
    @InjectQueue('repository-processing') private repositoryQueue: Queue,
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
    
    this.logger.log(`S3 configured with bucket: ${this.bucketName}, region: ${process.env.AWS_REGION || 'ap-south-1'}`);
  }

  async uploadRepositoryFromUrl(res: Response, userId: string, dto: CreateProjectDto) {
    try {
      this.logger.log(`Processing repository URL: ${dto.repoUrl} for user: ${userId}`);

      // Create project record
      const project = await this.databaseService.project.create({
        data: {
          name: dto.name,
          description: dto.description,
          sourceType: dto.sourceType,
          repoUrl: dto.repoUrl,
          branch: dto.branch || 'main',
          githubToken: dto.githubToken,
          status: 'DOWNLOADING',
          ownerId: userId,
          s3Bucket: this.bucketName,
          s3KeyPrefix: `projects/${userId}/${uuidv4()}`,
        },
      });

      // Add to background queue for processing
      await this.repositoryQueue.add('clone-repository', {
        projectId: project.id,
        repoUrl: dto.repoUrl,
        branch: dto.branch || 'main',
        githubToken: dto.githubToken,
        s3Bucket: this.bucketName,
        s3KeyPrefix: project.s3KeyPrefix,
      });

      return this.responseService.sendSuccess(
        res,
        HttpStatus.CREATED,
        'Repository download started successfully',
        { project },
      );
    } catch (error) {
      this.logger.error('Error uploading repository from URL:', error);
      return this.responseService.sendError(
        res,
        HttpStatus.INTERNAL_SERVER_ERROR,
        'Failed to process repository URL',
      );
    }
  }

  async generatePresignedUrl(res: Response, userId: string, dto: GeneratePresignedUrlDto) {
    try {
      const s3KeyPrefix = `projects/${userId}/${uuidv4()}`;
      const s3ZipKey = `${s3KeyPrefix}/${dto.fileName}`;

      // Create project record
      const project = await this.databaseService.project.create({
        data: {
          name: dto.projectName,
          description: dto.description,
          sourceType: 'FILE_UPLOAD',
          status: 'PENDING',
          ownerId: userId,
          s3Bucket: this.bucketName,
          s3KeyPrefix,
          s3ZipKey,
        },
      });

      // Generate presigned URL for direct upload
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: s3ZipKey,
        ContentType: 'application/zip',
        Metadata: {
          projectId: project.id,
          userId: userId,
        },
      });

      const presignedUrl = await getSignedUrl(this.s3Client, command, {
        expiresIn: 3600, // 1 hour
      });

      // Update project with presigned URL
      await this.databaseService.project.update({
        where: { id: project.id },
        data: { presignedUrl },
      });

      return this.responseService.sendSuccess(
        res,
        HttpStatus.OK,
        'Presigned URL generated successfully',
        {
          projectId: project.id,
          presignedUrl,
          s3Key: s3ZipKey,
          expiresIn: 3600,
        },
      );
    } catch (error) {
      this.logger.error('Error generating presigned URL:', error);
      return this.responseService.sendError(
        res,
        HttpStatus.INTERNAL_SERVER_ERROR,
        'Failed to generate presigned URL',
      );
    }
  }

  async confirmZipUpload(res: Response, projectId: string) {
    try {
      const project = await this.databaseService.project.findUnique({
        where: { id: projectId },
      });

      if (!project) {
        return this.responseService.sendError(
          res,
          HttpStatus.NOT_FOUND,
          'Project not found',
        );
      }

      // Update project status and add to processing queue
      await this.databaseService.project.update({
        where: { id: projectId },
        data: { status: 'PROCESSING' },
      });

      await this.repositoryQueue.add('process-uploaded-zip', {
        projectId: project.id,
        s3Bucket: project.s3Bucket,
        s3ZipKey: project.s3ZipKey,
        s3KeyPrefix: project.s3KeyPrefix,
      });

      return this.responseService.sendSuccess(
        res,
        HttpStatus.OK,
        'ZIP upload confirmed, processing started',
      );
    } catch (error) {
      this.logger.error('Error confirming ZIP upload:', error);
      return this.responseService.sendError(
        res,
        HttpStatus.INTERNAL_SERVER_ERROR,
        'Failed to confirm ZIP upload',
      );
    }
  }

  async getProjectStatus(res: Response, projectId: string, userId: string) {
    try {
      const project = await this.databaseService.project.findFirst({
        where: { 
          id: projectId,
          ownerId: userId,
        },
        include: {
          files: {
            select: {
              id: true,
              fileName: true,
              relativePath: true,
              size: true,
              language: true,
              lineCount: true,
            },
          },
          _count: {
            select: {
              files: true,
            },
          },
        },
      });

      if (!project) {
        return this.responseService.sendError(
          res,
          HttpStatus.NOT_FOUND,
          'Project not found',
        );
      }

      return this.responseService.sendSuccess(
        res,
        HttpStatus.OK,
        'Project status retrieved successfully',
        {
          project: {
            ...project,
            fileCount: project._count.files,
          },
        },
      );
    } catch (error) {
      this.logger.error('Error getting project status:', error);
      return this.responseService.sendError(
        res,
        HttpStatus.INTERNAL_SERVER_ERROR,
        'Failed to get project status',
      );
    }
  }

  async deleteProject(res: Response, projectId: string, userId: string) {
    try {
      const project = await this.databaseService.project.findFirst({
        where: { 
          id: projectId,
          ownerId: userId,
        },
      });

      if (!project) {
        return this.responseService.sendError(
          res,
          HttpStatus.NOT_FOUND,
          'Project not found',
        );
      }

      // Soft delete the project
      await this.databaseService.project.update({
        where: { id: projectId },
        data: { 
          deletedAt: new Date(),
          status: 'ARCHIVED',
        },
      });

      return this.responseService.sendSuccess(
        res,
        HttpStatus.OK,
        'Project deleted successfully',
      );
    } catch (error) {
      this.logger.error('Error deleting project:', error);
      return this.responseService.sendError(
        res,
        HttpStatus.INTERNAL_SERVER_ERROR,
        'Failed to delete project',
      );
    }
  }

  async getUserProjects(res: Response, userId: string) {
    try {
      const projects = await this.databaseService.project.findMany({
        where: { 
          ownerId: userId,
          deletedAt: null,
        },
        include: {
          _count: {
            select: {
              files: true,
              scans: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return this.responseService.sendSuccess(
        res,
        HttpStatus.OK,
        'Projects retrieved successfully',
        { projects },
      );
    } catch (error) {
      this.logger.error('Error getting user projects:', error);
      return this.responseService.sendError(
        res,
        HttpStatus.INTERNAL_SERVER_ERROR,
        'Failed to get projects',
      );
    }
  }
}
