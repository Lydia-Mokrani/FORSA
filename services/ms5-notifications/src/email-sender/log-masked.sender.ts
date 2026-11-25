import { IEmailSender, SendEmailOptions } from './email.interface';
import { renderEmail } from './email.templates';
import { maskEmail } from '@forsa/common';

export class LogMaskedEmailSender implements IEmailSender {
  async send(options: SendEmailOptions): Promise<boolean> {
    const data = options.data || { code: options.code, delayHours: options.delayHours };
    // Rendu pour obtenir l'objet du message sans exposer le code
    const rendered = renderEmail(options.template, data, options.locale);

    // GATE RULE: Never log a code, a token, or a full email address.
    console.log(`[EMAIL] to=${maskEmail(options.to)} template=${options.template} subject=${rendered.subject}`);
    return true;
  }

  async sendEmail(options: SendEmailOptions): Promise<void> {
    await this.send(options);
  }
}
