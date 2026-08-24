# Password Reset Feature — Setup & Test

This document explains how to apply the new Password Reset feature and test it locally.

## Env variables (example)

Add the following to your `.env` in the `sentinews_backend` folder:

```
DATABASE_URL=postgresql://user:pass@localhost:5432/sentinews
NEXTAUTH_SECRET=some_long_secret
NEXTAUTH_URL=http://localhost:3002

# Gmail SMTP (use App Password)
EMAIL_SMTP_HOST=smtp.gmail.com
EMAIL_SMTP_PORT=587
EMAIL_SMTP_USER=yourgmail@gmail.com
EMAIL_SMTP_PASS=your_google_app_password
EMAIL_FROM=yourgmail@gmail.com
```

## Install & generate Prisma client

```bash
cd c:\Users\TEJASWINI\OneDrive\Desktop\Sentinews\sentinews_backend
npm install
npx prisma generate
```

## Create and run the migration

This project schema was updated to add `PasswordResetToken` with `userId` and `tokenHash` fields.

Run the migration (review generated SQL before applying):

```bash
npx prisma migrate dev --name add_password_reset_token
```

If you prefer to create a SQL migration file manually, run `npx prisma migrate dev --create-only` and apply it via your DB tooling.

## Start the dev server

```bash
npm run dev
```

## Test the flow (dev mode)

1. Open: `http://localhost:3002/auth/forgot-password`
2. Submit a registered email.
   - In development, the UI will display a `resetUrl` (copy button). In production, the email will be sent by SMTP.
3. Open the reset link in the browser.
4. Enter a new password that follows the rules:
   - Minimum 8 characters
   - 1 uppercase, 1 lowercase, 1 number, 1 special character
5. Submit and then login with the new password.

## Notes

- Tokens are single-use and stored as SHA-256 hashes in the DB.
- Token expiry is 15 minutes.
- API endpoints return generic messages and do not reveal whether an email exists.

If you want, I can also generate an automated test script (Playwright or Jest + Supertest) to exercise the complete flow.
