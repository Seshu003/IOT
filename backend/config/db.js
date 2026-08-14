// PostgreSQL Database Interface with Graceful Fallback
let pool = null;
let isConnected = false;

if (process.env.PG_DATABASE_URL || process.env.PGHOST) {
  try {
    const { Pool } = require('pg');
    pool = new Pool({
      connectionString: process.env.PG_DATABASE_URL || `postgres://${process.env.PGUSER || 'postgres'}:${process.env.PGPASSWORD || 'postgres'}@${process.env.PGHOST || 'localhost'}:${process.env.PGPORT || 5432}/${process.env.PGDATABASE || 'iot_db'}`,
      connectionTimeoutMillis: 2000
    });
    pool.query('SELECT NOW()', (err) => {
      if (!err) {
        isConnected = true;
        console.log('🐘 PostgreSQL connected successfully');
      } else {
        console.log('ℹ️ PostgreSQL not available, using in-memory demo data engine');
      }
    });
  } catch (err) {
    console.log('ℹ️ PostgreSQL module not initialized, running in standalone mode');
  }
}

function isPgAvailable() {
  return isConnected;
}

async function query(text, params) {
  if (!pool || !isConnected) {
    return { rows: [] };
  }
  return pool.query(text, params);
}

module.exports = {
  isPgAvailable,
  query
};
