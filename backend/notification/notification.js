require('dotenv').config();
const nodemailer = require('nodemailer');
const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

//read env
const SMTP_USER = process.env.SMTP_USER
const SMTP_PASS = process.env.SMTP_PASS

//validation
if (!SMTP_USER || !SMTP_PASS) {
  console.error(
    'SMTP Error'
  );
  process.exit(1);
}

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Supabase Error');
  process.exit(1);
}

//create transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// Create Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const sanitizeInput = (value) => {
  if (value === null || value === undefined) {
    return '';
  }
  return String(value).replace(/[<>]/g, '').trim();
};

const formatEventDateTime = (value) => {
  if (!value) {
    return 'Unknown date';
  }
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return 'Unknown date';
    }
    return date.toLocaleString('en-SG', { timeZone: 'Asia/Singapore' });
  } catch (error) {
    return 'Unknown date';
  }
};

// Email test
// async function sendEmail() {
//   const info = await transporter.sendMail({
//     from: `"SMU Events Hub" <${process.env.SMTP_USER}>`,
//     to: 'terry.yeo.2024@scis.smu.edu.sg',
//     subject: 'Hello!',
//     text: 'SMU Events Hub Testing.'
//   });

//   console.log('Email sent:');
// }

// sendEmail().catch(console.error);

// Send confirmation email when user registers
async function sendRegistrationConfirmation(userEmail, userName, eventTitle, eventDatetime, eventLocation, eventVenue) {
  const info = await transporter.sendMail({
    from: `"SMU Events Hub" <${SMTP_USER}>`,
    to: userEmail,
    subject: `Registration Confirmed: ${eventTitle}`,
    html: `
      <h2>Registration Confirmed!</h2>
      <p>Hi ${userName},</p>
      <p>You have successfully registered for <strong>${eventTitle}</strong>.</p>
      <p><strong>Event Date:</strong> ${new Date(eventDatetime).toLocaleString()}</p>
      ${eventLocation ? `<p><strong>Location:</strong> ${eventLocation}</p>` : ''}
      ${eventVenue ? `<p><strong>Venue:</strong> ${eventVenue}</p>` : ''}
      <p>We look forward to seeing you there!</p>
      <br>
      <p>Best regards,<br>SMU Events Hub</p>
    `
  });

  console.log('Confirmation email sent to:', userEmail);
  return info;
}

// Send reminder email 24h before event
async function sendEventReminder(userEmail, userName, eventTitle, eventDatetime, eventLocation, eventVenue) {
  const info = await transporter.sendMail({
    from: `"SMU Events Hub" <${SMTP_USER}>`,
    to: userEmail,
    subject: `Reminder: ${eventTitle} is Tomorrow!`,
    html: `
      <h2>Event Reminder</h2>
      <p>Hi ${userName},</p>
      <p>This is a friendly reminder that you're registered for <strong>${eventTitle}</strong>.</p>
      <p><strong>Event Date:</strong> ${new Date(eventDatetime).toLocaleString()}</p>
      ${eventLocation ? `<p><strong>Location:</strong> ${eventLocation}</p>` : ''}
      ${eventVenue ? `<p><strong>Venue:</strong> ${eventVenue}</p>` : ''}
      <p>See you soon!</p>
      <br>
      <p>Best regards,<br>SMU Events Hub</p>
    `
  });

  console.log('Reminder email sent to:', userEmail);
  return info;
}

// Send confirmation email based on user_id and event_id
async function sendConfirmationEmail(userId, eventId) {
  try {
    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('email, name')
      .eq('id', userId)
      .single();

    if (profileError) throw profileError;

    // Get event details
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('title, datetime, location, venue')
      .eq('id', eventId)
      .single();

    if (eventError) throw eventError;

    await sendRegistrationConfirmation(
      profile.email,
      profile.name,
      event.title,
      event.datetime,
      event.location,
      event.venue
    );

    return { success: true };
  } catch (error) {
    console.error('Error sending confirmation:', error);
    throw error;
  }
}

// Check for events happening in 24 hours and send reminders
async function sendRemindersFor24HourEvents() {
  try {
    // Calculate the time window (24 hours from now, with 1 hour buffer)
    const now = new Date();
    const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const twentyThreeHoursFromNow = new Date(now.getTime() + 23 * 60 * 60 * 1000);

    // Fetch events happening in 24 hours
    const { data: upcomingEvents, error: eventsError } = await supabase
      .from('events')
      .select('*')
      .gte('datetime', twentyThreeHoursFromNow.toISOString())
      .lte('datetime', twentyFourHoursFromNow.toISOString());

    if (eventsError) throw eventsError;

    console.log(`Found ${upcomingEvents?.length || 0} events in the next 24 hours`);

    if (!upcomingEvents || upcomingEvents.length === 0) {
      console.log('No upcoming events to send reminders for');
      return;
    }

    let reminderCount = 0;

    // For each upcoming event, get all RSVPs
    for (const event of upcomingEvents) {
      // Get RSVPs for this event
      const { data: rsvps, error: rsvpsError } = await supabase
        .from('rsvps')
        .select('user_id')
        .eq('event_id', event.id)
        .eq('status', 'confirmed');

      if (rsvpsError) {
        console.error(`Error fetching RSVPs for event ${event.id}:`, rsvpsError);
        continue;
      }

      // Get unique user IDs
      const userIds = rsvps.map(rsvp => rsvp.user_id);

      if (userIds.length === 0) continue;

      // Fetch all user profiles for these RSVPs
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, name')
        .in('id', userIds);

      if (profilesError) {
        console.error(`Error fetching profiles for event ${event.id}:`, profilesError);
        continue;
      }

      // Send reminder to each registered user
      for (const profile of profiles || []) {
        try {
          await sendEventReminder(
            profile.email,
            profile.name,
            event.title,
            event.datetime,
            event.location,
            event.venue
          );
          reminderCount++;
        } catch (emailError) {
          console.error(`Failed to send reminder to ${profile.email}:`, emailError);
        }
      }
    }

    console.log(`Sent ${reminderCount} reminder emails successfully`);
  } catch (error) {
    console.error('Error sending reminders:', error);
  }
}

async function sendRsvpConfirmationEmail(userEmail, userName, eventTitle, confirmationLink) {

  const info = await transporter.sendMail({

    from: `"SMU Events Hub" <${SMTP_USER}>`,

    to: userEmail,

    subject: `Confirm Your RSVP for: ${eventTitle}`,

    html: `

      <h2>Confirm Your RSVP</h2>

      <p>Hi ${userName},</p>

      <p>Please confirm your RSVP for <strong>${eventTitle}</strong> by clicking the link below:</p>

      <p><a href="${confirmationLink}">Confirm RSVP</a></p>

      <p>If you did not request this, please ignore this email.</p>

      <br>

      <p>Best regards,<br>SMU Events Hub</p>

    `

  });



  console.log('RSVP confirmation email sent to:', userEmail);

  return info;

}



async function sendEventCancellationEmail(userEmail, userName, eventTitle, eventDatetime, eventLocation, eventVenue, cancellationReason) {
  const safeReason = sanitizeInput(cancellationReason);
  const reasonHtml = safeReason
    ? `<p><strong>Reason provided:</strong><br>${safeReason.replace(/\r?\n/g, '<br>')}</p>`
    : '<p>The organiser did not provide a specific reason for the cancellation.</p>';

  const info = await transporter.sendMail({
    from: `"SMU Events Hub" <${SMTP_USER}>`,
    to: userEmail,
    subject: `Event Cancelled: ${eventTitle}`,
    html: `
      <h2>Event Cancelled</h2>
      <p>Hi ${userName},</p>
      <p>We regret to inform you that the event <strong>${eventTitle}</strong> has been cancelled.</p>
      <p><strong>Originally scheduled for:</strong> ${formatEventDateTime(eventDatetime)}</p>
      ${eventLocation ? `<p><strong>Location:</strong> ${eventLocation}</p>` : ''}
      ${eventVenue ? `<p><strong>Venue:</strong> ${eventVenue}</p>` : ''}
      ${reasonHtml}
      <p>We apologise for any inconvenience caused.</p>
      <br>
      <p>Best regards,<br>SMU Events Hub</p>
    `
  });

  console.log('Cancellation email sent to:', userEmail);
  return info;
}



if (require.main === module) {

  sendRemindersFor24HourEvents().catch(console.error);

}



module.exports = {

    sendRegistrationConfirmation,

    sendEventReminder,

    sendConfirmationEmail,

    sendRemindersFor24HourEvents,

  sendRsvpConfirmationEmail,

  sendEventCancellationEmail

};


