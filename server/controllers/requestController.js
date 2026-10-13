const db = require('../config/db');

function generateRequestCode() {
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  const year = new Date().getFullYear();
  return `REQ-${year}-${randomNum}`;
}

exports.getAllRequests = async (req, res) => {
  try {
    const { status, urgency, blood_group } = req.query;

    let sql = 'SELECT * FROM blood_requests WHERE 1=1';
    const params = [];

    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }
    if (urgency) {
      sql += ' AND urgency_level = ?';
      params.push(urgency);
    }
    if (blood_group) {
      sql += ' AND blood_group = ?';
      params.push(blood_group);
    }

    sql += ' ORDER BY id DESC';

    const requests = await db.query(sql, params);

    res.json({
      success: true,
      count: requests.length,
      data: requests
    });
  } catch (err) {
    console.error('Request Fetch Error:', err);
    res.status(500).json({ success: false, message: 'Failed to retrieve blood requests.' });
  }
};

exports.createRequest = async (req, res) => {
  try {
    const {
      patient_name,
      hospital_name,
      contact_person,
      contact_phone,
      blood_group,
      units_requested = 1,
      urgency_level = 'Urgent',
      city,
      reason = ''
    } = req.body;

    const finalContactPerson = contact_person || 'Emergency Desk';
    const finalContactPhone = contact_phone || '+91 98400 11220';

    if (!patient_name || !hospital_name || !blood_group || !city) {
      return res.status(400).json({
        success: false,
        message: 'Patient name, hospital, blood group, and city are mandatory.'
      });
    }

    const units = parseInt(units_requested, 10);
    if (isNaN(units) || units < 1 || units > 20) {
      return res.status(400).json({
        success: false,
        message: 'Requested units must be between 1 and 20.'
      });
    }

    const requestCode = generateRequestCode();

    const result = await db.query(
      `INSERT INTO blood_requests 
       (request_code, patient_name, hospital_name, contact_person, contact_phone, blood_group, units_requested, urgency_level, status, city, reason) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Pending', ?, ?)`,
      [requestCode, patient_name, hospital_name, finalContactPerson, finalContactPhone, blood_group, units, urgency_level, city, reason]
    );

    // Audit log
    await db.query(
      'INSERT INTO audit_logs (action, actor, details) VALUES (?, ?, ?)',
      ['EMERGENCY_REQUEST_CREATED', finalContactPerson, `Request ${requestCode} created for ${units} units of ${blood_group} at ${hospital_name}`]
    );

    res.status(201).json({
      success: true,
      message: 'Emergency Blood Request broadcasted successfully! Nearby donors and blood banks alerted.',
      requestCode,
      data: {
        id: result.insertId,
        requestCode,
        patient_name,
        hospital_name,
        blood_group,
        units_requested: units,
        urgency_level,
        status: 'Pending',
        city,
        created_at: new Date()
      }
    });
  } catch (err) {
    console.error('Request Creation Error:', err);
    res.status(500).json({ success: false, message: 'Failed to create blood request.' });
  }
};

exports.updateRequestStatus = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { status } = req.body;

    const validStatuses = ['Pending', 'Approved', 'Dispatched', 'Fulfilled', 'Cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    const currentRows = await db.query('SELECT * FROM blood_requests WHERE id = ?', [id]);
    if (!currentRows || currentRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Request not found.' });
    }

    const request = currentRows[0];

    // If changing to 'Fulfilled', deduct from inventory if stock is available
    if (status === 'Fulfilled' && request.status !== 'Fulfilled') {
      const invRows = await db.query('SELECT * FROM blood_inventory WHERE blood_group = ?', [request.blood_group]);
      if (invRows && invRows.length > 0) {
        const inv = invRows[0];
        const newUnits = Math.max(0, inv.units_available - request.units_requested);
        const newStatus = newUnits <= 10 ? 'Critical' : (newUnits <= 15 ? 'Moderate' : 'Adequate');
        await db.query('UPDATE blood_inventory SET units_available = ?, status = ? WHERE id = ?', [newUnits, newStatus, inv.id]);
      }
    }

    await db.query('UPDATE blood_requests SET status = ? WHERE id = ?', [status, id]);

    // Audit log
    const actor = req.user ? req.user.name : 'Administrator';
    await db.query(
      'INSERT INTO audit_logs (action, actor, details) VALUES (?, ?, ?)',
      ['REQUEST_STATUS_UPDATED', actor, `Request ${request.request_code} status updated to ${status}`]
    );

    res.json({
      success: true,
      message: `Request status updated to ${status}`,
      data: {
        id,
        requestCode: request.request_code,
        status,
        updated_at: new Date()
      }
    });
  } catch (err) {
    console.error('Update Request Error:', err);
    res.status(500).json({ success: false, message: 'Failed to update request status.' });
  }
};

exports.deleteRequest = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    await db.query('DELETE FROM blood_requests WHERE id = ?', [id]);
    res.json({ success: true, message: 'Request removed.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to remove request.' });
  }
};
