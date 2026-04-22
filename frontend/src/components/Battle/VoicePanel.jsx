import React from 'react';
import { Mic, MicOff, AlertCircle } from 'lucide-react';

export default function VoicePanel({ players, myUserId, isMuted, toggleMute, speakingStates, voiceMuted, voiceEnabled, voiceError, startVoice, remoteStreams }) {
  return (
    <div className="voice-panel bg-white neo-border p-4 fixed bottom-8 left-8 neo-shadow-sm flex flex-col gap-4">
      <div className="flex items-center justify-between gap-8">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-full ${voiceEnabled ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-400'}`}>
            {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
          </div>
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">Voice Channel</div>
            <div className="text-xs font-black uppercase">{voiceEnabled ? 'Connected' : 'Disconnected'}</div>
          </div>
        </div>
        
        {!voiceEnabled ? (
          <button className="neo-btn btn-sm" onClick={startVoice}>Join Voice</button>
        ) : (
          <button className={`neo-btn btn-sm ${isMuted ? 'bg-red-500 text-white' : ''}`} onClick={toggleMute}>
            {isMuted ? 'Unmute' : 'Mute'}
          </button>
        )}
      </div>

      {voiceError && (
        <div className="flex items-center gap-2 text-red-500 text-[10px] font-bold uppercase">
          <AlertCircle size={12} />
          {voiceError}
        </div>
      )}

      <div className="voice-participants flex gap-2">
        {players.map(p => (
          <div 
            key={p.userId} 
            className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-black
              ${speakingStates[p.userId] ? 'border-emerald-500 scale-110' : 'border-black'}
              ${p.userId === myUserId ? 'bg-yellow-400' : 'bg-white'}
            `}
            title={p.username}
          >
            {p.username?.[0].toUpperCase() || '?'}
          </div>
        ))}
      </div>
    </div>
  );
}
