import { Routes, Route, Navigate, Link } from "react-router-dom";
import { useZkLogin } from "./context/ZkLoginContext";
import Navbar from "./components/Navbar";
import Marketplace from "./pages/Marketplace";
import Upload from "./pages/Upload";
import Dataset from "./pages/Dataset";
import Footer from "./components/Footer";
import Landing from "./pages/Landing";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

function RequireAuth({ children }) {
  const { account, loading, error, login } = useZkLogin();

  useEffect(() => {
    if (!account && !loading && !error) {
      login();
    }
  }, [account, loading, error, login]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#000000] flex flex-col items-center justify-center text-gray-200">
        <Loader2 className="w-10 h-10 text-[#38bdf8] animate-spin mb-4" />
        <p className="text-sm font-semibold font-sans">Processing zkLogin authentication...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#000000] flex flex-col items-center justify-center text-gray-200 px-4 text-center">
        <p className="text-red-400 font-semibold font-sans mb-2">Authentication Error</p>
        <p className="text-xs text-gray-400 max-w-md mb-4">{error}</p>
        <Link to="/" className="text-xs text-[#38bdf8] hover:underline font-sans">
          Return to Landing Page
        </Link>
      </div>
    );
  }

  if (!account) {
    return (
      <div className="min-h-screen bg-[#000000] flex flex-col items-center justify-center text-gray-200">
        <Loader2 className="w-10 h-10 text-[#38bdf8] animate-spin mb-4" />
        <p className="text-sm font-semibold font-sans">Redirecting to zkLogin authentication...</p>
      </div>
    );
  }

  return children;
}

function App() {
  const { account, loading, login } = useZkLogin();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#000000] flex flex-col items-center justify-center text-gray-200">
        <Loader2 className="w-10 h-10 text-[#38bdf8] animate-spin mb-4" />
        <p className="text-sm font-semibold font-sans">Processing zkLogin authentication...</p>
      </div>
    );
  }

  if (!account && window.location.pathname === "/") {
    return <Landing onLogin={login} />;
  }

  return (
    <div className="min-h-screen bg-[#000000] text-gray-100 flex flex-col font-sans">
      {/* Navigation bar */}
      {account && <Navbar />}
      
      {/* Main page content */}
      <main className="flex-grow pt-20 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full box-border">
        <Routes>
          <Route 
            path="/" 
            element={account ? <Marketplace /> : <Landing onLogin={login} />} 
          />
          <Route 
            path="/upload" 
            element={
              <RequireAuth>
                <Upload />
              </RequireAuth>
            } 
          />
          <Route 
            path="/dataset/:id" 
            element={
              <RequireAuth>
                <Dataset />
              </RequireAuth>
            } 
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {/* Centralized footer */}
      {account && <Footer />}
    </div>
  );
}

export default App;
