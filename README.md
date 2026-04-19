# sgpa-enrollment-2026

React + Tailwind + Firebase enrollment system for SGPA volunteers.

## Features

- Firebase Auth login/register flow
- Volunteer profile management fields:
  - name
  - mobile number
  - volunteer number
  - first join date (generated and readonly)
- Calendar-style course table showing:
  - available date
  - enrolled date
  - paid status
- Notification feed for new course schedules
- Admin console for:
  - user management (admin role toggle)
  - course schedule management
  - enrollment paid-status management

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy environment template and fill Firebase values:

   ```bash
   cp .env.example .env
   ```

3. Start development server:

   ```bash
   npm run dev
   ```

If Firebase variables are not configured, the app runs in demo mode so the UI can still be exercised.

## Validation

- `npm run lint`
- `npm run build`
