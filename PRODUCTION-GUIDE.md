# SPLI IT - Production Guide

## What's New: 1v1 Multiplayer with Stats

The **multiplayer production version** of SPLI IT — 1v1 competitive Guinness challenge with player stats, ranks, and streak tracking.

---

## Key Features

### Design System: "Irish Pub meets Silicon Valley"

- **Dark Mode Premium Aesthetic**
  - Matte Black background (#0B1A0E)
  - Guinness Cream accents (#F5E6C8)
  - Gold highlights (#D4A843)
  - Emerald success (#34D399)

- **Glassmorphism Throughout**
  - All cards use `backdrop-filter: blur(10px)`
  - Subtle borders at low opacity
  - Translucent overlays

- **Typography**
  - DM Sans for labels and body text
  - Space Mono for numeric data (stats, accuracy, timers)

- **Smooth Animations**
  - Framer Motion page transitions
  - Button press feedback
  - Rolling number counters
  - Confetti burst on wins

### Home Screen (Stats & Gamification)

- **Rank Badge** — Rookie / Bronze / Silver / Gold / Platinum
- **Stats Grid** — Games Played, Win Rate, Current Streak, Best Accuracy
- **Records Row** — Best Streak and W-L-T record
- **Clean first-time experience** — Stats only show after first game

### 1v1 Multiplayer

- **Real-time matchmaking** via Socket.IO
- **WebRTC video** — see your opponent live
- **Ready-up system** — both players confirm before countdown
- **Rematch support** — quick rematches without re-queuing

### Camera System

- **Back camera** (`facingMode: 'environment'`) for pint capture
- **Full viewport coverage** (no letterboxing)
- **Viewfinder** with gold corner brackets and emerald guide line
- **Camera flash** effect on capture

### The Reveal

- **6-phase dramatic reveal** — opponent score, your score, winner announcement, stats update
- **Sound effects** — countdown tick, shutter, win/lose
- **Haptic feedback** — on capture, countdown, and reveal
- **Personal best callouts** — "NEW PERSONAL BEST" and "NEW BEST STREAK" alerts
- **Confetti burst** on wins

### PWA Support

- **Installable** on iOS and Android
- **Manifest.json** with app icons
- **Standalone mode** — runs like native app
- **Portrait orientation**

---

## Scoring System

| Accuracy | Rating | Color |
|----------|--------|-------|
| 80-100% | Excellent | Emerald |
| 50-79% | Good | Gold |
| 25-49% | Fair | Orange |
| 0-24% | Needs Work | Red |

### Rank Tiers

| Rank | Requirements |
|------|-------------|
| Rookie | Less than 3 games played |
| Bronze | 3+ games, 40%+ win rate |
| Silver | 5+ games, 65%+ win rate |
| Gold | 10+ games, 70%+ win rate |
| Platinum | 20+ games, 75%+ win rate |

---

## Deployment Options

### Option 1: Netlify Drop (Fastest)

1. Go to [drop.netlify.com](https://drop.netlify.com)
2. Drag `index.html` into the browser
3. Get instant public URL
4. Share with friends!

**Note**: For full PWA support, deploy both `index.html` and `manifest.json` using Option 2 or 3.

### Option 2: Netlify CLI (Full PWA Support)

```bash
npm install -g netlify-cli
netlify deploy --prod
```

### Option 3: Vercel

```bash
npm install -g vercel
vercel --prod
```

### Option 4: GitHub Pages

1. Upload `index.html` and `manifest.json` to a GitHub repository
2. Go to Settings > Pages
3. Select main branch > Save

---

## Local Testing

```bash
npm start
```

Server runs on:
- **HTTPS**: `https://192.168.0.19:8443`
- **HTTP Redirect**: Port 8080

**QR Code** displays in terminal for easy mobile access.

---

## Technical Specifications

### Performance

- **Page Load**: < 2 seconds on 3G
- **Animations**: 60fps
- **Bundle Size**: ~150KB (CDN libraries cached)

### Browser Support

- iOS Safari 14+
- Chrome for Android 90+
- Samsung Internet 14+
- Firefox Mobile 90+

### Camera Requirements

- **Required**: HTTPS connection
- **Permissions**: Camera access
- **Facing Mode**: Environment (back camera)
- **Resolution**: 1920x1080 ideal, 640x480 fallback

### Data Persistence

Stored in `localStorage`:
- `stg-stats` — Player statistics JSON (games, wins, losses, ties, streaks, best accuracy)

No accounts or sign-ins required. All data stays in the browser.

---

## Game Flow

```
HOME (Stats + Rank)
  |
SNAP (Photograph full pint)
  |
MATCH (1v1 matchmaking)
  |
READY (Both players ready up)
  |
DRINK (30 second timer)
  |
VERIFY (Snap result photo)
  |
REVEAL (6-phase score reveal + stats update)
  |
HOME
```

---

## Files

- `index.html` — Main application (1v1 multiplayer)
- `manifest.json` — PWA manifest
- `server.js` — Node.js server (matchmaking + WebRTC signaling)
- `package.json` — Node dependencies
- `README.md` — User guide
- `PRODUCTION-GUIDE.md` — This file
- `DEPLOY.md` — Deployment options

---

## Color Reference

```css
--bg-primary: #0B1A0E;    /* Background */
--bg-elevated: #132A18;   /* Elevated surfaces */
--bg-surface: #1A3520;    /* Cards */
--cream: #F5E6C8;         /* Primary text */
--gold: #D4A843;          /* Accents, buttons */
--emerald: #34D399;       /* Win state, success */
--text-secondary: #7C9A82; /* Secondary text */
--accent-red: #EF4444;    /* Loss state */
```

---

## Known Limitations

- **Camera access required** — Won't work without camera permissions
- **HTTPS required** — Browsers require secure context for camera
- **Self-signed cert warnings** — Local server shows security warnings (safe to proceed)
- **No accounts** — All stats stored in localStorage (resets if browser data cleared)
