import { prisma } from '../db/client.js';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

// Send to specific user IDs
export async function sendPushToUsers(userIds, { title, body, data = {} }) {
  if (!userIds?.length) return;

  const pushTokens = await prisma.pushToken.findMany({
    where: { userId: { in: userIds } },
    select: { token: true },
  });

  if (!pushTokens.length) return;
  await _sendToTokens(pushTokens.map(pt => pt.token), { title, body, data });
}

// Send to all active members of a gym
export async function sendPushToGymMembers(gymId, { title, body, data = {} }, excludeUserId = null) {
  const where = { gymId, isActive: true };
  if (excludeUserId) where.userId = { not: excludeUserId };

  const memberships = await prisma.gymMembership.findMany({
    where,
    select: { userId: true },
  });

  await sendPushToUsers(memberships.map(m => m.userId), { title, body, data });
}

async function _sendToTokens(tokens, { title, body, data }) {
  // Expo allows batches of up to 100
  for (let i = 0; i < tokens.length; i += 100) {
    const messages = tokens.slice(i, i + 100).map(token => ({
      to: token,
      title,
      body,
      data,
      sound: 'default',
    }));

    try {
      const res = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(messages),
      });
      const result = await res.json();
      result.data?.forEach(ticket => {
        if (ticket.status === 'error') {
          console.error('Push ticket error:', ticket.message, ticket.details);
        }
      });
    } catch (e) {
      console.error('Push send failed:', e.message);
    }
  }
}
