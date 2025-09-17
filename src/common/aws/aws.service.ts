import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
    S3Client,
    ListObjectsV2Command,
    GetObjectCommand,
    PutObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class AwsService implements OnModuleInit {
    private readonly logger = new Logger(AwsService.name);
    private readonly s3: S3Client;
    private readonly bucket: string;

    constructor() {
        if (
            !process.env.AWS_REGION ||
            !process.env.AWS_ACCESS_KEY_ID ||
            !process.env.AWS_SECRET_ACCESS_KEY ||
            !process.env.AWS_BUCKET_NAME
        ) {
            this.logger.error('Missing AWS S3 environment variables');
            throw new Error('AWS S3 configuration error');
        }

        this.s3 = new S3Client({
            region: process.env.AWS_REGION,
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
            },
            endpoint: process.env.AWS_S3_ENDPOINT,
            forcePathStyle: true,
        });
        this.bucket = process.env.AWS_BUCKET_NAME!;
    }

    async onModuleInit() {
        await this.testConnection();
    }

    async testConnection(): Promise<boolean> {
        try {
            await this.s3.send(
                new ListObjectsV2Command({
                    Bucket: this.bucket,
                    MaxKeys: 1,
                }),
            );
            this.logger.log('✅ S3 connection successful');
            return true;
        } catch (error) {
            this.logger.error('⚠️ S3 connection failed:', error);
            return false;
        }
    }


    async generatePutPresignedUrl(
    key: string,
    expiresIn: number = 900,
    contentType?: string,
): Promise<string> {
    try {
        const command = new PutObjectCommand({
            Bucket: this.bucket,
            Key: key,
            ContentType: contentType,
        });
        const url = await getSignedUrl(this.s3, command, { expiresIn });
        this.logger.log(
            `Generated presigned PUT URL: ${key} (expires in ${expiresIn}s)`,
        );
        return url;
    } catch (error) {
        this.logger.error('Presigned PUT URL generation error:', error);
        throw new Error('Failed to generate presigned PUT URL');
    }
}
}