import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { authAPI } from '../services/api';

export default function PurchaseHistory() {
  const [purchases, setPurchases] = useState({ documents: [], translations: [] });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('documents');

  useEffect(() => {
    loadPurchases();
  }, []);

  const loadPurchases = async () => {
    try {
      const res = await authAPI.getPurchases();
      setPurchases(res.data);
    } catch (error) {
      console.error('Load purchases error:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  const PurchaseCard = ({ item, type }) => (
    <div className="bg-white rounded-lg shadow p-4 flex items-center justify-between hover:shadow-md transition-shadow">
      <div className="flex-1 min-w-0">
        <Link
          to={`/document/${item.document.id}`}
          className="text-lg font-medium text-gray-900 hover:text-blue-600 truncate block"
        >
          {item.document.title}
        </Link>
        <p className="text-sm text-gray-500 mt-1">
          购买时间：{formatDate(item.createdAt)}
        </p>
      </div>
      <div className="ml-4 text-right">
        <span className="text-lg font-medium text-gray-900">
          ¥{item.price.toFixed(2)}
        </span>
        <p className="text-xs text-gray-400 mt-1">
          {type === 'document' ? '文档购买' : '翻译购买'}
        </p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-gray-900">购买记录</h1>
          <Link
            to="/"
            className="text-blue-600 hover:text-blue-800 text-sm"
          >
            返回首页
          </Link>
        </div>

        <div className="mb-6">
          <div className="flex gap-2 border-b border-gray-200">
            <button
              onClick={() => setActiveTab('documents')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'documents'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              文档购买 ({purchases.documents.length})
            </button>
            <button
              onClick={() => setActiveTab('translations')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'translations'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              翻译购买 ({purchases.translations.length})
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : activeTab === 'documents' ? (
          purchases.documents.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <div className="text-gray-400 mb-4">
                <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-gray-500 mb-4">暂无文档购买记录</p>
              <Link
                to="/"
                className="text-blue-600 hover:text-blue-800"
              >
                去浏览文档
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {purchases.documents.map((item) => (
                <PurchaseCard key={item.id} item={item} type="document" />
              ))}
            </div>
          )
        ) : purchases.translations.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="text-gray-400 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
              </svg>
            </div>
            <p className="text-gray-500 mb-4">暂无翻译购买记录</p>
          </div>
        ) : (
          <div className="space-y-4">
            {purchases.translations.map((item) => (
              <PurchaseCard key={item.id} item={item} type="translation" />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
