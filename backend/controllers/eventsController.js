const pool = require('../db');
const table = "events";

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

function deriveVenue(location) {
  if (!location) return 'Off-Campus';
  const loc = String(location);
  const l = loc.toLowerCase();
  if (l.includes('zoom') || l.includes('virtual') || l.includes('online')) return 'Online';
  if (l.includes('connex')) return 'Connex';
  if (l.includes('lkcsb')) return 'LKCSB';
  if (l.includes('soe') || l.includes('scis')) return 'SOE/SCIS';
  return 'Off-Campus';
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
                e.price,
                p.name AS organiser_name,
                COALESCE(t.tags, '{}') AS tags,
                COALESCE(r.attendees, 0) AS attendees,
                v.latitude,
                v.altitude
            FROM ${table} e
            LEFT JOIN profiles p ON p.id = e.owner_id
            LEFT JOIN event_venues v ON v.name = CASE
                WHEN LOWER(e.location) LIKE '%zoom%' OR LOWER(e.location) LIKE '%online%' OR LOWER(e.location) LIKE '%virtual%' THEN 'Virtual'
                WHEN LOWER(e.location) LIKE '%connex%' THEN 'Connexion'
                WHEN LOWER(e.location) LIKE '%lkcsb%' THEN 'LKCSB'
                WHEN LOWER(e.location) LIKE '%soe%' OR LOWER(e.location) LIKE '%scis%' THEN 'SOE/SCIS2'
                WHEN LOWER(e.location) LIKE '%business%' THEN 'SOB'
                WHEN LOWER(e.location) LIKE '%jetty%' THEN 'Off-Campus'
                ELSE 'Off-Campus'
            END
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
            venue: deriveVenue(row.location),
            attendees: Number(row.attendees) || 0,
            maxAttendees: row.capacity != null ? Number(row.capacity) : null,
            description: row.description || '',
            image: row.image_url || '',
            latitude: row.latitude,
            altitude: row.altitude
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
                e.price,
                p.name AS organiser_name,
                COALESCE(t.tags, '{}') AS tags,
                COALESCE(r.attendees, 0) AS attendees,
                v.latitude,
                v.altitude
            FROM ${table} e
            LEFT JOIN profiles p ON p.id = e.owner_id
            LEFT JOIN event_venues v ON v.name = CASE
                WHEN LOWER(e.location) LIKE '%zoom%' OR LOWER(e.location) LIKE '%online%' OR LOWER(e.location) LIKE '%virtual%' THEN 'Virtual'
                WHEN LOWER(e.location) LIKE '%connex%' THEN 'Connexion'
                WHEN LOWER(e.location) LIKE '%lkcsb%' THEN 'LKCSB'
                WHEN LOWER(e.location) LIKE '%soe%' OR LOWER(e.location) LIKE '%scis%' THEN 'SOE/SCIS2'
                WHEN LOWER(e.location) LIKE '%business%' THEN 'SOB'
                WHEN LOWER(e.location) LIKE '%jetty%' THEN 'Off-Campus'
                ELSE 'Off-Campus'
            END
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
            venue: deriveVenue(row.location),
            attendees: Number(row.attendees) || 0,
            maxAttendees: row.capacity != null ? Number(row.capacity) : null,
            description: row.description || '',
            image: row.image_url || '',
            latitude: row.latitude,
            altitude: row.altitude
        };

        res.json(shaped);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};


exports.createEvent = async (req, res) => {
  try {
    const {
      title, description, datetime, location, category, capacity, image_url, owner_id, enddatetime, price
    } = req.body;
    const result = await pool.query(
      `INSERT INTO ${table} (title, description, datetime, location, category, capacity, image_url, owner_id, enddatetime, price)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [title, description, datetime, location, category, capacity, image_url, owner_id, enddatetime, price]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


exports.updateEvent = async (req, res) => {
  const { id } = req.params;
  const {
    title, description, datetime, location, category, capacity, image_url, owner_id, enddatetime, price
  } = req.body;
  try {
    const result = await pool.query(
      `UPDATE ${table} SET title=$1, description=$2, datetime=$3, location=$4,
       category=$5, capacity=$6, image_url=$7, owner_id=$8, enddatetime=$10, price=$11 WHERE id=$9 RETURNING *`,
      [title, description, datetime, location, category, capacity, image_url, owner_id, id, enddatetime, price]
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