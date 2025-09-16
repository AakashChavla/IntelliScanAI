import { Injectable } from '@nestjs/common';

export interface EmailTemplateData {
  title: string;
  preheader?: string;
  heading: string;
  content: string;
  buttonText?: string;
  buttonUrl?: string;
  footerText?: string;
  companyName?: string;
  companyAddress?: string;
  unsubscribeUrl?: string;
}

@Injectable()
export class MailTemplateService {
  generateEmailTemplate(data: EmailTemplateData): string {
    const {
      title,
      preheader = '',
      heading,
      content,
      buttonText,
      buttonUrl,
      footerText = 'Thank you for using our service.',
      companyName = process.env.MAIL_FROM_NAME || 'IntelliScanAI',
      companyAddress = '123 Security Street, Tech City, TC 12345',
      unsubscribeUrl = '#'
    } = data;

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <title>${title}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333333;
            background-color: #f4f4f4;
            margin: 0;
            padding: 0;
        }
        
        .email-container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 40px 20px;
            text-align: center;
            color: white;
        }
        
        .logo {
            font-size: 28px;
            font-weight: bold;
            margin-bottom: 10px;
            text-decoration: none;
            color: white;
        }
        
        .tagline {
            font-size: 14px;
            opacity: 0.9;
        }
        
        .content {
            padding: 40px 30px;
        }
        
        .heading {
            font-size: 24px;
            font-weight: 600;
            color: #2c3e50;
            margin-bottom: 20px;
            text-align: center;
        }
        
        .message {
            font-size: 16px;
            line-height: 1.8;
            color: #555555;
            margin-bottom: 30px;
        }
        
        .button-container {
            text-align: center;
            margin: 30px 0;
        }
        
        .cta-button {
            display: inline-block;
            padding: 15px 30px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            font-size: 16px;
            transition: transform 0.3s ease;
            box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
        }
        
        .cta-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
        }
        
        .divider {
            height: 1px;
            background: linear-gradient(to right, transparent, #e0e0e0, transparent);
            margin: 30px 0;
        }
        
        .footer {
            background-color: #f8f9fa;
            padding: 30px;
            text-align: center;
            border-top: 1px solid #e9ecef;
        }
        
        .footer-text {
            font-size: 14px;
            color: #6c757d;
            margin-bottom: 15px;
        }
        
        .company-info {
            font-size: 12px;
            color: #9ca3af;
            margin-bottom: 10px;
        }
        
        .social-links {
            margin: 20px 0;
        }
        
        .social-link {
            display: inline-block;
            margin: 0 10px;
            padding: 8px;
            background-color: #667eea;
            color: white;
            text-decoration: none;
            border-radius: 50%;
            width: 36px;
            height: 36px;
            line-height: 20px;
        }
        
        .unsubscribe {
            font-size: 11px;
            color: #9ca3af;
        }
        
        .unsubscribe a {
            color: #667eea;
            text-decoration: none;
        }
        
        /* Responsive Design */
        @media only screen and (max-width: 600px) {
            .email-container {
                width: 100% !important;
                margin: 0 !important;
            }
            
            .header {
                padding: 30px 20px;
            }
            
            .content {
                padding: 30px 20px;
            }
            
            .heading {
                font-size: 20px;
            }
            
            .message {
                font-size: 14px;
            }
            
            .cta-button {
                padding: 12px 25px;
                font-size: 14px;
            }
            
            .footer {
                padding: 20px;
            }
        }
        
        @media only screen and (max-width: 480px) {
            .logo {
                font-size: 24px;
            }
            
            .heading {
                font-size: 18px;
            }
            
            .content {
                padding: 20px 15px;
            }
        }
    </style>
</head>
<body>
    ${preheader ? `<div style="display: none; max-height: 0; overflow: hidden;">${preheader}</div>` : ''}
    
    <div class="email-container">
        <!-- Header -->
        <div class="header">
            <div class="logo">🛡️ ${companyName}</div>
            <div class="tagline">AI-Powered Security Scanner</div>
        </div>
        
        <!-- Main Content -->
        <div class="content">
            <h1 class="heading">${heading}</h1>
            <div class="message">${content}</div>
            
            ${buttonText && buttonUrl ? `
            <div class="button-container">
                <a href="${buttonUrl}" class="cta-button">${buttonText}</a>
            </div>
            ` : ''}
            
            <div class="divider"></div>
            <p style="text-align: center; color: #6c757d; font-size: 14px;">${footerText}</p>
        </div>
        
        <!-- Footer -->
        <div class="footer">
            <div class="footer-text">
                <strong>${companyName}</strong> - Securing your code, one scan at a time.
            </div>
            
            <div class="social-links">
                <a href="#" class="social-link">📧</a>
                <a href="#" class="social-link">🐦</a>
                <a href="#" class="social-link">💼</a>
                <a href="#" class="social-link">🌐</a>
            </div>
            
            <div class="company-info">
                ${companyAddress}
            </div>
            
            <div class="unsubscribe">
                <a href="${unsubscribeUrl}">Unsubscribe</a> | 
                <a href="#">Privacy Policy</a> | 
                <a href="#">Terms of Service</a>
            </div>
        </div>
    </div>
</body>
</html>`;
  }
  
  // Predefined templates for common use cases
  generateVerificationEmail(email: string, verificationUrl: string, userName?: string): string {
    return this.generateEmailTemplate({
      title: 'Verify Your Email - IntelliScanAI',
      preheader: 'Please verify your email address to activate your account',
      heading: 'Welcome to IntelliScanAI! 🚀',
      content: `
        <p>Hi ${userName || 'there'},</p>
        <p>Thank you for signing up with IntelliScanAI! We're excited to help you secure your code with our AI-powered vulnerability scanner.</p>
        <p>To get started, please verify your email address by clicking the button below:</p>
      `,
      buttonText: 'Verify Email Address',
      buttonUrl: verificationUrl,
      footerText: 'This verification link will expire in 24 hours. If you didn\'t create this account, please ignore this email.'
    });
  }
  
  generatePasswordResetEmail(resetUrl: string, userName?: string): string {
    return this.generateEmailTemplate({
      title: 'Reset Your Password - IntelliScanAI',
      preheader: 'Reset your password for your IntelliScanAI account',
      heading: 'Password Reset Request 🔐',
      content: `
        <p>Hi ${userName || 'there'},</p>
        <p>We received a request to reset your password for your IntelliScanAI account.</p>
        <p>Click the button below to create a new password:</p>
      `,
      buttonText: 'Reset Password',
      buttonUrl: resetUrl,
      footerText: 'This password reset link will expire in 1 hour. If you didn\'t request this reset, please ignore this email.'
    });
  }
  
  generateWelcomeEmail(userName: string, dashboardUrl: string): string {
    return this.generateEmailTemplate({
      title: 'Welcome to IntelliScanAI!',
      preheader: 'Your account has been verified successfully',
      heading: 'Welcome aboard! 🎉',
      content: `
        <p>Hi ${userName},</p>
        <p>Your email has been verified successfully! You're now ready to start using IntelliScanAI.</p>
        <p>Here's what you can do next:</p>
        <ul style="margin: 20px 0; padding-left: 20px;">
          <li>Upload your first project for security scanning</li>
          <li>Explore our AI-powered vulnerability detection</li>
          <li>Set up automated security monitoring</li>
          <li>Review our comprehensive security reports</li>
        </ul>
      `,
      buttonText: 'Go to Dashboard',
      buttonUrl: dashboardUrl,
      footerText: 'Need help getting started? Check out our documentation or contact our support team.'
    });
  }
}