# REST API reference

Base URL `http://localhost:5000/api`. Send `Authorization: Bearer <token>` on every route except register and login.
Bodies are JSON. Errors look like `{ "message": "..." }`; an invalid or expired token also returns `"code": "AUTH_REQUIRED"`.

## Authentication
| Method | Endpoint | Access | Notes |
|---|---|---|---|
| POST | `/auth/register` | public | `{ name, email, phone?, password }`, creates a patient. 409 if the email exists |
| POST | `/auth/login` | public | `{ email, password }` returns `{ token, user }`. 401 wrong credentials, 403 deactivated doctor |
| GET | `/auth/me` | any | restores a session |

## Doctors
| Method | Endpoint | Access | Notes |
|---|---|---|---|
| GET | `/doctors?specialization=&q=` | any | active doctors (`all=1` for the admin shows inactive ones too) |
| GET | `/doctors/specializations` | any | list for the filter chips |
| GET | `/doctors/:id` | any | one doctor |
| GET | `/doctors/:id/slots?date=YYYY-MM-DD` | any | every slot of the day with `available` true/false |
| POST | `/doctors` | admin | create a doctor account and profile |
| PUT | `/doctors/:id` | admin, or the doctor for own phone, qualification and working hours | update |
| DELETE | `/doctors/:id` | admin | deleted, or deactivated when the doctor has appointment records |

## Patients
| Method | Endpoint | Access | Notes |
|---|---|---|---|
| GET / PUT | `/patients/me` | patient | own profile |
| DELETE | `/patients/me` | patient | `{ password }` deletes the account and its data |
| GET | `/patients` | doctor (own patients), admin (all) | with visit counts |
| GET | `/patients/:id` | doctor (only patients with an appointment), admin | details and visit history |
| DELETE | `/patients/:id` | admin | |

## Appointments
| Method | Endpoint | Access | Notes |
|---|---|---|---|
| POST | `/appointments` | patient | `{ doctorId, date, time, reason }`; 409 if the slot is taken |
| GET | `/appointments?status=&from=&to=` | any | patient: own, doctor: own, admin: all |
| GET | `/appointments/:id` | owner or admin | details, patient profile (doctor/admin), consultation, prescription |
| PATCH | `/appointments/:id/status` | owner or admin | `{ status }`: patient cancels; doctor confirms, completes or declines; completing needs a consultation |
| PUT | `/appointments/:id/consultation` | doctor | `{ symptoms, diagnosis, notes, followUpDate }` create or update |
| PUT | `/appointments/:id/prescription` | doctor | `{ notes, items: [{ medicine, dosage, frequency, durationDays, instructions }] }` |

## Prescriptions, notifications, stats
| Method | Endpoint | Access | Notes |
|---|---|---|---|
| GET | `/prescriptions` | any | patient: own, doctor: issued, admin: all |
| GET | `/notifications` | any | own notifications, newest first |
| GET | `/notifications/unread-count` | any | `{ count }` for the bell badge |
| PATCH | `/notifications/:id/read` | any | |
| POST | `/notifications/read-all` | any | |
| GET | `/stats` | doctor, admin | dashboard numbers |
