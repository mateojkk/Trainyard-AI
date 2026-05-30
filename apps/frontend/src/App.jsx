import { Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Marketplace from "./pages/Marketplace";
import Upload from "./pages/Upload";
import Dataset from "./pages/Dataset";

function App() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-gray-100 flex flex-col font-sans">
      {/* Navigation bar */}
      <Navbar />
      
      {/* Main page content */}
      <main className="flex-grow pt-20 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full box-border">
        <Routes>
          <Route path="/" element={<Marketplace />} />
          <Route path="/upload" element={<Upload />} />
          <Route path="/dataset/:id" element={<Dataset />} />
        </Routes>
      </main>

      {/* Subtle footer */}
      <footer className="border-t border-[#1a1a1a] py-6 text-center text-xs text-gray-600 bg-[#070707]">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-2">
          <div>
            &copy; 2026 Trainyard AI. Decentralized AI Training Data Marketplace.
          </div>
          <div className="flex gap-4">
            <a href="https://walruscan.com" target="_blank" rel="noopener noreferrer" className="hover:text-brand-amber transition">Walrus Explorer</a>
            <span>&bull;</span>
            <a href="https://sui.io" target="_blank" rel="noopener noreferrer" className="hover:text-brand-amber transition">Sui Network</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
