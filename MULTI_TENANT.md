# 🏗️ Multi-Tenant Architecture Guide

## Overview

This app is built as a **multi-tenant SaaS platform** where multiple gyms can each run their own challenges independently.

---

## Key Concepts

### **Gyms**
- Each gym has its own subdomain or path (e.g., `prosperity.yourapp.com`)
- Gyms customize: logo, colors, team names, and challenge criteria
- Gym owners manage members, teams, and challenges

### **Users (Members)**
- Can join **multiple gyms**
- Each gym membership is independent
- Progress/points are tracked per gym/challenge

### **Challenges**
- Each gym creates their own challenges (e.g., "Reset 2026", "Summer Shred")
- Custom criteria per challenge
- Auto-scheduled check-in windows

### **Teams**
- Teams belong to a specific gym + challenge
- Customizable names, colors, and logos
- Team leaderboards are challenge-specific

---

## Database Schema

```
Gym (e.g., CrossFit Prosperity)
├── Members (via GymMembership)
│   ├── Owner (can manage gym)
│   ├── Admin (can manage challenges)
│   └── Member (can participate)
├── Challenges (e.g., Reset 2026)
│   ├── Criteria (customizable per challenge)
│   ├── Teams (Red, Blue, Green, etc.)
│   │   └── TeamMembers
│   └── Check-ins
└── Settings (branding, scheduling)
```

---

## User Flows

### **Gym Owner Creates Gym:**
1. Register account
2. Create gym (`POST /api/gyms`)
   - Choose gym name + slug
   - Set branding (logo, colors)
3. Create a challenge (`POST /api/challenges`)
4. Add criteria (`POST /api/challenges/:id/criteria`)
5. Create teams (`POST /api/challenges/:id/teams`)
6. Generate invite link (`POST /api/gyms/:id/invites`)
7. Share invite with members

### **Member Joins Gym:**
1. Register account (or login)
2. Use invite code (`POST /api/gyms/join/:code`)
3. Select challenge to participate in
4. Get assigned to a team
5. Start checking in

### **Multi-Gym User:**
- User can be member of multiple gyms
- App shows gym selector on login
- Switch between gyms in app

---

## API Endpoints

### **Gyms**
- `POST /api/gyms` - Create gym
- `GET /api/gyms/slug/:slug` - Get gym by slug
- `GET /api/gyms/user/my-gyms` - Get user's gyms
- `PUT /api/gyms/:id` - Update gym (owner/admin only)
- `POST /api/gyms/:id/invites` - Create invite code
- `POST /api/gyms/join/:code` - Join gym with code

### **Challenges**
- `POST /api/challenges` - Create challenge
- `GET /api/challenges/:id` - Get challenge details
- `PUT /api/challenges/:id` - Update challenge
- `POST /api/challenges/:id/checkin-window/toggle` - Manual window toggle
- `POST /api/challenges/:id/criteria` - Add criteria
- `PUT /api/challenges/:id/criteria/:criteriaId` - Update criteria
- `DELETE /api/challenges/:id/criteria/:criteriaId` - Delete criteria

### **Teams**
- `POST /api/challenges/:id/teams` - Create team
- `PUT /api/teams/:id` - Update team (name, color, logo)
- `POST /api/teams/:id/members` - Add member to team

---

## Auto Check-In Window Scheduler

### How It Works:
1. Gym owner configures schedule in challenge settings:
   ```json
   {
     "openDay": "sunday",
     "openTime": "17:00",
     "closeDay": "monday",
     "closeTime": "17:00"
   }
   ```

2. Cron job runs every minute checking if it's time to open/close
3. When triggered:
   - Updates `CheckinWindowState` in database
   - Emits Socket.io event to all connected users
   - Sends push notifications (optional)

### Manual Override:
Gym owners can manually open/close the window anytime:
```
POST /api/challenges/:id/checkin-window/toggle
{ "isOpen": true }
```

---

## Customization Per Gym

### **Branding:**
```javascript
{
  logoUrl: "https://...",
  primaryColor: "#0df259",   // Lime green
  secondaryColor: "#ff0000",
  backgroundColor: "#102216"
}
```

### **Teams:**
Each gym creates custom teams:
```javascript
{
  name: "Red Dragons",
  color: "#ff0000",
  logoUrl: "https://..."
}
```

### **Criteria:**
Each challenge has custom criteria:
```javascript
{
  name: "Hit Water Goal",
  type: "daily",
  points: 5,
  description: "Drink 1 gallon/day"
}
```

---

## Security & Data Isolation

### **Gym-Scoped Queries:**
All queries check gym membership:
```javascript
// Middleware ensures user can only see their gym's data
const membership = await prisma.gymMembership.findUnique({
  where: {
    userId_gymId: {
      userId: req.user.id,
      gymId: gymId
    }
  }
});

if (!membership) {
  return res.status(403).json({ error: 'Not a member' });
}
```

### **Roles:**
- **Owner** - Full control (can delete gym, manage billing)
- **Admin** - Can manage challenges, members, teams
- **Member** - Can check in, chat, view leaderboard

---

## Scaling Considerations

### **Current Architecture:**
- Single PostgreSQL database
- Gym data isolated via `gymId` foreign keys
- Good for: 10-1000 gyms

### **Future Scaling (if needed):**
- **Database per gym** - Ultimate isolation
- **Sharding** - Split gyms across multiple databases
- **Redis caching** - Cache leaderboards, team stats

---

## Example: CrossFit Prosperity Setup

```bash
# 1. Create gym
POST /api/gyms
{
  "name": "CrossFit Prosperity",
  "slug": "prosperity",
  "ownerName": "Sean Swetz",
  "primaryColor": "#0df259"
}

# 2. Create challenge
POST /api/challenges
{
  "gymId": "...",
  "name": "Reset 2026",
  "startDate": "2026-05-01",
  "endDate": "2026-06-30",
  "checkinSchedule": {
    "openDay": "sunday",
    "openTime": "17:00",
    "closeDay": "monday",
    "closeTime": "17:00"
  }
}

# 3. Add criteria
POST /api/challenges/:id/criteria
{
  "name": "Hit Water Goal",
  "type": "daily",
  "points": 5
}

# 4. Create teams
POST /api/challenges/:id/teams
{ "name": "Red Team", "color": "#ff0000" }

# 5. Generate invite
POST /api/gyms/:id/invites
{ "maxUses": 50 }
# Returns: { "code": "PROSPERITY2026" }

# 6. Members join
POST /api/gyms/join/PROSPERITY2026
```

---

## Mobile App Behavior

### **On Login:**
1. Fetch user's gyms: `GET /api/gyms/user/my-gyms`
2. If multiple gyms → Show gym selector
3. If one gym → Go straight to dashboard
4. Store selected gym in app state

### **Gym Context:**
All API calls include gym context:
```javascript
// Option 1: Pass gymId in requests
GET /api/challenges?gymId=abc123

// Option 2: Set gym in auth header
Authorization: Bearer <token>
X-Gym-Id: abc123
```

### **Switching Gyms:**
User can switch gyms in app settings:
- Switches context
- Reloads data for selected gym
- Socket rooms updated

---

## Next Steps

1. **Deploy Updated Backend**
   - Push database schema changes
   - Deploy to Railway

2. **Build Mobile App**
   - Gym onboarding flow
   - Gym selector
   - Challenge participation

3. **Test Multi-Tenant**
   - Create 2+ test gyms
   - Ensure data isolation

Ready to continue building! 🚀
