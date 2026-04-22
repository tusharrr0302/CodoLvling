export const handlePvP = (io, socket) => {
  socket.on('pvp_attack', ({ roomId, damage }) => {
    // In a real app, we'd validate the damage (e.g. by checking test results)
    socket.to(roomId).emit('pvp_take_damage', {
      attackerId: socket.id,
      damage
    });
  });

  socket.on('pvp_submit_status', ({ roomId, passed, testResults }) => {
    socket.to(roomId).emit('opponent_submit_status', {
      playerId: socket.id,
      passed,
      testResults
    });
  });
};
