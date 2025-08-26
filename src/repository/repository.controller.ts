import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Res,
  UseGuards,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { Response } from 'express';
import { RepositoryService } from './repository.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import { GetUser } from '../common/decorators/get-user.decorator';
import { CreateProjectDto, GeneratePresignedUrlDto, ConfirmUploadDto } from './dto/repository.dto';

@ApiTags('repository')
@Controller('repository')
@UseGuards(AuthGuard)
@ApiBearerAuth('access-token')
export class RepositoryController {
  private readonly logger = new Logger(RepositoryController.name);

  constructor(private readonly repositoryService: RepositoryService) {}

  @Post('upload-from-url')
  @ApiOperation({
    summary: 'Upload repository from URL',
    description: 'Clone a repository from GitHub/GitLab URL and process it',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Repository download started successfully',
    schema: {
      example: {
        status: 'success',
        message: 'Repository download started successfully',
        data: {
          project: {
            id: '123e4567-e89b-12d3-a456-426614174000',
            name: 'My Security Project',
            sourceType: 'GITHUB_URL',
            repoUrl: 'https://github.com/username/repo.git',
            status: 'DOWNLOADING',
            createdAt: '2025-08-26T10:00:00.000Z',
          },
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized - invalid JWT token',
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'Failed to process repository URL',
  })
  async uploadFromUrl(
    @Body() createProjectDto: CreateProjectDto,
    @GetUser('id') userId: string,
    @Res() res: Response,
  ) {
    this.logger.log(`User ${userId} uploading repository from URL: ${createProjectDto.repoUrl}`);
    return this.repositoryService.uploadRepositoryFromUrl(res, userId, createProjectDto);
  }

  @Post('generate-presigned-url')
  @ApiOperation({
    summary: 'Generate presigned URL for ZIP upload',
    description: 'Generate a presigned URL for direct ZIP file upload to S3',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Presigned URL generated successfully',
    schema: {
      example: {
        status: 'success',
        message: 'Presigned URL generated successfully',
        data: {
          projectId: '123e4567-e89b-12d3-a456-426614174000',
          presignedUrl: 'https://s3.amazonaws.com/bucket/key?X-Amz-Algorithm=...',
          s3Key: 'projects/userId/projectId/file.zip',
          expiresIn: 3600,
        },
      },
    },
  })
  async generatePresignedUrl(
    @Body() generateUrlDto: GeneratePresignedUrlDto,
    @GetUser('id') userId: string,
    @Res() res: Response,
  ) {
    this.logger.log(`User ${userId} generating presigned URL for: ${generateUrlDto.fileName}`);
    return this.repositoryService.generatePresignedUrl(res, userId, generateUrlDto);
  }

  @Post('confirm-upload/:projectId')
  @ApiOperation({
    summary: 'Confirm ZIP upload completion',
    description: 'Confirm that ZIP file has been uploaded to S3 and start processing',
  })
  @ApiParam({
    name: 'projectId',
    description: 'Project ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'ZIP upload confirmed, processing started',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Project not found',
  })
  async confirmUpload(
    @Param('projectId') projectId: string,
    @Res() res: Response,
  ) {
    this.logger.log(`Confirming upload for project: ${projectId}`);
    return this.repositoryService.confirmZipUpload(res, projectId);
  }

  @Get('status/:projectId')
  @ApiOperation({
    summary: 'Get project processing status',
    description: 'Get the current status and details of a project',
  })
  @ApiParam({
    name: 'projectId',
    description: 'Project ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Project status retrieved successfully',
    schema: {
      example: {
        status: 'success',
        message: 'Project status retrieved successfully',
        data: {
          project: {
            id: '123e4567-e89b-12d3-a456-426614174000',
            name: 'My Project',
            status: 'READY',
            fileCount: 150,
            files: [],
          },
        },
      },
    },
  })
  async getProjectStatus(
    @Param('projectId') projectId: string,
    @GetUser('id') userId: string,
    @Res() res: Response,
  ) {
    return this.repositoryService.getProjectStatus(res, projectId, userId);
  }

  @Get('projects')
  @ApiOperation({
    summary: 'Get user projects',
    description: 'Get all projects belonging to the authenticated user',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Projects retrieved successfully',
    schema: {
      example: {
        status: 'success',
        message: 'Projects retrieved successfully',
        data: {
          projects: [
            {
              id: '123e4567-e89b-12d3-a456-426614174000',
              name: 'My Project',
              status: 'READY',
              createdAt: '2025-08-26T10:00:00.000Z',
              _count: {
                files: 150,
                scans: 3,
              },
            },
          ],
        },
      },
    },
  })
  async getUserProjects(
    @GetUser('id') userId: string,
    @Res() res: Response,
  ) {
    return this.repositoryService.getUserProjects(res, userId);
  }

  @Delete(':projectId')
  @ApiOperation({
    summary: 'Delete project',
    description: 'Soft delete a project and all its associated data',
  })
  @ApiParam({
    name: 'projectId',
    description: 'Project ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Project deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Project not found',
  })
  async deleteProject(
    @Param('projectId') projectId: string,
    @GetUser('id') userId: string,
    @Res() res: Response,
  ) {
    this.logger.log(`User ${userId} deleting project: ${projectId}`);
    return this.repositoryService.deleteProject(res, projectId, userId);
  }
}
