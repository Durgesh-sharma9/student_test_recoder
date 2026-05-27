# School Daily Test Ranking System

A full-stack MERN application for managing daily test marks, automatic ranking, and parent progress tracking.

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| Frontend | React, Vite, Tailwind CSS, shadcn/ui, Recharts |
| Backend | Node.js, Express.js, MongoDB, JWT |
| Excel | ExcelJS (template/export), xlsx (upload parse), Multer |

## Features

- **Admin**: Manage teachers, parents, students, and classes
- **Teacher**: Download Excel template, fill **Marks Obt.** only, upload — system auto-calculates Total, Average, Percentage, and Rank (by highest total marks)
- **Parent**: View child's marks, percentage, rank, and progress charts
- JWT authentication with role-based protected routes
- Responsive dashboards and REST APIs

## Project Structure

```
daily-test/
├── backend/
│   └── src/
│       ├── config/       # Database connection
│       ├── controllers/  # Route handlers
│       ├── middleware/   # Auth, upload, errors
│       ├── models/       # Mongoose schemas
│       ├── routes/       # API routes
│       ├── services/     # Excel generation/parsing
│       └── utils/        # Helpers, rank calculation
└── frontend/
    └── src/
        ├── components/   # UI (shadcn-style), layout, charts
        ├── context/      # Auth state
        ├── lib/          # API client, utils
        └── pages/        # Admin, Teacher, Parent views
```

## Prerequisites

- Node.js 18+
- MongoDB running locally or a MongoDB Atlas URI

## Setup

### 1. Backend

```bash
cd backend
cp .env.example .env   # or use the included .env
npm install
npm run seed           # creates demo users & sample class
npm run dev
```

API runs at `http://localhost:5000`

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

App runs at `http://localhost:5173` (proxies `/api` to backend)

## Demo Login Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@school.com | admin123 |
| Teacher | teacher@school.com | teacher123 |
| Parent | parent@school.com | parent123 |

## Excel Workflow (Teacher)

1. Select class, test name, and date → **Download Template**
2. Fill only the **Marks Obt.** columns (do not modify max marks or student IDs)
3. **Upload** the file — backend computes Total, Average, Percentage, and Rank automatically

Rank is assigned by **highest total marks** (ties share the same rank).

## API Endpoints

| Method | Endpoint | Access |
|--------|----------|--------|
| POST | `/api/auth/login` | Public |
| GET | `/api/auth/me` | Authenticated |
| CRUD | `/api/users` | Admin |
| CRUD | `/api/classes` | Admin (write), All (read) |
| CRUD | `/api/students` | Admin (write), All (read) |
| GET | `/api/tests/template` | Teacher, Admin |
| POST | `/api/tests/upload` | Teacher, Admin |
| GET | `/api/tests` | All roles (filtered) |
| GET | `/api/tests/progress/:studentId` | Parent, Admin |
| GET | `/api/tests/export` | Teacher, Admin |
| GET | `/api/tests/dashboard` | All roles |

## Production Build

```bash
# Frontend
cd frontend && npm run build

# Backend
cd backend && npm start
```

Set `CLIENT_URL` and `VITE_API_URL` to your production domains.

## License

MIT
