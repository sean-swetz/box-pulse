# 🔄 Migration Guide: Updating to Multi-Tenant

## ⚠️ IMPORTANT: Your Server is Currently Running

Since you already ran `npm run db:push`, we need to update your database schema safely.

---

## Steps to Update Your Backend

### **1. Stop the Server**

In your terminal where the API is running, press `Ctrl+C` to stop it.

### **2. Pull the Updated Files**

Since we created new files, you need to get them. I'll create a new archive for you with all the updates.

### **3. Install New Dependencies**

```bash
cd apps/api
npm install
```

This will install `node-cron` for the scheduler.

### **4. Update Database Schema**

```bash
npm run db:push
```

This will:
- Add `Gym` table
- Add `GymMembership` table
- Add `GymInvite` table
- Add `Challenge` table
- Add `TeamMembership` table (users can be on multiple teams)
- Add `CheckinWindowState` table
- Update relationships

**⚠️ WARNING:** This will modify your database structure. If you have existing data, it might be lost.

Since you just started, this should be fine!

### **5. Restart the Server**

```bash
npm run dev
```

You should see:
```
🚀 Server running on port 3000
📊 Environment: development
🔌 Socket.io enabled
🏢 Multi-tenant mode
📅 Setting up check-in window scheduler...
✅ Check-in window scheduler running
```

---

## Testing the Multi-Tenant Setup

### **1. Create Your First Gym (CrossFit Prosperity)**

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "sean@prosperity.com",
    "password": "password123",
    "name": "Sean Swetz"
  }'
```

Save the `token` from the response.

### **2. Create the Gym**

```bash
curl -X POST http://localhost:3000/api/gyms \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "name": "CrossFit Prosperity",
    "slug": "prosperity",
    "ownerName": "Sean Swetz",
    "primaryColor": "#0df259"
  }'
```

Save the `gymId` from the response.

### **3. Create a Challenge**

```bash
curl -X POST http://localhost:3000/api/challenges \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "gymId": "YOUR_GYM_ID",
    "name": "Reset 2026",
    "description": "8-week nutrition and fitness challenge",
    "startDate": "2026-05-01T00:00:00Z",
    "endDate": "2026-06-30T23:59:59Z",
    "checkinSchedule": {
      "openDay": "sunday",
      "openTime": "17:00",
      "closeDay": "monday",
      "closeTime": "17:00"
    }
  }'
```

Save the `challengeId`.

### **4. Add Criteria**

```bash
curl -X POST http://localhost:3000/api/challenges/YOUR_CHALLENGE_ID/criteria \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "name": "Hit Water Goal",
    "description": "Drink at least 1 gallon/day",
    "type": "daily",
    "points": 5
  }'
```

### **5. Generate Invite Code**

```bash
curl -X POST http://localhost:3000/api/gyms/YOUR_GYM_ID/invites \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "maxUses": 50
  }'
```

You'll get back an invite code like `"ABC12345"`.

### **6. Test Joining the Gym (as a new user)**

```bash
# Register another user
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "member@test.com",
    "password": "password123",
    "name": "Test Member"
  }'

# Join the gym with invite code
curl -X POST http://localhost:3000/api/gyms/join/ABC12345 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer MEMBER_TOKEN_HERE"
```

---

## What Changed?

### **Before (Single-Tenant):**
```
Users → Teams → Check-ins
```

### **After (Multi-Tenant):**
```
Gym → Challenges → Teams → Users (via TeamMembership)
                 ↘ Criteria
                 ↘ Check-ins
```

### **Key Differences:**

1. **Users can join multiple gyms**
   - Via `GymMembership` table

2. **Teams belong to challenges**
   - Not global anymore

3. **Criteria belong to challenges**
   - Each gym creates their own

4. **Check-in windows per challenge**
   - Auto-scheduled with cron jobs

5. **Invite codes**
   - Members join via invite links

---

## New API Endpoints Available

### **Gym Management:**
- `POST /api/gyms` - Create gym
- `GET /api/gyms/user/my-gyms` - Get my gyms
- `POST /api/gyms/:id/invites` - Create invite
- `POST /api/gyms/join/:code` - Join gym

### **Challenge Management:**
- `POST /api/challenges` - Create challenge
- `GET /api/challenges/:id` - Get challenge
- `POST /api/challenges/:id/criteria` - Add criteria
- `POST /api/challenges/:id/checkin-window/toggle` - Toggle window

---

## Next: Build the Mobile App

Once your backend is updated and running with multi-tenant support, we'll build the React Native app with:

1. **Gym Onboarding** - Create or join a gym
2. **Gym Selector** - Switch between gyms
3. **Challenge Dashboard** - See active challenges
4. **Check-in Flow** - Submit check-ins
5. **Leaderboards** - Gym-scoped rankings
6. **Team Chat** - Challenge-specific chat

Ready to continue? 🚀
