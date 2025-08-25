# IntelliScanAI

🛡️ AI-powered security vulnerability scanner that analyzes your code repositories and uploaded projects to detect security flaws, generate intelligent fix suggestions, and provide comprehensive security reports.

---

## Features

- Upload your project or paste a repo URL for instant vulnerability analysis
- Machine learning-powered security scanning
- Automated fix suggestions
- Comprehensive security reports
- User authentication and email verification
- Responsive email templates

---

## Getting Started

### 1. Clone & Install

```sh
git clone https://github.com/your-org/IntelliScanAI.git
cd IntelliScanAI
npm install
```

### 2. Environment Setup

Edit `.env` for database and mail credentials:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/IntelliScanAI
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_password
JWT_SECRET=your_jwt_secret
FRONTEND_URL=http://localhost:3000
```

### 3. Prisma Setup

```sh
npx prisma generate
npx prisma migrate dev --name init
```

### 4. Run the App

```sh
npm run start:dev
```

---

## Authentication & Email Verification

- **Register:** User receives a verification link via email.
- **Verify:** Clicking the link verifies the user instantly using JWT.
<!-- - **Login:** Only verified users can log in and receive a JWT token. -->

---

## Project Structure

```
src/
  ├── auth/
  ├── user/         # User management
  ├── common/       # Shared services (mail, templates, etc.)
  ├── database/     # Prisma database service
  ├── prisma/       # Prisma schema and migrations
```

---

## Email Templates

- Stylish, responsive, and customizable for all notifications.
- Located in `src/common/mail/mail-template.service.ts`.

---

## API Endpoints

- `POST /auth/register` — Register a new user
- `GET /user/verify-email?token=...` — Verify user email
<!-- - `POST /auth/login` — Login and receive JWT -->

---
---
## Screenshots
---

## License

MIT