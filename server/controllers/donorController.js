const db = require('../config/db');

const VALID_BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];

exports.getDonors = async (req, res) => {
  try {
    let { blood_group, city, available } = req.query;
    if (blood_group) {
      blood_group = blood_group.replace(/\s+/g, '+').trim();
    }

    let sql = 'SELECT * FROM donors WHERE 1=1';
    const params = [];

    if (blood_group && VALID_BLOOD_GROUPS.includes(blood_group)) {
      sql += ' AND blood_group = ?';
      params.push(blood_group);
    }

    if (city && city.trim()) {
      sql += ' AND city LIKE ?';
      params.push(`%${city.trim()}%`);
    }

    if (available !== undefined) {
      sql += ' AND is_available = ?';
      params.push(available === 'true' || available === '1');
    }

    sql += ' ORDER BY id DESC';

    const donors = await db.query(sql, params);

    res.json({
      success: true,
      count: donors.length,
      data: donors
    });
  } catch (err) {
    console.error('Donor Search Error:', err);
    res.status(500).json({ success: false, message: 'Failed to retrieve donors.' });
  }
};

exports.getDonorById = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const donors = await db.query('SELECT * FROM donors WHERE id = ?', [id]);

    if (!donors || donors.length === 0) {
      return res.status(404).json({ success: false, message: 'Donor not found.' });
    }

    res.json({ success: true, data: donors[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error retrieving donor.' });
  }
};

exports.registerDonor = async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      blood_group,
      age,
      gender,
      city,
      address = '',
      last_donation_date = null,
      medical_notes = ''
    } = req.body;

    if (!name || !email || !phone || !blood_group || !age || !gender || !city) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, phone, blood group, age, gender, and city are mandatory.'
      });
    }

    if (!VALID_BLOOD_GROUPS.includes(blood_group)) {
      return res.status(400).json({
        success: false,
        message: `Invalid blood group. Allowed: ${VALID_BLOOD_GROUPS.join(', ')}`
      });
    }

    const ageNum = parseInt(age, 10);
    if (isNaN(ageNum) || ageNum < 18 || ageNum > 65) {
      return res.status(400).json({
        success: false,
        message: 'Donor age must be between 18 and 65 years.'
      });
    }

    // Check 90 days cooldown if last_donation_date provided
    let isAvailable = true;
    if (last_donation_date) {
      const lastDate = new Date(last_donation_date);
      const diffDays = (new Date() - lastDate) / (1000 * 60 * 60 * 24);
      if (diffDays < 90) {
        isAvailable = false;
      }
    }

    const userId = req.user ? req.user.id : null;

    const result = await db.query(
      `INSERT INTO donors 
       (user_id, name, email, phone, blood_group, age, gender, city, address, last_donation_date, total_donations, is_available, medical_notes) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, name, email, phone, blood_group, ageNum, gender, city, address, last_donation_date, 1, isAvailable, medical_notes || 'Registered LifeBlood Hero']
    );

    await db.query(
      'INSERT INTO audit_logs (action, actor, details) VALUES (?, ?, ?)',
      ['NEW_DONOR_REGISTERED', name, `Registered as ${blood_group} donor in ${city}`]
    );

    res.status(201).json({
      success: true,
      message: 'Congratulations! You are officially registered as a LifeBlood Donor.',
      donorId: result.insertId,
      data: {
        id: result.insertId,
        name,
        email,
        phone,
        blood_group,
        age: ageNum,
        gender,
        city,
        is_available: isAvailable
      }
    });
  } catch (err) {
    console.error('Donor Registration Error:', err);
    res.status(500).json({ success: false, message: 'Failed to complete donor registration.' });
  }
};

exports.checkEligibility = (req, res) => {
  const { age, weight, lastDonationDate, hasChronicConditions } = req.body;

  const ageNum = parseInt(age, 10);
  const weightNum = parseFloat(weight);

  const errors = [];

  if (!ageNum || ageNum < 18) errors.push('Must be at least 18 years old.');
  if (ageNum > 65) errors.push('Maximum age for standard donation is 65 years.');
  if (!weightNum || weightNum < 45) errors.push('Minimum body weight requirement is 45 kg (100 lbs).');
  if (hasChronicConditions) errors.push('Active chronic infectious conditions require medical clearance.');

  if (lastDonationDate) {
    const days = (new Date() - new Date(lastDonationDate)) / (1000 * 60 * 60 * 24);
    if (days < 90) {
      errors.push(`A 90-day cooldown between whole blood donations is required. Days remaining: ${Math.ceil(90 - days)}`);
    }
  }

  const eligible = errors.length === 0;

  res.json({
    success: true,
    eligible,
    messages: eligible ? ['You meet all basic medical criteria to donate blood!'] : errors
  });
};

exports.bookAppointment = async (req, res) => {
  try {
    const { donor_name, donor_email, donor_phone, blood_group, blood_bank_id = 1, appointment_date, time_slot } = req.body;

    if (!donor_name || !donor_email || !blood_group || !appointment_date || !time_slot) {
      return res.status(400).json({ success: false, message: 'All appointment fields are required.' });
    }

    const phone = donor_phone || '+91 98401 22334';

    const result = await db.query(
      `INSERT INTO donation_appointments (donor_name, donor_email, donor_phone, blood_group, blood_bank_id, appointment_date, time_slot, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, 'Scheduled')`,
      [donor_name, donor_email, phone, blood_group, blood_bank_id, appointment_date, time_slot]
    );

    res.status(201).json({
      success: true,
      message: 'Donation appointment scheduled successfully!',
      appointmentId: result.insertId
    });
  } catch (err) {
    console.error('Appointment Error:', err);
    res.status(500).json({ success: false, message: 'Failed to schedule appointment.' });
  }
};

exports.getAppointments = async (req, res) => {
  try {
    const email = req.query.email;
    let sql = 'SELECT a.*, b.name as bank_name, b.address as bank_address FROM donation_appointments a LEFT JOIN blood_banks b ON a.blood_bank_id = b.id';
    const params = [];
    if (email) {
      sql += ' WHERE a.donor_email = ?';
      params.push(email);
    }
    sql += ' ORDER BY a.id DESC';
    const rows = await db.query(sql, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('Get Appointments Error:', err);
    res.status(500).json({ success: false, message: 'Failed to retrieve appointments.' });
  }
};

exports.getDonorProfile = async (req, res) => {
  try {
    const userEmail = req.user ? req.user.email : req.query.email;
    if (!userEmail) {
      return res.status(400).json({ success: false, message: 'Email required' });
    }

    const rows = await db.query('SELECT * FROM donors WHERE email = ?', [userEmail]);
    if (!rows || rows.length === 0) {
      return res.json({
        success: true,
        hasProfile: false,
        donor: null
      });
    }

    res.json({
      success: true,
      hasProfile: true,
      donor: rows[0]
    });
  } catch (err) {
    console.error('Donor Profile Error:', err);
    res.status(500).json({ success: false, message: 'Failed to retrieve donor profile.' });
  }
};

exports.toggleAvailability = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { is_available } = req.body;

    await db.query('UPDATE donors SET is_available = ? WHERE id = ?', [Boolean(is_available), id]);
    res.json({
      success: true,
      message: `Availability updated to ${is_available ? 'Available' : 'Cooldown'}`,
      is_available: Boolean(is_available)
    });
  } catch (err) {
    console.error('Toggle Availability Error:', err);
    res.status(500).json({ success: false, message: 'Failed to update availability.' });
  }
};

