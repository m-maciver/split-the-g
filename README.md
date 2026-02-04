# Split the G

A 1v1 competitive Guinness challenge where players race to drink a pint and stop the liquid level exactly at the 'G' logo with the best accuracy.

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

1. **SNAP** - Photograph your full pint
2. **MATCH** - Get paired with an opponent 1v1
3. **DRINK** - 30 seconds to drink and stop at the G
4. **VERIFY** - Snap a photo to verify your accuracy
5. **REVEAL** - Watch the dramatic score reveal!

### Scoring

Higher accuracy wins the round. Track your stats, build your streak, and climb the ranks!

### Ranks

| Rank | Requirements |
|------|-------------|
| Rookie | Less than 3 games played |
| Bronze | 3+ games, 40%+ win rate |
| Silver | 5+ games, 65%+ win rate |
| Gold | 10+ games, 70%+ win rate |
| Platinum | 20+ games, 75%+ win rate |

## Technical Details

- **Framework**: React 18 (single-file HTML app)
- **Styling**: CSS Variables + Inline Styles (Irish Pub theme)
- **Animation**: Framer Motion
- **Vision**: HTML5 Canvas pixel analysis
- **Multiplayer**: Socket.IO + WebRTC
- **Persistence**: localStorage for player stats and records

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

Drink responsibly. Split precisely.
