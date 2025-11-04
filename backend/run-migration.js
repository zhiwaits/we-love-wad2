const fs = require('fs');
const path = require('path');
const pool = require('./db');

async function runMigration(migrationFile) {
    try {
        console.log(`Running migration: ${migrationFile}`);

        const migrationPath = path.join(__dirname, 'migrations', migrationFile);
        const sql = fs.readFileSync(migrationPath, 'utf8');

        await pool.query(sql);

        console.log(`Migration ${migrationFile} completed successfully!`);
    } catch (error) {
        console.error(`Migration ${migrationFile} failed:`, error.message);
        throw error;
    }
}

async function main() {
    try {
        await runMigration('002_add_user_preferences.sql');
        console.log('\nAll migrations completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('\nMigration failed:', error);
        process.exit(1);
    }
}

main();
