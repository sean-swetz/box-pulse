import cron from 'node-cron';
import { prisma } from '../db/client.js';
import { emitToGym } from '../socket/index.js';

/**
 * Auto Check-in Window Manager
 * 
 * Runs every minute to check if any challenge check-in windows
 * should be opened or closed based on their schedule
 */

export function startCheckinWindowScheduler(io) {
  // Run every minute
  cron.schedule('* * * * *', async () => {
    try {
      await processCheckinWindows(io);
    } catch (error) {
      console.error('Checkin window scheduler error:', error);
    }
  });

  console.log('✅ Check-in window scheduler started');
}

async function processCheckinWindows(io) {
  // Get all active challenges with auto check-in enabled
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
    const shouldBeOpen = shouldWindowBeOpen(challenge);
    const currentlyOpen = challenge.isCheckinWindowOpen;

    // State changed - update and notify
    if (shouldBeOpen !== currentlyOpen) {
      await prisma.challenge.update({
        where: { id: challenge.id },
        data: { isCheckinWindowOpen: shouldBeOpen }
      });

      console.log(
        `🔔 ${challenge.gym.name} - ${challenge.name}: Check-in window ${shouldBeOpen ? 'OPENED' : 'CLOSED'}`
      );

      // Emit real-time event to all gym members
      if (io) {
        emitToGym(io, challenge.gymId, 'checkin_window_changed', {
          challengeId: challenge.id,
          isOpen: shouldBeOpen,
          timestamp: new Date().toISOString(),
        });
      }

      // TODO: Send push notifications to gym members
      // notifyGymMembers(challenge.gymId, shouldBeOpen);
    }
  }
}

/**
 * Determine if check-in window should be open right now
 * based on challenge schedule and gym timezone
 */
function shouldWindowBeOpen(challenge) {
  if (!challenge.checkinOpenDay || !challenge.checkinOpenTime ||
      !challenge.checkinCloseDay || !challenge.checkinCloseTime) {
    // No schedule set - keep current state
    return challenge.isCheckinWindowOpen;
  }

  // Get current time in gym's timezone
  const now = new Date();
  const gymTimezone = challenge.gym.timezone;
  
  // Convert to gym's timezone
  const nowInGymTz = new Date(now.toLocaleString('en-US', { timeZone: gymTimezone }));
  
  const currentDay = nowInGymTz.getDay(); // 0=Sunday, 6=Saturday
  const currentTime = nowInGymTz.toTimeString().slice(0, 5); // "HH:MM"

  const openDay = challenge.checkinOpenDay;
  const openTime = challenge.checkinOpenTime;
  const closeDay = challenge.checkinCloseDay;
  const closeTime = challenge.checkinCloseTime;

  // Create datetime objects for comparison
  const openDayTime = getDayTime(currentDay, openDay, openTime);
  const closeDayTime = getDayTime(currentDay, closeDay, closeTime);
  const currentDayTime = getDayTime(currentDay, currentDay, currentTime);

  // Handle wrap-around week (e.g., Sunday 5pm to Monday 5pm)
  if (closeDayTime < openDayTime) {
    // Window crosses week boundary
    return currentDayTime >= openDayTime || currentDayTime < closeDayTime;
  } else {
    // Normal case
    return currentDayTime >= openDayTime && currentDayTime < closeDayTime;
  }
}

/**
 * Helper to create comparable day+time number
 * Day 0-6, Time 00:00-23:59 → Number like 00000 to 62359
 */
function getDayTime(currentDay, targetDay, timeString) {
  const [hours, minutes] = timeString.split(':').map(Number);
  
  // Calculate days difference
  let dayDiff = targetDay - currentDay;
  if (dayDiff < 0) dayDiff += 7;
  
  return (dayDiff * 10000) + (hours * 100) + minutes;
}

/**
 * Manually open/close check-in window (admin override)
 */
export async function setCheckinWindowState(challengeId, isOpen) {
  await prisma.challenge.update({
    where: { id: challengeId },
    data: {
      isCheckinWindowOpen: isOpen,
      checkinWindowEnabled: false, // Disable auto when manually changed
    }
  });
}

/**
 * Update check-in window schedule
 */
export async function updateCheckinSchedule(challengeId, schedule) {
  const {
    openDay,
    openTime,
    closeDay,
    closeTime,
    enabled = true
  } = schedule;

  await prisma.challenge.update({
    where: { id: challengeId },
    data: {
      checkinWindowEnabled: enabled,
      checkinOpenDay: openDay,
      checkinOpenTime: openTime,
      checkinCloseDay: closeDay,
      checkinCloseTime: closeTime,
    }
  });
}
