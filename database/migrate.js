const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function run() {
  console.log('Starting migration and seeding...');

  const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD,
  };

  // 1. Create database 'arenago' if not exists
  const rootClient = new Client({ ...dbConfig, database: 'postgres' });
  try {
    const dbName = process.env.DB_DATABASE || 'arenago';
    await rootClient.connect();
    const checkDb = await rootClient.query(`SELECT 1 FROM pg_database WHERE datname = $1`, [dbName]);
    
    if (checkDb.rowCount > 0) {
      console.log(`Database '${dbName}' already exists. Dropping it first...`);
      await rootClient.query(`DROP DATABASE "${dbName}"`);
    }
    console.log(`Database '${dbName}' is being created...`);
    await rootClient.query(`CREATE DATABASE "${dbName}"`);
    console.log(`Database '${dbName}' created successfully.`);
  } catch (err) {
    console.error('Error checking/creating database:', err.message);
  } finally {
    await rootClient.end();
  }

  // 2. Connect to the 'arenago' database and apply schema and seed
  const targetClient = new Client({ ...dbConfig, database: process.env.DB_DATABASE || 'arenago' });
  try {
    await targetClient.connect();
    console.log('Connected to target database. Applying schema...');

    // Read and run database.sql DDL
    const schemaSql = fs.readFileSync(path.join(__dirname, 'database.sql'), 'utf8');
    await targetClient.query(schemaSql);
    console.log('Schema DDL applied successfully.');

    // Read and run seed.sql DML
    console.log('Applying seeds...');
    const seedSql = fs.readFileSync(path.join(__dirname, 'seed.sql'), 'utf8');
    await targetClient.query(seedSql);
    console.log('Database seeded successfully.');

  } catch (err) {
    console.error('Error during migration/seeding:', err.message);
    process.exit(1);
  } finally {
    await targetClient.end();
  }

  console.log('Migration and seeding completed successfully!');
}

run();
