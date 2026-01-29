import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Header from './components/Header';
import Login from './pages/Login';
import Home from './pages/Home';
import PublicHome from './pages/PublicHome';
import DocumentPage from './pages/DocumentPage';
import Bookshelf from './pages/Bookshelf';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in
    const storedUser = localStorage.getItem('user');
    const token = localStorage.getItem('token');

    if (storedUser && token) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (error) {
        console.error('Parse user error:', error);
        localStorage.removeItem('user');
        localStorage.removeItem('token');
      }
    }
    setLoading(false);
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    setUser(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
      </div>
    );
  }

  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <div className="min-h-screen bg-gray-50">
        <Header
          documentTitle=""
          user={user}
          onLogout={handleLogout}
          showDocTitle={false}
        />

        <Routes>
          <Route
            path="/login"
            element={
              user ? (
                <Navigate to="/home" replace />
              ) : (
                <Login onLogin={handleLogin} />
              )
            }
          />

          {/* Public homepage for non-logged in users */}
          <Route
            path="/"
            element={user ? <Navigate to="/home" replace /> : <PublicHome />}
          />

          {/* Logged in user's home (my documents) */}
          <Route
            path="/home"
            element={
              user ? <Home /> : <Navigate to="/login" replace />
            }
          />

          <Route
            path="/document/:id"
            element={
              user ? <DocumentPage /> : <Navigate to="/login" replace />
            }
          />

          <Route
            path="/bookshelf"
            element={
              user ? <Bookshelf /> : <Navigate to="/login" replace />
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
