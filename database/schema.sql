
CREATE DATABASE IF NOT EXISTS `lifeblood_db` 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE `lifeblood_db`;

DROP TABLE IF EXISTS `donation_appointments`;
DROP TABLE IF EXISTS `blood_requests`;
DROP TABLE IF EXISTS `blood_inventory`;
DROP TABLE IF EXISTS `donors`;
DROP TABLE IF EXISTS `blood_banks`;
DROP TABLE IF EXISTS `audit_logs`;
DROP TABLE IF EXISTS `users`;

-- 1. USERS & AUTHENTICATION TABLE
CREATE TABLE `users` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(100) NOT NULL,
    `email` VARCHAR(120) NOT NULL UNIQUE,
    `password_hash` VARCHAR(255) NOT NULL,
    `role` ENUM('admin', 'donor', 'hospital', 'blood_bank') NOT NULL DEFAULT 'donor',
    `phone` VARCHAR(25),
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 2. BLOOD BANKS DIRECTORY
CREATE TABLE `blood_banks` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(150) NOT NULL,
    `license_no` VARCHAR(80),
    `city` VARCHAR(100) NOT NULL,
    `address` TEXT NOT NULL,
    `phone` VARCHAR(30) NOT NULL,
    `email` VARCHAR(120),
    `operating_hours` VARCHAR(100) DEFAULT '24/7 Emergency Service',
    `lat` DECIMAL(10, 7) DEFAULT 13.0827,
    `lng` DECIMAL(10, 7) DEFAULT 80.2707,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 3. DONORS DIRECTORY
CREATE TABLE `donors` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NULL,
    `name` VARCHAR(100) NOT NULL,
    `email` VARCHAR(120) NOT NULL,
    `phone` VARCHAR(25) NOT NULL,
    `blood_group` ENUM('A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-') NOT NULL,
    `age` INT NOT NULL,
    `gender` ENUM('Male', 'Female', 'Other') NOT NULL,
    `city` VARCHAR(100) NOT NULL,
    `address` VARCHAR(255),
    `last_donation_date` DATE NULL,
    `total_donations` INT DEFAULT 1,
    `is_available` BOOLEAN DEFAULT TRUE,
    `medical_notes` TEXT,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_blood_group` (`blood_group`),
    INDEX `idx_city` (`city`),
    INDEX `idx_available` (`is_available`),
    CONSTRAINT `fk_donors_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB;

-- 4. LIVE BLOOD INVENTORY
CREATE TABLE `blood_inventory` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `blood_group` ENUM('A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-') NOT NULL UNIQUE,
    `units_available` INT NOT NULL DEFAULT 0,
    `critical_threshold` INT NOT NULL DEFAULT 15,
    `status` ENUM('Critical', 'Moderate', 'Adequate', 'Surplus') DEFAULT 'Adequate',
    `last_updated` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 5. BLOOD REQUESTS & EMERGENCY SOS
CREATE TABLE `blood_requests` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `request_code` VARCHAR(30) NOT NULL UNIQUE,
    `patient_name` VARCHAR(100) NOT NULL,
    `hospital_name` VARCHAR(150) NOT NULL,
    `contact_person` VARCHAR(100) NOT NULL,
    `contact_phone` VARCHAR(30) NOT NULL,
    `blood_group` ENUM('A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-') NOT NULL,
    `units_requested` INT NOT NULL DEFAULT 1,
    `urgency_level` ENUM('Standard', 'Urgent', 'Critical_Emergency') DEFAULT 'Urgent',
    `status` ENUM('Pending', 'Approved', 'Dispatched', 'Fulfilled', 'Cancelled') DEFAULT 'Pending',
    `city` VARCHAR(100) NOT NULL,
    `reason` TEXT,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_req_status` (`status`),
    INDEX `idx_req_blood_group` (`blood_group`),
    INDEX `idx_req_urgency` (`urgency_level`)
) ENGINE=InnoDB;

-- 6. DONATION APPOINTMENTS
CREATE TABLE `donation_appointments` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `donor_name` VARCHAR(100) NOT NULL,
    `donor_email` VARCHAR(120) NOT NULL,
    `donor_phone` VARCHAR(30) NOT NULL,
    `blood_group` ENUM('A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-') NOT NULL,
    `blood_bank_id` INT NULL,
    `appointment_date` DATE NOT NULL,
    `time_slot` VARCHAR(50) NOT NULL,
    `status` ENUM('Scheduled', 'Completed', 'Cancelled') DEFAULT 'Scheduled',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_app_bank` FOREIGN KEY (`blood_bank_id`) REFERENCES `blood_banks`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB;

-- 7. AUDIT & ACTIVITY LOGS
CREATE TABLE `audit_logs` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `action` VARCHAR(100) NOT NULL,
    `actor` VARCHAR(100) NOT NULL,
    `details` TEXT,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ==========================================================
-- SEED DATA
-- ==========================================================

-- Default Users:
-- Admin: admin@lifeblood.org / Admin@123
-- (Bcrypt hash: $2a$10$7dZ1L7VqgLwVf9n5KkYq1.WdYV7n8kE0kR2MvH2n0T2v4P5x5XQKe or generated dynamically)
INSERT INTO `users` (`name`, `email`, `password_hash`, `role`, `phone`) VALUES
('LifeBlood Administrator', 'admin@lifeblood.org', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin', '+91 98765 43210'),
('Karthik Raman', 'karthik@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'donor', '+91 98401 22334'),
('Apollo Hospitals Dispatch', 'emergency@apollo.org', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'hospital', '+91 44 2829 0200');

-- Regional Blood Banks
INSERT INTO `blood_banks` (`name`, `license_no`, `city`, `address`, `phone`, `email`, `operating_hours`, `lat`, `lng`) VALUES
('Central Medical Blood Center', 'TN-BB-2024-001', 'Chennai', '24 Greams Road, Thousand Lights, Chennai 600006', '+91 44 2829 0200', 'central@lifeblood.org', '24 Hours / 7 Days', 13.0604, 80.2496),
('Apex Regional Red Cross Bank', 'TN-BB-2024-042', 'Coimbatore', '108 Trichy Road, Singanallur, Coimbatore 641005', '+91 422 257 8890', 'apex.cbe@lifeblood.org', '24 Hours / 7 Days', 11.0168, 76.9558),
('Metro Lifeline Blood Institute', 'KA-BB-2023-119', 'Bengaluru', '54 Bannerghatta Main Rd, Bengaluru 560076', '+91 80 4123 9900', 'lifeline.blr@lifeblood.org', '24 Hours / 7 Days', 12.9716, 77.5946),
('CarePoint Blood Transfusion Trust', 'TN-BB-2024-088', 'Madurai', '82 Melur Road, K.K. Nagar, Madurai 625020', '+91 452 258 4400', 'carepoint.mdu@lifeblood.org', '08:00 AM - 10:00 PM', 9.9252, 78.1198);

-- Initial Live Inventory for all 8 blood groups
INSERT INTO `blood_inventory` (`blood_group`, `units_available`, `critical_threshold`, `status`) VALUES
('A+',  32, 15, 'Adequate'),
('A-',  18, 12, 'Adequate'),
('B+',  28, 15, 'Adequate'),
('B-',  12, 10, 'Moderate'),
('O+',  45, 20, 'Surplus'),
('O-',  20, 15, 'Adequate'),
('AB+', 14, 10, 'Moderate'),
('AB-',  6, 10, 'Critical');

-- Verified Donors
INSERT INTO `donors` (`name`, `email`, `phone`, `blood_group`, `age`, `gender`, `city`, `address`, `last_donation_date`, `total_donations`, `is_available`, `medical_notes`) VALUES
('Karthik Raman', 'karthik@example.com', '+91 98401 22334', 'O+', 29, 'Male', 'Chennai', 'Anna Nagar West', '2026-05-12', 4, TRUE, 'Eligible, BP Normal, Hemoglobin 14.5'),
('Priya Sundaram', 'priya.s@example.com', '+91 97902 44556', 'A+', 26, 'Female', 'Chennai', 'Adyar', '2026-06-04', 3, TRUE, 'Eligible, Universal Platelet Donor'),
('Mohammed Arif', 'arif.m@example.com', '+91 94441 78901', 'B+', 34, 'Male', 'Coimbatore', 'RS Puram', '2026-04-18', 7, TRUE, 'Regular Donor, Platinum Star'),
('Deepa Lakshmi', 'deepa.l@example.com', '+91 99623 88123', 'O-', 31, 'Female', 'Bengaluru', 'Indiranagar', '2026-03-20', 5, TRUE, 'Universal Red Blood Cell Donor'),
('Vijay Anand', 'vijay.a@example.com', '+91 98845 67890', 'AB+', 28, 'Male', 'Madurai', 'Anna Nagar', '2026-07-01', 2, TRUE, 'Universal Plasma Donor'),
('Ananya Krishnan', 'ananya.k@example.com', '+91 91761 23456', 'B-', 25, 'Female', 'Chennai', 'T. Nagar', '2026-02-15', 3, TRUE, 'Rare Group Registered'),
('Suresh Kumar', 'suresh.k@example.com', '+91 98403 99887', 'A-', 37, 'Male', 'Coimbatore', 'Peelamedu', '2026-05-30', 6, TRUE, 'Verified Regular Donor'),
('Naveen Raj', 'naveen.r@example.com', '+91 97109 11223', 'AB-', 30, 'Male', 'Bengaluru', 'Koramangala', '2026-01-10', 4, TRUE, 'Super Rare Blood Champion');

-- Active Emergency & Clinical Blood Requests
INSERT INTO `blood_requests` (`request_code`, `patient_name`, `hospital_name`, `contact_person`, `contact_phone`, `blood_group`, `units_requested`, `urgency_level`, `status`, `city`, `reason`) VALUES
('REQ-2026-8801', 'Mrs. Radhika Natarajan', 'Apollo Speciality Hospital', 'Dr. S. Varma', '+91 98400 11220', 'AB-', 2, 'Critical_Emergency', 'Pending', 'Chennai', 'Emergency vascular surgery, urgent AB- requirement'),
('REQ-2026-8802', 'Master K. Adithya', 'PSG Institute of Medical Sciences', 'Nurse Incharge', '+91 94433 22110', 'O-', 3, 'Urgent', 'Approved', 'Coimbatore', 'Pediatric thalassemia support transfusion'),
('REQ-2026-8803', 'Mr. Robert Wilson', 'Manipal Hospital Bengaluru', 'Chief Coordinator', '+91 80 2502 4444', 'B+', 2, 'Standard', 'Dispatched', 'Bengaluru', 'Scheduled orthopedic hip replacement surgery'),
('REQ-2026-8804', 'Smt. Gomathi Ammal', 'Meenakshi Mission Hospital', 'Emergency Desk', '+91 452 258 8741', 'A+', 1, 'Urgent', 'Fulfilled', 'Madurai', 'Severe anemia postpartum recovery transfusion');

-- Audit Log Entry
INSERT INTO `audit_logs` (`action`, `actor`, `details`) VALUES
('SYSTEM_INITIALIZATION', 'LifeBlood Core', 'Database schema established and live blood inventory initialized.');
