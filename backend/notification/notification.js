// ============================================
// RabbitMQ Configuration and Setup
// ============================================

const amqp = require('amqplib');

// RabbitMQ connection configuration
const RABBITMQ_CONFIG = {
  url: process.env.RABBITMQ_URL || 'amqp://localhost',
  exchanges: {
    events: 'events.exchange',
    notifications: 'notifications.exchange'
  },
  queues: {
    eventConfirmations: 'event.confirmations',
    eventReminders: 'event.reminders',
    weeklyDigest: 'event.weekly.digest',
    announcements: 'event.announcements',
    rsvpUpdates: 'event.rsvp.updates',
    waitlistNotifications: 'event.waitlist'
  }
};

// ============================================
// Message Producer - Publishes messages to RabbitMQ
// ============================================

class EventMessageProducer {
  constructor() {
    this.connection = null;
    this.channel = null;
  }

  async connect() {
    try {
      this.connection = await amqp.connect(RABBITMQ_CONFIG.url);
      this.channel = await this.connection.createChannel();
      
      // Assert exchanges
      await this.channel.assertExchange(
        RABBITMQ_CONFIG.exchanges.notifications,
        'topic',
        { durable: true }
      );
      
      console.log('RabbitMQ Producer connected successfully');
    } catch (error) {
      console.error('Failed to connect to RabbitMQ:', error);
      throw error;
    }
  }

  async publishMessage(routingKey, message) {
    try {
      if (!this.channel) {
        await this.connect();
      }

      const messageBuffer = Buffer.from(JSON.stringify(message));
      
      this.channel.publish(
        RABBITMQ_CONFIG.exchanges.notifications,
        routingKey,
        messageBuffer,
        {
          persistent: true,
          contentType: 'application/json',
          timestamp: Date.now()
        }
      );

      console.log(`Message published to ${routingKey}:`, message.type);
    } catch (error) {
      console.error('Error publishing message:', error);
      throw error;
    }
  }

  // Send event confirmation notification
  async sendEventConfirmation(eventData, userData) {
    const message = {
      type: 'EVENT_CONFIRMATION',
      timestamp: new Date().toISOString(),
      data: {
        userId: userData.id,
        userEmail: userData.email,
        userName: userData.name,
        eventId: eventData.id,
        eventTitle: eventData.title,
        eventDate: eventData.date,
        eventTime: eventData.time,
        eventLocation: eventData.location,
        eventDescription: eventData.description
      }
    };

    await this.publishMessage('notification.event.confirmation', message);
  }

  // Send event reminder (24 hours before)
  async sendEventReminder(eventData, userData) {
    const message = {
      type: 'EVENT_REMINDER',
      timestamp: new Date().toISOString(),
      data: {
        userId: userData.id,
        userEmail: userData.email,
        userName: userData.name,
        eventId: eventData.id,
        eventTitle: eventData.title,
        eventDate: eventData.date,
        eventTime: eventData.time,
        eventLocation: eventData.location,
        mapsLink: eventData.mapsLink
      }
    };

    await this.publishMessage('notification.event.reminder', message);
  }

  // Send weekly digest of recommended events
  async sendWeeklyDigest(userData, recommendedEvents) {
    const message = {
      type: 'WEEKLY_DIGEST',
      timestamp: new Date().toISOString(),
      data: {
        userId: userData.id,
        userEmail: userData.email,
        userName: userData.name,
        events: recommendedEvents,
        weekStart: new Date().toISOString()
      }
    };

    await this.publishMessage('notification.weekly.digest', message);
  }

  // Send organizer announcement
  async sendAnnouncement(eventData, announcement, attendees) {
    const message = {
      type: 'ORGANIZER_ANNOUNCEMENT',
      timestamp: new Date().toISOString(),
      data: {
        eventId: eventData.id,
        eventTitle: eventData.title,
        announcement: announcement,
        attendees: attendees
      }
    };

    await this.publishMessage('notification.announcement', message);
  }

  // Send waitlist status update
  async sendWaitlistUpdate(eventData, userData, status) {
    const message = {
      type: 'WAITLIST_UPDATE',
      timestamp: new Date().toISOString(),
      data: {
        userId: userData.id,
        userEmail: userData.email,
        userName: userData.name,
        eventId: eventData.id,
        eventTitle: eventData.title,
        status: status, // 'ADDED', 'APPROVED', 'SPOT_AVAILABLE'
        eventDate: eventData.date,
        eventTime: eventData.time
      }
    };

    await this.publishMessage('notification.waitlist.update', message);
  }

  // Send RSVP update (cancellation, event changes)
  async sendRsvpUpdate(eventData, userData, updateType, changes) {
    const message = {
      type: 'RSVP_UPDATE',
      timestamp: new Date().toISOString(),
      data: {
        userId: userData.id,
        userEmail: userData.email,
        userName: userData.name,
        eventId: eventData.id,
        eventTitle: eventData.title,
        updateType: updateType, // 'EVENT_UPDATED', 'EVENT_CANCELLED', 'RSVP_CANCELLED'
        changes: changes
      }
    };

    await this.publishMessage('notification.rsvp.update', message);
  }

  async close() {
    if (this.channel) await this.channel.close();
    if (this.connection) await this.connection.close();
  }
}

// ============================================
// Message Consumer - Processes messages from RabbitMQ
// ============================================

class EventMessageConsumer {
  constructor(emailService) {
    this.connection = null;
    this.channel = null;
    this.emailService = emailService; // Your email sending service
  }

  async connect() {
    try {
      this.connection = await amqp.connect(RABBITMQ_CONFIG.url);
      this.channel = await this.connection.createChannel();
      
      // Assert exchange
      await this.channel.assertExchange(
        RABBITMQ_CONFIG.exchanges.notifications,
        'topic',
        { durable: true }
      );

      console.log('RabbitMQ Consumer connected successfully');
    } catch (error) {
      console.error('Failed to connect to RabbitMQ:', error);
      throw error;
    }
  }

  async setupQueue(queueName, routingKey, messageHandler) {
    try {
      // Assert queue
      await this.channel.assertQueue(queueName, {
        durable: true,
        arguments: {
          'x-message-ttl': 86400000 // 24 hours
        }
      });

      // Bind queue to exchange
      await this.channel.bindQueue(
        queueName,
        RABBITMQ_CONFIG.exchanges.notifications,
        routingKey
      );

      // Set prefetch to 1 to ensure even distribution
      await this.channel.prefetch(1);

      // Consume messages
      await this.channel.consume(queueName, async (msg) => {
        if (msg !== null) {
          try {
            const messageContent = JSON.parse(msg.content.toString());
            console.log(`Processing ${messageContent.type} message`);
            
            await messageHandler(messageContent);
            
            // Acknowledge message
            this.channel.ack(msg);
          } catch (error) {
            console.error('Error processing message:', error);
            // Reject and requeue if processing fails
            this.channel.nack(msg, false, true);
          }
        }
      });

      console.log(`Listening to queue: ${queueName}`);
    } catch (error) {
      console.error(`Error setting up queue ${queueName}:`, error);
      throw error;
    }
  }

  // Start all consumers
  async startConsuming() {
    await this.connect();

    // Event Confirmation Consumer
    await this.setupQueue(
      RABBITMQ_CONFIG.queues.eventConfirmations,
      'notification.event.confirmation',
      async (message) => {
        await this.emailService.sendEventConfirmationEmail(message.data);
      }
    );

    // Event Reminder Consumer
    await this.setupQueue(
      RABBITMQ_CONFIG.queues.eventReminders,
      'notification.event.reminder',
      async (message) => {
        await this.emailService.sendEventReminderEmail(message.data);
      }
    );

    // Weekly Digest Consumer
    await this.setupQueue(
      RABBITMQ_CONFIG.queues.weeklyDigest,
      'notification.weekly.digest',
      async (message) => {
        await this.emailService.sendWeeklyDigestEmail(message.data);
      }
    );

    // Announcement Consumer
    await this.setupQueue(
      RABBITMQ_CONFIG.queues.announcements,
      'notification.announcement',
      async (message) => {
        await this.emailService.sendAnnouncementEmail(message.data);
      }
    );

    // Waitlist Update Consumer
    await this.setupQueue(
      RABBITMQ_CONFIG.queues.waitlistNotifications,
      'notification.waitlist.update',
      async (message) => {
        await this.emailService.sendWaitlistUpdateEmail(message.data);
      }
    );

    // RSVP Update Consumer
    await this.setupQueue(
      RABBITMQ_CONFIG.queues.rsvpUpdates,
      'notification.rsvp.update',
      async (message) => {
        await this.emailService.sendRsvpUpdateEmail(message.data);
      }
    );
  }

  async close() {
    if (this.channel) await this.channel.close();
    if (this.connection) await this.connection.close();
  }
}

// ============================================
// Email Service Implementation
// ============================================

class EmailService {
  constructor() {
    // You can use nodemailer, SendGrid, AWS SES, or any email service
    // This is a placeholder implementation
  }

  async sendEventConfirmationEmail(data) {
    console.log(`Sending confirmation email to ${data.userEmail}`);
    
    const emailContent = {
      to: data.userEmail,
      subject: `Event Confirmation: ${data.eventTitle}`,
      html: `
        <h2>Event RSVP Confirmed!</h2>
        <p>Hi ${data.userName},</p>
        <p>Your RSVP for <strong>${data.eventTitle}</strong> has been confirmed.</p>
        <p><strong>Date:</strong> ${data.eventDate}</p>
        <p><strong>Time:</strong> ${data.eventTime}</p>
        <p><strong>Location:</strong> ${data.eventLocation}</p>
        <p>${data.eventDescription}</p>
        <p>See you there!</p>
      `
    };

    // Send email using your preferred service
    // await this.mailService.send(emailContent);
  }

  async sendEventReminderEmail(data) {
    console.log(`Sending reminder email to ${data.userEmail}`);
    // Implementation here
  }

  async sendWeeklyDigestEmail(data) {
    console.log(`Sending weekly digest to ${data.userEmail}`);
    // Implementation here
  }

  async sendAnnouncementEmail(data) {
    console.log(`Sending announcement to attendees`);
    // Implementation here
  }

  async sendWaitlistUpdateEmail(data) {
    console.log(`Sending waitlist update to ${data.userEmail}`);
    // Implementation here
  }

  async sendRsvpUpdateEmail(data) {
    console.log(`Sending RSVP update to ${data.userEmail}`);
    // Implementation here
  }
}

// ============================================
// Express API Integration Example
// ============================================

// In your Express routes file
const express = require('express');
const router = express.Router();

// Initialize producer
const messageProducer = new EventMessageProducer();
messageProducer.connect();

// RSVP endpoint
router.post('/api/events/:eventId/rsvp', async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.user.id; // From authentication middleware

    // Save RSVP to database (Supabase)
    // const rsvp = await saveRsvpToDatabase(eventId, userId);

    // Fetch event and user data
    const eventData = {
      id: eventId,
      title: 'SMU Career Fair 2025',
      date: '2025-10-20',
      time: '10:00 AM - 4:00 PM',
      location: 'SMU Campus Green',
      description: 'Meet with top employers and explore career opportunities.'
    };

    const userData = {
      id: userId,
      email: req.user.email,
      name: req.user.name
    };

    // Send confirmation message to queue
    await messageProducer.sendEventConfirmation(eventData, userData);

    res.json({
      success: true,
      message: 'RSVP confirmed. Confirmation email will be sent shortly.'
    });
  } catch (error) {
    console.error('Error processing RSVP:', error);
    res.status(500).json({ error: 'Failed to process RSVP' });
  }
});

// ============================================
// Scheduled Jobs for Reminders
// ============================================

const cron = require('node-cron');

// Run every hour to check for events happening in 24 hours
cron.schedule('0 * * * *', async () => {
  console.log('Checking for events requiring reminders...');
  
  // Query database for events happening in 24 hours with RSVPs
  // const upcomingEvents = await getEventsIn24Hours();
  
  // for (const event of upcomingEvents) {
  //   for (const attendee of event.attendees) {
  //     await messageProducer.sendEventReminder(event, attendee);
  //   }
  // }
});

// Run every Monday at 9 AM for weekly digest
cron.schedule('0 9 * * 1', async () => {
  console.log('Sending weekly digests...');
  
  // Get all users and their recommended events
  // const users = await getAllActiveUsers();
  
  // for (const user of users) {
  //   const recommendedEvents = await getRecommendedEvents(user.id);
  //   await messageProducer.sendWeeklyDigest(user, recommendedEvents);
  // }
});

// ============================================
// Consumer Worker (separate process)
// ============================================

// Run this in a separate worker process/container
async function startWorker() {
  const emailService = new EmailService();
  const consumer = new EventMessageConsumer(emailService);
  
  await consumer.startConsuming();
  
  console.log('Message consumer worker started');
  
  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('Shutting down consumer...');
    await consumer.close();
    process.exit(0);
  });
}

// Uncomment to start worker
// startWorker();

module.exports = {
  EventMessageProducer,
  EventMessageConsumer,
  EmailService,
  RABBITMQ_CONFIG
};