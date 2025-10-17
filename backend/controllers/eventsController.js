const pool = require('../db');
const table = "events";
const fs = require('fs');
const path = require('path');

function ensureDir(p) {
  try {
    fs.mkdirSync(p, { recursive: true });
  } catch {}
}

function guessExtFromBase64(dataUrl) {
  if (typeof dataUrl !== 'string') return '';
  const m = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,/);
  if (!m) return '';
  const mime = m[1].toLowerCase();
  if (mime === 'image/jpeg' || mime === 'image/jpg') return '.jpg';
  if (mime === 'image/png') return '.png';
  if (mime === 'image/webp') return '.webp';
  if (mime === 'image/gif') return '.gif';
  return '';
}

function pickImageExtension(imageBase64, originalName) {
  const whitelist = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);
  const normalize = (ext) => {
    if (!ext) return '';
    const e = ext.toLowerCase();
    if (e === '.jpeg') return '.jpg';
    if (e === '.jfif') return '.jpg';
    return whitelist.has(e) ? e : '';
  };

  const fromName = normalize(path.extname(originalName || ''));
  if (fromName) return fromName;

  const fromMime = guessExtFromBase64(imageBase64);
  const normalizedMime = normalize(fromMime);
  if (normalizedMime) return normalizedMime;

  return '.png';
}

function formatDateISO(date) {
  if (!date) return null;
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatTimeHM(date) {
  if (!date) return null;
  const d = new Date(date);
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  return `${hours}:${minutes} ${ampm}`;
}

function formatTimeRange(start, end) {
  if (!start) return '';
  const startStr = formatTimeHM(start);
  if (!end) return startStr;
  const startD = new Date(start);
  const endD = new Date(end);
  const sameDay =
    startD.getFullYear() === endD.getFullYear() &&
    startD.getMonth() === endD.getMonth() &&
    startD.getDate() === endD.getDate();
  if (!sameDay) return startStr;
  return `${startStr} - ${formatTimeHM(end)}`;
}

function formatPriceTag(price) {
  if (price == null || Number(price) === 0) return 'FREE';
  const n = Number(price);
  const str = Number.isInteger(n) ? `${n}` : n.toFixed(2).replace(/\.00$/, '');
  return `$${str}`;
}

exports.getAllEvents = async (req, res) => {
  try {
    const query = `
      SELECT 
        e.id,
        e.title,
        e.description,
        e.datetime,
        e.enddatetime,
        e.location,
        e.category,
        e.capacity,
        e.image_url,
        e.owner_id,
        e.price,
        e.venue,
        p.name AS organiser_name,
        COALESCE(t.tags, '{}') AS tags,
        COALESCE(r.attendees, 0) AS attendees
      FROM ${table} e
      LEFT JOIN profiles p ON p.id = e.owner_id
      LEFT JOIN event_venues ev ON ev.name = e.venue
      LEFT JOIN (
        SELECT etm.event_id, array_agg(DISTINCT et.tag_name) AS tags
        FROM event_tag_map etm
        JOIN event_tags et ON et.id = etm.tag_id
        GROUP BY etm.event_id
      ) t ON t.event_id = e.id
      LEFT JOIN (
        SELECT event_id, COUNT(*) AS attendees
        FROM rsvps
        GROUP BY event_id
      ) r ON r.event_id = e.id
      ORDER BY e.datetime ASC
    `;
    const result = await pool.query(query);

    const shaped = result.rows.map((row) => ({
      id: row.id,
      title: row.title,
      organiser: row.organiser_name || 'Unknown',
      category: row.category || '',
      tags: Array.isArray(row.tags) ? row.tags : [],
      price: formatPriceTag(row.price),
      date: formatDateISO(row.datetime),
      time: formatTimeRange(row.datetime, row.enddatetime),
      location: row.location || '',
      venue: row.venue || '',
      attendees: Number(row.attendees) || 0,
      maxAttendees: row.capacity != null ? Number(row.capacity) : null,
      description: row.description || '',
      image: row.image_url || '',
      ownerId: row.owner_id || null
    }));

    res.json(shaped);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


exports.getEventById = async (req, res) => {
  try {
    const query = `
      SELECT 
        e.id,
        e.title,
        e.description,
        e.datetime,
        e.enddatetime,
        e.location,
        e.category,
        e.capacity,
        e.image_url,
        e.owner_id,
        e.price,
        e.venue,
        p.name AS organiser_name,
        COALESCE(t.tags, '{}') AS tags,
        COALESCE(r.attendees, 0) AS attendees
      FROM ${table} e
      LEFT JOIN profiles p ON p.id = e.owner_id
      LEFT JOIN event_venues ev ON ev.name = e.venue
      LEFT JOIN (
        SELECT etm.event_id, array_agg(DISTINCT et.tag_name) AS tags
        FROM event_tag_map etm
        JOIN event_tags et ON et.id = etm.tag_id
        GROUP BY etm.event_id
      ) t ON t.event_id = e.id
      LEFT JOIN (
        SELECT event_id, COUNT(*) AS attendees
        FROM rsvps
        GROUP BY event_id
      ) r ON r.event_id = e.id
      WHERE e.id = $1
      LIMIT 1
    `;
    const result = await pool.query(query, [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Event not found' });
    const row = result.rows[0];
    const shaped = {
      id: row.id,
      title: row.title,
      organiser: row.organiser_name || 'Unknown',
      category: row.category || '',
      tags: Array.isArray(row.tags) ? row.tags : [],
      price: formatPriceTag(row.price),
      date: formatDateISO(row.datetime),
      time: formatTimeRange(row.datetime, row.enddatetime),
      location: row.location || '',
      venue: row.venue || '',
      attendees: Number(row.attendees) || 0,
      maxAttendees: row.capacity != null ? Number(row.capacity) : null,
      description: row.description || '',
      image: row.image_url || '',
      ownerId: row.owner_id || null
    };
    res.json(shaped);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createEvent = async (req, res) => {
  const client = await pool.connect();
  let savedFilePath = null;
  try {
    const {
      title, description, datetime, location, category, capacity, owner_id, venue, enddatetime, price,
      imageBase64, imageOriginalName, tags
    } = req.body;

    if (!title || !description || !datetime || !location || !category || !owner_id || !venue) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    if (!imageBase64) {
      return res.status(400).json({ error: 'Event image is required' });
    }

    await client.query('BEGIN');
    const insertResult = await client.query(
      `INSERT INTO ${table} (title, description, datetime, location, category, capacity, owner_id, venue, enddatetime, price)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [title, description, datetime, location, category, capacity, owner_id, venue, enddatetime, price]
    );
    let event = insertResult.rows[0];
    console.log('[createEvent] Inserted event id:', event.id);

    const uploadsDir = path.resolve(__dirname, '../uploads/event');
    ensureDir(uploadsDir);

    const ext = pickImageExtension(imageBase64, imageOriginalName) || '.png';
    const finalFilename = `${event.id}${ext}`;
    const finalPath = path.join(uploadsDir, finalFilename);

    try { fs.unlinkSync(finalPath); } catch {}

    const base64PayloadRaw = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;
    const base64Payload = (base64PayloadRaw || '').replace(/\s+/g, '');
    if (!base64Payload || /[^A-Za-z0-9+/=]/.test(base64Payload)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Invalid image data' });
    }
    fs.writeFileSync(finalPath, Buffer.from(base64Payload, 'base64'));
    console.log('[createEvent] Saved image file to:', finalPath);
    savedFilePath = finalPath;

    const imageUrl = `/uploads/event/${finalFilename}`;
    const updateResult = await client.query(
      `UPDATE ${table} SET image_url = $1 WHERE id = $2 RETURNING *`,
      [imageUrl, event.id]
    );
    if (!updateResult.rows.length) {
      await client.query('ROLLBACK');
      try { fs.unlinkSync(savedFilePath); } catch {}
      return res.status(500).json({ error: 'Failed to update image_url in database' });
    }
    event = updateResult.rows[0];
    console.log('[createEvent] Updated image_url:', event.image_url);

    const normalizedTags = [];
    const seenTags = new Set();
    if (Array.isArray(tags)) {
      for (const rawTag of tags) {
        if (normalizedTags.length >= 10) break;
        if (rawTag == null) continue;
        const trimmed = String(rawTag).trim();
        if (!trimmed) continue;
        const key = trimmed.toLowerCase();
        if (seenTags.has(key)) continue;
        seenTags.add(key);
        normalizedTags.push({ key, name: trimmed });
      }
    }

    let finalTagNames = [];
    if (normalizedTags.length) {
      const lowerNames = normalizedTags.map((t) => t.key);
      const existingTagsResult = await client.query(
        `SELECT id, tag_name FROM event_tags WHERE LOWER(tag_name) = ANY($1::text[])`,
        [lowerNames]
      );

      const tagIdByLower = new Map();
      existingTagsResult.rows.forEach((row) => {
        tagIdByLower.set(row.tag_name.toLowerCase(), { id: row.id, name: row.tag_name });
      });

      const tagIds = [];
      for (const tag of normalizedTags) {
        let stored = tagIdByLower.get(tag.key);
        if (!stored) {
          const inserted = await client.query(
            `INSERT INTO event_tags (tag_name) VALUES ($1) RETURNING id, tag_name`,
            [tag.name]
          );
          stored = { id: inserted.rows[0].id, name: inserted.rows[0].tag_name };
          tagIdByLower.set(stored.name.toLowerCase(), stored);
        }
        tagIds.push(stored.id);
      }

      const uniqueTagIds = [...new Set(tagIds)];
      for (const tagId of uniqueTagIds) {
        await client.query(
          `INSERT INTO event_tag_map (event_id, tag_id)
           SELECT $1, $2
           WHERE NOT EXISTS (
             SELECT 1 FROM event_tag_map WHERE event_id = $1 AND tag_id = $2
           )`,
          [event.id, tagId]
        );
      }

      const allTagIds = uniqueTagIds;
      if (allTagIds.length) {
        const tagNamesResult = await client.query(
          `SELECT tag_name FROM event_tags WHERE id = ANY($1::int[]) ORDER BY tag_name ASC`,
          [allTagIds]
        );
        finalTagNames = tagNamesResult.rows.map((r) => r.tag_name);
      }
    }

    await client.query('COMMIT');
    console.log('[createEvent] Commit successful for event id:', event.id);
    const responsePayload = { ...event, tags: finalTagNames };
    res.status(201).json(responsePayload);
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch {}
    if (savedFilePath) {
      try { fs.unlinkSync(savedFilePath); } catch {}
    }
    console.error('Create event failed:', err);
    res.status(500).json({ error: 'Failed to create event' });
  } finally {
    client.release();
  }
};


exports.updateEvent = async (req, res) => {
  const { id } = req.params;
  const {
    title, description, datetime, location, category, capacity, image_url, owner_id, venue, enddatetime, price
  } = req.body;
  try {
    const result = await pool.query(
      `UPDATE ${table} SET title=$1, description=$2, datetime=$3, location=$4,
       category=$5, capacity=$6, image_url=$7, owner_id=$8, venue=$9, enddatetime=$10, price=$11 WHERE id=$12 RETURNING *`,
      [title, description, datetime, location, category, capacity, image_url, owner_id, venue, enddatetime, price, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Event not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


exports.deleteEvent = async (req, res) => {
  try {
    const result = await pool.query(`DELETE FROM ${table} WHERE id = $1 RETURNING *`, [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Event not found' });
    res.json({ message: 'Event deleted', event: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};