import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { useUser } from '@clerk/clerk-react';

const MultiplayerContext = createContext(null);

export const MultiplayerProvider = ({ children }) => {
  const { user } = useUser();
  const [socket, setSocket] = useState(null);
  const [room, setRoom] = useState(null);
  const [myTeam, setMyTeam] = useState(null);
  const [teamHP, setTeamHP] = useState({ A: 1000, B: 1000 });
  const [bossHP, setBossHP] = useState(1000);
  const [submissions, setSubmissions] = useState([]);
  const [comboEvent, setComboEvent] = useState(null);
  const [typingUsers, setTypingUsers] = useState({});
  const [matchResult, setMatchResult] = useState(null);
  const [rateLimited, setRateLimited] = useState(null);
  const [isSearching, setIsSearching] = useState(false);

  // Voice States (Simplified, usually managed by useVoiceChat hook)
  const [voiceMuted, setVoiceMuted] = useState(true);
  const [voiceSpeaking, setVoiceSpeaking] = useState({});

  useEffect(() => {
    if (user) {
      const newSocket = io('http://localhost:5000');
      setSocket(newSocket);

      newSocket.on('room_update', (roomData) => {
        setRoom(roomData);
        // Determine my team
        const teamA = roomData.teams?.A || [];
        const teamB = roomData.teams?.B || [];
        if (teamA.find(p => p.userId === user.id)) setMyTeam('A');
        else if (teamB.find(p => p.userId === user.id)) setMyTeam('B');
      });

      newSocket.on('battle_update', (data) => {
        if (data.teamHP) setTeamHP(data.teamHP);
        if (data.bossHP) setBossHP(data.bossHP);
        if (data.submissions) setSubmissions(data.submissions);
      });

      newSocket.on('combo_event', (event) => {
        setComboEvent(event);
        setTimeout(() => setComboEvent(null), 3000);
      });

      newSocket.on('typing_update', ({ userId, isTyping }) => {
        setTypingUsers(prev => ({ ...prev, [userId]: isTyping }));
      });

      newSocket.on('match_finished', (result) => {
        setMatchResult(result);
      });

      newSocket.on('rate_limit', ({ retryAfter }) => {
        setRateLimited(retryAfter);
        const timer = setInterval(() => {
          setRateLimited(prev => {
            if (prev <= 1) {
              clearInterval(timer);
              return null;
            }
            return prev - 1;
          });
        }, 1000);
      });

      return () => newSocket.close();
    }
  }, [user]);

  const joinRoom = (roomId) => {
    if (socket && user) {
      socket.emit('join_room', { roomId, user: { id: user.id, username: user.username || user.firstName } });
    }
  };

  const submitCode = (roomId, results) => {
    if (socket) {
      socket.emit('submit_code', { roomId, results });
    }
  };

  const sendTyping = (roomId, isTyping) => {
    if (socket) {
      socket.emit('typing', { roomId, isTyping });
    }
  };

  return (
    <MultiplayerContext.Provider value={{ 
      socket, 
      room, 
      myTeam,
      teamHP,
      bossHP,
      submissions,
      comboEvent,
      typingUsers,
      matchResult,
      rateLimited,
      isSearching,
      setIsSearching,
      joinRoom,
      submitCode,
      sendTyping,
      voiceMuted,
      setVoiceMuted,
      voiceSpeaking
    }}>
      {children}
    </MultiplayerContext.Provider>
  );
};

export const useMultiplayer = () => {
  const context = useContext(MultiplayerContext);
  if (!context) {
    throw new Error('useMultiplayer must be used within a MultiplayerProvider');
  }
  return context;
};
