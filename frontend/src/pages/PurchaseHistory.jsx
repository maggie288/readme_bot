import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authAPI } from '../services/api';
import Header from '../components/Header';

export default function PurchaseHistory({ user, onLogout }) {
  const navigate = useNavigate();
  const [purchases, setPurchases] = useState({ documents: [], translations: [] });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('documents');

  useEffect(() => {
    loadPurchases();
  }, []);

  const loadPurchases = async () => {
    try {
      const res = await authAPI.getPurchases();
      setPurchases(res.data || { documents: [], translations: [] });
    } catch (error) {
      console.error('Load purchases error:', error);
    } finally {
      setLoading(false);
    }
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

  const PurchaseCard = ({ item, type }) => (
    <Link
      to={`/document/${item.document.id}`}
      className="block bg-white rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between mb-3">
        <h3 className="font-medium text-gray-900 line-clamp-1 flex-1 pr-4 text-lg">
          {item.document?.title || '未命名文档'}
        </h3>
        <span className="text-xl font-bold text-gray-900">
          ¥{item.price.toFixed(2)}
        </span>
      </div>
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {formatDate(item.createdAt)}
        </p>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
          type === 'document'
            ? 'bg-blue-100 text-blue-700'
            : 'bg-purple-100 text-purple-700'
        }`}>
          {type === 'document' ? '文档' : '翻译'}
        </span>
      </div>
    </Link>
  );

  const totalCount = purchases.documents.length + purchases.translations.length;

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
            <h1 className="text-2xl font-semibold text-gray-900">购买记录</h1>
          </div>
          <span className="text-sm text-gray-500">共 {totalCount} 笔</span>
        </div>

        <div className="flex gap-3 mb-6">
          <button
            onClick={() => setActiveTab('documents')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'documents'
                ? 'bg-blue-500 text-white'
                : 'bg-white text-gray-700 shadow-sm hover:bg-gray-50'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            文档 ({purchases.documents.length})
          </button>
          <button
            onClick={() => setActiveTab('translations')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'translations'
                ? 'bg-blue-500 text-white'
                : 'bg-white text-gray-700 shadow-sm hover:bg-gray-50'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
            </svg>
            翻译 ({purchases.translations.length})
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : activeTab === 'documents' ? (
          purchases.documents.length === 0 ? (
            <div className="bg-white rounded-xl p-12 text-center shadow-sm">
              <div className="text-gray-400 mb-4">
                <svg className="w-20 h-20 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-gray-500 mb-6 text-lg">暂无文档购买记录</p>
              <Link
                to="/"
                className="inline-block px-6 py-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                去浏览
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
          <div className="bg-white rounded-xl p-12 text-center shadow-sm">
            <div className="text-gray-400 mb-4">
              <svg className="w-20 h-20 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
              </svg>
            </div>
            <p className="text-gray-500 mb-6 text-lg">暂无翻译购买记录</p>
          </div>
        ) : (
          <div className="space-y-4">
            {purchases.translations.map((item) => (
              <PurchaseCard key={item.id} item={item} type="translation" />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
