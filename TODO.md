# SPLIT IT - Next Session Todo List

## Recently Completed
- [x] Robust pint analysis for dark pub environments (histogram equalization, adaptive thresholding)
- [x] Sound toggle with iOS audio unlock workaround
- [x] Visual overlay showing detected liquid level vs target G line
- [x] Personal best celebrations (sound + animation)
- [x] Close match reveal with extended dramatic timing
- [x] Accessibility improvements (focus styles, ARIA labels, skip links)
- [x] PWA service worker for offline support
- [x] 30-second communication window before match starts
- [x] Auto-start countdown on ready screen
- [x] Ready-up button for both players to start early

---

## Priority 1: Deploy to Production
Get the app live so friends can actually play!

- [ ] Deploy to Vercel or Railway (needs WebSocket support)
- [ ] Set up custom domain (splitit.app / splittheg.com)
- [ ] Configure production TURN server (Twilio/Metered) for reliable WebRTC
- [ ] Set environment variables in production
- [ ] Test full game flow on production URL with real users
- [ ] Set up basic analytics (Plausible/Umami)

## Priority 2: Private Room Codes
Let friends play together without random matchmaking.

- [ ] Add "Create Private Room" button on home screen
- [ ] Generate 4-6 character room codes (e.g., "PINT42")
- [ ] Add "Join Room" input field for entering codes
- [ ] Server: handle private room creation and joining
- [ ] Share room code via Web Share API or copy button
- [ ] Room expires after 5 minutes if not joined

## Priority 3: Shareable Result Cards
Auto-generate images for social sharing.

- [ ] Canvas-based result card generation (score, pint photo, rank)
- [ ] Include "SPLIT IT" branding on the card
- [ ] "Share Result" button that shares image directly
- [ ] Add "Beat my score" challenge link in share text
- [ ] Open Graph meta tags for link previews

## Priority 4: Testing & Polish
- [ ] Full two-device test on production URL
- [ ] Test on iOS Safari (camera, audio, haptics, safe areas)
- [ ] Test on Android Chrome (camera, vibration, Web Share)
- [ ] Test on pub Wi-Fi (verify TURN server works)
- [ ] Fix any remaining iOS audio autoplay quirks
- [ ] Replace any leftover `alert()` calls with toast messages

## Priority 5: Marketing Assets
- [ ] Record 15-30s demo video of a full game
- [ ] Create GIF of the reveal animation
- [ ] Design QR code poster template for pubs
- [ ] Create Open Graph image (1200x630) for link previews
- [ ] Set up @SplitTheG social accounts

## Priority 6: Future Features (Backlog)
- [ ] Global leaderboard (requires backend/database)
- [ ] Achievement badges (First Win, 5 Streak, 90%+ Accuracy)
- [ ] Push notifications ("Your rival just beat your high score")
- [ ] "Pub of the Week" location-tagged leaderboard
- [ ] Tournament mode with brackets
- [ ] Spectator mode for watching live games

---

## Quick Start (Local Dev)
```bash
cd C:/Users/Admin/split-the-g
npm start
```
Opens https://192.168.0.19:8443 — scan QR code in terminal for mobile.

## Environment Variables
```
PORT=8443
HTTP_PORT=8080
CORS_ORIGIN=https://yourdomain.com
TURN_URL=turn:your-turn-server.com:3478
TURN_USERNAME=username
TURN_CREDENTIAL=password
LOG_LEVEL=info
```

## Key localStorage Keys
- `stg-stats` — Player statistics (games, wins, streaks, best accuracy)
- `stg-nickname` — Player display name
- `stg-leaderboard` — Local high scores

---

## Session Notes
_Use this space to jot down ideas, bugs, or observations during dev sessions._

