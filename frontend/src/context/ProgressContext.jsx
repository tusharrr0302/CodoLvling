import { createContext, useContext, useState, useEffect } from 'react';
import { STATES } from '../data/problems';
import { useAuth } from './AuthContext';

const ProgressContext = createContext(null);

// Initial state for V3
const DEFAULT_STATE = {
  solvedProblems: {}, // { problemId: true }
  problemStats: {},   // { problemId: { score, attempts, xp, coins } }
  completedStates: {}, // { stateId: true }
  xp: 0,
  level: 1,
  coins: 100, // starting coins
  unlockedRegions: { arrays: true }, 
  inventory: {},
};

function loadProgress() {
  try {
    const saved = localStorage.getItem('codo-progress');
    // Ensure all new keys from DEFAULT_STATE are present if an old v2 state is loaded
    return saved ? { ...DEFAULT_STATE, ...JSON.parse(saved) } : DEFAULT_STATE;
  } catch {
    return DEFAULT_STATE;
  }
}

// XP thresholds generated roughly matching the spec curve
const getXPForLevel = (level) => {
  if (level === 1) return 0;
  const n = level - 1;
  return Math.floor(500 * n * (1 + n * 0.10));
};

const getLevelFromXP = (xp) => {
  let lvl = 1;
  while (lvl < 60 && xp >= getXPForLevel(lvl + 1)) {
    lvl++;
  }
  return lvl;
};

export function ProgressProvider({ children }) {
  const [progress, setProgress] = useState(loadProgress);

  const { user } = useAuth();

  useEffect(() => {
    localStorage.setItem('codo-progress', JSON.stringify(progress));

    // Attempt to sync to backend
    const syncToBackend = async () => {
      if (!user?.id) return;

      let token;
      try {
        token = await user.getToken();
      } catch {
        return; // Clerk not ready yet
      }

      if (!token) return;

      try {
        await fetch(`/api/progress/${user.id}/sync`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(progress)
        });
      } catch (err) {
        console.warn('Backend sync failed or API unavailable. Relying on local storage.', err);
      }
    };

    syncToBackend();

  }, [progress, user]);

  // V3 Scoring & Damage Formula
  const calculateRewards = (difficulty, attempts, correctness = 1.0, efficiency = 1.0, quality = 1.0) => {
    const baseXP = { 'Easy': 50, 'Easy-Medium': 80, 'Medium': 120, 'Medium-Hard': 180, 'Hard': 250 }[difficulty] || 50;
    const baseCoins = { 'Easy': 15, 'Easy-Medium': 25, 'Medium': 40, 'Medium-Hard': 60, 'Hard': 90 }[difficulty] || 15;

    const score = (0.60 * correctness) + (0.25 * Math.min(1, efficiency)) + (0.15 * Math.min(1, quality));
    const attempt_multiplier = Math.max(0.50, 1.0 - (attempts - 1) * 0.10);
    const final_score = score * attempt_multiplier;
    
    const critical_hit = (final_score >= 0.95 && attempts === 1);
    const crit_mod = critical_hit ? 1.5 : 1.0;

    return {
      score: final_score,
      xpGain: Math.floor(baseXP * final_score * crit_mod),
      coinGain: Math.floor(baseCoins * final_score * attempt_multiplier * (critical_hit ? 1.5 : 1.0)),
      critical: critical_hit
    };
  };

  const markSolved = (problemId, stateId, difficulty = 'Easy', attempts = 1) => {
    setProgress(prev => {
      // Determine if first solve
      const isFirstSolve = !prev.solvedProblems[problemId];
      
      const rewards = calculateRewards(difficulty, attempts);
      let totalXPGain = rewards.xpGain + (isFirstSolve ? 30 : 0); // first time bonus
      let totalCoinGain = rewards.coinGain;

      // Ensure we don't grant coins forever for repeating the identical easiest problem immediately (unless wanted)
      // For V3 prototype, we just grant it.

      const newXP = prev.xp + totalXPGain;
      const newLevel = getLevelFromXP(newXP);

      const newSolved = { ...prev.solvedProblems, [problemId]: true };
      const newStats = { ...prev.problemStats, [problemId]: { attempts, score: rewards.score, xp: totalXPGain, coins: totalCoinGain } };
      
      const state = STATES[stateId];
      const stateComplete = state?.problems.every(pid => newSolved[pid]);
      const newCompletedStates = stateComplete
        ? { ...prev.completedStates, [stateId]: true }
        : prev.completedStates;

      let newUnlocked = { ...prev.unlockedRegions };
      if (stateComplete && state) {
        newUnlocked[state.regionId] = true;
      }

      return {
        ...prev,
        solvedProblems: newSolved,
        problemStats: newStats,
        completedStates: newCompletedStates,
        unlockedRegions: newUnlocked,
        xp: newXP,
        level: newLevel,
        coins: prev.coins + totalCoinGain,
      };
    });
    
    // We return rewards to the UI so it can animate them
    return calculateRewards(difficulty, attempts);
  };

  const deductPlayerHP = (enemyBaseAttack, correctness) => {
    return Math.floor(enemyBaseAttack * (1 - correctness));
  };
  
  const getPlayerDamage = (baseDamage, score) => {
    return Math.floor(baseDamage * score);
  };

  const addCoins = (amount) => setProgress(prev => ({ ...prev, coins: prev.coins + amount }));
  const spendCoins = (amount) => setProgress(prev => ({ ...prev, coins: prev.coins - amount }));

  const isStateLocked = (stateId) => {
    const state = STATES[stateId];
    if (!state) return true;
    if (state.order === 1) return false;
    
    const allStates = Object.values(STATES)
      .filter(s => s.regionId === state.regionId)
      .sort((a, b) => a.order - b.order);
    const prevState = allStates[state.order - 2];
    return prevState ? !progress.completedStates[prevState.id] : true;
  };

  const isRegionLocked = (regionId) => {
    return !progress.unlockedRegions[regionId];
  };

  const getStateProgress = (stateId) => {
    const state = STATES[stateId];
    if (!state) return { solved: 0, total: 5 };
    const solved = state.problems.filter(pid => progress.solvedProblems[pid]).length;
    return { solved, total: state.problems.length };
  };

  const getRegionProgress = (regionId) => {
    const regionStates = Object.values(STATES).filter(s => s.regionId === regionId);
    const totalProblems = regionStates.reduce((acc, s) => acc + s.problems.length, 0);
    const solvedProblems = regionStates.reduce((acc, s) =>
      acc + s.problems.filter(pid => progress.solvedProblems[pid]).length, 0);
    return { solved: solvedProblems, total: totalProblems };
  };

  const resetProgress = () => {
    setProgress(DEFAULT_STATE);
  };

  return (
    <ProgressContext.Provider value={{
      progress,
      markSolved,
      isStateLocked,
      isRegionLocked,
      getStateProgress,
      getRegionProgress,
      resetProgress,
      calculateRewards,
      addCoins,
      spendCoins
    }}>
      {children}
    </ProgressContext.Provider>
  );
}

export const useProgress = () => {
  const ctx = useContext(ProgressContext);
  if (!ctx) throw new Error('useProgress must be used within ProgressProvider');
  return ctx;
};

