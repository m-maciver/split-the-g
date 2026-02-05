# SPLIT IT - Next Session Todo List

## Done (from previous sessions)
- [x] Irish Pub + Silicon Valley retheme (dark pub colors, gold/emerald/cream)
- [x] Space Mono for numeric data, DM Sans for labels/body
- [x] Animated gradient borders, noise texture, glassmorphism cards
- [x] SearchRing SVG spinner, TimerArc countdown ring
- [x] Gold corner-bracket viewfinder with emerald guide line
- [x] 3-2-1 animated countdown with random "Slainte!" / "GO!"
- [x] Sound effects (countdown tick, shutter, go, win, lose via Web Audio API)
- [x] Haptic feedback (shutter, countdown, ready up, reveal)
- [x] Camera flash overlay on capture
- [x] Accuracy color gradient (emerald > gold > orange > red)
- [x] Ambient gold particles on landing
- [x] Win streak counter (localStorage)
- [x] Web Share API on reveal screen
- [x] PWA manifest updated

---

## Priority 1: Test & Validate Everything
- [ ] Full two-device game flow test (match > ready > drink > submit > reveal > rematch)
- [ ] Test on iOS Safari (camera permissions, safe areas, haptics)
- [ ] Test on Android Chrome (camera, vibration API, Web Share)
- [ ] Verify countdown timer sync between players
- [ ] Confirm WebRTC video displays correctly on both sides
- [ ] Test win streak persists across sessions
- [ ] Test all sound effects fire at correct moments

## Priority 2: Robustness & Error Handling
- [x] WebRTC connection failure — show retry/reconnect button instead of dead screen
- [x] Socket disconnect mid-game — reconnection logic to resume game state
- [x] Opponent closes app during drinking phase — graceful handling with message
- [x] Opponent timeout on submit — auto-win after 90s should show clear UI feedback
- [ ] Replace any remaining browser `alert()` calls with in-app toast messages
- [x] Add "Connecting..." loading state while WebRTC peer connection establishes
- [x] Handle camera permission denied gracefully (explain why it's needed)

## Priority 3: Gameplay Features
- [x] Player nicknames — let users pick a name before queuing (stored in localStorage)
- [x] Best-of-3 mode — option to play a series instead of single round
- [x] Rematch improvements — show "rematch requested" state more clearly
- [x] Show opponent's live video feed during the drinking/submit phase
- [x] Post-game stats — show both pint images side by side on reveal
- [x] Leaderboard — simple localStorage leaderboard of best accuracy scores

## Priority 4: Mobile & Network
- [ ] Test rear camera for pint capture, front camera for face (if applicable)
- [x] Optimize video resolution/bitrate for mobile networks
- [x] Add TURN server support for networks that block P2P (Twilio/Metered TURN)
- [ ] Fix any iOS-specific quirks (camera orientation, audio autoplay policy)
- [x] Lock to portrait orientation (or handle landscape gracefully)

## Priority 5: Production Readiness
- [x] Server-side accuracy validation (prevent score spoofing)
- [x] Rate limiting on socket events (prevent queue spam)
- [x] CORS lockdown — restrict to actual domain instead of `origin: '*'`
- [x] Environment variables for port, host, TURN credentials
- [x] Structured logging (replace console.log with proper logger)
- [x] Clean up unused code and console.log statements
- [x] Room cleanup — auto-destroy stale rooms after timeout

## Priority 6: Code Quality (If Time)
- [x] Extract WebRTC logic into a dedicated custom hook
- [ ] Extract game state machine into its own module
- [ ] Split index.html into separate component files with a bundler
- [x] Add JSDoc comments to server socket handlers
- [x] Memory leak audit — ensure camera streams are always released

---

## Quick Start
```bash
cd /Users/maciver/split-the-g
npm start
```
Then open https://192.168.0.19:8443 on two devices to test.

## Notes
- Server runs on port 8443 (HTTPS) with self-signed cert
- Need to accept security warning on each device
- QR code displays in terminal for easy mobile access
- Player stats stored in localStorage key `stg-stats` (JSON)
- Nicknames stored in localStorage key `stg-nickname`
- Leaderboard stored in localStorage key `stg-leaderboard`
- Environment variables: PORT, HTTP_PORT, CORS_ORIGIN, TURN_URL, TURN_USERNAME, TURN_CREDENTIAL, LOG_LEVEL
