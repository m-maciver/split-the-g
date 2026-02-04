# Split the G 🍺

A Pub-Tech betting game where players bet virtual credits that they can drink a pint of Guinness and stop the liquid level exactly in the middle of the 'G' logo.

## Quick Start

### Start the Server

```bash
npm start
```

The server will:
- Run on HTTPS (port 8443) - required for camera access
- Display a QR code for easy mobile access
- Show your local IP address

### Access on Mobile

1. **Scan the QR code** displayed in the terminal
2. **Accept the security warning** (self-signed certificate - safe for local use)
   - iOS: Tap "Show Details" → "visit this website"
   - Android: Tap "Advanced" → "Proceed"
3. **Allow camera access** when prompted
4. **Start playing!**

### Alternative Access

If QR scanning doesn't work, manually enter the URL shown in the terminal:
```
https://192.168.0.19:8443
```

## How to Play

1. **STAKE $5** - Place your bet (starting balance: $50)
2. **CALIBRATE** - Line up the fresh pint's G logo in the crosshair
3. **DRINK** - 60 seconds to drink and stop at the G
4. **VERIFY** - Snap a photo to verify your accuracy
5. **VAR REVIEW** - Watch the reveal!

### Scoring

- **97-100%** = GOD TIER (Win $10, net +$5)
- **90-96%** = ROBBED (Lose $5)
- **<90%** = SHOCKING (Lose $5)

## Technical Details

- **Framework**: React (single-file HTML artifact)
- **Styling**: Tailwind CSS (inline)
- **Animation**: Framer Motion
- **Vision**: HTML5 Canvas pixel analysis
- **Persistence**: localStorage for balance & high score

## Requirements

- Node.js (for the server)
- Modern web browser
- Camera access on mobile device
- Local network connection

## Troubleshooting

**Camera not working?**
- Ensure you're using HTTPS (required by browsers)
- Check that you allowed camera permissions
- Try a different browser (Chrome/Safari recommended)

**Can't connect from mobile?**
- Ensure both devices are on the same WiFi network
- Check your firewall isn't blocking ports 8080 or 8443
- Try the HTTP redirect: `http://192.168.0.19:8080`

**Security warning won't go away?**
- This is normal for self-signed certificates
- The app is safe - it only runs locally on your network
- Follow the "Advanced" or "Details" prompts to proceed

## Credits

Built with React, Canvas API, and questionable pub logic.

🍺 Drink responsibly. Play irresponsibly.
