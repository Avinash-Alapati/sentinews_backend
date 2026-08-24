import nodemailer from "nodemailer";

type MailOptions = {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  from?: string;
};

const getTransporter = () => {
  const host = process.env.EMAIL_SMTP_HOST;
  const port = Number(process.env.EMAIL_SMTP_PORT ?? "0");
  const user = process.env.EMAIL_SMTP_USER;
  const pass = process.env.EMAIL_SMTP_PASS;

  if (!host || !port || !user || !pass) {
    console.warn("[mail] SMTP not configured; emails will be logged.");
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
};

export const sendMail = async ({ to, subject, html, text, from }: MailOptions) => {
  const transporter = getTransporter();
  const fromAddress = from ?? process.env.EMAIL_FROM ?? "no-reply@sentinews.local";

  if (!transporter) {
    console.info(`[mail] To: ${to} Subject: ${subject}`);
    if (html) console.info(`[mail] HTML: ${html}`);
    return;
  }

  const message: Parameters<typeof transporter.sendMail>[0] = {
    from: fromAddress,
    to,
    subject,
    html,
    text,
  };

  await transporter.sendMail(message);
};

export const sendPasswordResetEmail = async ({ to, resetUrl }: { to: string; resetUrl: string }) => {
  const subject = "Reset your SentiNews password";
  const html = `
    <p>Hello,</p>
    <p>You requested a password reset for your SentiNews account. Click the link below to reset your password. This link expires in 15 minutes.</p>
    <p><a href="${resetUrl}">Reset password</a></p>
    <p>If you did not request this, you can safely ignore this email.</p>
  `;

  await sendMail({ to, subject, html });
};
