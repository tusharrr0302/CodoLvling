import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar/Navbar';
import Footer from './components/Footer/Footer';
import Home from './pages/Home/Home';

// Placeholder components for other routes
const Placeholder = ({ title }) => (
  <div className="flex-1 flex items-center justify-center p-6">
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
          <Route path="/practice" element={<Placeholder title="Practice" />} />
          <Route path="/arena" element={<Placeholder title="Arena" />} />
          <Route path="/logic-lab" element={<Placeholder title="Logic Lab" />} />
          <Route path="/leaderboard" element={<Placeholder title="Leaderboard" />} />
        </Routes>
      </main>

      <Footer />
    </div>
  );
}

export default App;
