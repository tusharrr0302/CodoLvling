import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Sparkles, MessageSquare } from 'lucide-react';

export default function AICompanion({ feedback, show }) {
  if (!show || !feedback) return null;

  return (
    <div className="ai-companion-overlay fixed bottom-8 right-8 z-[100] max-w-sm">
      <motion.div 
        className="bg-black text-white neo-border p-6 neo-shadow-lg"
        initial={{ opacity: 0, y: 20, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.9 }}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center text-black">
            <Bot size={24} />
          </div>
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest text-yellow-400">AI SENSEI</div>
            <div className="text-sm font-black uppercase">Battle Analysis</div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="text-xs font-medium leading-relaxed opacity-90 italic">
            "{feedback.feedback || "Analyzing your approach..."}"
          </div>

          {feedback.suggestions && feedback.suggestions.length > 0 && (
            <div className="bg-white/10 p-3 rounded border border-white/20">
              <div className="flex items-center gap-2 text-[10px] font-black uppercase mb-2">
                <Sparkles size={12} className="text-yellow-400" /> Key Suggestions
              </div>
              <ul className="text-[10px] space-y-1 opacity-80 list-disc list-inside">
                {feedback.suggestions.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            </div>
          )}

          <div className="flex justify-between items-center pt-2">
            <div className="flex gap-2">
              <span className="px-2 py-1 bg-white/10 text-[9px] font-black rounded">{feedback.complexity?.time || "O(?)"}</span>
              <span className="px-2 py-1 bg-white/10 text-[9px] font-black rounded">{feedback.complexity?.space || "O(?)"}</span>
            </div>
            <button className="text-[10px] font-black uppercase text-yellow-400 hover:underline flex items-center gap-1">
               Detailed Report <MessageSquare size={10} />
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
