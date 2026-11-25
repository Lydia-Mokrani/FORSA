import nodemailer from 'nodemailer';
import { IEmailSender, SendEmailOptions } from './email.interface';
import { renderEmail } from './email.templates';
import { LogMaskedEmailSender } from './log-masked.sender';
import { maskEmail } from '@forsa/common';
import { config } from '../config/env';

export class SmtpEmailSender implements IEmailSender {
  private transporter?: nodemailer.Transporter;
  private fallbackSender?: LogMaskedEmailSender;

  constructor() {
    if (!config.smtpHost) {
      if (config.isProduction) {
        throw new Error('FATAL: SMTP_HOST est requis en production pour SmtpEmailSender.');
      }
      // En dev, fallback gracieux vers log-masked si SMTP_HOST n'est pas configuré
      this.fallbackSender = new LogMaskedEmailSender();
      return;
    }

    this.transporter = nodemailer.createTransport({
      host: config.smtpHost,
      port: config.smtpPort,
      secure: config.smtpPort === 465,
      auth:
        config.smtpUser && config.smtpPass
          ? {
              user: config.smtpUser,
              pass: config.smtpPass,
            }
          : undefined,
    });
  }

  async send(options: SendEmailOptions): Promise<boolean> {
    if (this.fallbackSender) {
      return this.fallbackSender.send(options);
    }

    try {
      const data = options.data || { code: options.code, delayHours: options.delayHours };
      const { subject, text, html } = renderEmail(options.template, data, options.locale);

      if (!this.transporter) {
        throw new Error('Transporter nodemailer non initialisé.');
      }

      const info = await this.transporter.sendMail({
        from: config.mailFrom,
        to: options.to,
        subject,
        text,
        html,
      });

      console.log(
        `[EmailSender:SMTP] Email sent (template=${options.template}) to ${maskEmail(options.to)} messageId=${info.messageId}`
      );
      return true;
    } catch (err: any) {
      console.error(
        `[EmailSender:SMTP] Error sending email to ${maskEmail(options.to)}:`,
        err.message
      );
      return false;
    }
  }

  async sendEmail(options: SendEmailOptions): Promise<void> {
    await this.send(options);
  }
}
