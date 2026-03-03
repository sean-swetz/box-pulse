# RESET 2026 - CrossFit Prosperity Challenge Tracker

Modern mobile app + API for tracking nutrition and fitness challenges.

## 🏗️ Tech Stack

### Backend (API)
- **Node.js** + Express - REST API
- **Socket.io** - Real-time chat & updates
- **PostgreSQL** - Database (via Prisma ORM)
- **Redis** - Caching & sessions
- **JWT** - Authentication

### Frontend (Mobile)
- **React Native** + Expo
- **Tailwind CSS** (NativeWind)
- **Zustand** - State management
- **React Navigation** - Routing

### Infrastructure
- **Railway** - Hosting (API + Database)
- **Expo** - Mobile app builds
- **Cloudflare R2** - Photo storage (optional)

## 📁 Project Structure

```
reset-2026/
├── apps/
│   ├── api/              # Node.js backend
│   └── mobile/           # React Native app (coming next)
├── packages/
│   └── shared/           # Shared TypeScript types
└── package.json          # Monorepo root
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm
- Railway account (free)
- Git

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd reset-2026
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Environment Variables

**API (.env file):**

```bash
cd apps/api
cp .env.example .env
```

Then edit `.env` and add your values:
- `DATABASE_URL` - From Railway (PostgreSQL)
- `REDIS_URL` - From Railway (Redis)
- `JWT_SECRET` - Generate a random string

### 4. Set Up Database

```bash
cd apps/api
npm run db:push    # Push schema to database
```

### 5. Run Locally

**API only:**
```bash
cd apps/api
npm run dev
```

The API will run on `http://localhost:3000`

### 6. Test the API

```bash
# Health check
curl http://localhost:3000/health

# Register a user
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "name": "Test User"
  }'
```

## 🛠️ Development

### Available Scripts

**Root:**
- `npm run dev` - Run API + Mobile concurrently
- `npm run dev:api` - Run API only
- `npm run dev:mobile` - Run Mobile only

**API:**
- `npm run dev` - Start with nodemon (auto-reload)
- `npm run start` - Production start
- `npm run db:push` - Push Prisma schema to database
- `npm run db:studio` - Open Prisma Studio (database GUI)

## 🚢 Deployment to Railway

### 1. Connect GitHub

1. Go to Railway dashboard
2. Create new project
3. Select "Deploy from GitHub repo"
4. Choose your repository

### 2. Add PostgreSQL

1. In your Railway project, click "New"
2. Select "Database" → "PostgreSQL"
3. Railway will provide `DATABASE_URL` automatically

### 3. Add Redis

1. Click "New" again
2. Select "Database" → "Redis"
3. Railway will provide `REDIS_URL` automatically

### 4. Configure Environment Variables

In Railway project settings, add:
- `JWT_SECRET` - Your secret key
- `ALLOWED_ORIGINS` - Your mobile app URL
- `NODE_ENV` - Set to `production`

### 5. Deploy

Railway will automatically deploy on every push to `main` branch!

## 📱 Mobile App (Coming Next)

The React Native mobile app will be added in the next phase.

## 🔑 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user (requires auth)

### Users
- `GET /api/users/:id` - Get user profile
- `PUT /api/users/:id` - Update profile

### Check-ins
- `POST /api/checkins` - Submit check-in
- `GET /api/checkins/draft` - Get draft
- `PUT /api/checkins/draft` - Save draft

### Leaderboard
- `GET /api/leaderboard/individual` - Individual rankings
- `GET /api/leaderboard/teams` - Team standings

### Messages
- `GET /api/messages/locker-room` - Locker room chat
- `POST /api/messages/locker-room` - Post message
- `GET /api/messages/team/:teamId` - Team chat
- `POST /api/messages/team/:teamId` - Post to team

### Admin
- `GET /api/admin/users` - All users
- `PUT /api/admin/users/:id/team` - Assign team
- `POST /api/admin/points` - Adjust points

## 🔌 Socket.io Events

### Client → Server
- `join_team` - Join team room
- `team_message` - Send team message
- `join_locker_room` - Join global chat
- `locker_room_message` - Send global message
- `typing_start` - Start typing indicator
- `typing_stop` - Stop typing indicator

### Server → Client
- `new_team_message` - New team message
- `new_locker_room_message` - New global message
- `leaderboard_update` - Leaderboard changed
- `user_typing` - Someone is typing
- `user_stopped_typing` - Stopped typing

## 📊 Database Schema

See `apps/api/prisma/schema.prisma` for the complete schema.

Key tables:
- **User** - User accounts & profiles
- **Team** - Team information
- **Checkin** - Weekly check-ins
- **Criteria** - Challenge criteria (configurable)
- **Message** - Locker room messages
- **TeamMessage** - Team-specific messages
- **PointAdjustment** - Admin point adjustments
- **AdminUser** - Admin permissions

## 🤝 Contributing

This is a private project for CrossFit Prosperity.

## 📝 License

Private - All Rights Reserved

## 👤 Author

Sean Swetz - Curriculum Manager at Tanium
