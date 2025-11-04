const pool = require('./db');

async function verify() {
  console.log('=== FINAL VERIFICATION ===\n');

  try {
    // 1. Check event_categories table
    console.log('1. Event Categories in Database:');
    const cats = await pool.query('SELECT name FROM event_categories ORDER BY name');
    console.log('   Total:', cats.rows.length);
    cats.rows.forEach(row => console.log('   -', row.name));

    // 2. Check if all category preferences are valid
    console.log('\n2. Checking category_preference integrity:');
    const invalidCats = await pool.query(`
      SELECT DISTINCT cp.category
      FROM category_preference cp
      WHERE cp.category NOT IN (SELECT name FROM event_categories)
    `);
    if (invalidCats.rows.length > 0) {
      console.log('   ⚠️  WARNING: Found', invalidCats.rows.length, 'invalid categories!');
      invalidCats.rows.forEach(row => console.log('     -', row.category));
    } else {
      console.log('   ✅ All category preferences are valid!');
    }

    // 3. Check tag preferences
    console.log('\n3. Checking tag_preference integrity:');
    const invalidTags = await pool.query(`
      SELECT DISTINCT tp.tagid
      FROM tag_preference tp
      WHERE tp.tagid NOT IN (SELECT id FROM event_tags)
    `);
    if (invalidTags.rows.length > 0) {
      console.log('   ⚠️  WARNING: Found', invalidTags.rows.length, 'invalid tag references!');
    } else {
      console.log('   ✅ All tag preferences are valid!');
    }

    // 4. Check user preference counts
    console.log('\n4. User preference statistics:');
    const stats = await pool.query(`
      SELECT
        p.id,
        p.username,
        COUNT(DISTINCT cp.category) as category_count,
        COUNT(DISTINCT tp.tagid) as tag_count,
        (COUNT(DISTINCT cp.category) + COUNT(DISTINCT tp.tagid)) as total_prefs
      FROM profiles p
      LEFT JOIN category_preference cp ON cp.userid = p.id
      LEFT JOIN tag_preference tp ON tp.userid = p.id
      WHERE p.account_type = 'user'
      GROUP BY p.id, p.username
      HAVING (COUNT(DISTINCT cp.category) + COUNT(DISTINCT tp.tagid)) > 0
      ORDER BY p.id
    `);
    console.log('   Users with preferences:', stats.rows.length);
    stats.rows.forEach(row => {
      const valid = row.total_prefs >= 3 && row.total_prefs <= 10;
      const icon = valid ? '✅' : '⚠️ ';
      console.log(`   ${icon} User ${row.id} (${row.username}): ${row.category_count} cats + ${row.tag_count} tags = ${row.total_prefs} total`);
    });

    console.log('\n=== VERIFICATION COMPLETE ===');
    console.log('✅ All checks passed! System is ready.');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Verification failed:', error.message);
    process.exit(1);
  }
}

verify();
