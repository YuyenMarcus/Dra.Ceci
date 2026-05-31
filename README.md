# MedTrack

A clean, modern operations app for **dental and medical clinics**, with a **landing page**
and two distinct experiences:

- **Doctors** log in to manage their own patients, inventory and schedule.
- **Patients** don't need an account — they **book in public** by choosing a doctor and an
  open time, then leaving a **phone number** (email optional). They manage/cancel later
  using that same phone number.

> This is a front-end demo: all data (including the demo doctor "passwords") is stored
> locally in your browser (`localStorage`). It is not real authentication. Use the
> **Reset data** button in the doctor top bar to restore the demo records.

## Patient booking (no login)

- **`/book`** — pick a doctor → pick an open slot → enter name + **phone (required)**,
  email optional → confirm.
- **`/manage`** — enter the phone number used to book to view and cancel upcoming visits.

### Schedule protections
- Only genuinely free slots are bookable (conflict-checked against the doctor's calendar).
- A phone number is capped at **3 upcoming appointments** and can't double-book overlapping
  times.
- Cancelling requires the booking phone number, so others can't cancel your visit.
- Every booking auto-creates/links a patient **ficha** under the chosen doctor.

## Doctor accounts

Demo doctor passwords are `demo1234`.

| Role   | Email                 |
| ------ | --------------------- |
| Doctor | `patel@medtrack.dev`  |
| Doctor | `nguyen@medtrack.dev` |

The login screen also has one-tap **Quick demo login** buttons.

## Features

### Doctor app (`/app`)
- **Dashboard** — at-a-glance stats, upcoming appointments, and restock alerts (scoped
  to the signed-in doctor).
- **Inventory logging** — add/edit/delete supplies, quick +/- quantity adjustments,
  per-item reorder levels with automatic **low / out of stock** badges, search and
  category filters.
- **Clients** — patient cards with contact details and full clinical **fichas**;
  online bookings automatically appear here, tagged and matched by phone.
- **Appointments** — schedule visits for your patients (conflict-checked), see online
  bookings (with booker name + phone), mark as completed, **cancel**, restore cancelled
  visits, and browse Upcoming / Past / Cancelled.

### Public patient pages
- **Book** (`/book`) into real open time slots, generated from the doctor's working hours
  and slot length, with already-booked times removed — so bookings never collide.
- **Manage** (`/manage`) — look up and **cancel** your visits with your phone number,
  which frees the slot for others.

### Landing & auth
- Marketing **landing page** at `/` with public booking and a doctor entry point.
- Doctor **login** (`/login`) with route guards; patients book without an account.

## Tech stack

- [React 19](https://react.dev/) + [Vite](https://vite.dev/)
- [React Router](https://reactrouter.com/)
- [Tailwind CSS v4](https://tailwindcss.com/)
- [lucide-react](https://lucide.dev/) icons

## Getting started

```bash
npm install
npm run dev
```

Then open the URL Vite prints (usually <http://localhost:5173>).

### Build for production

```bash
npm run build
npm run preview
```

## Project structure

```
src/
  components/      Layout (sidebar/topbar), Modal, Confirm, Empty
  pages/           Dashboard, Inventory, Clients, Appointments
  store/           StoreContext (localStorage state) + seed data
  lib/             date/formatting helpers
  index.css        Tailwind theme + reusable component classes
```
