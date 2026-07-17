import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

/**
 * Transactional email sender. Uses SMTP when `SMTP_HOST` is configured;
 * otherwise falls back to nodemailer's JSON transport (no network) and logs
 * the message so flows are fully testable in development.
 */
@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger(MailService.name);
  private transporter!: Transporter;
  private from!: string;

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    const mail = this.config.get('mail') as {
      from: string;
      smtpHost?: string;
      smtpPort?: number;
      smtpUser?: string;
      smtpPass?: string;
    };
    this.from = mail.from;

    if (mail.smtpHost) {
      this.transporter = nodemailer.createTransport({
        host: mail.smtpHost,
        port: mail.smtpPort ?? 587,
        secure: (mail.smtpPort ?? 587) === 465,
        auth: mail.smtpUser ? { user: mail.smtpUser, pass: mail.smtpPass } : undefined,
      });
      this.logger.log(`Mail transport: SMTP ${mail.smtpHost}:${mail.smtpPort ?? 587}`);
    } else {
      this.transporter = nodemailer.createTransport({ jsonTransport: true });
      this.logger.warn('Mail transport: DEV (JSON) — emails are logged, not delivered');
    }
  }

  async sendVerificationEmail(to: string, link: string): Promise<void> {
    await this.send(
      to,
      'Verify your NairaFlow email',
      `Welcome to NairaFlow! Confirm your email to activate your account:\n\n${link}\n\nThis link expires soon. If you didn't sign up, ignore this email.`,
      this.htmlTemplate('Verify your email', 'Confirm your email', link, 'Verify email'),
    );
  }

  async sendPasswordResetEmail(to: string, link: string): Promise<void> {
    await this.send(
      to,
      'Reset your NairaFlow password',
      `We received a request to reset your NairaFlow password:\n\n${link}\n\nIf you didn't request this, you can safely ignore this email.`,
      this.htmlTemplate('Reset your password', 'Reset your password', link, 'Reset password'),
    );
  }

  private async send(to: string, subject: string, text: string, html: string): Promise<void> {
    const info = await this.transporter.sendMail({ from: this.from, to, subject, text, html });
    // Surface the link in dev logs so it can be used without a real inbox.
    this.logger.log(`Email queued -> ${to} | ${subject}`);
    if (this.config.get<string>('app.nodeEnv') !== 'production') {
      this.logger.debug(`DEV email body:\n${text}`);
    }
    void info;
  }

  private htmlTemplate(title: string, heading: string, link: string, cta: string): string {
    return `<!doctype html><html><body style="font-family:sans-serif;background:#052e26;padding:24px">
      <div style="max-width:480px;margin:auto;background:#fff;border-radius:12px;padding:32px">
        <h1 style="color:#047857">NairaFlow</h1>
        <h2>${heading}</h2>
        <p>Click the button below to ${title.toLowerCase()}.</p>
        <p><a href="${link}" style="display:inline-block;background:#047857;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none">${cta}</a></p>
        <p style="color:#6b7280;font-size:12px">Or paste this URL: ${link}</p>
      </div></body></html>`;
  }
}
