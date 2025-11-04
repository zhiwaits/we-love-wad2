const pool = require('./db');

async function debugCategories() {
    try {
        console.log('=== Event Categories in Database ===');
        const cats = await pool.query('SELECT name FROM event_categories ORDER BY name');
        console.log('Total categories:', cats.rows.length);
        cats.rows.forEach(row => {
            console.log('  -', JSON.stringify(row.name), '(length:', row.name.length, ')');
        });

        console.log('\n=== Sample Category Preferences ===');
        const prefs = await pool.query('SELECT userid, category FROM category_preference ORDER BY userid LIMIT 10');
        console.log('Total preferences:', prefs.rows.length);
        prefs.rows.forEach(row => {
            console.log('  User', row.userid, ':', JSON.stringify(row.category), '(length:', row.category.length, ')');
        });

        console.log('\n=== Testing Insert ===');
        console.log('Attempting to insert "Academic" for a test...');

        // Try to see what happens with different case variations
        const testCategories = ['Academic', 'academic', 'ACADEMIC'];
        for (const testCat of testCategories) {
            try {
                const check = await pool.query(
                    'SELECT name FROM event_categories WHERE name = $1',
                    [testCat]
                );
                console.log(`  "${testCat}" match:`, check.rows.length > 0 ? 'FOUND' : 'NOT FOUND');
            } catch (e) {
                console.log(`  "${testCat}" error:`, e.message);
            }
        }

        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        console.error('Stack:', error.stack);
        process.exit(1);
    }
}

debugCategories();
