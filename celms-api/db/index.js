const fs = require('fs');
const path = require('path');

// Use real PostgreSQL connection
const { Pool } = require('pg');

// Use either DB_* or PG* environment variables
const host = process.env.DB_HOST || process.env.PGHOST;
const database = process.env.DB_NAME || process.env.PGDATABASE;
const user = process.env.DB_USER || process.env.PGUSER;
const password = process.env.DB_PASSWORD || process.env.PGPASSWORD;
const port = Number(process.env.DB_PORT || process.env.PGPORT || 5432);

const pool = new Pool({
  host,
  port,
  database,
  user,
  password
});

// Test the connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Database connection error:', err.message);
    console.error('Please check your DB_* or PG* environment variables.');
    process.exit(1); // Exit if DB connection fails
  } else {
    console.log('Database connected successfully');
    runInitialSetup(); // Run initial setup scripts if needed
  }
});

// Function to run initial setup scripts if needed
const runInitialSetup = async () => {
  try {
    // Check if we need to run initial setup
    const result = await pool.query(`
      SELECT EXISTS (
        SELECT FROM pg_tables 
        WHERE schemaname = 'public' AND tablename = 'users'
      ) as table_exists
    `);

    if (!result.rows[0].table_exists) {
      console.log('Database tables not found. Please run setup_db.ps1 to initialize the database.');
      console.log('Continuing with empty database...');
    } else {
      console.log('Database already set up');
    }
  } catch (err) {
    console.error('Error during initial setup check:', err.message);
  }
};module.exports = {
  query: (text, params) => pool.query(text, params),
  getClient: async () => {
    const client = await pool.connect();
    const query = client.query;
    const release = client.release;

    // Set a timeout of 5 seconds, after which we will log this client's last query
    const timeout = setTimeout(() => {
      console.error('A client has been checked out for more than 5 seconds!');
      console.error(`The last executed query on this client was: ${client.lastQuery}`);
    }, 5000);

    // Monkey patch the query method to keep track of the last query executed
    client.query = (...args) => {
      client.lastQuery = args;
      return query.apply(client, args);
    };

    client.release = () => {
      // Clear the timeout
      clearTimeout(timeout);
      // Set the methods back to their old implementations
      client.query = query;
      client.release = release;
      return release.apply(client);
    };

    return client;
  }
};