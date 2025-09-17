import {
  Controller,
  Post,
  Body,
  Res,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { Response } from 'express';
import { ProjectService } from './project.service';
import { GeneratePresignedUrlDto } from './dto/project.dto';

@ApiTags('project')
@Controller('project')
export class ProjectController {
  private readonly logger = new Logger(ProjectController.name);

  constructor(private readonly projectService: ProjectService) {}

  @Post('generate-presigned-upload-url')
  @ApiOperation({
    summary: 'Generate S3 presigned upload URL for a ZIP file',
    description: 'Creates a project record and returns a presigned S3 URL for direct ZIP upload',
  })
  @ApiBody({
    type: GeneratePresignedUrlDto,
    description: 'Project and file info for presigned URL generation',
    examples: {
      example: {
        summary: 'Example',
        value: {
          projectName: 'My Security Project',
          description: 'A security analysis project for my application',
          fileName: 'source.zip',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Presigned upload URL generated successfully',
    schema: {
      example: {
        status: 'success',
        message: 'Presigned upload URL generated successfully',
        data: {
          projectId: '123e4567-e89b-12d3-a456-426614174000',
          presignedUrl: 'https://s3.amazonaws.com/bucket/projects/userid/uuid/source.zip?...',
          s3Key: 'projects/userid/uuid/source.zip',
          expiresIn: 3600,
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'Failed to generate presigned upload URL',
    schema: {
      example: {
        status: 'error',
        message: 'Failed to generate presigned upload URL',
        error: 'Internal Server Error',
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      },
    },
  })
  async generatePresignedUploadUrl(
    @Body() dto: GeneratePresignedUrlDto,
    @Res() res: Response,
  ) {
    // You should get userId from auth/session in production
    const userId = 'demo-user-id'; // Replace with actual user ID
    await this.projectService.generatePresignedUploadUrl(res, userId, dto);
  }
}