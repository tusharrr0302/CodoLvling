import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, User, Zap, Swords, Mic, Shield, ChevronRight } from 'lucide-react';
import { useMultiplayer } from '../../context/MultiplayerContext';
import { useUser } from '@clerk/clerk-react';
import PageHeader from '../../components/UI/PageHeader';
import { motion, AnimatePresence } from 'framer-motion';
import './BattleLobby.css';

const MODES = [
  {
    id: '1v1',
    name: 'DUEL (1v1)',
    description: 'Classic head-to-head logic battle. First to solve or most damage wins.',
    icon: <User size={24} />,
    color: '#3B82F6',
    comingSoon: false
  },
  {
    id: '2v2',
    name: 'SQUAD (2v2)',
    description: 'Team up with a partner. Shared HP and coordinated attacks.',
    icon: <Users size={24} />,
    color: '#10B981',
    comingSoon: true
  },
  {
    id: '2vQ',
    name: 'CO-OP (2 vs Q)',
    description: 'Two players collaborate to take down a legendary difficulty enemy.',
    icon: <Swords size={24} />,
    color: '#F59E0B',
    comingSoon: true
  }
];

export default function BattleLobby() {
  const navigate = useNavigate();
  const { user } = useUser();
  const { joinRoom, isSearching, setIsSearching, room } = useMultiplayer();
  const [selectedMode, setSelectedMode] = useState('1v1');

  const startMatchmaking = () => {
    setIsSearching(true);
    // In a real app, we'd emit a matchmaking event. 
    // For this demo, we'll just join a fixed "Global Arena" room
    setTimeout(() => {
      joinRoom('arena-global-1');
    }, 2000);
  };

  if (room && room.players.length >= 2) {
    // Navigate to Multiplayer Arena when match is found
    navigate('/multiplayer-arena');
  }

  return (
    <div className="page lobby-page animate-fadeIn">
      <PageHeader 
        title="BATTLE ARENA" 
        description="Enter the competitive grounds. Face other Coders in real-time logic combat."
      />

      <div className="container py-12">
        {!isSearching ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {MODES.map((mode) => (
              <motion.div 
                key={mode.id}
                className={`mode-card bg-white neo-border neo-shadow transition-all ${selectedMode === mode.id ? 'active' : ''} ${mode.comingSoon ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                onClick={() => !mode.comingSoon && setSelectedMode(mode.id)}
                whileHover={!mode.comingSoon ? { y: -5 } : {}}
              >
                <div className="mode-icon-wrap" style={{ backgroundColor: `${mode.color}20` }}>
                  {mode.icon}
                </div>
                <h3 className="text-xl font-black mt-4">{mode.name}</h3>
                <p className="text-sm text-gray-500 mt-2 font-medium">{mode.description}</p>
                {mode.comingSoon && <span className="coming-soon-badge">COMING SOON</span>}
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="matchmaking-status flex flex-col items-center justify-center py-20">
            <div className="search-loader">
              <div className="loader-ring"></div>
              <Swords size={48} className="loader-icon" />
            </div>
            <h2 className="text-3xl font-black mt-8 uppercase tracking-tighter">Searching for Opponent...</h2>
            <p className="text-gray-500 mt-2 font-bold uppercase tracking-widest">Global Arena | {selectedMode}</p>
            
            <div className="mt-12 flex flex-col items-center gap-4">
               <div className="flex -space-x-4">
                  <div className="w-12 h-12 rounded-full bg-blue-500 border-4 border-white flex items-center justify-center font-black text-white">
                    {user?.username?.[0].toUpperCase()}
                  </div>
                  <div className="w-12 h-12 rounded-full bg-gray-200 border-4 border-white border-dashed animate-pulse"></div>
               </div>
               <button className="neo-btn btn-sm mt-4" onClick={() => setIsSearching(false)}>CANCEL</button>
            </div>
          </div>
        )}

        {!isSearching && (
          <div className="mt-12 flex justify-center">
            <button 
              className="neo-btn px-20 py-4 bg-black text-white text-2xl font-black hover:bg-gray-800 transition-all flex items-center gap-4"
              onClick={startMatchmaking}
            >
              FIND MATCH <ChevronRight size={28} />
            </button>
          </div>
        )}

        <div className="arena-features mt-24 grid grid-cols-1 md:grid-cols-3 gap-12 text-center">
           <div className="feature">
              <Mic size={32} className="mx-auto mb-4 text-blue-500" />
              <h4 className="font-black uppercase">Live Voice Chat</h4>
              <p className="text-sm text-gray-500 font-medium">Coordinate with teammates or banter with rivals in real-time.</p>
           </div>
           <div className="feature">
              <Zap size={32} className="mx-auto mb-4 text-yellow-500" />
              <h4 className="font-black uppercase">Instant Feedback</h4>
              <p className="text-sm text-gray-500 font-medium">Every correct line of code deals damage. Efficiency is your weapon.</p>
           </div>
           <div className="feature">
              <Shield size={32} className="mx-auto mb-4 text-emerald-500" />
              <h4 className="font-black uppercase">Ranked Play</h4>
              <p className="text-sm text-gray-500 font-medium">Climb the global leaderboard and earn legendary artifact skins.</p>
           </div>
        </div>
      </div>
    </div>
  );
}
