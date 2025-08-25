import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import SMTPTransport from 'nodemailer/lib/smtp-transport';
import { MailTemplateService, EmailTemplateData } from './mail-template';

interface EmailOptions {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter;
  private isMailServiceReady: boolean = false;

  constructor(private readonly mailTemplateService: MailTemplateService) {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    } as SMTPTransport.Options);
  }

  async onModuleInit() {
    await this.verifyConnection();
  }

  private async verifyConnection() {
    try {
      await this.transporter.verify();
      this.isMailServiceReady = true;
      this.logger.log('✅ Mail service connected successfully');
    } catch (error) {
      this.isMailServiceReady = false;
      this.logger.warn(
        '⚠️  Mail service configuration issue - emails will not be sent',
        error.message,
      );
    }
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  async sendEmail(options: EmailOptions) {
    try {
      if (
        !options.to ||
        (Array.isArray(options.to)
          ? options.to.some((email) => !this.isValidEmail(email))
          : !this.isValidEmail(options.to))
      ) {
        this.logger.error('Invalid email address:', options.to);
        throw new Error('Invalid recipient email address');
      }

      this.logger.log('Attempting to send email to:', options.to);
      this.logger.log('Subject:', options.subject);

      const mailOptions = {
        from: `"${process.env.MAIL_FROM_NAME || 'SimplCase'}" <${process.env.SMTP_USER}>`,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
      };

      const result = await this.transporter.sendMail(mailOptions);

      return {
        messageId: result.messageId,
        to: options.to,
        subject: options.subject,
      };
    } catch (error) {
      this.logger.error('Email sending error:', error);
      throw new Error('Failed to send email');
    }
  }

  async sendTemplatedEmail(
    options: EmailOptions & { templateData?: EmailTemplateData },
  ) {
    try {
      const htmlContent = options.templateData
        ? this.mailTemplateService.generateEmailTemplate(options.templateData)
        : options.html;

      return await this.sendEmail({
        ...options,
        html: htmlContent,
      });
    } catch (error) {
      this.logger.error('Templated email sending error:', error);
      throw new Error('Failed to send templated email');
    }
  }

  async sendVerificationEmail(
    email: string,
    verificationUrl: string,
    userName?: string,
  ) {
    const html = this.mailTemplateService.generateVerificationEmail(
      email,
      verificationUrl,
      userName,
    );

    return await this.sendEmail({
      to: email,
      subject: 'Verify Your Email - IntelliScanAI',
      html,
    });
  }
}
