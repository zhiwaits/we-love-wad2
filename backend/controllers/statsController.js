const pool = require('../db');

// Get user statistics
exports.getUserStats = async (req, res) => {
  try {
    const userId = req.params.id;
    
    // Get upcoming RSVPs count
    const upcomingRSVPs = await pool.query(
      `SELECT COUNT(*) FROM rsvps r
       JOIN events e ON r.event_id = e.id
       WHERE r.user_id = $1 AND e.datetime > NOW()`,
      [userId]
    );
    
    // Get total attended count (past events)
    const totalAttended = await pool.query(
      `SELECT COUNT(*) FROM rsvps r
       JOIN events e ON r.event_id = e.id
       WHERE r.user_id = $1 AND e.datetime <= NOW()`,
      [userId]
    );
    
    // Get saved events count (you'll need to add a 'saved_events' table later)
    // For now, return 0
    const savedCount = 0;
    
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