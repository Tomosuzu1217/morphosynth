
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import WorldCreator from './components/WorldCreator';
import Gallery from './components/Gallery';
import WorldViewer from './components/WorldViewer';
import AuthButton from './components/AuthButton';

const App: React.FC = () => {
  return (
    <Router>
      <div className="relative min-h-screen bg-black text-white font-sans selection:bg-white/10 selection:text-white">
        {/* Global Navigation */}
        <nav className="fixed top-0 left-0 w-full z-[100] px-6 py-4 flex justify-between items-start pointer-events-none">
          <div className="flex flex-col gap-1 pointer-events-auto">
            <Link to="/" className="text-white text-xl font-serif tracking-tighter hover:opacity-80 transition-opacity">
              SYNTR<span className="italic">O</span>PY
            </Link>
            <div className="flex gap-4 text-[9px] uppercase tracking-widest text-white/40">
              <Link to="/" className="hover:text-white transition-colors">Create</Link>
              <Link to="/gallery" className="hover:text-white transition-colors">Timeline</Link>
            </div>
          </div>

          <div className="pointer-events-auto">
            <AuthButton />
          </div>
        </nav>

        {/* Routes */}
        <Routes>
          <Route path="/" element={<WorldCreator />} />
          <Route path="/gallery" element={<Gallery />} />
          <Route path="/world/:worldId" element={<WorldViewer />} />
        </Routes>
      </div>
    </Router>
  );
};

export default App;



