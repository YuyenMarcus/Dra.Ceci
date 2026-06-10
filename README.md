# Clinika

Operations platform for **dental and medical clinics in El Salvador** — fichas, odontogram, inventory, appointments, patient portal, and public booking.

Data is stored in **Supabase** (auth, multi-tenant clinics, row-level security). No demo passwords or browser-only storage.

## Setup

1. Copy `.env.example` to `.env` and set:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
2. In the [Supabase SQL Editor](https://supabase.com/dashboard), run migrations in order:
   - `supabase/migrations/0001_clinics_auth_tenancy.sql`
   - `supabase/migrations/0002_patient_portal.sql`
   - `supabase/migrations/0003_clinic_profile.sql`
   - `supabase/migrations/0004_treatments.sql`
3. Install and run:

```bash
npm install
npm run dev
```

Open http://localhost:5173

## Roles

- **Doctor** — sign up at `/signup`, manage clinic at `/app`
- **Patient** — optional account at `/me/signup`; or book/manage with phone only at `/c/:slug/book` and `/c/:slug/manage`
- **Public** — clinic profile at `/c/:slug`, directory at `/find`

## Features (in-app, no third-party services)

| Area | Description |
|------|-------------|
| Clinical log | Treatment timeline per patient (private vs patient-visible notes, procedures, follow-up) |
| Patient history | Logged-in portal (`/me`) and phone lookup on manage page |
| Odontogram | Adult + primary teeth; auto-mark from treatment log |
| Inventory | Stock tracking; optional deduction when logging materials on a procedure |
| Informed consent | Digital consent records; patients can view/print |
| Commission calculator | Settings → estimate doctor vs clinic split |
| CSV import | Import patient fichas from CSV on Clients page |
| Plans (UI) | Starter / Profesional / Hacienda flag in settings (billing not wired) |

## Requires external services (not built yet)

- **DTE / Hacienda** fiscal invoicing API
- **Wompi** card payments and payment links
- **SMS / WhatsApp OTP** for phone verification
- **Subscription billing** (14-day trial, annual plans)

## Scripts

- `npm run dev` — development server
- `npm run build` — production build
- `npm run preview` — preview production build
