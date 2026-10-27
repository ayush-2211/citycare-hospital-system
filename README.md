# CityCare Hospital Portal

A hospital web and mobile application. Patients register, book appointments, view prescriptions and receive appointment notifications. Doctors view patient details and update consultation records. The admin office manages doctors and patients.

Built for **MMCA314D, Web Development Using Full Stack Open** (AAT-II, Question 1), Department of MCA, Dayananda Sagar College of Engineering.

| Part     | Technology                                                  |
|----------|-------------------------------------------------------------|
| Web app  | React 19 (Vite), hooks, Context API, custom hash router     |
| Mobile   | React Native (Expo), patient app, runs on the Android emulator |
| API      | Node.js, Express 4, JWT, bcrypt                              |
| Database | MySQL 8                                                      |

## Features

**Patients (web and mobile)**
- Register and log in (passwords stored as bcrypt hashes, JWT session)
- Book an appointment in four steps: doctor, day, free time slot, reason
- View, filter and cancel appointments
- View prescriptions and the doctor's consultation notes
- In-app notifications with an unread badge: request sent, confirmed, cancelled, consultation completed, new prescription
- Update the profile (CRUD) or delete the account (needs the password)

**Doctors (web)**
- Dashboard with today's schedule and pending requests
- Confirm, decline or complete appointments
- View patient details (age, blood group, allergies, emergency contact) and visit history
- Update the consultation record (symptoms, diagnosis, notes, follow-up date) and write or edit the prescription
- Edit working hours, which decide the slots patients can book

**Admin (web)**
- Hospital overview and every appointment
- Doctors: create, read, update, delete (a doctor with appointment history is deactivated instead, so records stay intact)
- Patients: list and delete

**Rules enforced by the API**
- A slot cannot be double-booked; no past dates, no Sundays, only inside the doctor's working hours
- Only the doctor of an appointment can write its consultation record and prescription, and only after confirming it
- An appointment cannot be completed before a diagnosis is recorded
- A doctor can open only the patients who have an appointment with them
- Every route checks the role (`patient`, `doctor`, `admin`)

## Project structure

```
hospital-system/
├── client/    React web app (Vite)
│   └── src/   components/, pages/, AuthContext.jsx, api.js, router.js, hooks.js
├── mobile/    React Native patient app (Expo)
│   └── src/   screens/, components/, api.js, AuthContext.js, Main.js
├── server/    Express REST API
│   ├── src/   routes/, middleware/, utils/, db.js, seed.js
│   └── tests/ apitest.js (51 API checks)
├── database/  schema.sql
└── docs/      API.md, DATABASE.md, MOBILE.md, SCREENSHOTS.md
```

## Getting started

**Prerequisites:** Node.js 20.19+ (or 22+), MySQL 8, Git. For the mobile app also Android Studio with a virtual device (see `docs/MOBILE.md`).

```powershell
# 1. Database: open database\schema.sql in MySQL Workbench and run it (lightning bolt).

# 2. API (terminal 1)
cd server
copy .env.example .env        # then set DB_PASSWORD and a long JWT_SECRET inside .env
npm install
npm run seed                  # sample doctors, patients, appointments, prescriptions
npm run dev                   # http://localhost:5000

# 3. Web app (terminal 2)
cd client
npm install
npm run dev                   # http://localhost:5173

# 4. Mobile app (terminal 3): follow docs/MOBILE.md
```

### Demo accounts (created by `npm run seed`)

| Role    | Email                         | Password     |
|---------|-------------------------------|--------------|
| Patient | ayush@citycare.in             | Patient@123  |
| Doctor  | dr.meera.iyer@citycare.in     | Doctor@123   |
| Admin   | admin@citycare.in             | Admin@123    |

Other doctors: `dr.rahul.menon`, `dr.kavya.shetty`, `dr.imran.khan`, `dr.suresh.nair` (all `@citycare.in`, password `Doctor@123`).

### Run the API checks (optional)
With the API running on freshly seeded data, run `npm run seed` then `npm run test:api` inside `server/`. It prints the HTTP status for 51 checks (wrong passwords, double booking, role restrictions, doctor CRUD and more).

## API

See [docs/API.md](docs/API.md). Database design: [docs/DATABASE.md](docs/DATABASE.md).
