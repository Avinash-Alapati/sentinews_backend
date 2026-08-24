import nodemailer from "nodemailer";

const getTransporter = () => {
  const host = process.env.EMAIL_SMTP_HOST;
  const port = Number(process.env.EMAIL_SMTP_PORT ?? "0");
  const user = process.env.EMAIL_SMTP_USER;
  const pass = process.env.EMAIL_SMTP_PASS;

  if (!host || !port || !user || !pass) {
    console.warn("[email] SMTP is not fully configured. Emails will be logged instead of sent.");
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
  });
};

export const sendPasswordResetEmail = async ({
  to,
  resetUrl,
}: {
  to: string;
  resetUrl: string;
}) => {
  const transporter = getTransporter();
  const from = process.env.EMAIL_FROM || "no-reply@sentinews.local";

  const message = {
    from,
    to,
    subject: "Reset your SentiNews password",
    html: `
      <p>Hello,</p>
      <p>You requested a password reset for your SentiNews account.</p>
      <p>
        Click the link below to reset your password. This link expires in 30 minutes.
      </p>
      <p><a href="${resetUrl}">Reset password</a></p>
      <p>If you did not request this, you can ignore this email.</p>
    `,
  };

  if (!transporter) {
    console.info(`[email] Password reset link for ${to}: ${resetUrl}`);
    return;
  }

  await transporter.sendMail(message);
};
