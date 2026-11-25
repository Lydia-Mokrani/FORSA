export type EmailTemplate = 'verify' | 'recovery' | 'phone-changed' | 'phone-change-pending';

export interface SendEmailOptions {
  to: string;
  template: EmailTemplate;
  locale?: 'fr' | 'ar' | string;
  data?: {
    code?: string;
    delayHours?: number;
    [key: string]: any;
  };
  code?: string;
  delayHours?: number;
}

export interface IEmailSender {
  send(options: SendEmailOptions): Promise<boolean>;
  sendEmail(options: SendEmailOptions): Promise<void>;
}
