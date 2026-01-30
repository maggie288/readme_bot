import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import Logo from './Logo';

export default function Header({ documentTitle, user, onLogout, showDocTitle = true, onUserUpdate }) {
  const navigate = useNavigate();
  const [balance, setBalance] = useState(user?.balance || 0);
  const [showRecharge, setShowRecharge] = useState(false);
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
  };

  return (
    <>
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-full px-6 py-4 flex items-center justify-between">
          {/* Left: Logo and Document Title */}
          <div className="flex items-center gap-6">
            <Link to="/" className="flex-shrink-0 flex items-center gap-2 text-gray-900 hover:text-black transition-colors">
              <Logo className="h-6 w-6" />
              <span className="text-lg font-semibold">Readme<span className="text-gray-400 font-normal text-sm">BOT</span></span>
            </Link>
            {showDocTitle && documentTitle && (
              <>
                <span className="text-gray-300">|</span>
                <h1 className="text-lg font-medium text-gray-800">
                  {documentTitle}
                </h1>
              </>
            )}
          </div>

          {/* Right: Navigation */}
          <nav className="flex items-center gap-6">
            {user ? (
              <>
                <Link
                  to="/"
                  className="text-gray-600 hover:text-gray-900 transition-colors text-sm"
                >
                  首页
                </Link>
                <Link
                  to="/bookshelf"
                  className="text-gray-600 hover:text-gray-900 transition-colors text-sm"
                >
                  我的书架
                </Link>

                {/* 余额显示 */}
                <button
                  onClick={() => setShowRecharge(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-50 text-yellow-700 rounded-lg hover:bg-yellow-100 transition-colors text-sm"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="font-medium">¥{balance.toFixed(2)}</span>
                </button>

                <div className="flex items-center gap-2">
                  <div className="relative group">
                    <button className="flex items-center gap-1 text-gray-600 hover:text-gray-900 transition-colors text-sm">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <span>账户</span>
                    </button>
                    <div className="absolute right-0 top-full mt-1 w-40 bg-white rounded-lg shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                      <Link
                        to="/recharge-history"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        充值记录
                      </Link>
                      <Link
                        to="/purchase-history"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        购买记录
                      </Link>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
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
                    <span className="text-sm text-gray-700">{user.username}</span>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    退出
                  </button>
                </div>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-gray-600 hover:text-gray-900 transition-colors text-sm"
                >
                  登录
                </Link>
                <Link
                  to="/login"
                  state={{ isRegister: true }}
                  className="px-4 py-2 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
                >
                  注册
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* 充值弹窗 */}
      {showRecharge && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">账户充值</h3>
              <button
                onClick={() => setShowRecharge(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6">
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">当前余额</p>
                <p className="text-3xl font-bold text-gray-900">¥{balance.toFixed(2)}</p>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  充值金额
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">¥</span>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={rechargeAmount}
                    onChange={(e) => setRechargeAmount(e.target.value)}
                    className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="请输入充值金额"
                  />
                </div>
              </div>

              {/* 快捷金额 */}
              <div className="flex gap-2 mb-6">
                {[10, 50, 100, 200].map((amount) => (
                  <button
                    key={amount}
                    onClick={() => setRechargeAmount(amount.toString())}
                    className="flex-1 py-2 border border-gray-300 rounded-lg text-sm hover:border-blue-500 hover:text-blue-500 transition-colors"
                  >
                    ¥{amount}
                  </button>
                ))}
              </div>

              <button
                onClick={handleRecharge}
                disabled={recharging || !rechargeAmount}
                className="w-full py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                {recharging ? '充值中...' : '立即充值'}
              </button>

              <p className="mt-4 text-xs text-gray-400 text-center">
                充值金额将使用支付宝支付（扫码支付）
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
