# Cakree

Cakree is a Bangladesh-focused job portal built with Next.js, TypeScript, Prisma, and PostgreSQL. Job seekers can create profiles, upload a CV, save roles, and apply. Employers can create a company profile, publish or close openings, review applications, schedule interviews, and update candidate statuses.

## Run locally

Use Node.js 22.13 or later and create a PostgreSQL database (for example, the Prisma Postgres store connected to the Vercel project). Add its connection URL to `.env`, then install dependencies and initialize the database:

```bash
npm install
Copy-Item .env.example .env
npm run db:migrate
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

`DATABASE_URL` is used by the application and Prisma Migrate.

On macOS or Linux, copy `.env.example` to `.env` with `cp .env.example .env`.

## Demo employer

The seed command adds a local employer account so you can try the posting dashboard:

- Email: `demo-employer@cakree.local`
- Password: `CakreeDemo2026!`

Use a separate job-seeker account to try candidate profiles, saved jobs, CV uploads, and applications. The preloaded jobs are sample listings for preview purposes, not confirmed live vacancies.

## Features

- Account registration and sign-in for job seekers and employers
- Database-backed sessions using secure, HTTP-only cookies
- Candidate profile, skills, preferred location, and private CV upload (PDF/DOCX, maximum 5 MB; local files in development, private Vercel Blob in deployments)
- Persistent saved jobs and job applications with optional cover letters
- Employer company profile, job posting, job status management, and application review
- Public company pages with active openings
- Candidate directory search for job seekers who explicitly opt in; email and CV remain private
- Interview scheduling with in-app candidate and employer notifications
- Saved job alerts with matching jobs shown in the candidate dashboard
- Employer job-posting packages with active-job limits and featured listing placement on Growth
- Candidate resume builder with printable / Save as PDF output
- Verified company reviews, published after admin moderation
- Employer company-registration submissions with admin-reviewed verification badges
- Email updates for opted-in application/interview events and scheduled job-alert digests
- Protected admin dashboard for reviewing content and suspending accounts or listings
- bKash Tokenized Checkout for employer package purchases (requires merchant credentials)
- Authorized employer access to a candidate CV only for that employer's application
- Search by keyword, location, category, job type, work arrangement, monthly BDT salary range, posting date, and salary-based sorting
- Homepage discovery by job category and Bangladesh location
- Employer hiring pipeline with application-stage metrics and contextual next actions
- Dedicated job detail pages and paginated results

## Scripts

- `npm run dev` — start the development server
- `npm run lint` — run ESLint
- `npm run build` — generate Prisma Client, deploy committed migrations on Vercel Production, and create a production build
- `npm run db:migrate` — create/apply a PostgreSQL development migration
- `npm run db:deploy` — apply committed migrations to a production database
- `npm run db:seed` — add sample jobs and the local demo employer
- `npm run db:seed-demo` — add or refresh clearly labeled fictional preview listings across varied roles and employment types in the configured database; requires `CAKREE_DEMO_SEED_CONFIRMATION=YES_ADD_DEMO_CONTENT_TO_THIS_DATABASE`
- `npm run db:create-admin` — create or reset a protected administrator account using environment variables
- `npm run db:promote-admin -- cakreebd@gmail.com` — grant admin access to that existing account without changing its password

The application now uses PostgreSQL. Existing local SQLite data is not migrated automatically; the SQLite database file is left untouched, but it cannot be used by this PostgreSQL configuration. CV files use the local filesystem in development unless `BLOB_READ_WRITE_TOKEN` or `BLOB_STORE_ID` is configured. Production uses private Vercel Blob storage and requires a private Blob store connected to the Vercel project. Local database files and uploaded files are excluded from source control.

## Deploy to Vercel

1. Connect a PostgreSQL database to the Vercel project and create a **private** Vercel Blob store.
2. Import this GitHub repository into Vercel.
3. Confirm the database integration provides `DATABASE_URL` for Production. Configure `SITE_URL` and the existing integration environment variables in Vercel. Keep all secrets server-side.
4. Connect the private Blob store to the Vercel project and enable it for Production, Preview, and Development as needed. Vercel supplies Blob access to connected deployments; local runs may use `BLOB_READ_WRITE_TOKEN`.
5. Deploy the app. On Vercel Production builds, the build command automatically applies pending migrations with `prisma migrate deploy` before building the app. Preview builds do not run production migrations. Do not run `db:seed` in production. The separately gated `db:seed-demo` command creates fictional employers and sample jobs in the database selected by `DATABASE_URL`; demo jobs are marked and cannot accept applications.

Preview deployments should use a separate PostgreSQL database/branch from production. The first PostgreSQL migration is a fresh baseline; it does not import data from the previous local SQLite database.

Employer package prices are shown in Bangladeshi taka. Paid package entitlements are granted only after bKash payment verification; checkout requires merchant credentials and a public HTTPS callback URL.

### Email delivery

Set `RESEND_API_KEY`, a verified `EMAIL_FROM`, and `SITE_URL` to enable email. Users must opt in under their dashboard profile. Interview/application emails are sent when those events occur. Configure a scheduled job (for example every 15 minutes) to `POST /api/cron/job-alerts` with a Bearer token containing the server-side `CRON_SECRET`. Keep the secret in your scheduler, never in browser code.

### bKash package checkout

Use credentials issued to your merchant account. Configure `BKASH_API_BASE_URL` to the official sandbox endpoint for testing, plus `BKASH_USERNAME`, `BKASH_PASSWORD`, `BKASH_APP_KEY`, and `BKASH_APP_SECRET`. Generate a separate random 32-byte key for `BKASH_TOKEN_ENCRYPTION_KEY` (base64-encoded), for example with `node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"`; it encrypts the cached bKash access and refresh tokens in the database. Set `SITE_URL` to a public HTTPS deployment address so bKash can reach the callback. Do not expose credentials or encryption keys in frontend code or commit them. Checkout stays disabled if configuration is incomplete. Confirm production endpoints, merchant terms, package pricing, and sandbox tests with bKash before going live.

### Administrator setup

Set `CAKREE_ADMIN_EMAIL`, `CAKREE_ADMIN_NAME`, and `CAKREE_ADMIN_PASSWORD` (at least 16 characters) in the server environment, then run `npm run db:create-admin` once to create or reset an administrator account. To promote an existing account while preserving its password, confirm `.env` points to the intended production database, set `CONFIRM_PRODUCTION_ADMIN_PROMOTION=YES`, then run `npm run db:promote-admin -- email@example.com`. This command changes only that existing account's role, and refuses missing or inactive accounts. Admin registration is not available through the public signup form.

Company reviews may only be submitted by candidates whose application was marked hired, and remain private until approved by an administrator. Email delivery and bKash integration require production credentials and are not verified by local builds.

Employers can request company verification from their dashboard by submitting their legal company name and registration details. Administrators review these details before a badge appears on public company pages and matching job listings. Registration numbers are not shown publicly.
