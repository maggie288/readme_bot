import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import Header from '../components/Header';

export default function RechargeHistory({ user, onLogout }) {
  const navigate = useNavigate();
  const [recharges, setRecharges] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRecharges();
  }, []);

  const loadRecharges = async () => {
    try {
      const res = await authAPI.getRecharges();
      setRecharges(res.data || []);
    } catch (error) {
      console.error('Load recharges error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: 'bg-yellow-100 text-yellow-700',
      success: 'bg-green-100 text-green-700',
      failed: 'bg-red-100 text-red-700',
    };
    const labels = {
      pending: '待支付',
      success: '成功',
      failed: '失败',
    };
    return (
      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${badges[status] || badges.pending}`}>
        {labels[status] || status}
      </span>
    );
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return `今天 ${date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`;
    } else if (days === 1) {
      return `昨天 ${date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`;
    } else if (days < 7) {
      return `${days}天前`;
    }
    return date.toLocaleDateString('zh-CN');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header user={user} onLogout={onLogout} showDocTitle={false} />

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-2xl font-semibold text-gray-900">充值记录</h1>
          </div>
          <span className="text-sm text-gray-500">共 {recharges.length} 笔</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : recharges.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center shadow-sm">
            <div className="text-gray-400 mb-4">
              <svg className="w-20 h-20 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="text-gray-500 mb-6 text-lg">暂无充值记录</p>
            <button
              onClick={() => navigate(-1)}
              className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              返回
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {recharges.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-3xl font-bold text-gray-900">
                      ¥{item.amount.toFixed(2)}
                    </p>
                    <p className="text-sm text-gray-500 mt-2">
                      {formatDate(item.createdAt)}
                    </p>
                  </div>
                  {getStatusBadge(item.status)}
                </div>
                <div className="pt-4 border-t border-gray-100">
                  <p className="text-sm text-gray-400">
                    订单号: {item.alipayOrderId || '-'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
