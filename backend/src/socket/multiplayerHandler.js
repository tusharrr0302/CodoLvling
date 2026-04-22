const rooms = new Map(); // roomId -> roomData

export const handleMultiplayer = (io, socket) => {
  socket.on('join_room', ({ roomId, user }) => {
    socket.join(roomId);
    
    if (!rooms.has(roomId)) {
      rooms.set(roomId, {
        id: roomId,
        teams: { A: [], B: [] },
        teamHP: { A: 1000, B: 1000 },
        bossHP: 1000,
        submissions: [],
        status: 'active',
        problem: {
          title: 'Two Sum',
          difficulty: 'Easy',
          mission: 'Find two numbers that add up to a target.',
          testCases: [
            { input: [[2, 7, 11, 15], 9], expected: [0, 1] }
          ],
          functionSignatures: {
             javascript: 'function solve(nums, target) {\n  \n}'
          }
        },
        mode: '1v1'
      });
    }

    const room = rooms.get(roomId);
    
    // Simple team assignment logic
    const allPlayers = [...room.teams.A, ...room.teams.B];
    if (!allPlayers.find(p => p.userId === user.id)) {
      if (room.teams.A.length <= room.teams.B.length) {
        room.teams.A.push({ ...user, userId: user.id });
      } else {
        room.teams.B.push({ ...user, userId: user.id });
      }
    }

    io.to(roomId).emit('room_update', room);
    console.log(`User ${user.username} joined room ${roomId}`);
  });

  socket.on('submit_code', ({ roomId, results }) => {
    const room = rooms.get(roomId);
    if (!room) return;

    const passedCount = results.filter(r => r.passed).length;
    const totalCount = results.length;
    const correctness = passedCount / totalCount;
    const damage = Math.floor(correctness * 100);

    const player = [...room.teams.A, ...room.teams.B].find(p => p.userId === socket.id || p.id === socket.id); // This is tricky with clerk IDs vs socket IDs
    // For now let's assume we find them or use a fallback
    
    const team = room.teams.A.find(p => p.id === socket.id || p.userId === socket.id) ? 'A' : 'B';
    const opponentTeam = team === 'A' ? 'B' : 'A';

    if (room.mode === 'duo') {
      room.bossHP = Math.max(0, room.bossHP - damage);
    } else {
      room.teamHP[opponentTeam] = Math.max(0, room.teamHP[opponentTeam] - damage);
    }

    const submission = {
      userId: socket.id,
      username: 'Coder', // Should get from room players
      team,
      damage,
      correctness
    };

    room.submissions.push(submission);
    
    io.to(roomId).emit('battle_update', {
      teamHP: room.teamHP,
      bossHP: room.bossHP,
      submissions: room.submissions
    });

    if (room.teamHP[opponentTeam] === 0 || room.bossHP === 0) {
      io.to(roomId).emit('match_finished', {
        winner: team,
        loot: { xp: 100, coins: 50 }
      });
    }
  });

  socket.on('typing', ({ roomId, isTyping }) => {
    // We need the clerk userId here, but for now we'll use socket.id as a fallback
    // In a real app, the socket should be authenticated and have user data attached
    socket.to(roomId).emit('typing_update', { userId: socket.id, isTyping });
  });

  socket.on('disconnect', () => {
    rooms.forEach((room, roomId) => {
      room.teams.A = room.teams.A.filter(p => p.id !== socket.id);
      room.teams.B = room.teams.B.filter(p => p.id !== socket.id);
      if (room.teams.A.length === 0 && room.teams.B.length === 0) {
        rooms.delete(roomId);
      } else {
        io.to(roomId).emit('room_update', room);
      }
    });
  });
};
EOF
