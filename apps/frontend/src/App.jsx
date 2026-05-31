import { Routes, Route, Navigate, Link } from "react-router-dom";
import { useZkLogin } from "./context/useZkLogin";
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
      <div className="min-h-screen bg-[#1c1c1c] flex flex-col items-center justify-center text-gray-200">
        <Loader2 className="w-10 h-10 text-[#e7c88f] animate-spin mb-4" />
        <p className="text-sm font-semibold font-sans">Processing zkLogin authentication...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#1c1c1c] flex flex-col items-center justify-center text-gray-200 px-4 text-center">
        <p className="text-red-400 font-semibold font-sans mb-2">Authentication Error</p>
        <p className="text-xs text-gray-400 max-w-md mb-4">{error}</p>
        <Link to="/" className="text-xs text-[#e7c88f] hover:underline font-sans">
          Return to Landing Page
        </Link>
      </div>
    );
  }

  if (!account) {
    return (
      <div className="min-h-screen bg-[#1c1c1c] flex flex-col items-center justify-center text-gray-200">
        <Loader2 className="w-10 h-10 text-[#e7c88f] animate-spin mb-4" />
        <p className="text-sm font-semibold font-sans">Redirecting to zkLogin authentication...</p>
      </div>
    );
  }

  return children;
}

function App() {
  const { account, loading, login, error } = useZkLogin();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#161313] flex flex-col items-center justify-center text-gray-200">
        <Loader2 className="w-10 h-10 text-[#e7c88f] animate-spin mb-4" />
        <p className="text-sm font-semibold font-sans">Processing zkLogin authentication...</p>
      </div>
    );
  }

  if (!account && window.location.pathname === "/") {
    return <Landing onLogin={login} authError={error} />;
  }

  return (
    <div className="min-h-screen bg-[#1c1c1c] text-gray-100 flex flex-col font-sans">
      {/* Navigation bar */}
      {account && <Navbar />}
      
      {/* Main page content */}
      <main className="flex-grow pt-20 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full box-border">
        <Routes>
          <Route 
            path="/" 
            element={account ? <Marketplace /> : <Landing onLogin={login} authError={error} />} 
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
