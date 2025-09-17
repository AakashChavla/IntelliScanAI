import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, IsOptional, IsEnum, MaxLength, MinLength } from 'class-validator';
import { SourceType } from '@prisma/client';

export class CreateProjectDto {
  @ApiProperty({
    description: 'Project name',
    example: 'My Security Project',
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty({ message: 'Project name is required' })
  @MaxLength(100, { message: 'Project name must not exceed 100 characters' })
  name: string;

  @ApiProperty({
    description: 'Project description',
    example: 'A security analysis project for my application',
    required: false,
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Description must not exceed 500 characters' })
  description?: string;

  @ApiProperty({
    description: 'Repository source type',
    example: 'GITHUB_URL',
    enum: SourceType,
  })
  @IsEnum(SourceType)
  @IsNotEmpty({ message: 'Source type is required' })
  sourceType: SourceType;

  @ApiProperty({
    description: 'Repository URL',
    example: 'https://github.com/username/repository.git',
    maxLength: 500,
  })
  @IsString()
  @IsNotEmpty({ message: 'Repository URL is required' })
  @MaxLength(500, { message: 'Repository URL must not exceed 500 characters' })
  repoUrl: string;

  @ApiProperty({
    description: 'Git branch to clone',
    example: 'main',
    required: false,
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'Branch name must not exceed 100 characters' })
  branch?: string;

  @ApiProperty({
    description: 'GitHub personal access token for private repositories',
    example: 'ghp_1234567890abcdef',
    required: false,
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'GitHub token must not exceed 100 characters' })
  githubToken?: string;
}

export class GeneratePresignedUrlDto {
  @ApiProperty({
    description: 'Project name',
    example: 'My Upload Project',
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty({ message: 'Project name is required' })
  @MaxLength(100, { message: 'Project name must not exceed 100 characters' })
  projectName: string;

  @ApiProperty({
    description: 'Project description',
    example: 'A project uploaded via ZIP file',
    required: false,
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Description must not exceed 500 characters' })
  description?: string;

  @ApiProperty({
    description: 'ZIP file name',
    example: 'my-project.zip',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty({ message: 'File name is required' })
  @MaxLength(255, { message: 'File name must not exceed 255 characters' })
  fileName: string;
}

export class UploadZipDto {
  @ApiProperty({
    description: 'Project name',
    example: 'My ZIP Project',
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty({ message: 'Project name is required' })
  @MaxLength(100, { message: 'Project name must not exceed 100 characters' })
  projectName: string;

  @ApiProperty({
    description: 'Project description',
    example: 'A project uploaded via ZIP file',
    required: false,
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Description must not exceed 500 characters' })
  description?: string;
}

export class ConfirmUploadDto {
  @ApiProperty({
    description: 'Project ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  @IsNotEmpty({ message: 'Project ID is required' })
  projectId: string;
}