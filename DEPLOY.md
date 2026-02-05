# Deploy G SPLIT - Beta Testing Guide

## Option 1: Netlify Drop (Fastest - 2 minutes) ⚡

**Perfect for quick beta testing with friends!**

1. Go to [drop.netlify.com](https://drop.netlify.com)
2. Drag and drop the `index.html` file into the browser
3. Get your public link instantly (looks like: `https://random-name-123.netlify.app`)
4. Share the link with your friends!

**Pros:**
- No account needed initially
- Instant deployment
- Free HTTPS included
- Works on all devices

**Notes:**
- The link stays active for 24 hours without an account
- Create a free Netlify account to keep it permanent
- You can update the site by dragging a new file

---

## Option 2: Vercel (Also Very Fast)

1. Install Vercel CLI:
   ```bash
   npm install -g vercel
   ```

2. Deploy:
   ```bash
   vercel --yes
   ```

3. Get your public link instantly!

---

## Option 3: GitHub Pages (Permanent)

1. Create a new GitHub repository
2. Upload `index.html` to the repo
3. Go to Settings → Pages
4. Select "main" branch and save
5. Your site will be at: `https://yourusername.github.io/repo-name`

---

## Option 4: ngrok (Tunnel Your Local Server)

**Use if you want to keep the server running locally**

1. Install ngrok: [ngrok.com/download](https://ngrok.com/download)
2. Start your local server: `npm start`
3. In another terminal: `ngrok http 8443`
4. Share the ngrok HTTPS URL with friends

**Note:** The URL changes each time you restart ngrok (free tier)

---

## Recommended for Beta Testing

**Use Netlify Drop (Option 1)** - it's the fastest and easiest!

Just drag `index.html` to [drop.netlify.com](https://drop.netlify.com) and you'll have a public link in seconds.
