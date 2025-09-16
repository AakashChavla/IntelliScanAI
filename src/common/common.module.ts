import { Module, Global } from '@nestjs/common';
import { ResponseService } from './services/response.service';
import { DatabaseService } from './database/database.service';
import { MailService } from './mail/mail.service';
import { MailTemplateService } from './mail/main-template';

@Global()
@Module({
  providers: [
    ResponseService,
    DatabaseService,
    MailService,
    MailTemplateService
  ],
  exports: [
    ResponseService,
    DatabaseService,
    MailService,
    MailTemplateService
  ],
})
export class CommonModule { } 
