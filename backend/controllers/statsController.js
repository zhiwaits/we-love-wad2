const pool = require('../db');

// Get user statistics
exports.getUserStats = async (req, res) => {
  try {
    const userId = req.params.id;
    
    // Get upcoming RSVPs count (only confirmed RSVPs)
    const upcomingRSVPs = await pool.query(
      `SELECT COUNT(*) FROM rsvps r
       JOIN events e ON r.event_id = e.id
       WHERE r.user_id = $1 AND e.datetime > NOW() AND r.status = 'confirmed'`,
      [userId]
    );
    
    // Get total attended count (past events)
    const totalAttended = await pool.query(
      `SELECT COUNT(*) FROM rsvps r
       JOIN events e ON r.event_id = e.id
       WHERE r.user_id = $1 AND e.datetime <= NOW()`,
      [userId]
    );
    
    // Get saved events count from event_saved table
    const savedCountResult = await pool.query(
      `SELECT COUNT(*) FROM event_saved WHERE user_id = $1`,
      [userId]
    );
    const savedCount = parseInt(savedCountResult.rows[0].count);
    
    // Get clubs followed count (from user_follows table)
    const clubsFollowed = await pool.query(
      `SELECT COUNT(DISTINCT followed_club_id) FROM user_follows
       WHERE follower_id = $1`,
      [userId]
    );
    
    res.json({
      upcomingRSVPs: parseInt(upcomingRSVPs.rows[0].count),
      totalAttended: parseInt(totalAttended.rows[0].count),
      savedCount: savedCount,
      clubsFollowed: parseInt(clubsFollowed.rows[0].count)
    });
    
  } catch (err) {
    console.error('Error fetching user stats:', err);
    res.status(500).json({ error: err.message });
  }
};

// Get club statistics
exports.getClubStats = async (req, res) => {
  try {
    const clubId = req.params.id;

    const upcomingEvents = await pool.query(
      `SELECT COUNT(*) FROM events
       WHERE owner_id = $1 AND datetime > NOW()`,
      [clubId]
    );

    const totalEvents = await pool.query(
      `SELECT COUNT(*) FROM events
       WHERE owner_id = $1`,
      [clubId]
    );

    const currentRSVPs = await pool.query(
      `SELECT COUNT(*) FROM rsvps r
       JOIN events e ON r.event_id = e.id
       WHERE e.owner_id = $1 AND e.datetime > NOW()`,
      [clubId]
    );

    const followers = await pool.query(
      `SELECT COUNT(*) FROM user_follows
       WHERE followed_club_id = $1`,
      [clubId]
    );

    res.json({
      upcomingEvents: parseInt(upcomingEvents.rows[0].count, 10) || 0,
      totalEvents: parseInt(totalEvents.rows[0].count, 10) || 0,
      currentRSVPs: parseInt(currentRSVPs.rows[0].count, 10) || 0,
      followers: parseInt(followers.rows[0].count, 10) || 0
    });
  } catch (err) {
    console.error('Error fetching club stats:', err);
    res.status(500).json({ error: err.message });
  }
};