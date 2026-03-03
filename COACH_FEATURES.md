# 👨‍🏫 Coach Dashboard Features

## Overview
Coaches get a special dashboard to manage and monitor their teams.

---

## What Coaches Can Do

### **1. View Team Roster**
- See all team members
- View member rankings within team
- See points per member
- Identify team captain (marked with badge)

### **2. Track Team Performance**
- Total team points
- Average points per member
- Team ranking (coming soon)
- Progress over time (coming soon)

### **3. Message Team**
- Quick access to team chat
- Send announcements
- Motivate team members
- Coordinate challenges

### **4. Multi-Team Support**
- Coach can manage multiple teams
- Each team has separate dashboard
- Switch between teams easily

---

## How to Assign Coaches

### **Via API:**
```bash
POST /api/gyms/:gymId/coaches
{
  "userId": "user_id_here",
  "teamId": "team_id_here"  # Optional - assign to specific team
}
```

### **From Mobile App:**
*(Coming in next phase - Gym Owner Dashboard)*

Gym owners will be able to:
1. Go to Settings → Manage Coaches
2. Select a member
3. Assign them as coach
4. Choose which team(s) they coach

---

## Coach Permissions

Coaches can:
- ✅ View their team's roster
- ✅ See team stats and scores
- ✅ Message their team
- ✅ View team progress

Coaches CANNOT:
- ❌ Edit gym settings
- ❌ Manage other teams
- ❌ Adjust member points (only admins/owners)
- ❌ Remove members from gym

---

## UI Components

### **Coach Dashboard Screen**
- **Path:** `/(app)/coach-dashboard`
- **Shows:** List of all teams the user coaches
- **Features:**
  - Team cards with quick stats
  - Member count
  - Team score
  - Quick actions (Chat, View Details)

### **Team Detail Screen**
- **Path:** `/coach/team/[id]`
- **Shows:** Full team roster and stats
- **Features:**
  - Sorted member list (by points)
  - Rank badges (1st, 2nd, 3rd)
  - Captain identification
  - Message team button
  - Individual member stats

---

## Bottom Navigation

The bottom nav automatically shows a "Coach" tab if the user is a coach at the selected gym.

**Tab shows when:**
- User has `GymCoach` record for current gym
- `selectedGym.isCoach === true`

---

## API Endpoints

### **Get My Coached Teams:**
```
GET /api/coaches/my-teams
```
Returns all teams the current user is coaching across all gyms.

### **Get Team Details:**
```
GET /api/teams/:id
```
Returns full team details including members, stats, and challenge info.

### **Add Coach:**
```
POST /api/gyms/:gymId/coaches
Body: { userId, teamId? }
```

### **Remove Coach:**
```
DELETE /api/gyms/:gymId/coaches/:coachId
```

---

## Next Steps

**Phase 3: Enhanced Chat**
- Team messaging with reactions
- Emoji picker
- GIF support
- Image uploads

**Phase 4: Gym Owner Dashboard**
- Assign coaches via UI
- Manage multiple teams
- View analytics
- Export data

---

## Database Schema

```prisma
model GymCoach {
  id        String
  userId    String   # The coach
  gymId     String
  teamId    String?  # Optional - which team
  
  canMessageTeam   Boolean
  canViewTeamStats Boolean
  
  user      User
  gym       Gym
  team      Team?
}
```

---

Ready to use! 🚀
