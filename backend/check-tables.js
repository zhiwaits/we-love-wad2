const pool = require('./db');

async function checkTables() {
    try {
        // Get all tables in the database
        const result = await pool.query(`
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
            ORDER BY table_name;
        `);

        console.log('\n=== All tables in database ===');
        result.rows.forEach(row => {
            console.log(`  - ${row.table_name}`);
        });

        // Check if preference tables exist
        const prefTables = ['club_category_preference', 'category_preference', 'tag_preference'];
        console.log('\n=== Checking for preference tables ===');

        for (const tableName of prefTables) {
            const check = await pool.query(`
                SELECT EXISTS (
                    SELECT FROM information_schema.tables
                    WHERE table_schema = 'public'
                    AND table_name = $1
                );
            `, [tableName]);

            if (check.rows[0].exists) {
                console.log(`✓ ${tableName} exists`);

                // Get columns
                const cols = await pool.query(`
                    SELECT column_name, data_type
                    FROM information_schema.columns
                    WHERE table_name = $1
                    ORDER BY ordinal_position;
                `, [tableName]);

                console.log(`  Columns:`);
                cols.rows.forEach(col => {
                    console.log(`    - ${col.column_name} (${col.data_type})`);
                });
            } else {
                console.log(`✗ ${tableName} does not exist`);
            }
        }

        // Check profiles table structure
        console.log('\n=== Profiles table structure ===');
        const profileCols = await pool.query(`
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'profiles'
            ORDER BY ordinal_position;
        `);

        profileCols.rows.forEach(col => {
            console.log(`  - ${col.column_name} (${col.data_type})`);
        });

        // Check foreign key constraints
        console.log('\n=== Foreign key constraints ===');
        const fkConstraints = await pool.query(`
            SELECT
                tc.table_name,
                kcu.column_name,
                ccu.table_name AS foreign_table_name,
                ccu.column_name AS foreign_column_name,
                tc.constraint_name
            FROM information_schema.table_constraints AS tc
            JOIN information_schema.key_column_usage AS kcu
                ON tc.constraint_name = kcu.constraint_name
                AND tc.table_schema = kcu.table_schema
            JOIN information_schema.constraint_column_usage AS ccu
                ON ccu.constraint_name = tc.constraint_name
                AND ccu.table_schema = tc.table_schema
            WHERE tc.constraint_type = 'FOREIGN KEY'
                AND tc.table_name IN ('category_preference', 'tag_preference', 'club_category_preference')
            ORDER BY tc.table_name;
        `);

        fkConstraints.rows.forEach(fk => {
            console.log(`  ${fk.table_name}.${fk.column_name} -> ${fk.foreign_table_name}.${fk.foreign_column_name}`);
        });

        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

checkTables();
