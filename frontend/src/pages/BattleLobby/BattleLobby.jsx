import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Swords, Zap, Activity } from 'lucide-react';
import { useMultiplayer } from '../../context/MultiplayerContext';
import { useProgress } from '../../context/ProgressContext';
import { useUser } from '@clerk/clerk-react';
import './BattleLobby.css';

const MODE_CARDS = [
  {
    id: '1v1',
    icon: Swords,
    title: '1v1 DUEL',
    subtitle: 'SOLO VS SOLO',
    description: 'One hunter vs one hunter. Pure individual skill — first to drain the opponent\'s 500 HP wins the duel.',
    color: '#ef4444',
    shadow: '#7f1d1d',
    players: '2 PLAYERS',
    badge: 'DUEL',
  },
  {
    id: 'duo',
    icon: Users,
    title: 'DUO MODE',
    subtitle: 'CO-OP',
    description: 'Team up with one other hunter. Both solve the same problem together and combine damage to defeat the shared boss.',
    color: '#FAFF00',
    shadow: '#f59e0b',
    players: '2 PLAYERS',
    badge: 'CO-OP',
  },
  {
    id: '2v2',
    icon: Users,
    title: '2v2 BATTLE',
    subtitle: 'TEAM VS TEAM',
    description: 'Two hunters vs two hunters. Each team attacks the other\'s HP. First team to zero wins. Sync your submissions for a TEAM COMBO bonus.',
    color: '#f97316',
    shadow: '#b91c1c',
    players: '4 PLAYERS',
    badge: 'VERSUS',
  },
];

export default function BattleLobby() {
  const navigate = useNavigate();
  const { progress } = useProgress();
  const { user } = useUser();
  const { status, mode, room, queueSize, findMatch, cancelSearch } = useMultiplayer();

  // Navigate to arena when match is active
  useEffect(() => {
    if (status === 'active' && room) {
      navigate('/battle/' + room.roomId, { state: { room } });
    }
  }, [status, room, navigate]);

  return (
    <div className="battle-lobby-page">
      <div className="lobby-bg-pattern" />

      <div className="lobby-content">
        {/* Header */}
        <div className="lobby-header">
          <div className="lobby-tag"><Zap size={14} fill="currentColor" /> MULTIPLAYER</div>
          <h1 className="lobby-title">THE<br />PROVING<br />GROUNDS</h1>
          <p className="lobby-subtitle">Engage in real-time logic combat. Winners claim glory and coins.</p>
          <div className="lobby-player-badge">
            <div className="lobby-player-avatar">{(user?.username || 'P')[0].toUpperCase()}</div>
            <div>
              <div className="lobby-player-name">{user?.username || user?.fullName || 'Hunter'}</div>
              <div className="lobby-player-level">LVL {progress?.level || 1} — READY TO FIGHT</div>
            </div>
          </div>
        </div>

        {/* Mode Cards or Matchmaking State */}
        <div className="lobby-right">
          <AnimatePresence mode="wait">
            {status === 'idle' && (
              <motion.div
                key="mode-select"
                className="mode-cards"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                {MODE_CARDS.map((card, i) => (
                  <motion.button
                    key={card.id}
                    className="mode-card"
                    style={{ '--card-color': card.color, '--card-shadow': card.shadow }}
                    onClick={() => findMatch(card.id)}
                    initial={{ opacity: 0, x: 40 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    whileHover={{ y: -4 }}
                  >
                    <div className="mode-card-badge">{card.badge}</div>
                    <div className="mode-card-icon">
                      <card.icon size={36} />
                    </div>
                    <div className="mode-card-body">
                      <div className="mode-card-players">{card.players}</div>
                      <div className="mode-card-title">{card.title}</div>
                      <div className="mode-card-subtitle">{card.subtitle}</div>
                      <p className="mode-card-desc">{card.description}</p>
                    </div>
                    <div className="mode-card-cta">ENTER QUEUE →</div>
                  </motion.button>
                ))}
              </motion.div>
            )}

            {status === 'searching' && (
              <motion.div
                key="searching"
                className="matchmaking-state"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
              >
                <div className="mm-icon-ring">
                  <Activity size={40} className="mm-spinner" />
                </div>
                <div className="mm-title">
                  {mode === '1v1' ? 'FINDING OPPONENT' : mode === 'duo' ? 'FINDING CO-OP PARTNER' : 'ASSEMBLING TEAMS'}
                </div>
                <div className="mm-players-preview">
                  {[...Array(mode === '2v2' ? 4 : 2)].map((_, i) => (
                    <div
                      key={i}
                      className={`mm-player-slot ${i === 0 ? 'filled' : i < (queueSize) ? 'filled' : 'empty'}`}
                    >
                      {i === 0 ? (user?.username || 'P')[0].toUpperCase() : i < queueSize ? '?' : '+'}
                    </div>
                  ))}
                </div>
                <div className="mm-count">
                  {queueSize}/{mode === '2v2' ? 4 : 2} PLAYERS IN QUEUE
                </div>
                <button className="mp-btn mp-btn-ghost cancel-btn" onClick={cancelSearch}>
                  Cancel Search
                </button>
              </motion.div>
            )}

            {status === 'found' && (
              <motion.div
                key="found"
                className="matchmaking-state found"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              >
                <div className="mm-found-badge">⚡ MATCH FOUND</div>
                <div className="mm-title">PREPARING ARENA</div>
                <p className="mm-subtitle">Establishing secure connection...</p>
                <div className="mm-loading-bar">
                  <motion.div
                    className="mm-loading-fill"
                    initial={{ width: '0%' }}
                    animate={{ width: '100%' }}
                    transition={{ duration: 2, ease: 'easeInOut' }}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
