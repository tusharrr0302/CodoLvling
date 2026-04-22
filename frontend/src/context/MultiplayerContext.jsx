import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useUser } from '@clerk/clerk-react';
import { useProgress } from './ProgressContext';

const MultiplayerContext = createContext(null);
const SOCKET_URL = 'http://localhost:3000';

export function MultiplayerProvider({ children }) {
  const { user } = useUser();
  const { progress } = useProgress();
  const socketRef = useRef(null);

  const [status, setStatus] = useState('idle'); // idle | searching | found | active | ended
  const [mode, setMode] = useState(null);       // 'duo' | '2v2'
  const [room, setRoom] = useState(null);        // full room payload from server
  const [myTeam, setMyTeam] = useState(null);   // 'A' | 'B'
  const [queueSize, setQueueSize] = useState(0);

  // Battle state (live-updated via events)
  const [teamHP, setTeamHP] = useState({ A: 1000, B: 1000 });
  const [bossHP, setBossHP] = useState(1000);
  const [submissions, setSubmissions] = useState([]); // list of { userId, team, damage, correctness }
  const [comboEvent, setComboEvent] = useState(null);  // { team, bonusDamage } — cleared after anim
  const [typingUsers, setTypingUsers] = useState({});   // { userId: true/false }
  const [matchResult, setMatchResult] = useState(null); // { winner, loot }
  const [rateLimited, setRateLimited] = useState(null);

  // Voice state (mute map, speaking map)
  const [voiceMuted, setVoiceMuted] = useState({});
  const [voiceSpeaking, setVoiceSpeaking] = useState({});

  // ── Socket lifecycle ──────────────────────────────────────────────────────
  useEffect(() => {
    const socket = io(SOCKET_URL, { autoConnect: false });
    socketRef.current = socket;
    socket.connect();

    socket.on('mp:waiting', (data) => {
      setStatus('searching');
    });

    socket.on('mp:queue_update', ({ queueSize }) => {
      setQueueSize(queueSize);
    });

    socket.on('mp:match_found', (data) => {
      setRoom(data);
      setMyTeam(data.myTeam);
      setStatus('found');
      if (data.teamHP) setTeamHP(data.teamHP);
      if (data.bossHP !== undefined) setBossHP(data.bossHP);
      setTimeout(() => setStatus('active'), 2500); // brief countdown before arena
    });

    socket.on('mp:submission_result', (result) => {
      setSubmissions(prev => [...prev, result]);
    });

    socket.on('mp:hp_update', ({ teamHP: newTeamHP, bossHP: newBossHP }) => {
      if (newTeamHP) setTeamHP(newTeamHP);
      if (newBossHP !== undefined) setBossHP(newBossHP);
    });

    socket.on('mp:team_combo', (data) => {
      setComboEvent(data);
      setTimeout(() => setComboEvent(null), 2500);
    });

    socket.on('mp:typing', ({ userId, isTyping }) => {
      setTypingUsers(prev => ({ ...prev, [userId]: isTyping }));
    });

    socket.on('mp:match_end', (result) => {
      setMatchResult(result);
      setStatus('ended');
    });

    socket.on('mp:player_disconnected', ({ username }) => {
      setMatchResult({ disconnected: true, username });
      setStatus('ended');
    });

    socket.on('mp:search_cancelled', () => {
      setStatus('idle');
      setQueueSize(0);
    });

    socket.on('mp:rate_limited', ({ message }) => {
      setRateLimited(message);
      setTimeout(() => setRateLimited(null), 3000);
    });

    // Voice relay events — forwarded by useVoiceChat hook via context
    // (just expose socket ref; hook handles the WebRTC logic directly)

    socket.on('voice:mute', ({ userId, isMuted }) => {
      setVoiceMuted(prev => ({ ...prev, [userId]: isMuted }));
    });

    socket.on('voice:speaking', ({ userId, isSpeaking }) => {
      setVoiceSpeaking(prev => ({ ...prev, [userId]: isSpeaking }));
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // ── Actions ───────────────────────────────────────────────────────────────
  const findMatch = (selectedMode) => {
    const socket = socketRef.current;
    if (!socket || !user) return;
    setMode(selectedMode);
    setStatus('searching');
    setSubmissions([]);
    setMatchResult(null);
    setComboEvent(null);
    socket.emit('mp:find_match', {
      mode: selectedMode,
      userId: user.id,
      username: user.username || user.fullName || 'Hunter',
      level: progress?.level || 1,
    });
  };

  const cancelSearch = () => {
    socketRef.current?.emit('mp:cancel_search');
    setStatus('idle');
    setMode(null);
    setQueueSize(0);
  };

  const submitCode = (roomId, testResults) => {
    socketRef.current?.emit('mp:code_submit', {
      roomId,
      userId: user?.id,
      testResults,
    });
  };

  const sendTyping = (roomId, isTyping) => {
    socketRef.current?.emit('mp:typing', { roomId, userId: user?.id, isTyping });
  };

  const sendVoiceMute = (roomId, isMuted) => {
    socketRef.current?.emit('voice:mute', { roomId, userId: user?.id, isMuted });
  };

  return (
    <MultiplayerContext.Provider value={{
      socket: socketRef.current,
      status, mode, room, myTeam, queueSize,
      teamHP, bossHP, submissions, comboEvent, typingUsers, matchResult, rateLimited,
      voiceMuted, voiceSpeaking,
      findMatch, cancelSearch, submitCode, sendTyping, sendVoiceMute,
    }}>
      {children}
    </MultiplayerContext.Provider>
  );
}

export const useMultiplayer = () => {
  const ctx = useContext(MultiplayerContext);
  if (!ctx) throw new Error('useMultiplayer must be used within MultiplayerProvider');
  return ctx;
};
