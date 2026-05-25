const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const envPath = path.join(__dirname, '.env');
const env = {};
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let value = match[2] || '';
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.substring(1, value.length - 1);
      } else if (value.startsWith("'") && value.endsWith("'")) {
        value = value.substring(1, value.length - 1);
      }
      env[key] = value.trim();
    }
  });
}

// Set env vars for execution
process.env.OCI_DB_HOST = env.OCI_DB_HOST;
process.env.OCI_DB_PORT = env.OCI_DB_PORT;
process.env.OCI_DB_NAME = env.OCI_DB_NAME;
process.env.OCI_DB_USER = env.OCI_DB_USER;
process.env.OCI_DB_PASSWORD = env.OCI_DB_PASSWORD;

console.log('OCI DB Config:', {
  host: process.env.OCI_DB_HOST,
  port: process.env.OCI_DB_PORT,
  database: process.env.OCI_DB_NAME,
  user: process.env.OCI_DB_USER,
});

const pool = new Pool({
  host: process.env.OCI_DB_HOST,
  port: parseInt(process.env.OCI_DB_PORT || '5432', 10),
  database: process.env.OCI_DB_NAME,
  user: process.env.OCI_DB_USER,
  password: process.env.OCI_DB_PASSWORD,
  ssl: false,
});

async function runTests() {
  try {
    console.log('\n--- 1. Testing Connection ---');
    const timeRes = await pool.query('SELECT NOW()');
    console.log('Successfully connected. Current time:', timeRes.rows[0].now);

    console.log('\n--- 2. Testing Flowers (Assets Table) ---');
    const flowersRes = await pool.query(`
      SELECT DISTINCT ON (name) id, name, type, url, metadata 
      FROM assets 
      WHERE type = 'flower' AND is_active = true 
      ORDER BY name, id
    `);
    console.log(`Found ${flowersRes.rows.length} active flower assets in DB.`);
    if (flowersRes.rows.length > 0) {
      console.log('Sample flower:', flowersRes.rows[0]);
    } else {
      console.log('WARNING: No active flower assets found in DB!');
    }

    console.log('\n--- 3. Testing Cards (Designs Table) ---');
    const designsRes = await pool.query('SELECT * FROM designs LIMIT 5');
    console.log(`Found ${designsRes.rows.length} designs in DB.`);
    if (designsRes.rows.length > 0) {
      console.log('Sample design:', {
        id: designsRes.rows[0].id,
        name: designsRes.rows[0].name,
        preview_url: designsRes.rows[0].preview_url,
      });
    }

    console.log('\n--- 4. Testing Favorite Flowers Table ---');
    // Check if table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'user_favorite_flowers'
      )
    `);
    console.log('Table user_favorite_flowers exists:', tableCheck.rows[0].exists);

    if (tableCheck.rows[0].exists) {
      const columns = await pool.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'user_favorite_flowers'
      `);
      console.log('Columns:');
      columns.rows.forEach(col => console.log(`  - ${col.column_name}: ${col.data_type}`));

      // Test inserting and deleting a temporary favorite record
      const tempUserId = 'test-user-id-12345';
      const tempFlowerId = flowersRes.rows[0]?.id || 'test-flower-id-67890';
      
      console.log(`\nInserting temporary favorite for user ${tempUserId}, flower ${tempFlowerId}...`);
      await pool.query(
        `INSERT INTO user_favorite_flowers (user_id, flower_id) 
         VALUES ($1, $2) 
         ON CONFLICT (user_id, flower_id) DO NOTHING`,
        [tempUserId, tempFlowerId]
      );
      
      const selectRes = await pool.query(
        `SELECT * FROM user_favorite_flowers WHERE user_id = $1`,
        [tempUserId]
      );
      console.log('Fetched favorite record:', selectRes.rows);

      console.log('Deleting temporary favorite...');
      await pool.query(
        `DELETE FROM user_favorite_flowers WHERE user_id = $1 AND flower_id = $2`,
        [tempUserId, tempFlowerId]
      );
      
      const selectResAfter = await pool.query(
        `SELECT * FROM user_favorite_flowers WHERE user_id = $1`,
        [tempUserId]
      );
      console.log('Fetched favorite record after delete:', selectResAfter.rows);
    }

  } catch (err) {
    console.error('Test execution failed:', err);
  } finally {
    await pool.end();
  }
}

runTests();
