# LifeBlood - System Architecture & Technical Specifications

## 1. High-Level Architecture

LifeBlood is architected as an asynchronous, event-driven healthcare platform connecting volunteer donors, regional blood banks, and hospital trauma centers in real time.

```mermaid
graph TD
    Client["Client Web Portal (HTML5, Three.js WebGL, GSAP, Vanilla ES6+)"] -->|HTTP / REST JSON| ExpressServer["Node.js / Express Application Server"]
    ExpressServer --> Middleware["Security & JWT Middleware (Helmet, CORS, Auth)"]
    Middleware --> Controllers["Domain Controllers\n(Inventory, Donors, Emergency Requests, Banks)"]
    Controllers --> MySQLPool["mysql2 Connection Pool"]
    MySQLPool --> MySQL[("MySQL 8.0 Relational Database")]
    ExpressServer -.->|Alternative Runtime| FlaskServer["Python Flask Micro-Backend (app.py)"]
```

---

## 2. Relational Entity-Relationship (ER) Model

```mermaid
erDiagram
    USERS ||--o{ DONORS : "associated_with"
    USERS ||--o{ BLOOD_REQUESTS : "submits"
    BLOOD_BANKS ||--o{ BLOOD_INVENTORY : "maintains"
    BLOOD_BANKS ||--o{ DONATION_APPOINTMENTS : "hosts"
    DONORS ||--o{ DONATION_APPOINTMENTS : "books"
    USERS ||--o{ AUDIT_LOGS : "triggers"

    USERS {
        int id PK
        string name
        string email UK
        string password_hash
        string role
        string phone
    }

    BLOOD_BANKS {
        int id PK
        string name
        string city
        string address
        string phone
        string email
    }

    DONORS {
        int id PK
        int user_id FK
        string name
        string blood_group
        int age
        string city
        string phone
        boolean is_available
    }

    BLOOD_INVENTORY {
        int id PK
        int bank_id FK
        string blood_group
        int units_available
        string status_tier
    }

    BLOOD_REQUESTS {
        int id PK
        string tracking_code UK
        string patient_name
        string blood_group
        int units_required
        string urgency
        string status
    }

    DONATION_APPOINTMENTS {
        int id PK
        int donor_id FK
        int bank_id FK
        date appointment_date
        string status
    }
```

---

## 3. Clinical & Real-Time Specifications

1. **Clinical Compatibility Matrix**: Dynamic client-side evaluator calculating ABO/Rh reciprocal compatibility ("Can Donate To" / "Can Receive From") to assist emergency trauma units during blood shortages.
2. **Emergency SOS Triage Engine**: High-priority broadcast engine generating tracking IDs (`REQ-2026-XXXX`) with urgency tiers (*Critical Emergency*, *Urgent*, *Standard*) and direct inventory deductions.
3. **Three.js WebGL Cell Simulation**: GPU-accelerated 3D canvas simulating floating erythrocytes (red blood cells) with dynamic particle kinematics responding to user interaction and scroll depth.
