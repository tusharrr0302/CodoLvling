import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar/Navbar';
import Footer from './components/Footer/Footer';
import Home from './pages/Home/Home';
import WorldMap from './pages/WorldMap/WorldMap';
import Login from './pages/Login/Login';
import Dashboard from './pages/Dashboard/Dashboard';
import Codex from './pages/Codex/Codex';
import LogicLab from './pages/LogicLab/LogicLab';
import Practice from './pages/Practice/Practice';
import Question from './pages/Question/Question';

import Shop from './pages/Shop/Shop';
import BattleLobby from './pages/BattleLobby/BattleLobby';
import MultiplayerArena from './pages/MultiplayerArena/MultiplayerArena';

const Placeholder = ({ title }) => (
  <div className="flex-1 flex items-center justify-center p-6 bg-[var(--neo-beige)]">
    <h1 className="text-4xl font-black uppercase border-4 border-black p-8 bg-yellow-400 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
      {title} Page Coming Soon
    </h1>
  </div>
);

function App() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50 text-black font-sans">
      <Navbar />
      
      <main className="flex-1 flex flex-col">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/map" element={<WorldMap />} />
          <Route path="/practice" element={<Practice />} />
          <Route path="/question/:problemId" element={<Question />} />
          <Route path="/pvp" element={<BattleLobby />} />
          <Route path="/multiplayer-arena" element={<MultiplayerArena />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/logic-lab" element={<LogicLab />} />
          <Route path="/logic-lab/:topicId" element={<Placeholder title="Logic Lab Topic" />} />
          <Route path="/codex" element={<Codex />} />
          <Route path="/leaderboard" element={<Placeholder title="Leaderboard" />} />
        </Routes>
      </main>

      <Footer />
    </div>
  );
}

export default App;
