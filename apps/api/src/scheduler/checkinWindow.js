import cron from 'node-cron';
import { prisma } from '../db/client.js';
import { sendPushToGymMembers } from '../services/pushNotifications.js';

const DAYS_MAP = {
  'sunday': 0,
  'monday': 1,
  'tuesday': 2,
  'wednesday': 3,
  'thursday': 4,
  'friday': 5,
  'saturday': 6,
};

export const setupCheckinWindowScheduler = (io) => {
  console.log('📅 Setting up check-in window scheduler...');

  // Run every minute to check if we need to open/close windows
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();
      const currentDay = now.getDay();
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

      // Get all active challenges with scheduling enabled
      const challenges = await prisma.challenge.findMany({
        where: {
          isActive: true,
          checkinWindowEnabled: true,
        },
        include: {
          gym: true,
        }
      });

      for (const challenge of challenges) {
        if (!challenge.checkinAutoOpen) continue;

        const {
          checkinOpenDay, checkinOpenTime,
          checkinCloseDay, checkinCloseTime,
        } = challenge;

        if (!checkinOpenDay || !checkinOpenTime || !checkinCloseDay || !checkinCloseTime) continue;

        const windowState = await prisma.checkinWindowState.findUnique({
          where: { challengeId: challenge.id }
        });

        if (!windowState) continue;

        // Check if it's time to open
        const shouldOpen =
          DAYS_MAP[checkinOpenDay.toLowerCase()] === currentDay &&
          currentTime === checkinOpenTime &&
          !windowState.isOpen;

        // Check if it's time to close
        const shouldClose =
          DAYS_MAP[checkinCloseDay.toLowerCase()] === currentDay &&
          currentTime === checkinCloseTime &&
          windowState.isOpen;

        if (shouldOpen) {
          console.log(`🟢 Opening check-in window for ${challenge.name} (${challenge.gym.name})`);
          
          await prisma.checkinWindowState.update({
            where: { challengeId: challenge.id },
            data: {
              isOpen: true,
              lastOpened: now,
            }
          });

          // Notify users via socket
          io.to(`challenge:${challenge.id}`).emit('checkin_window_opened', {
            challengeId: challenge.id,
            challengeName: challenge.name,
            timestamp: now.toISOString(),
          });

          sendPushToGymMembers(challenge.gymId, {
            title: '✅ Check-in window is open!',
            body: `Submit your ${challenge.name} check-in now`,
            data: { type: 'checkin_window', challengeId: challenge.id },
          }).catch(console.error);
        }

        if (shouldClose) {
          console.log(`🔴 Closing check-in window for ${challenge.name} (${challenge.gym.name})`);
          
          await prisma.checkinWindowState.update({
            where: { challengeId: challenge.id },
            data: {
              isOpen: false,
              lastClosed: now,
            }
          });

          // Notify users via socket
          io.to(`challenge:${challenge.id}`).emit('checkin_window_closed', {
            challengeId: challenge.id,
            challengeName: challenge.name,
            timestamp: now.toISOString(),
          });

          sendPushToGymMembers(challenge.gymId, {
            title: '🔒 Check-in window closed',
            body: `The ${challenge.name} check-in window is now closed`,
            data: { type: 'checkin_window_closed', challengeId: challenge.id },
          }).catch(console.error);
        }
      }
    } catch (error) {
      console.error('Checkin window scheduler error:', error);
    }
  });

  console.log('✅ Check-in window scheduler running');
};
