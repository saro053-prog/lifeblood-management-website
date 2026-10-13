const db = require('../config/db');

exports.getAllBanks = async (req, res) => {
  try {
    const { city } = req.query;
    let sql = 'SELECT * FROM blood_banks';
    const params = [];

    if (city && city.trim()) {
      sql += ' WHERE city LIKE ?';
      params.push(`%${city.trim()}%`);
    }

    sql += ' ORDER BY id ASC';

    const banks = await db.query(sql, params);
    res.json({
      success: true,
      count: banks.length,
      data: banks
    });
  } catch (err) {
    console.error('Blood Bank Fetch Error:', err);
    res.status(500).json({ success: false, message: 'Failed to retrieve blood banks.' });
  }
};

exports.getBankById = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const banks = await db.query('SELECT * FROM blood_banks WHERE id = ?', [id]);
    if (!banks || banks.length === 0) {
      return res.status(404).json({ success: false, message: 'Blood bank not found.' });
    }
    res.json({ success: true, data: banks[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error retrieving blood bank.' });
  }
};

exports.createBank = async (req, res) => {
  try {
    const { name, license_no, city, address, phone, email, operating_hours, lat, lng } = req.body;

    if (!name || !city || !address || !phone) {
      return res.status(400).json({ success: false, message: 'Name, city, address, and phone are required.' });
    }

    const result = await db.query(
      `INSERT INTO blood_banks (name, license_no, city, address, phone, email, operating_hours, lat, lng) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, license_no || '', city, address, phone, email || '', operating_hours || '24/7', lat || 13.0827, lng || 80.2707]
    );

    res.status(201).json({
      success: true,
      message: 'Blood bank registered successfully!',
      bankId: result.insertId
    });
  } catch (err) {
    console.error('Create Bank Error:', err);
    res.status(500).json({ success: false, message: 'Failed to register blood bank.' });
  }
};
