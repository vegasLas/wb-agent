import nodemailer from 'nodemailer';
import { env } from '@/config/env';
import { createLogger } from '@/utils/logger';

const logger = createLogger('EmailService');

export class EmailService {
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    if (env.EMAIL_SMTP_HOST && env.EMAIL_SMTP_USER && env.EMAIL_SMTP_PASS) {
      const port = parseInt(env.EMAIL_SMTP_PORT, 10);
      this.transporter = nodemailer.createTransport({
        host: env.EMAIL_SMTP_HOST,
        port,
        secure: port === 465,
        tls: port === 587 ? { rejectUnauthorized: false } : undefined,
        auth: {
          user: env.EMAIL_SMTP_USER,
          pass: env.EMAIL_SMTP_PASS,
        },
      });
      logger.info('Email transporter configured');
    } else {
      logger.warn(
        'SMTP not configured — emails will be logged to console only',
      );
    }
  }

  private async send(options: {
    to: string;
    subject: string;
    html: string;
  }): Promise<void> {
    if (!this.transporter) {
      logger.info('[EMAIL MOCK] To:', options.to);
      logger.info('[EMAIL MOCK] Subject:', options.subject);
      logger.info('[EMAIL MOCK] HTML:', options.html.substring(0, 200) + '...');
      return;
    }

    try {
      await this.transporter.sendMail({
        from: env.EMAIL_FROM,
        to: options.to,
        subject: options.subject,
        html: options.html,
      });
      logger.info(`Email sent to ${options.to}: ${options.subject}`);
    } catch (error) {
      logger.error('Failed to send email:', error);
      throw error;
    }
  }

  async sendVerificationEmail(to: string, token: string): Promise<void> {
    const verifyUrl = `${env.FRONTEND_URL}/verify-email?token=${token}`;
    logger.info(`sendVerificationEmail() called — to=${to}, frontendUrl=${env.FRONTEND_URL}`);
    logger.info(`Verification link: ${verifyUrl}`);

    await this.send({
      to,
      subject: 'Подтверждение email — wboi',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
          <h2 style="color: #7c3aed;">wboi</h2>
          <p>Здравствуйте!</p>
          <p>Для завершения регистрации подтвердите ваш email, нажав на кнопку ниже:</p>
          <a href="${verifyUrl}" style="display: inline-block; padding: 12px 24px; background: #7c3aed; color: #fff; text-decoration: none; border-radius: 8px; margin: 16px 0;">
            Подтвердить email
          </a>
          <p style="color: #666; font-size: 13px;">Ссылка действительна 1 час.</p>
          <p style="color: #666; font-size: 13px;">Если вы не регистрировались, просто проигнорируйте это письмо.</p>
        </div>
      `,
    });

    logger.info(`sendVerificationEmail() completed for ${to}`);
  }

  async sendPasswordResetEmail(to: string, token: string): Promise<void> {
    const resetUrl = `${env.FRONTEND_URL}/reset-password?token=${token}`;
    logger.info(`sendPasswordResetEmail() called — to=${to}, frontendUrl=${env.FRONTEND_URL}`);
    logger.info(`Password reset link: ${resetUrl}`);

    await this.send({
      to,
      subject: 'Сброс пароля — wboi',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
          <h2 style="color: #7c3aed;">wboi</h2>
          <p>Здравствуйте!</p>
          <p>Вы запросили сброс пароля. Нажмите на кнопку ниже, чтобы задать новый пароль:</p>
          <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background: #7c3aed; color: #fff; text-decoration: none; border-radius: 8px; margin: 16px 0;">
            Сбросить пароль
          </a>
          <p style="color: #666; font-size: 13px;">Ссылка действительна 1 час.</p>
          <p style="color: #666; font-size: 13px;">Если вы не запрашивали сброс, проигнорируйте это письмо.</p>
        </div>
      `,
    });

    logger.info(`sendPasswordResetEmail() completed for ${to}`);
  }

  async sendNotificationEmail(
    to: string,
    subject: string,
    html: string,
  ): Promise<void> {
    const wrappedHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #7c3aed;">wboi</h2>
        ${html}
      </div>
    `;
    await this.send({ to, subject, html: wrappedHtml });
  }
}

export const emailService = new EmailService();
