/**
 * multiplayerHandler.js
 * Full multiplayer socket handler for Duo (2-player co-op) and 2v2 Team Battle modes.
 * Also acts as WebRTC signaling relay for voice chat.
 */

// In-memory state
const queues = { '1v1': [], duo: [], '2v2': [] };
const activeRooms = new Map(); // roomId → RoomState

// Rate limiting: userId → last submission timestamp
const submissionTimestamps = new Map();
const RATE_LIMIT_MS = 10_000; // 10 seconds between submissions per player

// ── Coin Stakes per Mode ──────────────────────────────────────────────────────
const COIN_STAKES = { '1v1': 120, 'duo': 0, '2v2': 200 };
const BASE_ELO_CHANGE = 25; // Flat ELO points exchanged per match

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateRoomId() {
  return `mp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Pick a problem appropriate for the average level of players in the room.
 * Returns a simplified problem object for the client.
 */
function selectProblem(avgLevel) {
  const PROBLEMS = [
    {
      id: 'p-arr-1-1',
      title: 'The First Sentinel',
      difficulty: 'Easy',
      mission: 'Retrieve the value stored in the very first vault. Return null if the archive is empty.',
      hint: 'Access index 0. Check length first to handle the empty case.',
      testCases: [
        { input: [1, 2, 3, 4], expected: 1 },
        { input: [42], expected: 42 },
        { input: [], expected: null },
      ],
      functionSignatures: {
        javascript: 'function solve(arr) {\n  // Return the first element, or null if empty\n  \n}',
        python: 'def solve(arr):\n    # Return the first element, or None if empty\n    pass',
      },
    },
    {
      id: 'p-arr-1-3',
      title: 'Maximum Signal',
      difficulty: 'Medium',
      mission: 'Find the highest intensity value in the sensor array. Readings may be negative.',
      hint: 'Math.max() with spread, or iterate tracking a running maximum.',
      testCases: [
        { input: [3, 1, 4, 1, 5, 9, 2, 6], expected: 9 },
        { input: [-5, -1, -3], expected: -1 },
        { input: [7], expected: 7 },
      ],
      functionSignatures: {
        javascript: 'function solve(arr) {\n  // Return the maximum value\n  \n}',
        python: 'def solve(arr):\n    # Return the maximum value\n    pass',
      },
    },
    {
      id: 'p-arr-2-1',
      title: 'Two-Sum Gate',
      difficulty: 'Medium',
      mission: 'Find two indices whose values sum to the target. Return the indices as [i, j].',
      hint: 'Use a Map to store seen values. For each element, check if (target - element) was seen.',
      testCases: [
        { input: '[2, 7, 11, 15], 9', expected: '[0, 1]' },
        { input: '[3, 2, 4], 6', expected: '[1, 2]' },
        { input: '[3, 3], 6', expected: '[0, 1]' },
      ],
      functionSignatures: {
        javascript: 'function solve(arr, target) {\n  // Return [i, j] where arr[i] + arr[j] === target\n  \n}',
        python: 'def solve(arr, target):\n    # Return [i, j]\n    pass',
      },
    },
    {
      id: 'p-arr-2-3',
      title: 'Subarray Sum',
      difficulty: 'Hard',
      mission: 'Find the contiguous subarray with the largest sum and return that sum.',
      hint: "Kadane's Algorithm: at each position, extend previous subarray or start fresh.",
      testCases: [
        { input: '[-2, 1, -3, 4, -1, 2, 1, -5, 4]', expected: '6' },
        { input: '[1]', expected: '1' },
        { input: '[-1, -2, -3]', expected: '-1' },
      ],
      functionSignatures: {
        javascript: 'function solve(arr) {\n  // Return the maximum subarray sum\n  \n}',
        python: 'def solve(arr):\n    # Return the maximum subarray sum\n    pass',
      },
    },
  ];

  // Simple level-to-difficulty mapping
  if (avgLevel < 5) return PROBLEMS[0];
  if (avgLevel < 10) return PROBLEMS[1];
  if (avgLevel < 20) return PROBLEMS[2];
  return PROBLEMS[3];
}

/**
 * Calculate player damage from a submission result.
 * @param {number} correctness - 0 to 1 (fraction of test cases passed)
 * @param {number} secondsElapsed - time since match start
 */
function calcPlayerDamage(correctness, secondsElapsed) {
  const baseDamage = Math.floor(correctness * 150);
  const speedBonus = Math.max(0, 50 - Math.floor(secondsElapsed / 2));
  return baseDamage + (correctness === 1 ? speedBonus : 0);
}

/**
 * Calculate ELO-style coin exchange.
 * Winner earns stake coins from loser. ELO delta is flat BASE_ELO_CHANGE.
 */
function calcCoinExchange(mode, winnerCorrectness, loserCorrectness) {
  const stake = COIN_STAKES[mode] || 0;
  // Performance multiplier: if winner barely won vs loser who solved a lot → smaller swing
  const performanceDelta = Math.max(0, (winnerCorrectness || 0) - (loserCorrectness || 0));
  const coinGain = Math.round(stake * (0.5 + performanceDelta * 0.5));
  const coinLoss = coinGain; // zero-sum
  const eloChange = BASE_ELO_CHANGE + Math.round(performanceDelta * 15);
  return { coinGain, coinLoss, eloChange };
}

/**
 * Build the sanitized player list for a team (safe to send to clients).
 */
function sanitizePlayers(players) {
  return players.map(p => ({
    userId: p.userId,
    username: p.username,
    level: p.level,
    hp: p.hp,
    submitted: p.submitted,
  }));
}

// ─── Room Creation ─────────────────────────────────────────────────────────────

function create1v1Room(p1, p2, io) {
  const roomId = generateRoomId();
  const avgLevel = Math.round((p1.level + p2.level) / 2);
  const problem = selectProblem(avgLevel);

  const room = {
    roomId,
    mode: '1v1',
    problem,
    teams: {
      A: [{ ...p1, hp: 100, submitted: false }],
      B: [{ ...p2, hp: 100, submitted: false }],
    },
    teamHP: { A: 1000, B: 1000 },
    submissions: new Map(),
    startedAt: Date.now(),
    status: 'active',
  };

  activeRooms.set(roomId, room);

  p1.socket.join(roomId);
  p2.socket.join(roomId);

  p1.socket.emit('mp:match_found', { roomId, mode: '1v1', problem, teams: { A: sanitizePlayers(room.teams.A), B: sanitizePlayers(room.teams.B) }, teamHP: room.teamHP, myTeam: 'A' });
  p2.socket.emit('mp:match_found', { roomId, mode: '1v1', problem, teams: { A: sanitizePlayers(room.teams.A), B: sanitizePlayers(room.teams.B) }, teamHP: room.teamHP, myTeam: 'B' });

  console.log(`[1v1] Room ${roomId} created: ${p1.username} vs ${p2.username}`);
}

function createDuoRoom(p1, p2, io) {
  const roomId = generateRoomId();
  const avgLevel = Math.round((p1.level + p2.level) / 2);
  const problem = selectProblem(avgLevel);

  const room = {
    roomId,
    mode: 'duo',
    problem,
    teams: {
      A: [
        { ...p1, hp: 100, submitted: false },
        { ...p2, hp: 100, submitted: false },
      ],
      B: [], // No opponents in duo — fight a boss
    },
    teamHP: { A: 1000 }, // Boss HP
    bossHP: 1000,
    submissions: new Map(),
    startedAt: Date.now(),
    status: 'active',
    lastComboCheck: null,
  };

  activeRooms.set(roomId, room);

  p1.socket.join(roomId);
  p2.socket.join(roomId);

  const payload = {
    roomId,
    mode: 'duo',
    problem,
    teams: { A: sanitizePlayers(room.teams.A) },
    bossHP: room.bossHP,
    myTeam: 'A',
  };

  io.to(roomId).emit('mp:match_found', payload);
  console.log(`[DUO] Room ${roomId} created: ${p1.username} + ${p2.username}`);
}

function create2v2Room(teamA, teamB, io) {
  const roomId = generateRoomId();
  const allLevels = [...teamA, ...teamB].map(p => p.level);
  const avgLevel = Math.round(allLevels.reduce((a, b) => a + b, 0) / allLevels.length);
  const problem = selectProblem(avgLevel);

  const room = {
    roomId,
    mode: '2v2',
    problem,
    teams: {
      A: teamA.map(p => ({ ...p, hp: 100, submitted: false })),
      B: teamB.map(p => ({ ...p, hp: 100, submitted: false })),
    },
    teamHP: { A: 1000, B: 1000 },
    submissions: new Map(),
    startedAt: Date.now(),
    status: 'active',
    lastComboCheck: { A: null, B: null },
    recentSubmissions: { A: [], B: [] },
  };

  activeRooms.set(roomId, room);

  teamA.forEach(p => p.socket.join(roomId));
  teamB.forEach(p => p.socket.join(roomId));

  // Notify each team separately so they know which team they're on
  teamA.forEach(p => {
    p.socket.emit('mp:match_found', {
      roomId,
      mode: '2v2',
      problem,
      teams: {
        A: sanitizePlayers(room.teams.A),
        B: sanitizePlayers(room.teams.B),
      },
      teamHP: room.teamHP,
      myTeam: 'A',
    });
  });

  teamB.forEach(p => {
    p.socket.emit('mp:match_found', {
      roomId,
      mode: '2v2',
      problem,
      teams: {
        A: sanitizePlayers(room.teams.A),
        B: sanitizePlayers(room.teams.B),
      },
      teamHP: room.teamHP,
      myTeam: 'B',
    });
  });

  console.log(`[2v2] Room ${roomId} created`);
}

// ─── Main Handler ──────────────────────────────────────────────────────────────

const setupMultiplayer = (io) => {
  io.on('connection', (socket) => {
    console.log(`[MP] Client connected: ${socket.id}`);

    // ── Disconnect cleanup ──────────────────────────────────────────────────
    socket.on('disconnect', () => {
      console.log(`[MP] Client disconnected: ${socket.id}`);

      // Remove from queues
      queues['1v1'] = queues['1v1'].filter(p => p.socket.id !== socket.id);
      queues.duo = queues.duo.filter(p => p.socket.id !== socket.id);
      queues['2v2'] = queues['2v2'].filter(p => p.socket.id !== socket.id);

      // Notify room of forfeit
      for (const [roomId, room] of activeRooms.entries()) {
        const allPlayers = [...room.teams.A, ...room.teams.B];
        const disconnected = allPlayers.find(p => p.socket.id === socket.id);
        if (disconnected) {
          if (room.status !== 'ended') {
            room.status = 'ended';
            socket.to(roomId).emit('mp:player_disconnected', {
              userId: disconnected.userId,
              username: disconnected.username,
            });
          }
          activeRooms.delete(roomId);
          break;
        }
      }
    });

    // ── Matchmaking ─────────────────────────────────────────────────────────
    socket.on('mp:find_match', ({ mode, userId, username, level }) => {
      const playerData = { socket, userId, username: username || 'Hunter', level: level || 1 };

      if (mode === '1v1') {
        if (queues['1v1'].length >= 1) {
          const opponent = queues['1v1'].shift();
          if (opponent.socket.id !== socket.id) {
            create1v1Room(opponent, playerData, io);
            return;
          }
          queues['1v1'].push(opponent);
        }
        queues['1v1'].push(playerData);
        socket.emit('mp:waiting', { message: 'Searching for an opponent...', mode: '1v1', queueSize: 1 });
      } else if (mode === 'duo') {
        if (queues.duo.length >= 1) {
          const p1 = queues.duo.shift();
          if (p1.socket.id !== socket.id) {
            createDuoRoom(p1, playerData, io);
            return;
          }
          queues.duo.push(p1); // put back if same socket somehow
        }
        queues.duo.push(playerData);
        socket.emit('mp:waiting', { message: 'Searching for a co-op partner...', mode: 'duo' });
      } else if (mode === '2v2') {
        queues['2v2'].push(playerData);

        if (queues['2v2'].length >= 4) {
          const [p1, p2, p3, p4] = queues['2v2'].splice(0, 4);
          create2v2Room([p1, p2], [p3, p4], io);
        } else {
          socket.emit('mp:waiting', {
            message: `In queue — ${queues['2v2'].length}/4 players found...`,
            mode: '2v2',
            queueSize: queues['2v2'].length,
          });
          // Notify everyone in queue of updated count
          queues['2v2'].forEach(p =>
            p.socket.emit('mp:queue_update', { queueSize: queues['2v2'].length })
          );
        }
      }
    });

    socket.on('mp:cancel_search', () => {
      queues['1v1'] = queues['1v1'].filter(p => p.socket.id !== socket.id);
      queues.duo = queues.duo.filter(p => p.socket.id !== socket.id);
      queues['2v2'] = queues['2v2'].filter(p => p.socket.id !== socket.id);
      socket.emit('mp:search_cancelled');
    });

    // ── Code Submission ─────────────────────────────────────────────────────
    socket.on('mp:code_submit', async ({ roomId, userId, code, language, testResults }) => {
      const room = activeRooms.get(roomId);
      if (!room || room.status !== 'active') return;

      // Rate limit check
      const lastSubmit = submissionTimestamps.get(userId);
      if (lastSubmit && Date.now() - lastSubmit < RATE_LIMIT_MS) {
        socket.emit('mp:rate_limited', {
          message: `Wait ${Math.ceil((RATE_LIMIT_MS - (Date.now() - lastSubmit)) / 1000)}s before resubmitting.`,
        });
        return;
      }
      submissionTimestamps.set(userId, Date.now());

      // Find player + team
      let playerTeam = null;
      let player = room.teams.A.find(p => p.userId === userId);
      if (player) {
        playerTeam = 'A';
      } else {
        player = room.teams.B.find(p => p.userId === userId);
        if (player) playerTeam = 'B';
      }

      if (!player || !playerTeam) return;
      player.submitted = true;

      // Calculate correctness from test results passed from client
      const passed = (testResults || []).filter(r => r.passed).length;
      const total = Math.max((testResults || []).length, 1);
      const correctness = passed / total;

      const secondsElapsed = Math.floor((Date.now() - room.startedAt) / 1000);
      const damage = calcPlayerDamage(correctness, secondsElapsed);

      // Record submission
      room.submissions.set(userId, { timestamp: Date.now(), correctness, damage });

      // Broadcast submission result to whole room
      io.to(roomId).emit('mp:submission_result', {
        userId,
        username: player.username,
        team: playerTeam,
        correctness,
        damage,
        testResults: testResults || [],
      });

      // Apply damage to opposing team HP
      if (room.mode === '1v1' || room.mode === '2v2') {
        const opposingTeam = playerTeam === 'A' ? 'B' : 'A';
        room.teamHP[opposingTeam] = Math.max(0, room.teamHP[opposingTeam] - damage);

        // Team combo only applies to 2v2 (2 teammates)
        if (room.mode === '2v2') {
          const teamPlayers = room.teams[playerTeam];
          const teamSubmissions = teamPlayers.map(p => room.submissions.get(p.userId)).filter(Boolean);

          if (teamSubmissions.length === teamPlayers.length) {
            const timestamps = teamSubmissions.map(s => s.timestamp);
            const timeDiff = Math.abs(timestamps[0] - timestamps[1]);

            if (
              timeDiff <= 5000 &&
              teamSubmissions.every(s => s.correctness >= 0.8)
            ) {
              const comboBonusDamage = Math.floor(
                teamSubmissions.reduce((sum, s) => sum + s.damage, 0) * 0.5
              );
              room.teamHP[opposingTeam] = Math.max(0, room.teamHP[opposingTeam] - comboBonusDamage);
              io.to(roomId).emit('mp:team_combo', {
                team: playerTeam,
                bonusDamage: comboBonusDamage,
                teamHP: room.teamHP,
              });
            }
          }
        }

        io.to(roomId).emit('mp:hp_update', { teamHP: room.teamHP });

        // Win condition
        if (room.teamHP[opposingTeam] <= 0) {
          room.status = 'ended';
          const is1v1 = room.mode === '1v1';

          // Collect best correctness from each team for ELO calc
          const winnerBestCorrectness = Math.max(
            ...(room.teams[playerTeam] || []).map(p => (room.submissions.get(p.userId)?.correctness || 0))
          );
          const loserBestCorrectness = Math.max(
            ...(room.teams[opposingTeam] || []).map(p => (room.submissions.get(p.userId)?.correctness || 0))
          );

          const { coinGain, coinLoss, eloChange } = calcCoinExchange(room.mode, winnerBestCorrectness, loserBestCorrectness);

          io.to(roomId).emit('mp:match_end', {
            winner: playerTeam,
            loser: opposingTeam,
            loot: {
              xp: is1v1 ? 350 : 500,
              coins: coinGain,
              coinsLost: coinLoss,
              eloChange,
            },
          });
          activeRooms.delete(roomId);
        }
      } else if (room.mode === 'duo') {
        // Duo: damage the boss
        room.bossHP = Math.max(0, room.bossHP - damage);
        io.to(roomId).emit('mp:hp_update', { bossHP: room.bossHP });

        // Check team combo for duo too
        const teamSubmissions = room.teams.A.map(p => room.submissions.get(p.userId)).filter(Boolean);
        if (teamSubmissions.length === room.teams.A.length) {
          const timestamps = teamSubmissions.map(s => s.timestamp);
          const timeDiff = Math.abs(timestamps[0] - timestamps[1]);
          if (timeDiff <= 5000 && teamSubmissions.every(s => s.correctness >= 0.8)) {
            const comboBonusDamage = Math.floor(
              teamSubmissions.reduce((sum, s) => sum + s.damage, 0) * 0.5
            );
            room.bossHP = Math.max(0, room.bossHP - comboBonusDamage);
            io.to(roomId).emit('mp:team_combo', { team: 'A', bonusDamage: comboBonusDamage, bossHP: room.bossHP });
            io.to(roomId).emit('mp:hp_update', { bossHP: room.bossHP });
          }
        }

        if (room.bossHP <= 0) {
          room.status = 'ended';
          io.to(roomId).emit('mp:match_end', {
            winner: 'A',
            loot: { xp: 400, coins: 150 },
          });
          activeRooms.delete(roomId);
        }
      }
    });

    // ── Typing Indicator ────────────────────────────────────────────────────
    socket.on('mp:typing', ({ roomId, userId, isTyping }) => {
      socket.to(roomId).emit('mp:typing', { userId, isTyping });
    });

    // ── WebRTC Voice Signaling Relay ────────────────────────────────────────
    socket.on('voice:offer', ({ roomId, targetUserId, offer, fromUserId }) => {
      // Find target socket in room and forward offer
      const room = activeRooms.get(roomId);
      if (!room) return;
      const allPlayers = [...room.teams.A, ...room.teams.B];
      const target = allPlayers.find(p => p.userId === targetUserId);
      if (target) {
        target.socket.emit('voice:offer', { offer, fromUserId });
      }
    });

    socket.on('voice:answer', ({ roomId, targetUserId, answer, fromUserId }) => {
      const room = activeRooms.get(roomId);
      if (!room) return;
      const allPlayers = [...room.teams.A, ...room.teams.B];
      const target = allPlayers.find(p => p.userId === targetUserId);
      if (target) {
        target.socket.emit('voice:answer', { answer, fromUserId });
      }
    });

    socket.on('voice:ice', ({ roomId, targetUserId, candidate, fromUserId }) => {
      const room = activeRooms.get(roomId);
      if (!room) return;
      const allPlayers = [...room.teams.A, ...room.teams.B];
      const target = allPlayers.find(p => p.userId === targetUserId);
      if (target) {
        target.socket.emit('voice:ice', { candidate, fromUserId });
      }
    });

    socket.on('voice:mute', ({ roomId, userId, isMuted }) => {
      socket.to(roomId).emit('voice:mute', { userId, isMuted });
    });

    socket.on('voice:speaking', ({ roomId, userId, isSpeaking }) => {
      socket.to(roomId).emit('voice:speaking', { userId, isSpeaking });
    });
  });
};

module.exports = setupMultiplayer;
