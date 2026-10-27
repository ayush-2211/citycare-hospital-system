# Database design

MySQL 8, database `citycare_hospital`, created by `database/schema.sql`.

| Table | Purpose | Key columns |
|---|---|---|
| `users` | one login table for patients, doctors and admin | `email` (unique), `password_hash`, `role` |
| `patients` | patient-only details | `user_id` (PK, FK), date of birth, gender, blood group, allergies, emergency contact |
| `doctors` | doctor-only details and working hours | `user_id` (PK, FK), specialization, fee, `available_from`, `available_to`, `slot_minutes`, `is_active` |
| `appointments` | a booking | `patient_id`, `doctor_id`, `appointment_date`, `start_time`, `status` (pending, confirmed, completed, cancelled) |
| `consultations` | the doctor's record for one appointment | `appointment_id` (unique), symptoms, diagnosis, notes, follow-up date |
| `prescriptions` | one prescription per appointment | `appointment_id` (unique), patient, doctor, notes |
| `prescription_items` | the medicines on a prescription | medicine, dosage, frequency, `duration_days`, instructions |
| `notifications` | in-app notifications | `user_id`, `type`, title, message, `is_read` |

## Relationships and rules
- `users` 1 to 1 `patients` or `doctors` (the role decides which); deleting a user removes that profile (`ON DELETE CASCADE`).
- A patient has many appointments; deleting a patient removes their appointments, consultations, prescriptions and notifications (cascade).
- A doctor with appointment history cannot be deleted (`ON DELETE RESTRICT`); the API deactivates the account instead.
- One consultation and one prescription per appointment (unique keys).
- Dates and times are stored as `DATE` and `TIME`; the connection uses `dateStrings: true` so they reach the app as plain strings and never shift with time zones.
- Passwords are stored only as bcrypt hashes.
