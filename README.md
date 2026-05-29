# Health Assistant Web

Web app quan ly suc khoe ca nhan voi dang ky/dang nhap email, calories, calendar, task/water reminder, va pet chatbot.

## Stack
- Next.js (App Router)
- PostgreSQL + Prisma
- NextAuth (email + mật khẩu, bcrypt)
- Rule-based chatbot intent parser (co san de nang cap LLM sau)

## Setup
1. Copy env:
```bash
cp .env.example .env
```
2. Dien bien moi truong trong `.env`:
   - `DATABASE_URL`
   - `NEXTAUTH_SECRET`
   - `NEXTAUTH_URL`
3. Chay migration va generate client:
```bash
npm run prisma:migrate -- --name init
npm run prisma:generate
```
4. Chay app:
```bash
npm run dev
```

## Main Routes
- `/login`
- `/register`
- `/dashboard`
- `/nutrition`
- `/calendar`
- `/water`
- `/tasks`

## APIs
- `/api/profile`
- `/api/meals`
- `/api/calendar`
- `/api/tasks`
- `/api/water`
- `/api/chat`

## Tests
```bash
npm run test
```
