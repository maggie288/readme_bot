import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import Logo from './Logo';

export default function MobileHeader({ user, onLogout, showBalance = true }) {
  const navigate = useNavigate();
  const [balance, setBalance] = useState(user?.balance || 0);
  const [showRecharge, setShowRecharge] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [rechargeAmount, setRechargeAmount] = useState('');
  const [recharging, setRecharging] = useState(false);

  useEffect(() => {
    if (user) {
      loadBalance();
    }
  }, [user]);

  const loadBalance = async () => {
    try {
      const res = await authAPI.getMe();
      setBalance(res.data.balance || 0);
    } catch (error) {
      console.error('Load balance error:', error);
    }
  };

  const handleRecharge = async () => {
    const amount = parseFloat(rechargeAmount);
    if (!amount || amount <= 0) {
      alert('请输入有效金额');
      return;
    }

    setRecharging(true);
    try {
      const res = await authAPI.createAlipayOrder(amount);
      if (res.data.payUrl) {
        window.location.href = res.data.payUrl;
      }
    } catch (error) {
      console.error('Create order error:', error);
      alert('创建订单失败');
    } finally {
      setRecharging(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    if (onLogout) onLogout();
    navigate('/login');
    setShowUserMenu(false);
  };

  const quickAmounts = [10, 50, 100, 200];

  return (
    <>
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200">
        <div className="px-4 py-3 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 text-gray-900">
            <Logo className="h-6 w-6" />
            <span className="text-lg font-semibold">Readme<span className="text-gray-400 font-normal text-sm">BOT</span></span>
          </Link>

          {/* Right Actions */}
          <div className="flex items-center gap-2">
            {user ? (
              <>
                {/* Balance Button */}
                {showBalance && (
                  <button
                    onClick={() => setShowRecharge(true)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-yellow-50 text-yellow-700 rounded-full text-sm"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="font-medium">¥{balance.toFixed(2)}</span>
                  </button>
                )}

                {/* User Menu Button */}
                <button
                  onClick={() => setShowUserMenu(true)}
                  className="flex items-center gap-2 p-1"
                >
                  {user.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.username}
                      className="w-8 h-8 rounded-full"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center text-white font-medium text-sm">
                      {user.username?.[0]?.toUpperCase() || 'U'}
                    </div>
                  )}
                </button>
              </>
            ) : (
              <Link
                to="/login"
                className="px-4 py-2 bg-black text-white text-sm font-medium rounded-lg"
              >
                登录
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* User Menu Drawer */}
      {showUserMenu && user && (
        <div className="fixed inset-0 z-50">
          <div 
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowUserMenu(false)}
          />
          <div className="absolute right-0 top-0 bottom-0 w-4/5 max-w-xs bg-white shadow-xl">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">我的账户</h2>
                <button
                  onClick={() => setShowUserMenu(false)}
                  className="p-2 -mr-2 text-gray-500"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-4">
              {/* User Info */}
              <div className="flex items-center gap-3 mb-6">
                {user.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.username}
                    className="w-14 h-14 rounded-full"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-black flex items-center justify-center text-white font-medium text-xl">
                    {user.username?.[0]?.toUpperCase() || 'U'}
                  </div>
                )}
                <div>
                  <p className="font-semibold text-gray-900">{user.username}</p>
                  <p className="text-sm text-gray-500">{user.email}</p>
                </div>
              </div>

              {/* Balance Card */}
              <div className="bg-gradient-to-r from-yellow-400 to-orange-500 rounded-xl p-4 mb-6 text-white">
                <p className="text-sm opacity-90">账户余额</p>
                <p className="text-3xl font-bold mt-1">¥{balance.toFixed(2)}</p>
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    setShowRecharge(true);
                  }}
                  className="mt-3 w-full py-2 bg-white/20 rounded-lg text-sm font-medium"
                >
                  立即充值
                </button>
              </div>

              {/* Quick Actions Cards */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                <Link
                  to="/m/bookshelf"
                  onClick={() => setShowUserMenu(false)}
                  className="flex flex-col items-center p-4 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors"
                >
                  <svg className="w-8 h-8 text-blue-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  <span className="text-sm font-medium text-blue-700">我的书架</span>
                </Link>
                <Link
                  to="/m/profile"
                  onClick={() => setShowUserMenu(false)}
                  className="flex flex-col items-center p-4 bg-purple-50 rounded-xl hover:bg-purple-100 transition-colors"
                >
                  <svg className="w-8 h-8 text-purple-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span className="text-sm font-medium text-purple-700">个人中心</span>
                </Link>
                <Link
                  to="/m/recharge-history"
                  onClick={() => setShowUserMenu(false)}
                  className="flex flex-col items-center p-4 bg-green-50 rounded-xl hover:bg-green-100 transition-colors"
                >
                  <svg className="w-8 h-8 text-green-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                  <span className="text-sm font-medium text-green-700">充值记录</span>
                </Link>
                <Link
                  to="/m/purchase-history"
                  onClick={() => setShowUserMenu(false)}
                  className="flex flex-col items-center p-4 bg-orange-50 rounded-xl hover:bg-orange-100 transition-colors"
                >
                  <svg className="w-8 h-8 text-orange-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                  <span className="text-sm font-medium text-orange-700">购买记录</span>
                </Link>
              </div>

              {/* Logout */}
              <button
                onClick={handleLogout}
                className="w-full mt-6 flex items-center gap-3 px-4 py-3 rounded-lg text-red-600 hover:bg-red-50"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span>退出登录</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Recharge Modal */}
      {showRecharge && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden">
            <div className="px-4 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold">账户充值</h3>
              <button
                onClick={() => setShowRecharge(false)}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-4">
              <div className="text-center mb-6">
                <p className="text-sm text-gray-500 mb-1">当前余额</p>
                <p className="text-3xl font-bold text-gray-900">¥{balance.toFixed(2)}</p>
              </div>

              {/* Quick Amounts */}
              <div className="grid grid-cols-4 gap-2 mb-4">
                {quickAmounts.map((amount) => (
                  <button
                    key={amount}
                    onClick={() => setRechargeAmount(amount.toString())}
                    className={`py-2 rounded-lg text-sm font-medium transition-colors ${
                      rechargeAmount === amount.toString()
                        ? 'bg-yellow-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    ¥{amount}
                  </button>
                ))}
              </div>

              {/* Custom Amount */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  自定义金额
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">¥</span>
                  <input
                    type="number"
                    value={rechargeAmount}
                    onChange={(e) => setRechargeAmount(e.target.value)}
                    placeholder="输入金额"
                    className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  />
                </div>
              </div>

              <button
                onClick={handleRecharge}
                disabled={recharging || !rechargeAmount}
                className="w-full py-3 bg-yellow-500 text-white rounded-lg font-medium disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {recharging ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    处理中...
                  </span>
                ) : (
                  '立即充值'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
