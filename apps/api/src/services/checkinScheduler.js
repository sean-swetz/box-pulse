import cron from 'node-cron';
import { prisma } from '../db/client.js';
import { DateTime } from 'luxon';

// Check every minute if any windows should open/close
// Runs: "* * * * *" = every minute
export function startCheckinWindowScheduler() {
  console.log('🕐 Check-in window scheduler started');

  cron.schedule('* * * * *', async () => {
    try {
      await checkAndUpdateWindows();
    } catch (error) {
      console.error('Checkin window scheduler error:', error);
    }
  });
}

async function checkAndUpdateWindows() {
  // Get all active challenges with auto-scheduling enabled
  const challenges = await prisma.challenge.findMany({
    where: {
      isActive: true,
      checkinAutoOpen: true,
      checkinOpenDay: { not: null },
      checkinOpenTime: { not: null },
      checkinCloseDay: { not: null },
      checkinCloseTime: { not: null },
    },
    select: {
      id: true,
      name: true,
      gymId: true,
      checkinOpenDay: true,
      checkinOpenTime: true,
      checkinCloseDay: true,
      checkinCloseTime: true,
      checkinTimezone: true,
      checkinWindowOpen: true,
    }
  });

  for (const challenge of challenges) {
    const now = DateTime.now().setZone(challenge.checkinTimezone);
    const currentDay = now.toFormat('EEEE').toUpperCase(); // "MONDAY", "TUESDAY", etc.
    const currentTime = now.toFormat('HH:mm'); // "17:00"

    // Check if window should OPEN
    const shouldOpen = 
      currentDay === challenge.checkinOpenDay &&
      currentTime === challenge.checkinOpenTime &&
      !challenge.checkinWindowOpen;

    // Check if window should CLOSE
    const shouldClose =
      currentDay === challenge.checkinCloseDay &&
      currentTime === challenge.checkinCloseTime &&
      challenge.checkinWindowOpen;

    if (shouldOpen) {
      console.log(`✅ Opening check-in window for challenge: ${challenge.name} (${challenge.id})`);
      
      await prisma.challenge.update({
        where: { id: challenge.id },
        data: { checkinWindowOpen: true }
      });

      // Update state tracking
      await prisma.checkinWindowState.upsert({
        where: { challengeId: challenge.id },
        create: {
          challengeId: challenge.id,
          isOpen: true,
          lastOpened: new Date(),
        },
        update: {
          isOpen: true,
          lastOpened: new Date(),
        }
      });

      // TODO: Send push notifications to users
      // notifyCheckinWindowOpened(challenge.gymId, challenge.id);
    }

    if (shouldClose) {
      console.log(`⏹️  Closing check-in window for challenge: ${challenge.name} (${challenge.id})`);
      
      await prisma.challenge.update({
        where: { id: challenge.id },
        data: { checkinWindowOpen: false }
      });

      // Update state tracking
      await prisma.checkinWindowState.upsert({
        where: { challengeId: challenge.id },
        create: {
          challengeId: challenge.id,
          isOpen: false,
          lastClosed: new Date(),
        },
        update: {
          isOpen: false,
          lastClosed: new Date(),
        }
      });

      // TODO: Send push notifications
      // notifyCheckinWindowClosed(challenge.gymId, challenge.id);
    }
  }
}

// Manual override (for admin panel)
export async function setCheckinWindow(challengeId, isOpen) {
  await prisma.challenge.update({
    where: { id: challengeId },
    data: { checkinWindowOpen: isOpen }
  });

  await prisma.checkinWindowState.upsert({
    where: { challengeId },
    create: {
      challengeId,
      isOpen,
      [isOpen ? 'lastOpened' : 'lastClosed']: new Date(),
    },
    update: {
      isOpen,
      [isOpen ? 'lastOpened' : 'lastClosed']: new Date(),
    }
  });

  return true;
}
