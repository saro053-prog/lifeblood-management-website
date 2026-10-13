require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

let pool = null;
let isConnectedToMySQL = false;

// Resilient in-memory database store with seed data
const inMemoryDb = {
  users: [
    {
      id: 1,
      name: 'LifeBlood Administrator',
      email: 'admin@lifeblood.org',
      password_hash: bcrypt.hashSync('Admin@123', 10),
      role: 'admin',
      phone: '+91 98765 43210',
      created_at: new Date()
    },
    {
      id: 2,
      name: 'Karthik Raman',
      email: 'karthik@example.com',
      password_hash: bcrypt.hashSync('Donor@123', 10),
      role: 'donor',
      phone: '+91 98401 22334',
      created_at: new Date()
    },
    {
      id: 3,
      name: 'Apollo Hospitals Dispatch',
      email: 'emergency@apollo.org',
      password_hash: bcrypt.hashSync('Hospital@123', 10),
      role: 'hospital',
      phone: '+91 44 2829 0200',
      created_at: new Date()
    }
  ],
  blood_banks: [
    {
      id: 1,
      name: 'Central Medical Blood Center',
      license_no: 'TN-BB-2024-001',
      city: 'Chennai',
      address: '24 Greams Road, Thousand Lights, Chennai 600006',
      phone: '+91 44 2829 0200',
      email: 'central@lifeblood.org',
      operating_hours: '24 Hours / 7 Days',
      lat: 13.0604,
      lng: 80.2496
    },
    {
      id: 2,
      name: 'Apex Regional Red Cross Bank',
      license_no: 'TN-BB-2024-042',
      city: 'Coimbatore',
      address: '108 Trichy Road, Singanallur, Coimbatore 641005',
      phone: '+91 422 257 8890',
      email: 'apex.cbe@lifeblood.org',
      operating_hours: '24 Hours / 7 Days',
      lat: 11.0168,
      lng: 76.9558
    },
    {
      id: 3,
      name: 'Metro Lifeline Blood Institute',
      license_no: 'KA-BB-2023-119',
      city: 'Bengaluru',
      address: '54 Bannerghatta Main Rd, Bengaluru 560076',
      phone: '+91 80 4123 9900',
      email: 'lifeline.blr@lifeblood.org',
      operating_hours: '24 Hours / 7 Days',
      lat: 12.9716,
      lng: 77.5946
    },
    {
      id: 4,
      name: 'CarePoint Blood Transfusion Trust',
      license_no: 'TN-BB-2024-088',
      city: 'Madurai',
      address: '82 Melur Road, K.K. Nagar, Madurai 625020',
      phone: '+91 452 258 4400',
      email: 'carepoint.mdu@lifeblood.org',
      operating_hours: '08:00 AM - 10:00 PM',
      lat: 9.9252,
      lng: 78.1198
    }
  ],
  blood_inventory: [
    { id: 1, blood_group: 'A+', units_available: 32, critical_threshold: 15, status: 'Adequate', last_updated: new Date() },
    { id: 2, blood_group: 'A-', units_available: 18, critical_threshold: 12, status: 'Adequate', last_updated: new Date() },
    { id: 3, blood_group: 'B+', units_available: 28, critical_threshold: 15, status: 'Adequate', last_updated: new Date() },
    { id: 4, blood_group: 'B-', units_available: 12, critical_threshold: 10, status: 'Moderate', last_updated: new Date() },
    { id: 5, blood_group: 'O+', units_available: 45, critical_threshold: 20, status: 'Surplus', last_updated: new Date() },
    { id: 6, blood_group: 'O-', units_available: 20, critical_threshold: 15, status: 'Adequate', last_updated: new Date() },
    { id: 7, blood_group: 'AB+', units_available: 14, critical_threshold: 10, status: 'Moderate', last_updated: new Date() },
    { id: 8, blood_group: 'AB-', units_available: 6, critical_threshold: 10, status: 'Critical', last_updated: new Date() }
  ],
  donors: [
    { id: 1, name: 'Karthik Raman', email: 'karthik@example.com', phone: '+91 98401 22334', blood_group: 'O+', age: 29, gender: 'Male', city: 'Chennai', address: 'Anna Nagar West', last_donation_date: '2026-05-12', total_donations: 4, is_available: true, medical_notes: 'Eligible, BP Normal, Hemoglobin 14.5' },
    { id: 2, name: 'Priya Sundaram', email: 'priya.s@example.com', phone: '+91 97902 44556', blood_group: 'A+', age: 26, gender: 'Female', city: 'Chennai', address: 'Adyar', last_donation_date: '2026-06-04', total_donations: 3, is_available: true, medical_notes: 'Eligible, Universal Platelet Donor' },
    { id: 3, name: 'Mohammed Arif', email: 'arif.m@example.com', phone: '+91 94441 78901', blood_group: 'B+', age: 34, gender: 'Male', city: 'Coimbatore', address: 'RS Puram', last_donation_date: '2026-04-18', total_donations: 7, is_available: true, medical_notes: 'Regular Donor, Platinum Star' },
    { id: 4, name: 'Deepa Lakshmi', email: 'deepa.l@example.com', phone: '+91 99623 88123', blood_group: 'O-', age: 31, gender: 'Female', city: 'Bengaluru', address: 'Indiranagar', last_donation_date: '2026-03-20', total_donations: 5, is_available: true, medical_notes: 'Universal Red Blood Cell Donor' },
    { id: 5, name: 'Vijay Anand', email: 'vijay.a@example.com', phone: '+91 98845 67890', blood_group: 'AB+', age: 28, gender: 'Male', city: 'Madurai', address: 'Anna Nagar', last_donation_date: '2026-07-01', total_donations: 2, is_available: true, medical_notes: 'Universal Plasma Donor' },
    { id: 6, name: 'Ananya Krishnan', email: 'ananya.k@example.com', phone: '+91 91761 23456', blood_group: 'B-', age: 25, gender: 'Female', city: 'Chennai', address: 'T. Nagar', last_donation_date: '2026-02-15', total_donations: 3, is_available: true, medical_notes: 'Rare Group Registered' },
    { id: 7, name: 'Suresh Kumar', email: 'suresh.k@example.com', phone: '+91 98403 99887', blood_group: 'A-', age: 37, gender: 'Male', city: 'Coimbatore', address: 'Peelamedu', last_donation_date: '2026-05-30', total_donations: 6, is_available: true, medical_notes: 'Verified Regular Donor' },
    { id: 8, name: 'Naveen Raj', email: 'naveen.r@example.com', phone: '+91 97109 11223', blood_group: 'AB-', age: 30, gender: 'Male', city: 'Bengaluru', address: 'Koramangala', last_donation_date: '2026-01-10', total_donations: 4, is_available: true, medical_notes: 'Super Rare Blood Champion' }
  ],
  blood_requests: [
    { id: 1, request_code: 'REQ-2026-8801', patient_name: 'Mrs. Radhika Natarajan', hospital_name: 'Apollo Speciality Hospital', contact_person: 'Dr. S. Varma', contact_phone: '+91 98400 11220', blood_group: 'AB-', units_requested: 2, urgency_level: 'Critical_Emergency', status: 'Pending', city: 'Chennai', reason: 'Emergency vascular surgery, urgent AB- requirement', created_at: new Date('2026-09-19T14:30:00') },
    { id: 2, request_code: 'REQ-2026-8802', patient_name: 'Master K. Adithya', hospital_name: 'PSG Institute of Medical Sciences', contact_person: 'Nurse Incharge', contact_phone: '+91 94433 22110', blood_group: 'O-', units_requested: 3, urgency_level: 'Urgent', status: 'Approved', city: 'Coimbatore', reason: 'Pediatric thalassemia support transfusion', created_at: new Date('2026-09-19T10:15:00') },
    { id: 3, request_code: 'REQ-2026-8803', patient_name: 'Mr. Robert Wilson', hospital_name: 'Manipal Hospital Bengaluru', contact_person: 'Chief Coordinator', contact_phone: '+91 80 2502 4444', blood_group: 'B+', units_requested: 2, urgency_level: 'Standard', status: 'Dispatched', city: 'Bengaluru', reason: 'Scheduled orthopedic hip replacement surgery', created_at: new Date('2026-09-18T16:45:00') },
    { id: 4, request_code: 'REQ-2026-8804', patient_name: 'Smt. Gomathi Ammal', hospital_name: 'Meenakshi Mission Hospital', contact_person: 'Emergency Desk', contact_phone: '+91 452 258 8741', blood_group: 'A+', units_requested: 1, urgency_level: 'Urgent', status: 'Fulfilled', city: 'Madurai', reason: 'Severe anemia postpartum recovery transfusion', created_at: new Date('2026-09-17T09:20:00') }
  ],
  donation_appointments: [
    { id: 1, donor_name: 'Karthik Raman', donor_email: 'karthik@example.com', donor_phone: '+91 98401 22334', blood_group: 'O+', blood_bank_id: 1, appointment_date: '2026-09-25', time_slot: '10:00 AM - 11:30 AM', status: 'Scheduled', created_at: new Date() }
  ],
  audit_logs: [
    { id: 1, action: 'SYSTEM_INITIALIZATION', actor: 'LifeBlood Core', details: 'Database initialized successfully.', created_at: new Date() }
  ]
};

let nextIds = {
  users: 4,
  blood_banks: 5,
  blood_inventory: 9,
  donors: 9,
  blood_requests: 5,
  donation_appointments: 2,
  audit_logs: 2
};

async function initDatabase() {
  const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3305', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'lifeblood_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  };

  try {
    console.log(`🔌 Attempting connection to MySQL at ${dbConfig.host}:${dbConfig.port}...`);
    const testPool = mysql.createPool(dbConfig);
    const [rows] = await testPool.query('SELECT 1 + 1 AS solution');
    pool = testPool;
    isConnectedToMySQL = true;
    console.log('✅ Connected successfully to live MySQL Database (lifeblood_db)!');
    return true;
  } catch (err) {
    isConnectedToMySQL = false;
    console.warn(`⚠️ MySQL Connection note: ${err.message}`);
    console.warn('⚡ Active fallback: Resilient Medical Data Store active with complete seed dataset.');
    console.warn('💡 To use live MySQL, set correct DB_PASSWORD in .env and run: npm run setup-db\n');
    return false;
  }
}

// Unified query wrapper
async function query(sql, params = []) {
  if (isConnectedToMySQL && pool) {
    try {
      const [results] = await pool.query(sql, params);
      return results;
    } catch (err) {
      console.error('MySQL Query Error:', err.message);
      throw err;
    }
  }

  // Resilient fallback query simulator
  return simulateQuery(sql, params);
}

function simulateQuery(sql, params = []) {
  const cleanSql = sql.trim();
  const lower = cleanSql.toLowerCase();

  // 1. SELECT queries
  if (lower.startsWith('select')) {
    if (lower.includes('from users') || lower.includes('from `users`')) {
      if (lower.includes('where email =')) {
        const email = params[0];
        return inMemoryDb.users.filter(u => u.email.toLowerCase() === email.toLowerCase());
      }
      if (lower.includes('where id =')) {
        const id = parseInt(params[0], 10);
        return inMemoryDb.users.filter(u => u.id === id);
      }
      return [...inMemoryDb.users];
    }

    if (lower.includes('from blood_inventory') || lower.includes('from `blood_inventory`')) {
      if (lower.includes('where blood_group =')) {
        const bg = params[0];
        return inMemoryDb.blood_inventory.filter(i => i.blood_group === bg);
      }
      if (lower.includes('where id =')) {
        const id = parseInt(params[0], 10);
        return inMemoryDb.blood_inventory.filter(i => i.id === id);
      }
      return [...inMemoryDb.blood_inventory].sort((a, b) => a.id - b.id);
    }

    if (lower.includes('from donors') || lower.includes('from `donors`')) {
      let results = [...inMemoryDb.donors];
      if (lower.includes('where')) {
        if (params.length > 0) {
          results = results.filter(d => {
            let match = true;
            if (lower.includes('blood_group =')) {
              match = match && d.blood_group === params[0];
            }
            if (lower.includes('email =')) {
              match = match && d.email.toLowerCase() === params[0].toLowerCase();
            }
            if (lower.includes('id =')) {
              match = match && d.id === parseInt(params[0], 10);
            }
            return match;
          });
        }
      }
      return results.sort((a, b) => b.id - a.id);
    }

    if (lower.includes('from blood_requests') || lower.includes('from `blood_requests`')) {
      let list = [...inMemoryDb.blood_requests];
      if (lower.includes('where id =')) {
        const id = parseInt(params[0], 10);
        return list.filter(r => r.id === id);
      }
      if (lower.includes('where request_code =')) {
        const code = params[0];
        return list.filter(r => r.request_code === code);
      }
      return list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }

    if (lower.includes('from blood_banks') || lower.includes('from `blood_banks`')) {
      return [...inMemoryDb.blood_banks];
    }

    if (lower.includes('from donation_appointments')) {
      return [...inMemoryDb.donation_appointments].sort((a, b) => b.id - a.id);
    }

    if (lower.includes('from audit_logs')) {
      return [...inMemoryDb.audit_logs].sort((a, b) => b.id - a.id);
    }

    // Aggregations / counts
    if (lower.includes('count(*)')) {
      if (lower.includes('donors')) return [{ count: inMemoryDb.donors.length }];
      if (lower.includes('blood_requests')) return [{ count: inMemoryDb.blood_requests.length }];
      if (lower.includes('blood_inventory')) return [{ count: inMemoryDb.blood_inventory.length }];
      if (lower.includes('blood_banks')) return [{ count: inMemoryDb.blood_banks.length }];
    }
  }

  // 2. INSERT queries
  if (lower.startsWith('insert into users') || lower.startsWith('insert into `users`')) {
    const newUser = {
      id: nextIds.users++,
      name: params[0],
      email: params[1],
      password_hash: params[2],
      role: params[3] || 'donor',
      phone: params[4] || '',
      created_at: new Date()
    };
    inMemoryDb.users.push(newUser);
    return { insertId: newUser.id, affectedRows: 1 };
  }

  if (lower.startsWith('insert into donors') || lower.startsWith('insert into `donors`')) {
    const newDonor = {
      id: nextIds.donors++,
      user_id: params[0] || null,
      name: params[1],
      email: params[2],
      phone: params[3],
      blood_group: params[4],
      age: parseInt(params[5], 10),
      gender: params[6],
      city: params[7],
      address: params[8] || '',
      last_donation_date: params[9] || null,
      total_donations: parseInt(params[10] || 1, 10),
      is_available: params[11] !== undefined ? Boolean(params[11]) : true,
      medical_notes: params[12] || 'Registered Donor',
      created_at: new Date()
    };
    inMemoryDb.donors.unshift(newDonor);
    return { insertId: newDonor.id, affectedRows: 1 };
  }

  if (lower.startsWith('insert into blood_requests') || lower.startsWith('insert into `blood_requests`')) {
    const newReq = {
      id: nextIds.blood_requests++,
      request_code: params[0],
      patient_name: params[1],
      hospital_name: params[2],
      contact_person: params[3],
      contact_phone: params[4],
      blood_group: params[5],
      units_requested: parseInt(params[6], 10),
      urgency_level: params[7],
      status: params[8] || 'Pending',
      city: params[9],
      reason: params[10] || '',
      created_at: new Date(),
      updated_at: new Date()
    };
    inMemoryDb.blood_requests.unshift(newReq);
    return { insertId: newReq.id, affectedRows: 1 };
  }

  if (lower.startsWith('insert into donation_appointments')) {
    const newApp = {
      id: nextIds.donation_appointments++,
      donor_name: params[0],
      donor_email: params[1],
      donor_phone: params[2],
      blood_group: params[3],
      blood_bank_id: params[4] || 1,
      appointment_date: params[5],
      time_slot: params[6],
      status: 'Scheduled',
      created_at: new Date()
    };
    inMemoryDb.donation_appointments.unshift(newApp);
    return { insertId: newApp.id, affectedRows: 1 };
  }

  if (lower.startsWith('insert into audit_logs')) {
    const log = {
      id: nextIds.audit_logs++,
      action: params[0],
      actor: params[1],
      details: params[2],
      created_at: new Date()
    };
    inMemoryDb.audit_logs.unshift(log);
    return { insertId: log.id, affectedRows: 1 };
  }

  // 3. UPDATE queries
  if (lower.startsWith('update blood_inventory')) {
    // e.g., UPDATE blood_inventory SET units_available = ?, status = ? WHERE id = ?
    const units = parseInt(params[0], 10);
    const status = params[1];
    const id = parseInt(params[2], 10);
    const item = inMemoryDb.blood_inventory.find(i => i.id === id);
    if (item) {
      item.units_available = units;
      item.status = status;
      item.last_updated = new Date();
      return { affectedRows: 1 };
    }
  }

  if (lower.startsWith('update blood_requests')) {
    // UPDATE blood_requests SET status = ? WHERE id = ?
    const status = params[0];
    const id = parseInt(params[1], 10);
    const req = inMemoryDb.blood_requests.find(r => r.id === id);
    if (req) {
      req.status = status;
      req.updated_at = new Date();
      return { affectedRows: 1 };
    }
  }

  if (lower.startsWith('update donors')) {
    const id = parseInt(params[params.length - 1], 10);
    const donor = inMemoryDb.donors.find(d => d.id === id);
    if (donor) {
      if (lower.includes('is_available =')) {
        donor.is_available = Boolean(params[0]);
      }
      return { affectedRows: 1 };
    }
  }

  // 4. DELETE queries
  if (lower.startsWith('delete from blood_requests')) {
    const id = parseInt(params[0], 10);
    inMemoryDb.blood_requests = inMemoryDb.blood_requests.filter(r => r.id !== id);
    return { affectedRows: 1 };
  }

  return { affectedRows: 1 };
}

module.exports = {
  initDatabase,
  query,
  isUsingMySQL: () => isConnectedToMySQL,
  getInMemoryDb: () => inMemoryDb
};
