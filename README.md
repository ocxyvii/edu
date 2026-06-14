# EduCore - School Management System

A comprehensive multi-tenant School Management System built with Next.js 14, Supabase, and modern web technologies.

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Database & Auth**: Supabase (PostgreSQL, Auth, Storage, Realtime)
- **Styling**: Tailwind CSS + shadcn/ui
- **State Management**: Zustand
- **Server State**: TanStack Query (React Query v5)
- **Forms**: React Hook Form + Zod
- **Icons**: Lucide React

## Features

### Multi-Tenant Architecture
- Super Admin dashboard for platform management
- School Admin dashboard for school-specific management
- Teacher portal for class management and grading
- Student portal for academic tracking
- Parent portal for monitoring child's progress

### Core Modules
- **User Management**: Role-based access control
- **Academic Management**: Classes, subjects, timetable
- **Student Management**: Enrollment, attendance, grades
- **Teacher Management**: Staff management, assignments
- **Fee Management**: Payment tracking and reporting
- **Exam Management**: Exam scheduling and result processing
- **Attendance Tracking**: Daily attendance with reports
- **Announcements**: School-wide and targeted notifications
- **Events Management**: Calendar and event scheduling
- **Library Management**: Book catalog and issue tracking
- **Transport Management**: Route and vehicle management

## Getting Started

### Prerequisites

- Node.js 18+ installed
- Supabase account and project

### Installation

1. Clone the repository
2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.local.example .env.local
```

4. Configure your Supabase credentials in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

5. Run the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser

## Project Structure

```
/app
  /(auth)/
    login/page.tsx
    register/page.tsx
  /(super-admin)/
    layout.tsx
    page.tsx
  /(school-admin)/
    layout.tsx
    page.tsx
  /(teacher)/
    layout.tsx
    page.tsx
  /(student)/
    layout.tsx
    page.tsx
  /(parent)/
    layout.tsx
    page.tsx
  /api/auth/callback/route.ts
  layout.tsx
  page.tsx
  globals.css

/components
  /ui/ (shadcn/ui components)
  /shared/
    sidebar.tsx

/lib
  /supabase/
    client.ts
    server.ts
    middleware.ts
  /stores/
    auth-store.ts
    school-store.ts
    ui-store.ts
    notification-store.ts
  utils.ts

/types
  database.types.ts
  index.ts

middleware.ts
```

## Database Schema

The database schema includes tables for:
- Users and user profiles
- Schools and school settings
- Academic years and terms
- Classes and sections
- Students, teachers, and guardians
- Subjects and class-subject assignments
- Attendance records
- Exams and exam results
- Fees and fee payments
- Announcements and events
- Assignments and submissions
- Library books and issues
- Transport routes and stops

Run the Supabase migrations to set up the database:
```bash
supabase db push
```

## User Roles

### Super Admin
- Manage all schools on the platform
- View platform-wide analytics
- Manage system settings

### School Admin
- Manage school-specific settings
- Manage students, teachers, and classes
- Track fees and payments
- Create announcements and events

### Teacher
- Manage assigned classes
- Take attendance
- Create and grade assignments
- Schedule and conduct exams

### Student
- View class schedule and timetable
- Submit assignments
- View grades and attendance
- Access learning materials

### Parent
- Monitor child's academic progress
- View attendance and grades
- Track fee payments
- View school announcements

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking

### Adding New Components

To add new shadcn/ui components:
```bash
npx shadcn-ui@latest add [component-name]
```

### Database Types

To regenerate TypeScript types from Supabase:
```bash
supabase gen types typescript --local > types/database.types.ts
```

## Deployment

### Vercel

1. Push your code to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

### Environment Variables

Make sure to add these in your deployment platform:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_APP_URL`

## License

This project is licensed under the MIT License.
