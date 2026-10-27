-- CityCare Hospital Portal  |  MySQL 8.x
-- Run in MySQL Workbench (File > Open SQL Script > run all) or:  mysql -u root -p < database/schema.sql

CREATE DATABASE IF NOT EXISTS citycare_hospital
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE citycare_hospital;

DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS prescription_items;
DROP TABLE IF EXISTS prescriptions;
DROP TABLE IF EXISTS consultations;
DROP TABLE IF EXISTS appointments;
DROP TABLE IF EXISTS doctors;
DROP TABLE IF EXISTS patients;
DROP TABLE IF EXISTS users;

-- One login table for patients, doctors and the admin office; `role` decides what each can do.
CREATE TABLE users (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(100) NOT NULL,
  email         VARCHAR(120) NOT NULL UNIQUE,
  phone         VARCHAR(20)  NULL,
  password_hash VARCHAR(100) NOT NULL,                 -- bcrypt hash, never the plain password
  role          ENUM('patient','doctor','admin') NOT NULL DEFAULT 'patient',
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Extra details that only patients have
CREATE TABLE patients (
  user_id           INT UNSIGNED PRIMARY KEY,
  date_of_birth     DATE NULL,
  gender            ENUM('male','female','other') NULL,
  blood_group       VARCHAR(5) NULL,
  address           VARCHAR(255) NULL,
  emergency_contact VARCHAR(60) NULL,
  allergies         VARCHAR(255) NULL,
  CONSTRAINT fk_patient_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Extra details that only doctors have (working hours decide which slots patients can book)
CREATE TABLE doctors (
  user_id          INT UNSIGNED PRIMARY KEY,
  specialization   VARCHAR(60) NOT NULL,
  qualification    VARCHAR(120) NULL,
  experience_years TINYINT UNSIGNED NOT NULL DEFAULT 0,
  consultation_fee DECIMAL(8,2) NOT NULL DEFAULT 0,
  available_from   TIME NOT NULL DEFAULT '09:00:00',
  available_to     TIME NOT NULL DEFAULT '17:00:00',
  slot_minutes     TINYINT UNSIGNED NOT NULL DEFAULT 30,
  is_active        TINYINT(1) NOT NULL DEFAULT 1,
  CONSTRAINT fk_doctor_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE appointments (
  id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  patient_id       INT UNSIGNED NOT NULL,
  doctor_id        INT UNSIGNED NOT NULL,
  appointment_date DATE NOT NULL,
  start_time       TIME NOT NULL,
  reason           VARCHAR(255) NOT NULL,
  status           ENUM('pending','confirmed','completed','cancelled') NOT NULL DEFAULT 'pending',
  cancelled_by     ENUM('patient','doctor','admin') NULL,
  created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_appt_doctor_day (doctor_id, appointment_date),
  KEY idx_appt_patient (patient_id),
  CONSTRAINT fk_appt_patient FOREIGN KEY (patient_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_appt_doctor  FOREIGN KEY (doctor_id)  REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- The doctor's consultation record for one appointment
CREATE TABLE consultations (
  id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  appointment_id INT UNSIGNED NOT NULL UNIQUE,
  symptoms       TEXT NULL,
  diagnosis      VARCHAR(255) NOT NULL,
  notes          TEXT NULL,
  follow_up_date DATE NULL,
  created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_cons_appt FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- A prescription (one per appointment) and the medicines on it
CREATE TABLE prescriptions (
  id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  appointment_id INT UNSIGNED NOT NULL UNIQUE,
  patient_id     INT UNSIGNED NOT NULL,
  doctor_id      INT UNSIGNED NOT NULL,
  notes          VARCHAR(255) NULL,
  created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_rx_patient (patient_id),
  CONSTRAINT fk_rx_appt    FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE,
  CONSTRAINT fk_rx_patient FOREIGN KEY (patient_id)     REFERENCES users(id)        ON DELETE CASCADE,
  CONSTRAINT fk_rx_doctor  FOREIGN KEY (doctor_id)      REFERENCES users(id)        ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE prescription_items (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  prescription_id INT UNSIGNED NOT NULL,
  medicine        VARCHAR(100) NOT NULL,
  dosage          VARCHAR(50)  NOT NULL,
  frequency       VARCHAR(50)  NOT NULL,
  duration_days   SMALLINT UNSIGNED NOT NULL,
  instructions    VARCHAR(150) NULL,
  CONSTRAINT fk_item_rx FOREIGN KEY (prescription_id) REFERENCES prescriptions(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- In-app notifications (appointment updates, new prescriptions)
CREATE TABLE notifications (
  id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id        INT UNSIGNED NOT NULL,
  type           ENUM('appointment','prescription','consultation','system') NOT NULL DEFAULT 'system',
  title          VARCHAR(120) NOT NULL,
  message        VARCHAR(255) NOT NULL,
  appointment_id INT UNSIGNED NULL,
  is_read        TINYINT(1) NOT NULL DEFAULT 0,
  created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_notif_user (user_id, is_read),
  CONSTRAINT fk_notif_user FOREIGN KEY (user_id)        REFERENCES users(id)        ON DELETE CASCADE,
  CONSTRAINT fk_notif_appt FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE SET NULL
) ENGINE=InnoDB;
