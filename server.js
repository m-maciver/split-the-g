const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const express = require('express');
const { Server } = require('socket.io');
const qrcode = require('qrcode-terminal');
const pino = require('pino');

// ============ CONFIGURATION ============

const PORT = parseInt(process.env.PORT || '8443', 10);
const HTTP_PORT = parseInt(process.env.HTTP_PORT || '8080', 10);
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';
const TURN_URL = process.env.TURN_URL || '';
const TURN_USERNAME = process.env.TURN_USERNAME || '';
const TURN_CREDENTIAL = process.env.TURN_CREDENTIAL || '';
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const ROOM_TTL = 30 * 60 * 1000; // 30 minutes

const logger = pino({
  level: LOG_LEVEL,
  transport: process.env.NODE_ENV !== 'production'
    ? { target: 'pino-pretty', options: { colorize: true } }
    : undefined
});

// Get local IP address
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

const localIP = getLocalIP();

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// Express app
const app = express();

// Serve static files (index.html, manifest.json, icons, etc.)
app.use(express.static(__dirname, {
  index: 'index.html',
  extensions: ['html']
}));

// Redirect obsolete single-player page to unified app
app.get('/split-the-g.html', (req, res) => {
  res.redirect(301, '/');
});

// Health check endpoint for deployment platforms
app.get('/health', (req, res) => {
  res.json({ status: 'ok', rooms: rooms.size, queue: matchmakingQueue.length });
});

// Create server based on environment
let server;
if (IS_PRODUCTION) {
  // Production: plain HTTP — platform (Railway/Render/Fly.io) terminates SSL
  server = http.createServer(app);
} else {
  // Development: self-signed HTTPS for local testing
  const options = {
    key: fs.readFileSync('key.pem'),
    cert: fs.readFileSync('cert.pem')
  };
  server = https.createServer(options, app);
}

// HTTP redirect server (dev only — redirects HTTP to HTTPS)
const httpRedirectServer = !IS_PRODUCTION ? http.createServer((req, res) => {
  res.writeHead(301, { Location: `https://${req.headers.host.replace(HTTP_PORT, PORT)}${req.url}` });
  res.end();
}) : null;

// Socket.IO server
const corsOrigin = CORS_ORIGIN === '*' ? '*' : CORS_ORIGIN.split(',');
const io = new Server(server, {
  cors: {
    origin: corsOrigin,
    methods: ['GET', 'POST']
  },
  pingInterval: 10000,
  pingTimeout: 5000,
  connectionStateRecovery: {
    maxDisconnectionDuration: 10000
  }
});

// ============ RATE LIMITING ============

/**
 * Creates a lightweight in-memory rate limiter.
 * @param {number} maxPerWindow - Maximum allowed calls within the window
 * @param {number} windowMs - Time window in milliseconds
 * @returns {function(string): boolean} Returns true if allowed, false if rate limited
 */
function createRateLimiter(maxPerWindow, windowMs) {
  const counts = new Map();
  // Periodically clean up stale entries
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of counts.entries()) {
      if (now - entry.start > windowMs * 2) counts.delete(key);
    }
  }, windowMs * 5);

  return (socketId) => {
    const now = Date.now();
    const entry = counts.get(socketId);
    if (!entry || now - entry.start > windowMs) {
      counts.set(socketId, { start: now, count: 1 });
      return true;
    }
    entry.count++;
    return entry.count <= maxPerWindow;
  };
}

const queueLimiter = createRateLimiter(5, 10000);    // 5 queue joins per 10s
const readyLimiter = createRateLimiter(3, 5000);      // 3 ready events per 5s
const submitLimiter = createRateLimiter(2, 30000);     // 2 submits per 30s
const rematchLimiter = createRateLimiter(3, 10000);    // 3 rematch requests per 10s

// ============ MATCHMAKING & ROOM MANAGEMENT ============

const matchmakingQueue = [];
const rooms = new Map();
const playerRooms = new Map(); // socketId -> roomId
const pendingPintImages = new Map(); // socketId -> base64 image (before room exists)

function generateRoomId() {
  return 'room_' + Math.random().toString(36).substr(2, 9);
}

/**
 * Creates a new game room for two matched players.
 * Initializes all room state: ready flags, pint images, results, and timeouts.
 * Both players are joined to the Socket.IO room.
 * @param {object} player1 - Socket object for player 1
 * @param {object} player2 - Socket object for player 2
 * @returns {object} The created room object
 */
function createRoom(player1, player2) {
  const roomId = generateRoomId();
  // Negotiate mode: both must want best-of-3
  const mode = (player1.preferredMode === 'best-of-3' && player2.preferredMode === 'best-of-3')
    ? 'best-of-3' : 'single';
  const room = {
    id: roomId,
    players: [player1.id, player2.id],
    playerNames: {
      [player1.id]: player1.nickname || 'Anon',
      [player2.id]: player2.nickname || 'Anon'
    },
    state: 'matched', // matched -> ready -> countdown -> drinking -> submit -> reveal -> postgame
    mode,
    seriesScore: { [player1.id]: 0, [player2.id]: 0 },
    seriesRound: 1,
    readyState: {
      [player1.id]: false,
      [player2.id]: false
    },
    pintImages: {
      [player1.id]: null,
      [player2.id]: null
    },
    countdownStart: null,
    results: {
      [player1.id]: { submitted: false, image: null, accuracy: null },
      [player2.id]: { submitted: false, image: null, accuracy: null }
    },
    resultTimeout: null,
    createdAt: Date.now()
  };

  rooms.set(roomId, room);
  playerRooms.set(player1.id, roomId);
  playerRooms.set(player2.id, roomId);

  // Join both players to the Socket.IO room
  player1.join(roomId);
  player2.join(roomId);

  return room;
}

/**
 * Looks up the room a player is currently in.
 * @param {string} socketId - The socket ID of the player
 * @returns {object|null} The room object, or null if not in a room
 */
function getRoom(socketId) {
  const roomId = playerRooms.get(socketId);
  if (!roomId) return null;
  return rooms.get(roomId);
}

/**
 * Finds the opponent's socket ID for a given player.
 * @param {string} socketId - The socket ID of the player
 * @returns {string|null} The opponent's socket ID, or null
 */
function getOpponentId(socketId) {
  const room = getRoom(socketId);
  if (!room) return null;
  return room.players.find(id => id !== socketId);
}

/**
 * Cleans up a room: clears all timeouts, removes player mappings, deletes the room.
 * @param {string} roomId - The room ID to clean up
 */
function cleanupRoom(roomId) {
  const room = rooms.get(roomId);
  if (!room) return;

  if (room.resultTimeout) {
    clearTimeout(room.resultTimeout);
    room.resultTimeout = null;
  }

  // Cancel any pending disconnect grace-period timeouts
  if (room.disconnectTimeouts) {
    Object.values(room.disconnectTimeouts).forEach(t => clearTimeout(t));
    room.disconnectTimeouts = null;
  }

  room.players.forEach(playerId => {
    playerRooms.delete(playerId);
  });

  rooms.delete(roomId);
}

/**
 * Removes a player from the matchmaking queue by socket ID.
 * @param {string} socketId - The socket ID to remove
 */
function removeFromQueue(socketId) {
  const index = matchmakingQueue.findIndex(p => p.id === socketId);
  if (index !== -1) {
    matchmakingQueue.splice(index, 1);
  }
}

// ============ STALE ROOM CLEANUP ============

setInterval(() => {
  const now = Date.now();
  for (const [roomId, room] of rooms.entries()) {
    if (now - room.createdAt > ROOM_TTL) {
      logger.info({ event: 'room-stale-cleanup', roomId });
      room.players.forEach(pid => {
        const sock = io.sockets.sockets.get(pid);
        if (sock) sock.emit('opponent-left');
      });
      cleanupRoom(roomId);
    }
  }
}, 60000);

// ============ SOCKET.IO EVENTS ============

io.on('connection', (socket) => {
  logger.info({ event: 'connect', socketId: socket.id });

  // ---- ICE CONFIG ----

  /**
   * Returns the ICE server configuration for WebRTC.
   * Includes STUN servers and optional TURN server (if configured via env vars).
   * @param {function} callback - Receives { iceServers: Array }
   */
  socket.on('get-ice-config', (callback) => {
    if (typeof callback !== 'function') return;
    const iceServers = [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ];
    if (TURN_URL) {
      iceServers.push({
        urls: TURN_URL,
        username: TURN_USERNAME,
        credential: TURN_CREDENTIAL
      });
    }
    callback({ iceServers });
  });

  // ---- MATCHMAKING ----

  /**
   * Player joins the matchmaking queue.
   * Removes any existing queue entry to prevent duplicates.
   * If 2+ players are queued, creates a room and emits 'matched' to both.
   * @param {object} [data] - Optional data with { nickname: string }
   * @emits queue-joined - Confirmation with queue position
   * @emits matched - When a match is found (to both players)
   * @emits error - If player is already in a game or rate limited
   */
  socket.on('join-queue', (data) => {
    if (!queueLimiter(socket.id)) {
      socket.emit('error', { message: 'Too many requests, slow down' });
      return;
    }

    // Remove from queue if already in (prevent duplicates)
    removeFromQueue(socket.id);

    // Check if already in a room
    if (playerRooms.has(socket.id)) {
      socket.emit('error', { message: 'Already in a game' });
      return;
    }

    // Store nickname and mode preference on socket
    const nickname = (data && typeof data.nickname === 'string')
      ? data.nickname.trim().slice(0, 16) || 'Anon'
      : 'Anon';
    socket.nickname = nickname;
    socket.preferredMode = (data && data.mode === 'best-of-3') ? 'best-of-3' : 'single';

    matchmakingQueue.push(socket);
    logger.info({ event: 'queue-join', socketId: socket.id, nickname, queueSize: matchmakingQueue.length });

    socket.emit('queue-joined', { position: matchmakingQueue.length });

    // Try to match
    if (matchmakingQueue.length >= 2) {
      const player1 = matchmakingQueue.shift();
      const player2 = matchmakingQueue.shift();

      const room = createRoom(player1, player2);

      // Copy pending pint images to room
      if (pendingPintImages.has(player1.id)) {
        room.pintImages[player1.id] = pendingPintImages.get(player1.id);
        pendingPintImages.delete(player1.id);
      }
      if (pendingPintImages.has(player2.id)) {
        room.pintImages[player2.id] = pendingPintImages.get(player2.id);
        pendingPintImages.delete(player2.id);
      }

      logger.info({ event: 'match-created', roomId: room.id, player1: player1.id, player2: player2.id });

      // Notify both players (include opponent's pint image, name, and mode)
      player1.emit('matched', {
        roomId: room.id,
        playerId: player1.id,
        opponentId: player2.id,
        isInitiator: true,
        opponentPintImage: room.pintImages[player2.id] || null,
        opponentName: room.playerNames[player2.id],
        mode: room.mode
      });

      player2.emit('matched', {
        roomId: room.id,
        playerId: player2.id,
        opponentId: player1.id,
        isInitiator: false,
        opponentPintImage: room.pintImages[player1.id] || null,
        opponentName: room.playerNames[player1.id],
        mode: room.mode
      });
    }
  });

  /**
   * Player leaves the matchmaking queue.
   * Also cleans up any pending pint image.
   */
  socket.on('leave-queue', () => {
    removeFromQueue(socket.id);
    pendingPintImages.delete(socket.id);
    logger.info({ event: 'queue-leave', socketId: socket.id, queueSize: matchmakingQueue.length });
  });

  // ---- WEBRTC SIGNALING ----

  /**
   * Forwards a WebRTC SDP offer to the opponent for peer connection setup.
   * The isInitiator player creates and sends the offer.
   * @param {object} data - { offer: RTCSessionDescriptionInit }
   * @emits webrtc-offer - Forwarded to opponent with { offer, from }
   */
  socket.on('webrtc-offer', (data) => {
    const opponentId = getOpponentId(socket.id);
    if (opponentId) {
      io.to(opponentId).emit('webrtc-offer', {
        offer: data.offer,
        from: socket.id
      });
    }
  });

  /**
   * Forwards a WebRTC SDP answer to the opponent.
   * The non-initiator player creates and sends the answer in response to an offer.
   * @param {object} data - { answer: RTCSessionDescriptionInit }
   * @emits webrtc-answer - Forwarded to opponent with { answer, from }
   */
  socket.on('webrtc-answer', (data) => {
    const opponentId = getOpponentId(socket.id);
    if (opponentId) {
      io.to(opponentId).emit('webrtc-answer', {
        answer: data.answer,
        from: socket.id
      });
    }
  });

  /**
   * Forwards an ICE candidate to the opponent for NAT traversal.
   * Both players continuously exchange candidates during connection setup.
   * @param {object} data - { candidate: RTCIceCandidateInit }
   * @emits webrtc-ice-candidate - Forwarded to opponent with { candidate, from }
   */
  socket.on('webrtc-ice-candidate', (data) => {
    const opponentId = getOpponentId(socket.id);
    if (opponentId) {
      io.to(opponentId).emit('webrtc-ice-candidate', {
        candidate: data.candidate,
        from: socket.id
      });
    }
  });

  // ---- GAME STATE ----

  /**
   * Player marks themselves as ready.
   * When both players in a room are ready, starts the 3-second pre-countdown
   * followed by the 30-second drinking phase.
   * @emits ready-update - Broadcasts updated readyState to the room
   * @emits game-start - When both players are ready, with countdownStart and duration
   */
  socket.on('player-ready', () => {
    if (!readyLimiter(socket.id)) return;

    const room = getRoom(socket.id);
    if (!room) return;

    room.readyState[socket.id] = true;

    const roomId = playerRooms.get(socket.id);
    io.to(roomId).emit('ready-update', {
      readyState: room.readyState
    });

    // Check if both players are ready
    const allReady = room.players.every(id => room.readyState[id]);
    if (allReady) {
      room.state = 'countdown';
      room.countdownStart = Date.now() + 3000; // 3 second pre-countdown

      io.to(roomId).emit('game-start', {
        countdownStart: room.countdownStart,
        duration: 30000 // 30 seconds
      });
    }
  });

  /**
   * Stores a player's pint reference image (photo of the full pint before drinking).
   * If the player isn't in a room yet (still in queue), the image is stored in
   * pendingPintImages and transferred to the room upon match.
   * @param {object} data - { image: string } Base64-encoded JPEG
   */
  socket.on('submit-pint-image', (data) => {
    const room = getRoom(socket.id);
    if (room) {
      room.pintImages[socket.id] = data.image;
    } else {
      // Store pending image for when room is created
      pendingPintImages.set(socket.id, data.image);
    }
  });

  /**
   * Player submits their result after the drinking phase.
   * Validates accuracy (clamped 0-100), rejects oversized images (>2.8MB base64),
   * and checks timing plausibility. Starts a 90-second timeout for the opponent.
   * When both results are in (or timeout expires), emits reveal-start.
   * @param {object} data - { image: string, accuracy: number }
   * @emits submit-ack - Confirms submission to sender with { timeoutEnd }
   * @emits opponent-submitted - Notifies opponent with { timeoutEnd }
   * @emits reveal-start - When both submitted, with results, winnerId, player IDs
   * @emits error - If image too large or submitted too early
   */
  socket.on('submit-result', (data) => {
    if (!submitLimiter(socket.id)) {
      socket.emit('error', { message: 'Too many requests, slow down' });
      return;
    }

    const room = getRoom(socket.id);
    if (!room) return;

    // Timing plausibility: reject if submitted before countdown could have ended
    if (room.countdownStart) {
      const drinkEndEarliest = room.countdownStart + 3000;
      if (Date.now() < drinkEndEarliest) {
        socket.emit('error', { message: 'Result submitted too early' });
        return;
      }
    }

    // Validate accuracy
    const accuracy = Math.max(0, Math.min(100, Math.round(Number(data.accuracy) || 0)));

    // Reject oversized images (> 2.8MB base64 ~ 2MB decoded)
    let image = data.image;
    if (typeof image === 'string' && image.length > 2.8 * 1024 * 1024) {
      socket.emit('error', { message: 'Image too large' });
      return;
    }

    room.results[socket.id] = {
      submitted: true,
      image: image,
      accuracy: accuracy
    };

    const roomId = playerRooms.get(socket.id);
    const opponentId = getOpponentId(socket.id);

    // Compute timeout end for countdown sync
    const timeoutEnd = Date.now() + 90000;

    // Acknowledge submission to sender
    socket.emit('submit-ack', { timeoutEnd });

    // Notify opponent that this player submitted
    io.to(opponentId).emit('opponent-submitted', { timeoutEnd });

    /**
     * Builds and emits the reveal payload, including series data for best-of-3.
     */
    function emitReveal(room, roomId) {
      room.state = 'reveal';
      const p1 = room.players[0];
      const p2 = room.players[1];
      const p1Accuracy = room.results[p1].accuracy;
      const p2Accuracy = room.results[p2].accuracy;

      let winnerId = null;
      if (p1Accuracy > p2Accuracy) winnerId = p1;
      else if (p2Accuracy > p1Accuracy) winnerId = p2;

      const payload = {
        results: {
          [p1]: { image: room.results[p1].image, accuracy: p1Accuracy },
          [p2]: { image: room.results[p2].image, accuracy: p2Accuracy }
        },
        winnerId,
        player1Id: p1,
        player2Id: p2
      };

      // Best-of-3 series tracking
      if (room.mode === 'best-of-3') {
        if (winnerId) room.seriesScore[winnerId]++;
        const p1Score = room.seriesScore[p1];
        const p2Score = room.seriesScore[p2];
        const seriesOver = p1Score >= 2 || p2Score >= 2;
        payload.series = {
          mode: 'best-of-3',
          round: room.seriesRound,
          score: { [p1]: p1Score, [p2]: p2Score },
          seriesOver,
          seriesWinner: seriesOver ? (p1Score >= 2 ? p1 : p2) : null
        };
        room.seriesRound++;
      }

      io.to(roomId).emit('reveal-start', payload);
    }

    // Start 90s timeout for result submission if first to submit
    const otherSubmitted = room.results[opponentId] && room.results[opponentId].submitted;
    if (!otherSubmitted && !room.resultTimeout) {
      room.resultTimeout = setTimeout(() => {
        // Auto-win for the submitter if opponent hasn't submitted
        const stillPending = !room.results[opponentId] || !room.results[opponentId].submitted;
        if (stillPending && rooms.has(roomId)) {
          room.results[opponentId] = { submitted: true, image: null, accuracy: 0 };
          emitReveal(room, roomId);
        }
      }, 90000);
    }

    // Check if both players submitted
    const allSubmitted = room.players.every(id => room.results[id].submitted);
    if (allSubmitted) {
      // Clear timeout if both submitted
      if (room.resultTimeout) {
        clearTimeout(room.resultTimeout);
        room.resultTimeout = null;
      }
      emitReveal(room, roomId);
    }
  });

  /**
   * Player requests a rematch with their current opponent.
   * @emits rematch-requested - Sent to the opponent with { from: socketId }
   */
  socket.on('request-rematch', () => {
    if (!rematchLimiter(socket.id)) return;

    const room = getRoom(socket.id);
    if (!room) return;

    const opponentId = getOpponentId(socket.id);
    io.to(opponentId).emit('rematch-requested', { from: socket.id });
  });

  /**
   * Player accepts a rematch request.
   * Resets all room state (readyState, pintImages, results, timeouts)
   * back to 'matched' state for a new round.
   * @emits rematch-accepted - Broadcast to both players in the room
   */
  socket.on('accept-rematch', () => {
    const room = getRoom(socket.id);
    if (!room) return;

    // Reset room state
    room.state = 'matched';
    room.readyState = {
      [room.players[0]]: false,
      [room.players[1]]: false
    };
    room.pintImages = {
      [room.players[0]]: null,
      [room.players[1]]: null
    };
    room.countdownStart = null;
    if (room.resultTimeout) {
      clearTimeout(room.resultTimeout);
      room.resultTimeout = null;
    }
    room.results = {
      [room.players[0]]: { submitted: false, image: null, accuracy: null },
      [room.players[1]]: { submitted: false, image: null, accuracy: null }
    };

    const roomId = playerRooms.get(socket.id);
    io.to(roomId).emit('rematch-accepted');
  });

  /**
   * Player signals readiness for the next round in a best-of-3 series.
   * When both players are ready, resets round state (but preserves series score)
   * and starts a new countdown.
   * @emits game-start - When both players are ready for the next round
   */
  socket.on('next-round-ready', () => {
    const room = getRoom(socket.id);
    if (!room || room.mode !== 'best-of-3') return;

    room.readyState[socket.id] = true;

    // Check if both ready for next round
    if (room.players.every(id => room.readyState[id])) {
      room.state = 'countdown';
      room.countdownStart = Date.now() + 3000;
      room.results = {
        [room.players[0]]: { submitted: false, image: null, accuracy: null },
        [room.players[1]]: { submitted: false, image: null, accuracy: null }
      };
      room.readyState = {
        [room.players[0]]: false,
        [room.players[1]]: false
      };
      room.pintImages = {
        [room.players[0]]: null,
        [room.players[1]]: null
      };
      if (room.resultTimeout) {
        clearTimeout(room.resultTimeout);
        room.resultTimeout = null;
      }

      const roomId = playerRooms.get(socket.id);
      io.to(roomId).emit('game-start', {
        countdownStart: room.countdownStart,
        duration: 30000
      });
    } else {
      // Notify the other player
      const opponentId = getOpponentId(socket.id);
      if (opponentId) {
        io.to(opponentId).emit('next-round-waiting');
      }
    }
  });

  /**
   * Player declines a rematch request.
   * @emits rematch-declined - Sent to the opponent
   */
  socket.on('decline-rematch', () => {
    const opponentId = getOpponentId(socket.id);
    if (opponentId) {
      io.to(opponentId).emit('rematch-declined');
    }
  });

  /**
   * Player explicitly leaves their current room.
   * Notifies the opponent and cleans up all room resources.
   * @emits opponent-left - Sent to the remaining opponent
   */
  socket.on('leave-room', () => {
    const room = getRoom(socket.id);
    if (!room) return;

    const roomId = playerRooms.get(socket.id);
    const opponentId = getOpponentId(socket.id);

    if (opponentId) {
      io.to(opponentId).emit('opponent-left');
    }

    socket.leave(roomId);
    cleanupRoom(roomId);

    logger.info({ event: 'leave-room', socketId: socket.id, roomId });
  });

  // ---- REJOIN (reconnect grace period) ----

  /**
   * Handles player reconnection after a brief disconnect.
   * Cancels the disconnect grace-period timeout, remaps the old socket ID
   * to the new one across all room state (players, readyState, results,
   * pintImages, playerNames), and re-joins the Socket.IO room.
   * @param {object} data - { roomId: string, oldSocketId: string }
   * @emits rejoin-success - If successfully rejoined, with { roomId, state }
   * @emits rejoin-failed - If room not found or old socket ID not in room
   */
  socket.on('rejoin-room', (data) => {
    const { roomId, oldSocketId } = data;
    const room = rooms.get(roomId);
    if (!room) {
      socket.emit('rejoin-failed');
      return;
    }

    // Cancel pending disconnect cleanup
    if (room.disconnectTimeouts && room.disconnectTimeouts[oldSocketId]) {
      clearTimeout(room.disconnectTimeouts[oldSocketId]);
      delete room.disconnectTimeouts[oldSocketId];
      logger.debug({ event: 'disconnect-timeout-cancelled', oldSocketId, roomId });
    }

    // Remap player in room
    const playerIndex = room.players.indexOf(oldSocketId);
    if (playerIndex === -1) {
      socket.emit('rejoin-failed');
      return;
    }

    room.players[playerIndex] = socket.id;

    // Remap readyState, results, pintImages
    if (room.readyState[oldSocketId] !== undefined) {
      room.readyState[socket.id] = room.readyState[oldSocketId];
      delete room.readyState[oldSocketId];
    }
    if (room.results[oldSocketId] !== undefined) {
      room.results[socket.id] = room.results[oldSocketId];
      delete room.results[oldSocketId];
    }
    if (room.pintImages[oldSocketId] !== undefined) {
      room.pintImages[socket.id] = room.pintImages[oldSocketId];
      delete room.pintImages[oldSocketId];
    }
    if (room.playerNames[oldSocketId] !== undefined) {
      room.playerNames[socket.id] = room.playerNames[oldSocketId];
      delete room.playerNames[oldSocketId];
    }

    // Update mappings
    playerRooms.delete(oldSocketId);
    playerRooms.set(socket.id, roomId);
    socket.join(roomId);

    socket.emit('rejoin-success', { roomId, state: room.state });
    logger.info({ event: 'rejoin', socketId: socket.id, oldSocketId, roomId });
  });

  // ---- DISCONNECT ----

  /**
   * Handles socket disconnection.
   * Removes the player from the matchmaking queue, cleans up pending data,
   * and starts a 10-second grace period for the player to reconnect.
   * If they don't rejoin within 10s, the room is cleaned up and the
   * opponent is notified.
   * @emits opponent-disconnected - Sent to opponent immediately
   * @emits opponent-left - Sent to opponent after grace period expires
   */
  socket.on('disconnect', () => {
    logger.info({ event: 'disconnect', socketId: socket.id });

    // Remove from queue and clean up pending data
    removeFromQueue(socket.id);
    pendingPintImages.delete(socket.id);

    // Handle room cleanup with grace period
    const room = getRoom(socket.id);
    if (room) {
      const roomId = playerRooms.get(socket.id);
      const opponentId = getOpponentId(socket.id);

      if (opponentId) {
        io.to(opponentId).emit('opponent-disconnected');
      }

      // Delay cleanup by 10s to allow reconnect
      if (!room.disconnectTimeouts) room.disconnectTimeouts = {};
      room.disconnectTimeouts[socket.id] = setTimeout(() => {
        // Only clean up if player hasn't reconnected
        if (room.players.includes(socket.id)) {
          logger.info({ event: 'grace-period-expired', socketId: socket.id, roomId });
          // Notify remaining player before cleanup
          const remainingId = room.players.find(id => id !== socket.id);
          if (remainingId) {
            io.to(remainingId).emit('opponent-left');
          }
          cleanupRoom(roomId);
        }
      }, 10000);
    }
  });
});

// ============ START SERVERS ============

server.listen(PORT, '0.0.0.0', () => {
  if (IS_PRODUCTION) {
    logger.info({ event: 'server-started', port: PORT, mode: 'production' });
    console.log(`Split the G server running on port ${PORT} (production)`);
  } else {
    const url = `https://${localIP}:${PORT}`;

    console.log('\n========================================');
    console.log('     SPLIT THE G - MULTIPLAYER 1v1     ');
    console.log('========================================\n');
    console.log(`HTTPS Server running on port ${PORT}`);
    console.log(`HTTP redirect running on port ${HTTP_PORT}\n`);
    console.log('MOBILE ACCESS:\n');
    console.log(`   ${url}\n`);

    // Generate QR code
    console.log('SCAN THIS QR CODE:\n');
    qrcode.generate(url, { small: true });

    console.log('\nIMPORTANT: Accept the security warning');
    console.log('    (Self-signed certificate - safe for local use)\n');
    console.log('QUICK SETUP ON MOBILE:');
    console.log('    1. Scan the QR code above');
    console.log('    2. Tap "Advanced" or "Details"');
    console.log('    3. Tap "Proceed" or "Accept Risk"');
    console.log('    4. Allow camera & microphone access\n');
    console.log('Ready for 1v1 matches!\n');
    console.log('Press Ctrl+C to stop the server\n');
    console.log('========================================');
  }
});

if (httpRedirectServer) {
  httpRedirectServer.listen(HTTP_PORT, '0.0.0.0', () => {
    logger.info({ event: 'http-redirect-started', port: HTTP_PORT });
  });
}
