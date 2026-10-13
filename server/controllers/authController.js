const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'lifeblood_smart_blood_mgmt_jwt_secret_key_2026';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

exports.register = async (req, res) => {
  try {
    const { name, email, password, role = 'donor', phone = '' } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required fields.'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters.'
      });
    }

    // Check if user already exists
    const existing = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (existing && existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email address already exists.'
      });
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const result = await db.query(
      'INSERT INTO users (name, email, password_hash, role, phone) VALUES (?, ?, ?, ?, ?)',
      [name, email.toLowerCase(), password_hash, role, phone]
    );

    const userId = result.insertId;

    const token = jwt.sign(
      { id: userId, email: email.toLowerCase(), role, name },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // Audit log
    await db.query(
      'INSERT INTO audit_logs (action, actor, details) VALUES (?, ?, ?)',
      ['USER_REGISTRATION', name, `Registered as ${role}`]
    );

    res.status(201).json({
      success: true,
      message: 'Account created successfully!',
      token,
      user: {
        id: userId,
        name,
        email: email.toLowerCase(),
        role,
        phone
      }
    });
  } catch (err) {
    console.error('Registration Error:', err);
    res.status(500).json({
      success: false,
      message: 'Internal server error during registration.'
    });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required.'
      });
    }

    const users = await db.query('SELECT * FROM users WHERE email = ?', [email.toLowerCase()]);
    if (!users || users.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    const user = users[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.json({
      success: true,
      message: 'Signed in successfully!',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone
      }
    });
  } catch (err) {
    console.error('Login Error:', err);
    res.status(500).json({
      success: false,
      message: 'Internal server error during authentication.'
    });
  }
};

exports.getMe = async (req, res) => {
  try {
    const users = await db.query('SELECT id, name, email, role, phone, created_at FROM users WHERE id = ?', [req.user.id]);
    if (!users || users.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    res.json({
      success: true,
      user: users[0]
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to retrieve profile.' });
  }
};
