# Cakree

Cakree is a Bangladesh-focused job portal MVP built with Next.js, TypeScript, Prisma, and SQLite. Job seekers can create profiles, upload a CV, save roles, and apply. Employers can create a company profile, publish or close openings, review applications, schedule interviews, and update candidate statuses.

## Run locally

Use Node.js 22.13 or later, then install dependencies and create the local database:

```bash
npm install
Copy-Item .env.example .env
npm run db:migrate
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

On macOS or Linux, copy `.env.example` to `.env` with `cp .env.example .env`.

## Demo employer

The seed command adds a local employer account so you can try the posting dashboard:

- Email: `demo-employer@cakree.local`
- Password: `CakreeDemo2026!`

Use a separate job-seeker account to try candidate profiles, saved jobs, CV uploads, and applications. The preloaded jobs are sample listings for preview purposes, not confirmed live vacancies.

## Features

- Account registration and sign-in for job seekers and employers
- Database-backed sessions using secure, HTTP-only cookies
- Candidate profile, skills, preferred location, and CV upload (PDF/DOCX, maximum 5 MB)
- Persistent saved jobs and job applications with optional cover letters
- Employer company profile, job posting, job status management, and application review
- Public company pages with active openings
- Candidate directory search for job seekers who explicitly opt in; email and CV remain private
- Interview scheduling with in-app candidate and employer notifications
- Saved job alerts with matching jobs shown in the candidate dashboard
- Employer job-posting packages with active-job limits
- Candidate resume builder with printable / Save as PDF output
- Verified company reviews, published after admin moderation
- Email updates for opted-in application/interview events and scheduled job-alert digests
- Protected admin dashboard for reviewing content and suspending accounts or listings
- bKash Tokenized Checkout for employer package purchases (requires merchant credentials)
- Authorized employer access to a candidate CV only for that employer's application
- Search by keyword, location, category, job type, work arrangement, and minimum monthly BDT salary
- Dedicated job detail pages and paginated results

## Scripts

- `npm run dev` — start the development server
- `npm run lint` — run ESLint
- `npm run build` — create a production build
- `npm run db:migrate` — apply or create a Prisma migration
- `npm run db:seed` — add sample jobs and the local demo employer
- `npm run db:create-admin` — create or reset a protected administrator account using environment variables

SQLite data is stored in `prisma/dev.db`, and uploaded CVs are stored privately in `storage/cvs/`. Both paths are excluded from source control. For production, configure a managed database and private object storage; the local filesystem is intended for development and single-instance deployment only. Replace the demo data and credentials before deploying.

Employer package prices are shown in Bangladeshi taka. Paid package entitlements are granted only after bKash payment verification; checkout requires merchant credentials and a public HTTPS callback URL.

### Email delivery

Set `RESEND_API_KEY`, a verified `EMAIL_FROM`, and `SITE_URL` to enable email. Users must opt in under their dashboard profile. Interview/application emails are sent when those events occur. Configure a scheduled job (for example every 15 minutes) to `POST /api/cron/job-alerts` with a Bearer token containing the server-side `CRON_SECRET`. Keep the secret in your scheduler, never in browser code.

### bKash package checkout

Use credentials issued to your merchant account. Configure `BKASH_API_BASE_URL` to the official sandbox endpoint for testing, plus `BKASH_USERNAME`, `BKASH_PASSWORD`, `BKASH_APP_KEY`, and `BKASH_APP_SECRET`. Generate a separate random 32-byte key for `BKASH_TOKEN_ENCRYPTION_KEY` (base64-encoded), for example with `node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"`; it encrypts the cached bKash access and refresh tokens in the database. Set `SITE_URL` to a public HTTPS deployment address so bKash can reach the callback. Do not expose credentials or encryption keys in frontend code or commit them. Checkout stays disabled if configuration is incomplete. Confirm production endpoints, merchant terms, package pricing, and sandbox tests with bKash before going live.

### Administrator setup

Set `CAKREE_ADMIN_EMAIL`, `CAKREE_ADMIN_NAME`, and `CAKREE_ADMIN_PASSWORD` (at least 16 characters) in the server environment, then run `npm run db:create-admin` once. This creates or resets only an existing administrator; it refuses to promote an ordinary account. Admin registration is not available through the public signup form.

Company reviews may only be submitted by candidates whose application was marked hired, and remain private until approved by an administrator. Email delivery and bKash integration require production credentials and are not verified by local builds.
