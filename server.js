const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const express = require('express');
const { Server } = require('socket.io');
const qrcode = require('qrcode-terminal');

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

const PORT = 8443;
const HTTP_PORT = 8080;
const localIP = getLocalIP();

// Express app
const app = express();

// Read SSL certificates
const options = {
  key: fs.readFileSync('key.pem'),
  cert: fs.readFileSync('cert.pem')
};

// Static file serving
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/index.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Redirect obsolete single-player page to unified app
app.get('/split-the-g.html', (req, res) => {
  res.redirect(301, '/');
});

app.get('/manifest.json', (req, res) => {
  res.sendFile(path.join(__dirname, 'manifest.json'));
});

// HTTPS Server with Express
const httpsServer = https.createServer(options, app);

// HTTP redirect server
const httpServer = http.createServer((req, res) => {
  res.writeHead(301, { Location: `https://${req.headers.host.replace(HTTP_PORT, PORT)}${req.url}` });
  res.end();
});

// Socket.IO server
const io = new Server(httpsServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// ============ MATCHMAKING & ROOM MANAGEMENT ============

const matchmakingQueue = [];
const rooms = new Map();
const playerRooms = new Map(); // socketId -> roomId

function generateRoomId() {
  return 'room_' + Math.random().toString(36).substr(2, 9);
}

function createRoom(player1, player2) {
  const roomId = generateRoomId();
  const room = {
    id: roomId,
    players: [player1.id, player2.id],
    playerNames: {
      [player1.id]: 'Player 1',
      [player2.id]: 'Player 2'
    },
    state: 'matched', // matched -> ready -> countdown -> drinking -> submit -> reveal -> postgame
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

function getRoom(socketId) {
  const roomId = playerRooms.get(socketId);
  if (!roomId) return null;
  return rooms.get(roomId);
}

function getOpponentId(socketId) {
  const room = getRoom(socketId);
  if (!room) return null;
  return room.players.find(id => id !== socketId);
}

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

function removeFromQueue(socketId) {
  const index = matchmakingQueue.findIndex(p => p.id === socketId);
  if (index !== -1) {
    matchmakingQueue.splice(index, 1);
  }
}

// ============ SOCKET.IO EVENTS ============

io.on('connection', (socket) => {
  console.log(`[+] Player connected: ${socket.id}`);

  // ---- MATCHMAKING ----

  socket.on('join-queue', () => {
    // Remove from queue if already in (prevent duplicates)
    removeFromQueue(socket.id);

    // Check if already in a room
    if (playerRooms.has(socket.id)) {
      socket.emit('error', { message: 'Already in a game' });
      return;
    }

    matchmakingQueue.push(socket);
    console.log(`[Q] ${socket.id} joined queue. Queue size: ${matchmakingQueue.length}`);

    socket.emit('queue-joined', { position: matchmakingQueue.length });

    // Try to match
    if (matchmakingQueue.length >= 2) {
      const player1 = matchmakingQueue.shift();
      const player2 = matchmakingQueue.shift();

      const room = createRoom(player1, player2);

      console.log(`[M] Match created: ${room.id} (${player1.id} vs ${player2.id})`);

      // Notify both players
      player1.emit('matched', {
        roomId: room.id,
        playerId: player1.id,
        opponentId: player2.id,
        isInitiator: true // Player 1 initiates WebRTC
      });

      player2.emit('matched', {
        roomId: room.id,
        playerId: player2.id,
        opponentId: player1.id,
        isInitiator: false
      });
    }
  });

  socket.on('leave-queue', () => {
    removeFromQueue(socket.id);
    console.log(`[Q] ${socket.id} left queue. Queue size: ${matchmakingQueue.length}`);
  });

  // ---- WEBRTC SIGNALING ----

  socket.on('webrtc-offer', (data) => {
    const opponentId = getOpponentId(socket.id);
    if (opponentId) {
      io.to(opponentId).emit('webrtc-offer', {
        offer: data.offer,
        from: socket.id
      });
    }
  });

  socket.on('webrtc-answer', (data) => {
    const opponentId = getOpponentId(socket.id);
    if (opponentId) {
      io.to(opponentId).emit('webrtc-answer', {
        answer: data.answer,
        from: socket.id
      });
    }
  });

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

  socket.on('player-ready', () => {
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

  socket.on('submit-pint-image', (data) => {
    const room = getRoom(socket.id);
    if (!room) return;
    room.pintImages[socket.id] = data.image;
  });

  socket.on('submit-result', (data) => {
    const room = getRoom(socket.id);
    if (!room) return;

    room.results[socket.id] = {
      submitted: true,
      image: data.image,
      accuracy: data.accuracy
    };

    const roomId = playerRooms.get(socket.id);
    const opponentId = getOpponentId(socket.id);

    // Notify opponent that this player submitted
    io.to(opponentId).emit('opponent-submitted');

    // Start 90s timeout for result submission if first to submit
    const otherSubmitted = room.results[opponentId] && room.results[opponentId].submitted;
    if (!otherSubmitted && !room.resultTimeout) {
      room.resultTimeout = setTimeout(() => {
        // Auto-win for the submitter if opponent hasn't submitted
        const stillPending = !room.results[opponentId] || !room.results[opponentId].submitted;
        if (stillPending && rooms.has(roomId)) {
          room.results[opponentId] = { submitted: true, image: null, accuracy: 0 };
          room.state = 'reveal';

          const p1 = room.players[0];
          const p2 = room.players[1];
          const p1Accuracy = room.results[p1].accuracy;
          const p2Accuracy = room.results[p2].accuracy;

          let winnerId = null;
          if (p1Accuracy > p2Accuracy) winnerId = p1;
          else if (p2Accuracy > p1Accuracy) winnerId = p2;

          io.to(roomId).emit('reveal-start', {
            results: {
              [p1]: { image: room.results[p1].image, accuracy: p1Accuracy },
              [p2]: { image: room.results[p2].image, accuracy: p2Accuracy }
            },
            winnerId: winnerId,
            player1Id: p1,
            player2Id: p2
          });
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

      room.state = 'reveal';

      // Determine winner
      const p1 = room.players[0];
      const p2 = room.players[1];
      const p1Accuracy = room.results[p1].accuracy;
      const p2Accuracy = room.results[p2].accuracy;

      let winnerId = null;
      if (p1Accuracy > p2Accuracy) winnerId = p1;
      else if (p2Accuracy > p1Accuracy) winnerId = p2;
      // If tie, winnerId stays null

      // Send reveal sequence
      io.to(roomId).emit('reveal-start', {
        results: {
          [p1]: { image: room.results[p1].image, accuracy: p1Accuracy },
          [p2]: { image: room.results[p2].image, accuracy: p2Accuracy }
        },
        winnerId: winnerId,
        player1Id: p1,
        player2Id: p2
      });
    }
  });

  socket.on('request-rematch', () => {
    const room = getRoom(socket.id);
    if (!room) return;

    const opponentId = getOpponentId(socket.id);
    io.to(opponentId).emit('rematch-requested', { from: socket.id });
  });

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

  socket.on('decline-rematch', () => {
    const opponentId = getOpponentId(socket.id);
    if (opponentId) {
      io.to(opponentId).emit('rematch-declined');
    }
  });

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

    console.log(`[R] ${socket.id} left room ${roomId}`);
  });

  // ---- REJOIN (reconnect grace period) ----

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
      console.log(`[R] Cancelled disconnect timeout for ${oldSocketId} in room ${roomId}`);
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
    console.log(`[R] ${socket.id} rejoined room ${roomId} (was ${oldSocketId})`);
  });

  // ---- DISCONNECT ----

  socket.on('disconnect', () => {
    console.log(`[-] Player disconnected: ${socket.id}`);

    // Remove from queue
    removeFromQueue(socket.id);

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
          console.log(`[R] Grace period expired for ${socket.id} in room ${roomId}, cleaning up`);
          cleanupRoom(roomId);
        }
      }, 10000);
    }
  });
});

// ============ START SERVERS ============

httpsServer.listen(PORT, '0.0.0.0', () => {
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
});

httpServer.listen(HTTP_PORT, '0.0.0.0', () => {
  console.log(`HTTP redirect listening on port ${HTTP_PORT}`);
});
