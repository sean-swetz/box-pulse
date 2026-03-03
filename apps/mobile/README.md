# 📱 RESET 2026 Mobile App

React Native + Expo app for iOS, Android, and Web.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ installed
- iOS: iPhone with **Expo Go** app installed
- Android: Android phone with **Expo Go** app installed
- OR: Just use the web version in your browser

### 1. Install Dependencies

```bash
cd apps/mobile
npm install
```

### 2. Configure API URL

Create `app.config.js`:

```javascript
export default {
  ...require('./app.json').expo,
  extra: {
    apiUrl: 'http://YOUR_COMPUTER_IP:3000/api',
    // Example: 'http://192.168.1.100:3000/api'
  },
};
```

**To find your computer's IP:**
- Mac: System Settings → Network → Your IP shows there
- Or run: `ipconfig getifaddr en0` (Mac) or `ipconfig` (Windows)

### 3. Start the App

```bash
npm start
```

This will show a QR code in your terminal.

### 4. Open on Your Phone

**iPhone:**
1. Open **Expo Go** app
2. Scan the QR code with your camera
3. App will load!

**Android:**
1. Open **Expo Go** app
2. Scan the QR code from within Expo Go
3. App will load!

**Web Browser:**
- Press `w` in the terminal
- App opens in browser at `http://localhost:19006`

---

## 📁 Project Structure

```
apps/mobile/
├── app/                    # Expo Router pages
│   ├── (auth)/            # Login, Register, Join
│   ├── (app)/             # Dashboard, Check-in, etc.
│   ├── _layout.js         # Root layout
│   └── index.js           # Entry point
├── components/            # Reusable UI components
├── lib/                   # API client, utilities
├── store/                 # Zustand state management
├── assets/                # Images, fonts
├── app.json               # Expo configuration
└── package.json           # Dependencies
```

---

## 🎨 Screens

### Authentication:
- ✅ Login
- ✅ Register
- ✅ Join with Invite Code

### Main App:
- 🚧 Dashboard
- 🚧 Check-in Form
- 🚧 Leaderboard
- 🚧 Teams
- 🚧 Locker Room (Chat)
- 🚧 Profile
- 🚧 Gym Owner Dashboard

*(🚧 = Coming in next phase)*

---

## 🔧 Development

### Hot Reload
Changes to `.js` files reload automatically!

### Debugging
- Shake your phone → Dev Menu
- Or press `m` in terminal → Dev Menu

### Clear Cache
```bash
npm start --clear
```

---

## 📦 Building for App Store

*(Once app is complete)*

### iOS (TestFlight):
```bash
npx eas build --platform ios
```

### Android (Google Play):
```bash
npx eas build --platform android
```

---

## 🌐 Web Version

The same code runs as a web app!

```bash
npm run web
```

Opens at `http://localhost:19006`

---

## ⚙️ Environment Variables

Set your API URL in `app.config.js`:

```javascript
export default {
  extra: {
    apiUrl: process.env.API_URL || 'http://localhost:3000/api',
  },
};
```

---

## 🐛 Troubleshooting

### "Unable to connect to API"
- Make sure your backend is running (`npm run dev` in `apps/api`)
- Check your API URL in `app.config.js` has the correct IP
- Your phone and computer must be on the **same WiFi network**

### "Expo Go won't load"
- Make sure you're on the same WiFi
- Try restarting the Metro bundler
- Check firewall isn't blocking port 19000

### "NativeWind styles not working"
```bash
npm start --clear
```

---

Ready to test! 🚀
