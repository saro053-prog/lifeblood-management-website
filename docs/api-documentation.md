# LifeBlood - REST API Reference

Base URL: `http://localhost:5000/api`

---

## 1. Authentication (`/api/auth`)

- `POST /register` — Register a new user (`name`, `email`, `password`, `role`, `phone`).
- `POST /login` — Authenticate user and issue signed JWT bearer token.
- `GET /me` — Retrieve current authenticated session profile *(Requires Bearer Token)*.

---

## 2. Blood Inventory (`/api/inventory`)

- `GET /` — Retrieve live inventory counts across all 8 major blood groups with surplus/critical threshold tags.
- `GET /:group` — Retrieve unit counts for a specific blood group (e.g. `O-`).
- `PUT /:id` — Adjust unit quantities *(Admin Only)*.

---

## 3. Volunteer Donors (`/api/donors`)

- `GET /` — Search verified donors by blood group and city (`?blood_group=O-&city=Chennai`).
- `GET /:id` — Fetch donor profile details and donation history.
- `POST /register` — Register a volunteer donor with clinical health checklist.
- `POST /check-eligibility` — Evaluate donation frequency and medical criteria.
- `POST /appointments` — Book a donation slot at a regional blood bank.

---

## 4. Emergency SOS Requisitions (`/api/requests`)

- `GET /` — List active blood requests with filter parameters (`?status=Pending&urgency=Critical_Emergency`).
- `POST /` — Broadcast an emergency blood requisition. Generates unique tracking code (`REQ-2026-XXXX`).
- `PUT /:id/status` — Triage request status (`Pending` &rarr; `Approved` &rarr; `Dispatched` &rarr; `Fulfilled`) with automated inventory deduction *(Admin Only)*.

---

## 5. Blood Banks & Centers (`/api/banks`)

- `GET /` — Directory of accredited regional blood banks with contact details and operating hours.
- `POST /` — Register a partner blood bank facility *(Admin Only)*.

---

## 6. System Telemetry (`/api/stats`)

- `GET /` — Platform telemetry: Lives Saved, Active Donors, Units in Stock, Open Emergency Requests.
- `GET /health` — Health check and database connectivity status.
