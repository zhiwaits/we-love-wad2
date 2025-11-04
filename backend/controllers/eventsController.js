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
  const d = new Date(date + '+08:00');
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatTimeHM(date) {
  if (!date) return null;
  const d = new Date(date + '+08:00');
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
  const startD = new Date(start + '+08:00');
  const endD = new Date(end + '+08:00');
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

function convertToSGTime(isoString) {
  if (!isoString) return null;
  const date = new Date(isoString);
  return date.toLocaleString('sv-SE', { timeZone: 'Asia/Singapore' }).replace(',', '');
}

exports.getAllEvents = async (req, res) => {
  try {
    // Pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 1000; // Default to large number for backwards compatibility
    const offset = (page - 1) * limit;

    // Filter parameters
    const searchQuery = req.query.search || '';
    const categories = req.query.categories ? req.query.categories.split(',') : [];
    const eventStatus = req.query.eventStatus || 'both'; // 'upcoming', 'past', or 'both'
    const priceFilter = req.query.priceFilter || 'all';
    const minPrice = req.query.minPrice ? parseFloat(req.query.minPrice) : null;
    const maxPrice = req.query.maxPrice ? parseFloat(req.query.maxPrice) : null;
    const venueFilter = req.query.venueFilter || 'all';
    const locationQuery = req.query.locationQuery || '';
    const clubCategoryId = req.query.clubCategoryId || 'all';
    const specificDate = req.query.specificDate || null;
    const dateRangeStart = req.query.dateRangeStart || null;
    const dateRangeEnd = req.query.dateRangeEnd || null;

    // Build WHERE clause conditions
    const conditions = [];
    const params = [];
    let paramIndex = 1;

    // Search query filter (title, description, organiser name)
    if (searchQuery) {
      params.push(`%${searchQuery}%`);
      conditions.push(`(
        LOWER(e.title) LIKE LOWER($${paramIndex}) OR
        LOWER(e.description) LIKE LOWER($${paramIndex}) OR
        LOWER(p.name) LIKE LOWER($${paramIndex})
      )`);
      paramIndex++;
    }

    // Category filter
    if (categories.length > 0) {
      params.push(categories);
      conditions.push(`e.category = ANY($${paramIndex}::text[])`);
      paramIndex++;
    }

    // Event status filter (upcoming/past)
    if (eventStatus === 'upcoming') {
      conditions.push(`e.datetime > NOW()`);
    } else if (eventStatus === 'past') {
      conditions.push(`e.datetime <= NOW()`);
    }

    // Price filter
    if (priceFilter === 'free') {
      conditions.push(`(e.price IS NULL OR e.price = 0)`);
    } else if (priceFilter === 'paid') {
      conditions.push(`(e.price IS NOT NULL AND e.price > 0)`);
    } else if (priceFilter === 'custom' && minPrice !== null && maxPrice !== null) {
      params.push(minPrice, maxPrice);
      conditions.push(`e.price BETWEEN $${paramIndex} AND $${paramIndex + 1}`);
      paramIndex += 2;
    }

    // Venue filter
    if (venueFilter !== 'all') {
      params.push(venueFilter);
      conditions.push(`e.venue = $${paramIndex}`);
      paramIndex++;
    }

    // Location query filter
    if (locationQuery) {
      params.push(`%${locationQuery}%`);
      conditions.push(`LOWER(e.location) LIKE LOWER($${paramIndex})`);
      paramIndex++;
    }

    // Club category filter
    if (clubCategoryId !== 'all') {
      params.push(parseInt(clubCategoryId));
      conditions.push(`p.club_category_id = $${paramIndex}`);
      paramIndex++;
    }

    // Date filter
    if (specificDate) {
      params.push(specificDate);
      conditions.push(`DATE(e.datetime) = $${paramIndex}`);
      paramIndex++;
    } else if (dateRangeStart && dateRangeEnd) {
      params.push(dateRangeStart, dateRangeEnd);
      conditions.push(`DATE(e.datetime) BETWEEN $${paramIndex} AND $${paramIndex + 1}`);
      paramIndex += 2;
    }

    // Build WHERE clause
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get total count for pagination metadata with filters
    const countQuery = `
      SELECT COUNT(*) FROM ${table} e
      LEFT JOIN profiles p ON p.id = e.owner_id
      ${whereClause}
    `;
    const countResult = await pool.query(countQuery, params);
    const totalEvents = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalEvents / limit);

    // Get paginated events with filters
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
        e.latitude,
        e.altitude,
        p.name AS organiser_name,
        p.club_category_id AS club_category_id,
        cc.name AS club_category_name,
        COUNT(CASE WHEN r.status = 'confirmed' THEN 1 END) as confirmed_attendees
      FROM ${table} e
      LEFT JOIN profiles p ON p.id = e.owner_id
      LEFT JOIN club_categories cc ON cc.id = p.club_category_id
      LEFT JOIN rsvps r ON r.event_id = e.id AND r.status = 'confirmed'
      ${whereClause}
      GROUP BY e.id, e.title, e.description, e.datetime, e.enddatetime, e.location, e.category, e.capacity, e.image_url, e.owner_id, e.price, e.venue, e.latitude, e.altitude, p.name, p.club_category_id, cc.name
      ORDER BY e.datetime ASC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    params.push(limit, offset);
    const result = await pool.query(query, params);

    const shaped = result.rows.map((row) => {
      const numericPrice = row.price != null && !Number.isNaN(Number(row.price))
        ? Number(row.price)
        : null;

      return {
        id: row.id,
        title: row.title,
        organiser: row.organiser_name || 'Unknown',
        category: row.category || '',
        tags: [],
        price: formatPriceTag(row.price),
        priceValue: numericPrice,
        date: formatDateISO(row.datetime),
        datetime: row.datetime, // Keep full datetime for frontend filtering
        time: formatTimeRange(row.datetime, row.enddatetime),
        location: row.location || '',
        venue: row.venue || '',
        attendees: Number(row.confirmed_attendees) || 0,
        maxAttendees: row.capacity != null ? Number(row.capacity) : null,
        description: row.description || '',
        image: row.image_url || '',
        latitude: row.latitude,
        altitude: row.altitude,
        ownerId: row.owner_id,
        clubCategoryId: row.club_category_id != null ? Number(row.club_category_id) : null,
        clubCategoryName: row.club_category_name || ''
      };
    });

    // Return events with pagination metadata
    res.json({
      events: shaped,
      pagination: {
        currentPage: page,
        totalPages: totalPages,
        totalEvents: totalEvents,
        eventsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1
      }
    });
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
        e.latitude,
        e.altitude,
        p.name AS organiser_name,
        COUNT(CASE WHEN r.status = 'confirmed' THEN 1 END) as confirmed_attendees
      FROM ${table} e
      LEFT JOIN profiles p ON p.id = e.owner_id
      LEFT JOIN rsvps r ON r.event_id = e.id AND r.status = 'confirmed'
      WHERE e.id = $1
      GROUP BY e.id, e.title, e.description, e.datetime, e.enddatetime, e.location, e.category, e.capacity, e.image_url, e.owner_id, e.price, e.venue, e.latitude, e.altitude, p.name
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
      tags: [],
      price: formatPriceTag(row.price),
      date: formatDateISO(row.datetime),
      datetime: row.datetime, // Keep full datetime for frontend filtering
      time: formatTimeRange(row.datetime, row.enddatetime),
      location: row.location || '',
      venue: row.venue || '',
      attendees: Number(row.confirmed_attendees) || 0,
      maxAttendees: row.capacity != null ? Number(row.capacity) : null,
      description: row.description || '',
      image: row.image_url || '',
      latitude: row.latitude,
      altitude: row.altitude,
      ownerId: row.owner_id
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
      latitude = null, altitude = null, imageBase64, imageOriginalName, tags
    } = req.body;

    const sgDatetime = convertToSGTime(datetime);
    const sgEnddatetime = convertToSGTime(enddatetime);

    if (!title || !description || !sgDatetime || !location || !category || !owner_id || !venue) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    if (!imageBase64) {
      return res.status(400).json({ error: 'Event image is required' });
    }

    await client.query('BEGIN');
    const insertResult = await client.query(
      `INSERT INTO ${table} (title, description, datetime, location, category, capacity, owner_id, venue, enddatetime, price, latitude, altitude)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
      [title, description, sgDatetime, location, category, capacity, owner_id, venue, sgEnddatetime, price, latitude, altitude]
    );
    let event = insertResult.rows[0];
    console.log('[createEvent] Inserted event id:', event.id);

    const uploadsDir = path.resolve(__dirname, '../uploads/event');
    ensureDir(uploadsDir);

    const ext = pickImageExtension(imageBase64, imageOriginalName) || '.png';
    const timestamp = Date.now(); // Add timestamp for consistency
    const finalFilename = `${event.id}_${timestamp}${ext}`;
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

    const profileResult = await pool.query('SELECT name FROM profiles WHERE id = $1', [event.owner_id]);
    const organiserName = profileResult.rows[0]?.name || 'Unknown';

    const responsePayload = {
      id: event.id,
      title: event.title,
      organiser: organiserName,
      category: event.category || '',
      tags: finalTagNames,
      price: formatPriceTag(event.price),
      date: formatDateISO(event.datetime),
      time: formatTimeRange(event.datetime, event.enddatetime),
      location: event.location || '',
      venue: event.venue || '',
      attendees: 0,
      maxAttendees: event.capacity != null ? Number(event.capacity) : null,
      description: event.description || '',
      image: event.image_url || '',
      latitude: event.latitude,
      altitude: event.altitude,
      ownerId: event.owner_id
    };
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
    title, description, datetime, location, category, capacity, image_url, owner_id, venue, enddatetime, price,
    latitude = null, altitude = null, imageBase64, imageOriginalName
  } = req.body;

  const sgDatetime = convertToSGTime(datetime);
  const sgEnddatetime = convertToSGTime(enddatetime);
  try {
    const normalizedCapacity = capacity === null || capacity === '' || typeof capacity === 'undefined'
      ? null
      : Number(capacity);

    if (normalizedCapacity !== null && !Number.isFinite(normalizedCapacity)) {
      return res.status(400).json({ error: 'Capacity must be a valid number or left empty.' });
    }

    if (normalizedCapacity !== null) {
      const confirmedResult = await pool.query(
        `SELECT COUNT(*)::int AS confirmed_count
         FROM rsvps
         WHERE event_id = $1 AND status = 'confirmed'`,
        [id]
      );

      const confirmedCount = confirmedResult.rows[0]?.confirmed_count || 0;

      if (normalizedCapacity < confirmedCount) {
        return res.status(409).json({
          error: `Capacity (${normalizedCapacity}) cannot be lower than current confirmed attendees (${confirmedCount}).`
        });
      }
    }

    let finalImageUrl = image_url;

    if (imageBase64 && imageOriginalName) {
      const eventDir = path.join(__dirname, '..', 'uploads', 'event');
      ensureDir(eventDir);
      const ext = pickImageExtension(imageBase64, imageOriginalName);
      const timestamp = Date.now(); // Add timestamp to ensure unique filename
      const filename = `${id}_${timestamp}${ext}`;
      const filepath = path.join(eventDir, filename);
      const base64Data = imageBase64.replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, '');
      fs.writeFileSync(filepath, base64Data, 'base64');
      finalImageUrl = `/uploads/event/${filename}`;
    }

    const result = await pool.query(
      `UPDATE ${table} SET title=$1, description=$2, datetime=$3, location=$4,
       category=$5, capacity=$6, image_url=$7, owner_id=$8, venue=$9, enddatetime=$10, price=$11, latitude=$12, altitude=$13 WHERE id=$14 RETURNING *`,
      [title, description, sgDatetime, location, category, normalizedCapacity, finalImageUrl, owner_id, venue, sgEnddatetime, price, latitude, altitude, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Event not found' });

    // Get the updated event with organiser info and attendee count
    const updatedRow = result.rows[0];
    const fullQuery = `
      SELECT
        e.*,
        p.name AS organiser_name,
        COUNT(CASE WHEN r.status = 'confirmed' THEN 1 END) as confirmed_attendees
      FROM ${table} e
      LEFT JOIN profiles p ON p.id = e.owner_id
      LEFT JOIN rsvps r ON r.event_id = e.id AND r.status = 'confirmed'
      WHERE e.id = $1
      GROUP BY e.id, p.name
    `;
    const fullResult = await pool.query(fullQuery, [id]);
    const row = fullResult.rows[0];

    // Shape the response to match getAllEvents/getEventById format
    const shaped = {
      id: row.id,
      title: row.title,
      organiser: row.organiser_name || 'Unknown',
      category: row.category || '',
      tags: [], // Tags would need separate query, keeping empty for now
      price: formatPriceTag(row.price),
      date: formatDateISO(row.datetime),
      datetime: row.datetime,
      time: formatTimeRange(row.datetime, row.enddatetime),
      location: row.location || '',
      venue: row.venue || '',
      attendees: Number(row.confirmed_attendees) || 0,
      maxAttendees: row.capacity != null ? Number(row.capacity) : null,
      description: row.description || '',
      image: row.image_url || '',
      latitude: row.latitude,
      altitude: row.altitude,
      ownerId: row.owner_id
    };

    res.json(shaped);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


exports.deleteEvent = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const eventId = req.params.id;

    // Delete all RSVPs for this event
    await client.query('DELETE FROM rsvps WHERE event_id = $1', [eventId]);

    // Delete all saved events for this event
    await client.query('DELETE FROM event_saved WHERE event_id = $1', [eventId]);

    // Delete all event tags for this event
    await client.query('DELETE FROM event_tag_map WHERE event_id = $1', [eventId]);

    // Finally, delete the event
    const result = await client.query(`DELETE FROM ${table} WHERE id = $1 RETURNING *`, [eventId]);
    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Event not found' });
    }

    await client.query('COMMIT');
    res.json({ message: 'Event and all related data deleted successfully', event: result.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
};