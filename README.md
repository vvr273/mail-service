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
