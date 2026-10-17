import nodemailer from 'nodemailer';
import { env } from '../config/env';
import { logger } from '../shared/logger';

type EmailTemplate = 'verifyEmail' | 'forgotPassword' | 'officerApproved' | 'officerRejected';

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

const getTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: env.GMAIL_USER,
      pass: env.GMAIL_APP_PASSWORD
    }
  });
};

export const sendEmail = async (options: SendEmailOptions): Promise<void> => {
  if (!env.GMAIL_USER || !env.GMAIL_APP_PASSWORD) {
    logger.warn(
      { to: options.to, subject: options.subject },
      'Email not sent: GMAIL_USER or GMAIL_APP_PASSWORD not configured in .env'
    );
    return;
  }

  try {
    const transporter = getTransporter();
    const info = await transporter.sendMail({
      from: `"RoadSense Platform" <${env.GMAIL_USER}>`,
      to: options.to,
      subject: options.subject,
      html: options.html
    });
    logger.info({ to: options.to, messageId: info.messageId }, 'Email sent successfully');
  } catch (error) {
    logger.error({ error, to: options.to }, 'Failed to send email');
    throw new Error(`Failed to send email: ${(error as any).message}`);
  }
};

const baseStyles = `
  font-family: 'Segoe UI', Arial, sans-serif;
  max-width: 600px;
  margin: 0 auto;
  background: #0f172a;
  color: #e2e8f0;
  border-radius: 12px;
  overflow: hidden;
`;

const buttonStyle = `
  display: inline-block;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: white;
  text-decoration: none;
  padding: 12px 28px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 14px;
  margin: 20px 0;
`;

const headerHtml = `
  <div style="background: linear-gradient(135deg, #1e1b4b, #312e81); padding: 32px; text-align: center;">
    <div style="font-size: 28px; font-weight: 800; color: #a78bfa; letter-spacing: -0.5px;">🛣️ RoadSense</div>
    <div style="font-size: 12px; color: #818cf8; margin-top: 4px;">Smart Road Condition Monitoring</div>
  </div>
`;

const footerHtml = `
  <div style="background: #0f172a; padding: 20px 32px; border-top: 1px solid #1e293b; text-align: center;">
    <p style="color: #475569; font-size: 11px; margin: 0;">
      This email was sent by RoadSense Platform. Do not reply to this email.<br/>
      If you did not request this, please ignore this email.
    </p>
  </div>
`;

export const buildVerificationEmail = (name: string, verifyUrl: string): string => `
<div style="${baseStyles}">
  ${headerHtml}
  <div style="padding: 32px;">
    <h2 style="color: #c4b5fd; margin: 0 0 12px 0;">Verify Your Email Address</h2>
    <p style="color: #94a3b8; margin: 0 0 8px 0;">Hi <strong style="color: #e2e8f0;">${name}</strong>,</p>
    <p style="color: #94a3b8; line-height: 1.6;">
      Welcome to RoadSense! Please verify your email address to activate your account and start contributing to road safety.
    </p>
    <div style="text-align: center;">
      <a href="${verifyUrl}" style="${buttonStyle}">✅ Verify Email Address</a>
    </div>
    <p style="color: #64748b; font-size: 12px;">
      Or copy this link: <span style="color: #818cf8; word-break: break-all;">${verifyUrl}</span>
    </p>
    <p style="color: #64748b; font-size: 12px;">This link expires in <strong>24 hours</strong>.</p>
  </div>
  ${footerHtml}
</div>`;

export const buildForgotPasswordEmail = (name: string, resetUrl: string): string => `
<div style="${baseStyles}">
  ${headerHtml}
  <div style="padding: 32px;">
    <h2 style="color: #f97316; margin: 0 0 12px 0;">Reset Your Password</h2>
    <p style="color: #94a3b8; margin: 0 0 8px 0;">Hi <strong style="color: #e2e8f0;">${name}</strong>,</p>
    <p style="color: #94a3b8; line-height: 1.6;">
      We received a request to reset the password for your RoadSense account. Click the button below to set a new password.
    </p>
    <div style="text-align: center;">
      <a href="${resetUrl}" style="${buttonStyle.replace('#6366f1, #8b5cf6', '#f97316, #ea580c')}">🔐 Reset Password</a>
    </div>
    <p style="color: #64748b; font-size: 12px;">
      Or copy this link: <span style="color: #fb923c; word-break: break-all;">${resetUrl}</span>
    </p>
    <p style="color: #64748b; font-size: 12px;">This link expires in <strong>1 hour</strong>. If you did not request this, no action is needed.</p>
  </div>
  ${footerHtml}
</div>`;

export const buildOfficerApprovedEmail = (name: string, loginUrl: string): string => `
<div style="${baseStyles}">
  ${headerHtml}
  <div style="padding: 32px;">
    <h2 style="color: #34d399; margin: 0 0 12px 0;">🎉 Application Approved!</h2>
    <p style="color: #94a3b8;">Hi <strong style="color: #e2e8f0;">${name}</strong>,</p>
    <p style="color: #94a3b8; line-height: 1.6;">
      Congratulations! Your Municipal Officer registration request has been <strong style="color: #34d399;">approved</strong> by the RoadSense administrator.
      You can now log in using your registered credentials.
    </p>
    <div style="text-align: center;">
      <a href="${loginUrl}" style="${buttonStyle.replace('#6366f1, #8b5cf6', '#059669, #10b981')}">🔑 Login to RoadSense</a>
    </div>
  </div>
  ${footerHtml}
</div>`;

export const buildOfficerRejectedEmail = (name: string, reason?: string): string => `
<div style="${baseStyles}">
  ${headerHtml}
  <div style="padding: 32px;">
    <h2 style="color: #f87171; margin: 0 0 12px 0;">Application Update</h2>
    <p style="color: #94a3b8;">Hi <strong style="color: #e2e8f0;">${name}</strong>,</p>
    <p style="color: #94a3b8; line-height: 1.6;">
      We regret to inform you that your Municipal Officer registration request has not been approved at this time.
    </p>
    ${reason ? `<div style="background: #1e293b; border-left: 3px solid #f87171; padding: 12px 16px; border-radius: 0 8px 8px 0; margin: 16px 0;">
      <p style="color: #94a3b8; font-size: 13px; margin: 0;"><strong style="color: #f87171;">Reason:</strong> ${reason}</p>
    </div>` : ''}
    <p style="color: #64748b; font-size: 13px;">If you believe this is an error, please contact the administrator.</p>
  </div>
  ${footerHtml}
</div>`;
