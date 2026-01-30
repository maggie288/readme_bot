import React, { useState, useEffect } from 'react';
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
import ImportDocument from './components/ImportDocument';
import MobileImportDocument from './components/MobileImportDocument';
import MobileRechargeHistory from './pages/MobileRechargeHistory';
import MobilePurchaseHistory from './pages/MobilePurchaseHistory';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('React Error Boundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full">
            <div className="text-red-500 text-lg font-semibold mb-4">
              页面加载出错
            </div>
            <div className="text-gray-600 text-sm mb-4">
              {this.state.error?.message || '未知错误'}
            </div>
            <div className="text-gray-400 text-xs mb-4">
              {typeof window !== 'undefined' && (
                <pre className="bg-gray-100 p-2 rounded overflow-auto max-h-40">
                  {this.state.error?.stack}
                </pre>
              )}
            </div>
            <button
              onClick={() => {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = '/';
              }}
              className="w-full py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              清除缓存并刷新
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

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

function AppContent() {
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
    <div className="min-h-screen bg-gray-50">
      {!location.pathname.startsWith('/m/') && (
        <Header
          documentTitle=""
          user={user}
          onLogout={handleLogout}
          showDocTitle={false}
        />
      )}

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

        <Route path="/m/import" element={
          user ? <MobileImportDocument /> : <Navigate to="/m/login" replace />
        } />

        <Route path="/m/profile" element={
          user ? <MobileHome user={user} onLogout={handleLogout} /> : <Navigate to="/m/login" replace />
        } />

        <Route path="/login" element={
          user ? <Navigate to="/home" replace /> : <Login onLogin={handleLogin} />
        } />

        <Route path="/reset-password" element={<ResetPassword />} />

        <Route path="/recharge-history" element={
          user ? <RechargeHistory user={user} onLogout={handleLogout} /> : <Navigate to="/login" replace />
        } />

        <Route path="/purchase-history" element={
          user ? <PurchaseHistory user={user} onLogout={handleLogout} /> : <Navigate to="/login" replace />
        } />

        <Route path="/m/recharge-history" element={
          user ? <MobileRechargeHistory user={user} onLogout={handleLogout} /> : <Navigate to="/m/login" replace />
        } />

        <Route path="/m/purchase-history" element={
          user ? <MobilePurchaseHistory user={user} onLogout={handleLogout} /> : <Navigate to="/m/login" replace />
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
  );
}

function App() {
  return (
    <ErrorBoundary>
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AppContent />
      </Router>
    </ErrorBoundary>
  );
}

export default App;
