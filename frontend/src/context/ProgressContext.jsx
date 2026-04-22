import React, { createContext, useContext, useState, useEffect } from 'react';
import { MAGIC_ITEMS } from '../data/items';

const ProgressContext = createContext(null);

const INITIAL_STATE = {
  level: 1,
  xp: 0,
  coins: 500, // Starting coins for testing
  inventory: [],
  solvedProblems: {}, // { problemId: { score, attempts, efficiency } }
  unlockedStates: ['state-arrays-1'], // First state unlocked by default
};

export const ProgressProvider = ({ children }) => {
  const [progress, setProgress] = useState(() => {
    const saved = localStorage.getItem('codo_progress');
    return saved ? JSON.parse(saved) : INITIAL_STATE;
  });

  useEffect(() => {
    localStorage.setItem('codo_progress', JSON.stringify(progress));
  }, [progress]);

  const markSolved = (problemId, stateId, difficulty, attempts) => {
    setProgress(prev => {
      const newSolved = { ...prev.solvedProblems };
      if (!newSolved[problemId]) {
        // First time solving
        const xpReward = difficulty === 'Hard' ? 100 : difficulty === 'Medium' ? 50 : 25;
        const coinReward = difficulty === 'Hard' ? 50 : difficulty === 'Medium' ? 25 : 10;
        
        newSolved[problemId] = { solved: true, attempts };
        
        return {
          ...prev,
          xp: prev.xp + xpReward,
          coins: prev.coins + coinReward,
          solvedProblems: newSolved
        };
      }
      return prev;
    });
  };

  const buyItem = (itemId) => {
    const item = MAGIC_ITEMS.find(i => i.id === itemId);
    if (!item) return false;

    if (progress.coins >= item.price) {
      setProgress(prev => ({
        ...prev,
        coins: prev.coins - item.price,
        inventory: [...prev.inventory, itemId]
      }));
      return true;
    }
    return false;
  };

  const useItem = (itemId) => {
    let itemUsed = false;
    setProgress(prev => {
      const index = prev.inventory.indexOf(itemId);
      if (index > -1) {
        const newInventory = [...prev.inventory];
        newInventory.splice(index, 1);
        itemUsed = true;
        return { ...prev, inventory: newInventory };
      }
      return prev;
    });
    return itemUsed;
  };

  const isStateLocked = (stateId) => {
    return !progress.unlockedStates.includes(stateId);
  };

  const getStateProgress = (stateId) => {
    // This would normally check problem data, but for now we'll mock it
    // In a real app, you'd filter solvedProblems by those belonging to the state
    return { solved: 0, total: 5 }; 
  };

  const calculateRewards = (correctness, efficiency, difficulty) => {
    const baseXP = difficulty === 'Hard' ? 100 : difficulty === 'Medium' ? 50 : 25;
    const baseCoins = difficulty === 'Hard' ? 50 : difficulty === 'Medium' ? 25 : 10;
    
    return {
      xp: Math.floor(baseXP * correctness),
      coins: Math.floor(baseCoins * correctness)
    };
  };

  return (
    <ProgressContext.Provider value={{ 
      progress, 
      setProgress, 
      markSolved, 
      buyItem, 
      useItem,
      isStateLocked,
      getStateProgress,
      calculateRewards
    }}>
      {children}
    </ProgressContext.Provider>
  );
};

export const useProgress = () => {
  const context = useContext(ProgressContext);
  if (!context) {
    throw new Error('useProgress must be used within a ProgressProvider');
  }
  return context;
};
