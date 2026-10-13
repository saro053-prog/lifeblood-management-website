require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

async function setupDatabase() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  LifeBlood – MySQL Database Auto-Setup & Seeder');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const config = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true
  };

  console.log(`[1/4] Connecting to MySQL Server at ${config.host}:${config.port} as '${config.user}'...`);

  let connection;
  try {
    connection = await mysql.createConnection(config);
    console.log('      Connected successfully to MySQL server.');
  } catch (err) {
    console.error('\n❌ Could not connect to MySQL server!');
    console.error(`   Error details: ${err.message}`);
    console.error('   Please verify in .env: DB_USER, DB_PASSWORD, DB_PORT.\n');
    process.exit(1);
  }

  try {
    const schemaPath = path.join(__dirname, '../database/schema.sql');
    console.log(`[2/4] Reading schema & seed definitions from ${path.basename(schemaPath)}...`);
    let sql = fs.readFileSync(schemaPath, 'utf8');

    // Generate accurate bcrypt hash for standard passwords
    const salt = await bcrypt.genSalt(10);
    const adminHash = await bcrypt.hash('Admin@123', salt);
    const donorHash = await bcrypt.hash('Donor@123', salt);
    const hospitalHash = await bcrypt.hash('Hospital@123', salt);

    // Replace dummy hash in SQL
    sql = sql.replace(
      /'\$2a\$10\$92IXUNpkjO0rOQ5byMi\.Ye4oKoEa3Ro9llC\/\.og\/at2\.uheWG\/igi'/g,
      `'${adminHash}'`
    );

    console.log('[3/4] Executing schema migrations and seeding data...');
    await connection.query(sql);
    console.log('      Tables created: users, blood_banks, donors, blood_inventory, blood_requests, donation_appointments, audit_logs.');

    console.log('[4/4] Verifying database integrity...');
    const [invRows] = await connection.query('SELECT COUNT(*) as count FROM lifeblood_db.blood_inventory');
    const [donorRows] = await connection.query('SELECT COUNT(*) as count FROM lifeblood_db.donors');
    const [reqRows] = await connection.query('SELECT COUNT(*) as count FROM lifeblood_db.blood_requests');

    console.log('      Verified:');
    console.log(`        - Blood Groups Inventory: ${invRows[0].count} groups initialized`);
    console.log(`        - Active Donors Seeded:  ${donorRows[0].count} donors`);
    console.log(`        - Blood Requests Tracked: ${reqRows[0].count} requests`);

    console.log('\n SUCCESS: LifeBlood database is initialized and ready to run!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  Admin Credentials:');
    console.log('    Email:    admin@lifeblood.org');
    console.log('    Password: Admin@123');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (err) {
    console.error('\n❌ Error executing SQL script:', err.message);
    process.exit(1);
  } finally {
    if (connection) await connection.end();
  }
}

setupDatabase();
