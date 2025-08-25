import { Module, Global } from '@nestjs/common';
import { MailService } from './mail.service';
import { MailTemplateService } from './mail-template';

@Global()
@Module({
  providers: [MailService, MailTemplateService],
  exports: [MailService],
})
export class MailModule {}
