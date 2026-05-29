# SaaS Multi-Tenant Migration Plan

## Current State (Analyzed)

### Backend (reusable)
| Area | Files | Reuse |
|------|-------|-------|
| Auth/JWT | `authController`, `middleware/auth.js` | Extend login + add school signup |
| Users/Teachers | `userController`, `User` model | Add `schoolId`, rename `admin` → `school_admin` |
| Classes | `classController`, `Class` model | Add `schoolId`, remove `academicYear` |
| Students | `studentController`, `Student` model | Add `schoolId` |
| Results | `resultController`, `ResultSession`, `MarkEntry` | Replace month/year with `testDate` + `category` |
| Ranking | `computeCompetitionRanks` in resultController | Keep |
| Email | `sendTeacherMail.js` | Keep |
| Excel export | `excelService` / download in results | Extend for CSV/PDF |
| Activity | `Activity` model | Add `schoolId` |

### Frontend (reusable)
| Area | Reuse |
|------|-------|
| shadcn UI components | All `components/ui/*` |
| `DashboardLayout`, `ProtectedRoute`, `AuthContext`, `api.js` | Extend roles |
| `ManageUsers`, `ManageStudents`, `TeacherAssignments` | School-scoped |
| `MarksEntry` | Split Daily vs Main Exam |
| `TeacherResults`, `ResultManagement` | New filters/sorts/exports |
| `AdminDashboard`, charts | Extend stats |

### Remove
- `academicYear` on Class
- `month` / `year` on ResultSession
- Global single-tenant assumptions

### Add
- `School`, `Plan` models
- `schoolId` on all tenant collections
- Super Admin module
- Landing + School Signup pages
- Tenant middleware + plan expiry checks

## Implementation Phases

1. **Foundation** – Models, tenant middleware, auth signup, migration script
2. **APIs** – Scope controllers, result session refactor, super admin APIs
3. **Exports** – CSV/PDF service
4. **Frontend** – Landing, signup, role routes, class suggestions, marks split
5. **Results UI** – Daily date/range, main exam, overall combined

## Role Mapping

| Old | New |
|-----|-----|
| `admin` | `school_admin` |
| — | `super_admin` |
| `teacher` | `teacher` |

Legacy JWT users with `admin` treated as `school_admin` in middleware.

## Status (Completed)

- Backend: multi-tenant models, auth, super-admin APIs, tenant middleware, results (daily date, main exam, overall), CSV/PDF exports
- Frontend: Landing, Signup, Super Admin (dashboard, schools, plans, school details), School Admin CRUD, Teacher daily/main exam entry, results with filters/sorts/exports
- Removed: academic year, month/year on sessions

## First-time setup

```bash
cd backend
npm install
npm run migrate   # existing DB only
npm run seed      # demo data
npm run dev
```

Demo logins: `super@school.com` / `super123`, `admin@school.com` / `admin123`, `teacher@school.com` / `teacher123`
