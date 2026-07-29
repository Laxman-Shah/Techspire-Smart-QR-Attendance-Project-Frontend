# Smart QR Module 1 Frontend

Modern Next.js App Router frontend for testing the Smart QR Attendance System Module 1 authentication APIs.

## Setup

```bash
npm install
cp .env.example .env.local
# edit NEXT_PUBLIC_API_BASE_URL
npm run dev
```

## Requirements

- Backend must allow CORS for the Next.js origin.
- Backend refresh-token cookie must be configured for local development.
- Frontend automatically sends `X-Installation-Id`, optional `X-Browser-Fingerprint`, `Authorization` bearer token, and `credentials/include` through Axios `withCredentials: true`.

## Important flows

- Normal login is three steps: `/login`, `/login/verify-otp`, `/login/complete`.
- `/login/verify-otp` is not final login and does not issue tokens.
- Device replacement verify OTP completes replacement and issues session/token.
- Removed endpoint `/api/auth/device-replacement/complete` is not used.
- Selected session routes use `/api/auth/sessions/{sessionId}/revoke` and `/api/auth/sessions/{sessionId}`.
