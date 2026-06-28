# School Result & Performance Management System

MERN application with **2 roles only**: `admin` and `teacher`.

## Stack
- Frontend: React, Vite, Tailwind CSS, shadcn/ui, Recharts
- Backend: Node.js, Express.js, MongoDB, JWT, Mongoose

## Core Modules
- Admin Login + protected routes
- Teacher Management (Add/Edit/Delete + credential email sending)
- Class Management (`className` auto-uppercase)
- Student Management (class-wise, `rollNo` unique per class)
- Teacher Assignment (multiple classes + subjects)
- Marks Entry on website (no Excel upload workflow)
- Monthly result sessions (`month`, `year`, `examType`)
- Subject-wise and overall ranking (equal marks share same rank)
- Dashboard analytics, toppers, weak students, activity feed
- Result filtering and download

## Roles
- **Admin**: Full access
- **Teacher**: Access only assigned class-subject via middleware validation

## Exam Types
- Daily Test
- PA1
- PA2
- FA1
- FA2

## Setup

### Backend
```bash
cd backend
cp .env.example .env
npm install
npm run seed
npm run dev
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Demo Credentials
- Admin: `admin@school.com` / `admin123`
- Teacher: `teacher@school.com` / `teacher123`

## Important Env
- `MONGODB_URI`
- `JWT_SECRET`
- `CLIENT_URL`
- SMTP vars for credential email:
  - `SMTP_HOST`
  - `SMTP_PORT`
  - `SMTP_USER`
  - `SMTP_PASS`
  - `MAIL_FROM`

If SMTP is not configured, teacher credentials are logged on backend console.

dnjn
