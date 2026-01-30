import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';

export default function AlipayPayment() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  const orderId = searchParams.get('orderId');
  const amount = searchParams.get('amount');
  const tradeNo = searchParams.get('tradeNo');

  useEffect(() => {
    if (!orderId || !amount) {
      alert('缺少订单信息');
      navigate('/');
      return;
    }
    setLoading(false);
  }, [orderId, amount, navigate]);

  const handlePayment = async () => {
    setProcessing(true);
    try {
      const res = await authAPI.mockAlipaySuccess(orderId);
      alert('支付成功！');
      navigate('/');
    } catch (error) {
      alert(error.response?.data?.error || '支付失败');
    } finally {
      setProcessing(false);
    }
  };

  const handleCancel = () => {
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="bg-blue-600 px-6 py-4">
            <div className="flex items-center justify-center">
              <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12.067 2.415C6.813 2.415 2.48 6.748 2.48 12.002c0 5.255 4.333 9.587 9.587 9.587 5.255 0 9.587-4.332 9.587-9.587 0-5.254-4.332-9.587-9.587-9.587zm0 16.853c-4.006 0-7.266-3.26-7.266-7.266S8.061 4.735 12.067 4.735s7.266 3.26 7.266 7.267-3.26 7.266-7.266 7.266z"/>
                <path d="M12.067 5.99c-3.323 0-6.023 2.7-6.023 6.023s2.7 6.023 6.023 6.023 6.023-2.7 6.023-6.023-2.7-6.023-6.023-6.023zm0 10.79c-2.63 0-4.767-2.137-4.767-4.767s2.137-4.767 4.767-4.767 4.767 2.137 4.767 4.767-2.137 4.767-4.767 4.767z"/>
                <path d="M14.29 10.24h-4.446v-1.697h4.446v1.697z"/>
              </svg>
              <span className="ml-2 text-xl font-bold text-white">支付宝</span>
            </div>
          </div>

          <div className="p-6">
            <div className="text-center mb-6">
              <p className="text-gray-600">支付金额</p>
              <p className="text-4xl font-bold text-gray-900 mt-2">
                ¥{parseFloat(amount).toFixed(2)}
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-500">订单号</span>
                <span className="text-gray-900 font-mono">{orderId}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">商户</span>
                <span className="text-gray-900">ReadMeBot</span>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-4">
              <p className="text-sm text-gray-500 text-center mb-4">
                扫码支付（模拟）
              </p>
              
              <div className="flex justify-center mb-6">
                <div className="bg-white border-2 border-dashed border-gray-300 rounded-lg p-8">
                  <div className="text-center">
                    <svg className="w-24 h-24 mx-auto text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                    </svg>
                    <p className="text-sm text-gray-500 mt-2">支付宝扫码支付</p>
                  </div>
                </div>
              </div>

              <button
                onClick={handlePayment}
                disabled={processing}
                className="w-full py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                {processing ? '支付中...' : '确认支付'}
              </button>

              <button
                onClick={handleCancel}
                className="w-full mt-3 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
            </div>

            <p className="mt-4 text-xs text-gray-400 text-center">
              注：当前为演示模式，点击"确认支付"可直接完成支付
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
