# MERN Mail Verification Service

## What this includes
- Signup + login flow
- Email verification link (sets `semi_verified`)
- OTP send/resend with 60s cooldown and 10/day cap
- OTP verification to become fully `verified`
- Forced re-login after full verification
- Verified success screen with name + email

## Run locally
1. Copy env file and configure SMTP + MongoDB:
   - `cp backend/.env.example backend/.env`
2. Start backend:
   - `cd backend && npm run dev`
3. Start frontend:
   - `cd frontend && npm run dev`
4. Open `http://localhost:5173`

## Brevo SMTP setup
1. In Brevo, verify a sender email/domain under sender settings. `MAIL_FROM` must use that verified sender.
2. Create an SMTP key in Brevo under SMTP/API settings.
3. Copy the Brevo env sample:
   - `cp backend/.env.brevo.example backend/.env`
4. Configure `backend/.env`:
   - `SMTP_HOST=smtp-relay.brevo.com`
   - `SMTP_PORT=587`
   - `SMTP_SECURE=false`
   - `SMTP_USER=<your Brevo SMTP login>`
   - `SMTP_PASS=<your Brevo SMTP key>`
   - `MAIL_FROM="Mail Service <your verified sender email>"`
5. Restart the backend after changing env values.

The current backend sends verification and OTP emails through Nodemailer using these SMTP variables.

## Main backend routes
- `POST /auth/signup`
- `POST /auth/login`
- `POST /auth/send-verification-email`
- `GET /auth/verify-email-link?token=...`
- `POST /auth/otp/send`
- `POST /auth/otp/resend`
- `POST /auth/otp/verify`
- `GET /auth/verification-status`
- `POST /auth/logout`
