const path = require('path');
const fs = require('fs');
const fsPromises = require('fs/promises');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
const pool = require('../db');
const { uploadImageToSupabase } = require('../utils/supabaseStorage');

const MIME_TYPES = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
  bmp: 'image/bmp'
};

function toDataUrl(buffer, ext) {
  const safeExt = (ext || 'png').toLowerCase();
  const mime = MIME_TYPES[safeExt] || `image/${safeExt}`;
  return `data:${mime};base64,${buffer.toString('base64')}`;
}

function resolveLocalPath(relativePath) {
  if (!relativePath) return null;
  const normalized = relativePath.replace(/^\/+/, '');
  return path.resolve(__dirname, '..', normalized);
}

function candidateLocalPaths(currentValue, localFolder) {
  const sanitized = (currentValue || '').replace(/^\/+/, '');
  if (!sanitized) return [];

  const candidates = new Set();

  if (sanitized.startsWith('uploads/')) {
    candidates.add(sanitized);
  } else {
    candidates.add(`uploads/${sanitized}`);
    if (localFolder) {
      if (sanitized.startsWith(`${localFolder}/`)) {
        candidates.add(`uploads/${sanitized}`);
      } else {
        candidates.add(`uploads/${localFolder}/${sanitized}`);
      }
    }
  }

  return [...candidates];
}

async function migrateRow({
  label,
  row,
  column,
  supabaseFolder,
  localFolder,
  updateSql
}) {
  const currentValue = row[column];
  if (!currentValue) {
    console.log(`[${label}] Skipping ${row.id} (no current value)`);
    return { skipped: true };
  }

  if (/^https?:\/\//i.test(currentValue)) {
    console.log(`[${label}] ${row.id} already points to Supabase (skipping)`);
    return { skipped: true };
  }
  const candidates = candidateLocalPaths(currentValue, localFolder);
  let filePath = null;
  for (const candidate of candidates) {
    const resolved = resolveLocalPath(candidate);
    if (resolved && fs.existsSync(resolved)) {
      filePath = resolved;
      break;
    }
  }

  if (!filePath) {
    console.warn(`[${label}] Local file not found for ${row.id}: ${currentValue}`);
    return { skipped: true };
  }

  const ext = path.extname(filePath).slice(1) || 'png';

  try {
    const buffer = await fsPromises.readFile(filePath);
    const dataUrl = toDataUrl(buffer, ext);
    const newUrl = await uploadImageToSupabase(dataUrl, path.basename(filePath), supabaseFolder);

    await pool.query(updateSql, [newUrl, row.id]);
    console.log(`[${label}] Migrated ${row.id} -> ${newUrl}`);
    return { migrated: true };
  } catch (error) {
    console.error(`[${label}] Failed to migrate ${row.id}:`, error.message);
    return { error: error.message };
  }
}

async function migrateEvents() {
  const label = 'events';
  const selectSql = `
    SELECT id, image_url
    FROM events
    WHERE image_url IS NOT NULL
      AND image_url <> ''
      AND image_url NOT LIKE 'http%'
      AND image_url NOT LIKE 'https%'
  `;

  const updateSql = 'UPDATE events SET image_url = $1 WHERE id = $2';
  const { rows } = await pool.query(selectSql);
  console.log(`[${label}] Found ${rows.length} rows requiring migration.`);

  let migrated = 0;
  for (const row of rows) {
    const result = await migrateRow({
      label,
      row,
      column: 'image_url',
      supabaseFolder: 'events',
      localFolder: 'event',
      updateSql
    });
    if (result?.migrated) migrated += 1;
  }

  console.log(`[${label}] Migration complete. Migrated ${migrated}/${rows.length}.`);
}

async function migrateClubs() {
  const label = 'clubs';
  const selectSql = `
    SELECT id, club_image
    FROM profiles
    WHERE account_type = 'club'
      AND club_image IS NOT NULL
      AND club_image <> ''
      AND club_image NOT LIKE 'http%'
      AND club_image NOT LIKE 'https%'
  `;

  const updateSql = 'UPDATE profiles SET club_image = $1 WHERE id = $2';
  const { rows } = await pool.query(selectSql);
  console.log(`[${label}] Found ${rows.length} rows requiring migration.`);

  let migrated = 0;
  for (const row of rows) {
    const result = await migrateRow({
      label,
      row,
      column: 'club_image',
      supabaseFolder: 'clubs',
      localFolder: 'club',
      updateSql
    });
    if (result?.migrated) migrated += 1;
  }

  console.log(`[${label}] Migration complete. Migrated ${migrated}/${rows.length}.`);
}

async function run() {
  console.log('[migrateImagesToSupabase] Starting migration...');

  try {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
      throw new Error('SUPABASE_URL and SUPABASE_KEY environment variables are required.');
    }

    await migrateEvents();
    await migrateClubs();
    console.log('[migrateImagesToSupabase] Migration finished successfully.');
  } catch (error) {
    console.error('[migrateImagesToSupabase] Migration failed:', error);
    process.exitCode = 1;
  } finally {
    try {
      await pool.end();
    } catch (err) {
      console.warn('[migrateImagesToSupabase] Failed to close DB pool:', err.message);
    }
  }
}

if (require.main === module) {
  run();
}

module.exports = {
  migrateEvents,
  migrateClubs
};
