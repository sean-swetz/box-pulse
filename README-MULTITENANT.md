# 🏋️ RESET 2026 - Multi-Tenant Gym Challenge Platform

A modern SaaS platform for gyms to run nutrition and fitness challenges. Built with Node.js, React Native, and PostgreSQL.

---

## 🎯 What This Is

A **multi-tenant platform** that allows multiple gyms to:
- Run custom challenges with their own branding
- Track member check-ins and points
- Create teams and leaderboards
- Enable real-time chat (team channels + locker room)
- Auto-open/close check-in windows on a schedule
- Customize everything (logo, colors, teams, criteria)

**Members can join multiple gyms** and switch between them in the app!

---

## 🏗️ Multi-Tenant Architecture

### **Key Concepts:**

1. **Gym** - Each organization (e.g., "CrossFit Prosperity")
   - Has own branding (logo, colors)
   - Manages own members, teams, challenges
   - Configurable check-in schedule

2. **User** - Can be a member of multiple gyms
   - Single account across all gyms
   - Different roles in different gyms (owner, admin, member)

3. **Challenge** - Per-gym challenge (e.g., "Reset 2026")
   - Custom criteria (configurable points, types)
   - Auto check-in window scheduling
   - Teams specific to the challenge

4. **Invite System** - Join gyms via invite links
   - `yourapp.com/join/prosperity-abc123`
   - Configurable expiration and max uses

---

## 🚀 New Multi-Tenant Features

### **✅ Gym Customization:**
- Logo upload
- Primary color (used throughout app)
- Team names, colors, AND logos
- Custom criteria per challenge

### **✅ Auto Check-In Window:**
Gym owners can configure:
- **Open Day/Time:** "Sunday 5:00 PM"
- **Close Day/Time:** "Monday 5:00 PM"  
- **Timezone:** Auto-converts for members
- System automatically opens/closes (cron job runs every minute)

### **✅ Member Management:**
- Generate invite links
- Members join via code
- Assign roles (owner, admin, member)
- Multi-gym support (switch gyms in app)

---

## 📊 Database Schema (Multi-Tenant)

```
Gym
├── Members (via GymMembership - many-to-many)
├── Teams
├── Challenges
│   ├── Criteria (customizable)
│   ├── Check-ins
│   └── Auto-schedule settings
├── Invites
└── Settings (branding, features)
```

**Key tables:**
- `Gym` - Organization/gym
- `GymMembership` - User ↔ Gym relationship (with role)
- `Challenge` - Per-gym challenge with auto-scheduling
- `GymInvite` - Invite codes
- `Team` - Per-challenge teams
- `TeamMembership` - User ↔ Team (multi-team support)

---

## 🛠️ Getting Started

### Prerequisites
- Node.js 18+
- Railway account (free tier works)
- Git

### 1. Clone & Install
```bash
git clone <your-repo>
cd reset-2026
npm install
cd apps/api
npm install
```

### 2. Set Up Railway Databases

In Railway dashboard:
1. Create **PostgreSQL** database → Copy `DATABASE_URL`
2. Create **Redis** database → Copy `REDIS_URL`

### 3. Configure Environment

```bash
cd apps/api
cp .env.example .env
# Edit .env and add your Railway URLs
```

**Required .env variables:**
```env
DATABASE_URL=postgresql://...  # From Railway
REDIS_URL=redis://...           # From Railway
JWT_SECRET=your-random-secret-here
PORT=3000
NODE_ENV=development
```

### 4. Push Database Schema

```bash
npm run db:push
```

This creates all tables based on the Prisma schema.

### 5. Start the API

```bash
npm run dev
```

API runs on `http://localhost:3000`

### 6. Test It

```bash
curl http://localhost:3000/health
# Should return: {"status":"ok","timestamp":"..."}
```

---

## 🔑 API Endpoints

### **Authentication**
- `POST /api/auth/register` - Register user
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

### **Gyms**
- `POST /api/gyms` - Create a gym (becomes owner)
- `GET /api/gyms/user/my-gyms` - Get user's gyms
- `GET /api/gyms/slug/:slug` - Get gym by slug
- `PUT /api/gyms/:id` - Update gym (owner/admin only)
- `POST /api/gyms/:id/invites` - Create invite link
- `POST /api/gyms/join/:code` - Join gym via invite

### **Challenges**
- `POST /api/challenges` - Create challenge (gym owner/admin)
- `GET /api/challenges/:id` - Get challenge details
- `PUT /api/challenges/:id` - Update challenge settings

### **Check-ins**
- `POST /api/checkins` - Submit check-in
- `GET /api/checkins/draft` - Get draft
- `PUT /api/checkins/draft` - Save draft

### **Leaderboard**
- `GET /api/leaderboard/individual/:challengeId` - Individual rankings
- `GET /api/leaderboard/teams/:challengeId` - Team standings

### **Messages**
- `GET /api/messages/gym/:gymId` - Gym locker room chat
- `POST /api/messages/gym/:gymId` - Post to locker room
- `GET /api/messages/team/:teamId` - Team chat
- `POST /api/messages/team/:teamId` - Post to team

---

## ⏰ Auto Check-In Window

### **How It Works:**

1. **Gym owner configures schedule** in challenge settings:
   ```json
   {
     "checkinAutoOpen": true,
     "checkinOpenDay": "SUNDAY",
     "checkinOpenTime": "17:00",
     "checkinCloseDay": "MONDAY",
     "checkinCloseTime": "17:00",
     "checkinTimezone": "America/New_York"
   }
   ```

2. **Cron job runs every minute** checking if any windows should open/close

3. **Automatically updates** `checkinWindowOpen` field

4. **Members see live status** in the app

### **Manual Override:**
Admins can still manually open/close windows if needed.

---

## 🔌 Socket.io Events

### **Client → Server**
- `join_gym` - Join gym room for updates
- `join_team` - Join team room
- `team_message` - Send team message
- `join_locker_room` - Join gym locker room
- `locker_room_message` - Send locker room message

### **Server → Client**
- `new_team_message` - New team message
- `new_locker_room_message` - New locker room message
- `leaderboard_update` - Leaderboard changed
- `checkin_window_opened` - Window opened
- `checkin_window_closed` - Window closed

---

## 🚢 Deployment to Railway

### **1. Connect GitHub**
1. Push code to GitHub
2. In Railway: New Project → Deploy from GitHub
3. Select your repository

### **2. Add Services**
Railway will auto-detect the API. Also add:
- PostgreSQL database
- Redis database

### **3. Environment Variables**
In Railway project settings, add:
```
JWT_SECRET=your-secret
NODE_ENV=production
ALLOWED_ORIGINS=https://yourapp.com,https://app.yourapp.com
```

### **4. Auto-Deploy**
Every push to `main` branch auto-deploys! 🚀

---

## 📱 Mobile App (Coming Next)

The React Native app will connect to this API and support:
- Multi-gym switching
- Gym onboarding (create or join)
- All features from Stitch designs
- Real-time chat via Socket.io
- Push notifications

---

## 🎨 Gym Branding Customization

Gym owners can customize:
- **Logo:** Upload via admin panel
- **Primary Color:** Used for buttons, highlights
- **Team Colors:** Per-team customization
- **Team Logos:** Optional team branding

Example:
```javascript
// CrossFit Prosperity
{
  logoUrl: "https://...",
  primaryColor: "#0df259",  // Lime green
  teams: [
    { name: "Red Warriors", color: "#ff0000", logoUrl: "..." },
    { name: "Blue Sharks", color: "#0000ff", logoUrl: "..." }
  ]
}
```

---

## 💡 Business Model Ideas

### **Freemium:**
- **Free:** 1 challenge, 25 members
- **Pro ($49/mo):** Unlimited challenges, 100 members
- **Enterprise ($199/mo):** Unlimited + custom branding + API

### **Per-Member:**
- **$2/member/month** - Scales with gym size

### **One-Time:**
- **$500/challenge** - Pay per 8-week challenge

---

## 🔐 Security

- JWT authentication
- Role-based access control (owner, admin, member)
- Gym-scoped queries (users only see their gym's data)
- Rate limiting on API endpoints
- Helmet.js security headers

---

## 📈 Monitoring & Logs

Railway provides:
- Request logs
- Error tracking  
- Database metrics
- Uptime monitoring

---

## 🤝 Contributing

Private project for gym challenge platform.

---

## 👤 Author

Built by Sean Swetz for CrossFit Prosperity and beyond! 💪

---

## 📝 Next Steps

1. ✅ Backend API (DONE!)
2. 📱 React Native mobile app
3. 🌐 Web app (same codebase as mobile)
4. 🔔 Push notifications
5. 📊 Analytics dashboard
6. 💳 Billing integration (Stripe)
7. 🚀 Launch to multiple gyms!
