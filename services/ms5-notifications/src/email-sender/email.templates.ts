import { EmailTemplate } from './email.interface';

export interface RenderedEmail {
  subject: string;
  text: string;
  html: string;
}

export function renderEmail(
  template: EmailTemplate,
  data: { code?: string; delayHours?: number; [key: string]: any } = {},
  locale: string = 'fr'
): RenderedEmail {
  const isAr = locale.startsWith('ar');

  switch (template) {
    case 'verify': {
      const code = data.code || '';
      if (isAr) {
        return {
          subject: 'فرصة (FORSA) — تأكيد بريدك الإلكتروني',
          text: `مرحبا بك،\n\nرمز تأكيد بريدك الإلكتروني هو: ${code}\nهذا الرمز صالح لمدة 10 دقائق.\nلا تشارك هذا الرمز مع أي شخص.`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; direction: rtl; text-align: right;">
              <h2 style="color: #0d9488;">FORSA — تأكيد بريدك الإلكتروني</h2>
              <p>مرحباً بك في منصة FORSA،</p>
              <p>رمز التأكيد الخاص بك هو:</p>
              <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 4px; color: #111827; margin: 20px 0;">
                ${code}
              </div>
              <p style="color: #6b7280; font-size: 14px;">⏱️ هذا الرمز صالح لمدة 10 دقائق. لا تشارك هذا الرمز مع أي شخص.</p>
            </div>
          `,
        };
      }
      return {
        subject: 'FORSA — Vérification de votre adresse e-mail',
        text: `Bonjour,\n\nVotre code de vérification FORSA est : ${code}\n\nCe code est valable 10 minutes.\nNe partagez jamais ce code.`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #0d9488;">FORSA — Vérification de votre compte</h2>
            <p>Bonjour,</p>
            <p>Voici votre code de vérification pour confirmer votre adresse e-mail sur FORSA :</p>
            <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 4px; color: #111827; margin: 20px 0;">
              ${code}
            </div>
            <p style="color: #6b7280; font-size: 14px;">⏱️ Ce code est valable pendant 10 minutes. Ne partagez jamais ce code.</p>
          </div>
        `,
      };
    }

    case 'recovery': {
      const code = data.code || '';
      if (isAr) {
        return {
          subject: 'فرصة (FORSA) — استعادة الحساب',
          text: `مرحبا،\n\nتم طلب استعادة حسابك على FORSA.\nرمز الاستعادة هو: ${code}\nهذا الرمز صالح لمدة 15 دقيقة.\nإذا لم تكن أنت صاحب هذا الطلب، يمكنك تجاهل هذه الرسالة بأمان.`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; direction: rtl; text-align: right;">
              <h2 style="color: #0d9488;">FORSA — استعادة حسابك</h2>
              <p>مرحباً،</p>
              <p>تم طلب رمز لاستعادة حسابك وتعيين رقم هاتف جديد على منصة FORSA:</p>
              <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 4px; color: #111827; margin: 20px 0;">
                ${code}
              </div>
              <p style="color: #6b7280; font-size: 14px;">⏱️ هذا الرمز صالح لمدة 15 دقيقة. إذا لم تكن صاحب هذا الطلب، يمكنك تجاهل هذه الرسالة بأمان.</p>
            </div>
          `,
        };
      }
      return {
        subject: 'FORSA — Récupération de votre compte',
        text: `Bonjour,\n\nUne demande de récupération a été initiée pour votre compte FORSA.\nVotre code de récupération est : ${code}\n\nCe code est valable 15 minutes.\nSi vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail.`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #0d9488;">FORSA — Récupération de votre compte</h2>
            <p>Bonjour,</p>
            <p>Une demande de récupération de compte a été demandée. Utilisez le code ci-dessous pour poursuivre :</p>
            <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 4px; color: #111827; margin: 20px 0;">
              ${code}
            </div>
            <p style="color: #6b7280; font-size: 14px;">⏱️ Ce code est valable pendant 15 minutes. Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail.</p>
          </div>
        `,
      };
    }

    case 'phone-changed': {
      if (isAr) {
        return {
          subject: 'فرصة (FORSA) — تم تغيير رقم الهاتف بنجاح',
          text: `مرحبا،\n\nتم تحديث رقم الهاتف المرتبط بحسابك على FORSA بنجاح.\nإذا لم تكن أنت من قام بهذا الإجراء، يرجى الاتصال بالدعم فوراً.`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; direction: rtl; text-align: right;">
              <h2 style="color: #0d9488;">FORSA — تم تغيير رقم الهاتف</h2>
              <p>مرحباً،</p>
              <p>تم تحديث رقم الهاتف المرتبط بحسابك بنجاح.</p>
              <p style="color: #ef4444; font-size: 14px;">⚠️ إذا لم تكن أنت صاحب هذا التغيير، يرجى التواصل مع فريق الدعم فوراً لحماية حسابك.</p>
            </div>
          `,
        };
      }
      return {
        subject: 'FORSA — Numéro de téléphone mis à jour',
        text: `Bonjour,\n\nLe numéro de téléphone associé à votre compte FORSA a été mis à jour avec succès.\nSi vous n'êtes pas à l'origine de cette modification, contactez immédiatement le support.`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #0d9488;">FORSA — Numéro de téléphone mis à jour</h2>
            <p>Bonjour,</p>
            <p>Le numéro de téléphone lié à votre compte FORSA a bien été mis à jour.</p>
            <p style="color: #ef4444; font-size: 14px;">⚠️ Si vous n'êtes pas à l'origine de cette modification, contactez immédiatement l'équipe support FORSA.</p>
          </div>
        `,
      };
    }

    case 'phone-change-pending': {
      const delay = data.delayHours || 24;
      if (isAr) {
        return {
          subject: 'فرصة (FORSA) — طلب تغيير رقم هاتف المتجر قيد الانتظار',
          text: `مرحبا،\n\nتم استلام طلب تغيير رقم الهاتف لمتجرك المعتمد على FORSA.\nلدواعي الأمان، سيتم تفعيل الرقم الجديد بعد انقضاء ${delay} ساعة.\nإذا لم تكن أنت من قام بهذا الطلب، تواصل فوراً مع الدعم لإلغائه: support@forsa.dz`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; direction: rtl; text-align: right;">
              <h2 style="color: #0d9488;">FORSA — طلب تغيير رقم هاتف المتجر</h2>
              <p>مرحباً،</p>
              <p>تم استلام طلب تغيير رقم الهاتف لمتجرك المعتمد على FORSA.</p>
              <p>🔒 <strong>إجراء أمني :</strong> سيصبح الرقم الجديد نشطاً بعد انقضاء مهلة أمان مدتها <strong>${delay} ساعة</strong>.</p>
              <p style="color: #ef4444; font-size: 14px;">⚠️ إذا لم تكن أنت من طلب هذا التغيير، يرجى التواصل فوراً مع الدعم لإيقاف هذه العملية وحماية متجرك: support@forsa.dz</p>
            </div>
          `,
        };
      }
      return {
        subject: 'FORSA — Changement de numéro de téléphone en attente (Sécurité boutique)',
        text: `Bonjour,\n\nUne demande de changement de numéro a été validée pour votre boutique approuvée sur FORSA.\nPar mesure de sécurité, le nouveau numéro deviendra actif dans un délai de ${delay} heures.\nSi vous n'êtes pas à l'origine de cette demande, contactez immédiatement le support pour annuler l'opération: support@forsa.dz`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #0d9488;">FORSA — Sécurité Commerçant : Changement de numéro en attente</h2>
            <p>Bonjour,</p>
            <p>Une demande de changement de numéro de téléphone a été enregistrée pour votre boutique vérifiée sur FORSA.</p>
            <p>🔒 <strong>Délai de sécurité :</strong> Pour protéger votre boutique et vos réservations, le nouveau numéro ne sera activé que dans <strong>${delay} heures</strong>.</p>
            <p style="color: #ef4444; font-size: 14px;">⚠️ Si vous n'êtes pas à l'origine de cette demande, contactez immédiatement l'assistance FORSA pour bloquer la modification: support@forsa.dz</p>
          </div>
        `,
      };
    }

    default:
      throw new Error(`Unknown email template: ${template}`);
  }
}
