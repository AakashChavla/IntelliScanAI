import { Module, Global } from '@nestjs/common';
import { ResponseService } from './services/response.service';
import { DatabaseService } from './database/database.service';
import { MailService } from './mail/mail.service';
import { MailTemplateService } from './mail/main-template';
import { AwsService } from './aws/aws.service';

@Global()
@Module({
  providers: [
    ResponseService,
    DatabaseService,
    MailService,
    MailTemplateService,
    AwsService,
  ],
  exports: [
    ResponseService,
    DatabaseService,
    MailService,
    MailTemplateService,
    AwsService,
  ],
})
export class CommonModule { } 
