import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap } from 'lucide-react';

export default function TeamCombo({ comboEvent, myTeam }) {
  if (!comboEvent) return null;

  const isMyTeam = comboEvent.team === myTeam;

  return (
    <AnimatePresence>
      <motion.div 
        className={`fixed top-1/4 left-1/2 -translate-x-1/2 z-50 pointer-events-none`}
        initial={{ scale: 0, y: 50, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 2, opacity: 0 }}
        transition={{ type: 'spring', damping: 12 }}
      >
        <div className={`
          px-12 py-6 neo-border neo-shadow-lg flex flex-col items-center gap-2
          ${isMyTeam ? 'bg-yellow-400' : 'bg-red-500 text-white'}
        `}>
          <div className="flex items-center gap-3">
            <Zap size={32} className={isMyTeam ? 'fill-black' : 'fill-white'} />
            <span className="text-4xl font-black italic tracking-tighter uppercase">
              {comboEvent.count}X COMBO!
            </span>
            <Zap size={32} className={isMyTeam ? 'fill-black' : 'fill-white'} />
          </div>
          <div className="text-xs font-black uppercase tracking-widest opacity-80">
            {isMyTeam ? 'TEAM A' : 'TEAM B'} IS DOMINATING
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
