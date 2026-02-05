# G SPLIT - Marketing & Growth Plan

## Phase 1: Pre-Launch (Get the Foundation Right)

### Deployment & Access
- [ ] Deploy to production URL (Vercel/Netlify/Railway with custom domain)
- [ ] Buy a domain — `splittheg.com` / `splittheg.app` / `splitthe.g` (if available)
- [ ] Set up SSL + TURN server for reliable WebRTC on all networks
- [ ] Test full game flow on iOS Safari + Android Chrome on pub Wi-Fi
- [ ] Set up basic analytics (Plausible/Umami — privacy-friendly, no cookie banner needed)

### Branding Assets
- [ ] App icon — Guinness pint with split line (1024x1024 for stores, 512x512 for PWA)
- [ ] Open Graph image for link previews (1200x630 — pint visual + "Challenge your mates")
- [ ] Short demo video (15-30s screen recording of a full game round)
- [ ] GIF of the reveal animation for social posts
- [ ] QR code poster template (for printing and placing in pubs)

### App Store Presence
- [ ] Submit to PWA directories (PWA Store, Appscope, FindPWA)
- [ ] Consider TWA wrapper for Google Play Store listing
- [ ] Apple App Clips or Safari web app banner for iOS

---

## Phase 2: Seed Users (Friends, Pubs & Communities)

### Personal Network (Week 1)
- [ ] Play it at the pub with mates — film reactions for content
- [ ] Share on personal Instagram/TikTok stories with link
- [ ] WhatsApp/group chat blast to friend groups who go to pubs
- [ ] Get 10-20 real games played to have authentic content and feedback

### Reddit
- [ ] Post to r/Guinness — "I built a game to settle who splits the G best"
- [ ] Post to r/ireland and r/CasualUK — pub culture angle
- [ ] Post to r/webdev or r/SideProject — developer/maker angle
- [ ] Post to r/PWA — technical showcase
- [ ] Post to r/indiegaming — competitive casual game angle

### Twitter/X
- [ ] Create @SplitTheG account (or post from personal)
- [ ] Tag Guinness official account in launch post
- [ ] Post demo video with "Challenge your mates" hook
- [ ] Engage with Guinness/pub culture accounts

### TikTok & Instagram Reels
- [ ] Film "Split the G challenge" at a real pub — POV style
- [ ] "I built an app to settle pub arguments" — dev story angle
- [ ] Film reactions when someone gets 95%+ accuracy
- [ ] Film the dramatic reveal moment (the 6-phase animation)
- [ ] Use trending audio + #Guinness #PubGames #SplitTheG hashtags

### Product Hunt
- [ ] Prepare Product Hunt listing (tagline, screenshots, description)
- [ ] Line up hunter or self-post
- [ ] Schedule for a Tuesday/Wednesday (best launch days)
- [ ] Prep a "maker comment" explaining the backstory

### Hacker News
- [ ] "Show HN: Split the G — 1v1 competitive Guinness challenge" post
- [ ] Focus on the tech angle (WebRTC, single-file React, canvas pixel analysis)

---

## Phase 3: Pub & Venue Outreach

### QR Code Posters
- [ ] Design A5 poster: "Think you can split the G? Scan to challenge a mate"
- [ ] Print 50-100 posters on thick card stock
- [ ] Place in local pubs (ask bartenders/managers — most will say yes)
- [ ] Include NFC tag on poster for tap-to-play (optional)
- [ ] Track which pubs drive traffic (unique UTM params per poster)

### Bartender / Pub Staff
- [ ] Demo the game to bartenders — they're the influencers in this context
- [ ] Offer to run a "Split the G tournament night" at a local pub
- [ ] Leave business cards / table talkers at the bar
- [ ] Ask pubs to share on their social media

### Pub Chains & Brands
- [ ] Reach out to Irish pub chains (e.g., O'Neills, Wetherspoons Irish pubs)
- [ ] Contact Guinness brand team / Diageo marketing (long shot but worth trying)
- [ ] Pitch to pub quiz / pub games night organisers
- [ ] Contact craft beer festivals / Guinness pouring competitions

### University Bars & Student Unions
- [ ] Target university bar nights — students love competitive drinking games
- [ ] Partner with student unions for freshers week / pub crawl events
- [ ] Student ambassador program — free merch for top players

---

## Phase 4: Viral Growth Mechanics (Built Into the App)

### Share Loop
- [x] Web Share API on reveal screen (already built)
- [ ] Auto-generate shareable result card image (canvas → PNG with score, rank, pint photo)
- [ ] Add "Challenge a friend" button that copies a direct invite link
- [ ] Deep link support — open app directly to matchmaking from shared link
- [ ] "Beat my score" share template with pre-filled text

### Retention
- [x] Win streak counter (already built)
- [x] Leaderboard (already built)
- [x] Player ranks (already built)
- [ ] Push notifications via web push API ("Your rival just beat your high score")
- [ ] Daily/weekly challenge ("Split the G Sunday — post your best score")
- [ ] Achievement badges (First Win, 5 Streak, 90%+ Accuracy, etc.)

### Competitive Hooks
- [x] Best-of-3 mode (already built)
- [ ] Private room codes — play with a specific friend, not random matchmaking
- [ ] Global leaderboard (requires simple backend, even just a Google Sheet API)
- [ ] "Pub of the Week" — location-tagged leaderboard
- [ ] Seasonal tournaments / limited-time events

---

## Phase 5: Content & Community

### Content Calendar
- [ ] Weekly "Split of the Week" — best score screenshot from community
- [ ] "Pub spotlight" — feature a pub that's adopted the game
- [ ] Dev diary / build log posts (how it was built, tech decisions)
- [ ] Behind-the-scenes of the pixel analysis scoring algorithm
- [ ] "Tips to improve your split" — educational content that drives engagement

### Community
- [ ] Discord server or WhatsApp community group
- [ ] Encourage user-generated content (tag #SplitTheG for reposts)
- [ ] Monthly tournament with leaderboard reset
- [ ] Feature top players / "Split Masters" on social

### Press & Media
- [ ] Reach out to Irish media (JOE.ie, The Irish Post, Irish Mirror)
- [ ] Pitch to pub/beer blogs and YouTube channels
- [ ] Contact mobile gaming review sites
- [ ] Local newspaper — "Local developer creates viral pub game"

---

## Phase 6: Partnerships & Monetisation (Later)

### Potential Revenue
- [ ] Sponsored pub partnerships (featured pubs in-app)
- [ ] Premium cosmetics (custom reveal animations, themes)
- [ ] Tournament entry fees with prize pools
- [ ] White-label version for pub chains / beer brands
- [ ] Merch — "I Split the G" t-shirts, stickers, coasters

### Brand Partnerships
- [ ] Guinness / Diageo — official partnership or sponsorship
- [ ] Pub quiz apps — cross-promotion
- [ ] Beer delivery apps (Drizly, etc.) — post-game discount codes
- [ ] Pub booking apps — "Play Split the G at [pub name]"

---

## Key Metrics to Track
- [ ] Daily/weekly active players
- [ ] Games played per day
- [ ] Share rate (% of games that result in a share)
- [ ] Retention (Day 1, Day 7, Day 30 return rate)
- [ ] Viral coefficient (how many new players each share brings)
- [ ] Average session length
- [ ] Geographic spread (which cities/pubs)

---

## Quick Wins (Do This Week)
1. Deploy to a public URL with a proper domain
2. Film 3 short videos of real games at the pub
3. Post to r/Guinness and r/ireland
4. Print 20 QR code posters and put them in 5 local pubs
5. Set up a basic Instagram/TikTok account and post the demo video
