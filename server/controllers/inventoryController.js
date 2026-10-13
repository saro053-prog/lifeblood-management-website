const db = require('../config/db');

// Calculate status based on available units and threshold
function computeStatus(units, threshold) {
  if (units <= threshold * 0.5) return 'Critical';
  if (units <= threshold) return 'Moderate';
  if (units > threshold * 2.2) return 'Surplus';
  return 'Adequate';
}

exports.getAllInventory = async (req, res) => {
  try {
    const rows = await db.query(
      'SELECT id, blood_group, units_available, critical_threshold, status, last_updated FROM blood_inventory ORDER BY id ASC'
    );

    const totalUnits = rows.reduce((acc, curr) => acc + curr.units_available, 0);

    res.json({
      success: true,
      data: rows,
      meta: {
        totalUnits,
        totalGroups: rows.length,
        source: db.isUsingMySQL() ? 'MySQL (lifeblood_db)' : 'Live Relational Data Store',
        lastRefreshed: new Date().toISOString()
      }
    });
  } catch (err) {
    console.error('Inventory Fetch Error:', err);
    res.status(500).json({ success: false, message: 'Failed to retrieve blood inventory.' });
  }
};

exports.getInventoryByGroup = async (req, res) => {
  try {
    const group = req.params.group.toUpperCase();
    const rows = await db.query(
      'SELECT * FROM blood_inventory WHERE blood_group = ?',
      [group]
    );

    if (!rows || rows.length === 0) {
      return res.status(404).json({ success: false, message: `Blood group ${group} not found.` });
    }

    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error retrieving blood group details.' });
  }
};

exports.updateInventory = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { units_available, critical_threshold } = req.body;

    if (units_available === undefined || units_available < 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid positive units_available number is required.'
      });
    }

    const currentRows = await db.query('SELECT * FROM blood_inventory WHERE id = ?', [id]);
    if (!currentRows || currentRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Inventory item not found.' });
    }

    const current = currentRows[0];
    const threshold = critical_threshold !== undefined ? critical_threshold : current.critical_threshold;
    const newStatus = computeStatus(units_available, threshold);

    await db.query(
      'UPDATE blood_inventory SET units_available = ?, status = ? WHERE id = ?',
      [units_available, newStatus, id]
    );

    // Audit log
    const actor = req.user ? req.user.name : 'System Admin';
    await db.query(
      'INSERT INTO audit_logs (action, actor, details) VALUES (?, ?, ?)',
      ['INVENTORY_UPDATE', actor, `Adjusted ${current.blood_group} to ${units_available} units (Status: ${newStatus})`]
    );

    res.json({
      success: true,
      message: `Updated inventory for ${current.blood_group} successfully!`,
      data: {
        id,
        blood_group: current.blood_group,
        units_available,
        status: newStatus,
        last_updated: new Date()
      }
    });
  } catch (err) {
    console.error('Inventory Update Error:', err);
    res.status(500).json({ success: false, message: 'Failed to update blood inventory.' });
  }
};
