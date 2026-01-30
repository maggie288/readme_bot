import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import Header from './components/Header';
import Login from './pages/Login';
import ResetPassword from './pages/ResetPassword';
import RechargeHistory from './pages/RechargeHistory';
import PurchaseHistory from './pages/PurchaseHistory';
import AlipayPayment from './pages/AlipayPayment';
import Home from './pages/Home';
import PublicHome from './pages/PublicHome';
import DocumentPage from './pages/DocumentPage';
import MobileDocumentPage from './pages/MobileDocumentPage';
import MobileHome from './pages/MobileHome';
import MobileLogin from './pages/MobileLogin';
import MobileBookshelf from './pages/MobileBookshelf';
import Bookshelf from './pages/Bookshelf';

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      if (typeof window === 'undefined') return;

      const urlParams = new URLSearchParams(window.location.search);
      const viewMode = urlParams.get('view');

      if (viewMode === 'mobile') {
        setIsMobile(true);
        return;
      }
      if (viewMode === 'desktop') {
        setIsMobile(false);
        return;
      }

      const userAgent = navigator.userAgent || navigator.vendor || window.opera;
      const isMobileDevice = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
      const isSmallScreen = window.innerWidth <= 768;
      setIsMobile(isMobileDevice || isSmallScreen);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    window.addEventListener('popstate', checkMobile);
    return () => {
      window.removeEventListener('resize', checkMobile);
      window.removeEventListener('popstate', checkMobile);
    };
  }, []);

  return isMobile;
}

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const token = localStorage.getItem('token');

    if (storedUser && token) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (error) {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const isMobileRoute = location.pathname.startsWith('/m/');
    const isDocRoute = location.pathname.startsWith('/document/');
    const isHomeRoute = location.pathname === '/home';

    if (isMobile && !isMobileRoute && (isDocRoute || isHomeRoute)) {
      const targetPath = isDocRoute
        ? `/m${location.pathname}`
        : '/m/home';
      navigate(targetPath, { replace: true });
    } else if (!isMobile && isMobileRoute) {
      navigate(location.pathname.replace('/m', ''), { replace: true });
    }
  }, [location.pathname, isMobile, navigate]);

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
          <Route path="/m/login" element={
            user ? <Navigate to="/m/home" replace /> : <MobileLogin onLogin={handleLogin} />
          } />

          <Route path="/m/home" element={
            user ? <MobileHome user={user} onLogout={handleLogout} /> : <Navigate to="/m/login" replace />
          } />

          <Route path="/m/document/:id" element={
            user ? <MobileDocumentPage /> : <Navigate to="/m/login" replace />
          } />

          <Route path="/m/bookshelf" element={
            user ? <MobileBookshelf user={user} onLogout={handleLogout} /> : <Navigate to="/m/login" replace />
          } />

          <Route path="/login" element={
            user ? <Navigate to="/home" replace /> : <Login onLogin={handleLogin} />
          } />

          <Route path="/reset-password" element={<ResetPassword />} />

          <Route path="/recharge-history" element={
            user ? <RechargeHistory /> : <Navigate to="/login" replace />
          } />

          <Route path="/purchase-history" element={
            user ? <PurchaseHistory /> : <Navigate to="/login" replace />
          } />

          <Route path="/payment/alipay" element={<AlipayPayment />} />

          <Route path="/" element={
            user ? <Navigate to="/home" replace /> : <PublicHome />
          } />

          <Route path="/home" element={
            user ? <Home /> : <Navigate to="/login" replace />
          } />

          <Route path="/document/:id" element={
            user ? <DocumentPage /> : <Navigate to="/login" replace />
          } />

          <Route path="/bookshelf" element={
            user ? <Bookshelf /> : <Navigate to="/login" replace />
          } />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
