import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { documentsAPI, publicAPI } from '../services/api';
import MobileHeader from '../components/MobileHeader';

export default function MobileHome({ user, onLogout }) {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('discover'); // 'discover', 'recent', 'created'
  
  // 发现页面数据
  const [popularDocs, setPopularDocs] = useState([]);
  const [trendingDocs, setTrendingDocs] = useState([]);
  const [newDocs, setNewDocs] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (activeTab === 'discover') {
      loadDiscoverData();
    } else {
      loadDocuments();
    }
  }, [activeTab]);

  const loadDiscoverData = async () => {
    try {
      setLoading(true);
      const [popularRes, trendingRes, newRes] = await Promise.all([
        publicAPI.getPopular(),
        publicAPI.getTrending(),
        publicAPI.getNew(),
      ]);
      setPopularDocs(popularRes.data || []);
      setTrendingDocs(trendingRes.data || []);
      setNewDocs(newRes.data || []);
    } catch (error) {
      console.error('Load discover data error:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const response = await documentsAPI.list({ limit: 20 });
      console.log('[MobileHome] 文檔列表響應:', response.data);
      setDocuments(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Load documents error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const res = await publicAPI.search(searchQuery);
      setSearchResults(res.data || []);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (error) {
      console.error('Logout error:', error);
    }
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    onLogout();
  };

  const handleCreateNew = async () => {
    try {
      const response = await documentsAPI.create({
        title: '新文档',
        content: '',
        mode: 'edit',
      });
      window.location.href = `/m/document/${response.data.id}`;
    } catch (error) {
      console.error('Create document error:', error);
      alert('创建文档失败');
    }
  };

  const filteredDocuments = documents.filter(doc =>
    doc.title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return '今天';
    if (days === 1) return '昨天';
    if (days < 7) return `${days}天前`;
    return date.toLocaleDateString();
  };

  // 文档卡片组件
  const DocumentCard = ({ doc, rank, showRank = false }) => (
    <Link
      to={`/m/document/${doc._id || doc.id}`}
      className="block bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="flex items-start gap-3">
        {showRank && (
          <span className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
            rank <= 3 ? 'bg-black text-white' : 'bg-gray-200 text-gray-600'
          }`}>
            {rank}
          </span>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-medium text-gray-900 line-clamp-1 flex-1">
              {doc.title || '未命名文档'}
            </h3>
            {doc.price > 0 ? (
              <span className="px-2 py-0.5 text-xs bg-yellow-100 text-yellow-700 rounded-full font-medium flex-shrink-0">
                ¥{doc.price}
              </span>
            ) : (
              <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded-full flex-shrink-0">
                免费
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-gray-500 line-clamp-2">
            {doc.summary || '暂无描述'}
          </p>
          <div className="mt-2 flex items-center gap-3 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              {doc.viewCount || 0}
            </span>
            <span>{doc.author?.username || '匿名'}</span>
            {doc.purchaseCount > 0 && (
              <span className="text-purple-500">{doc.purchaseCount} 人购买</span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );

  // 排行榜列表组件
  const RankingList = ({ title, docs, icon }) => (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
        {icon}
        <h2 className="font-semibold text-gray-900">{title}</h2>
      </div>
      <div className="divide-y divide-gray-100">
        {docs.length > 0 ? (
          docs.slice(0, 10).map((doc, index) => (
            <Link
              key={doc._id || doc.id}
              to={`/m/document/${doc._id || doc.id}`}
              className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
            >
              <span className={`flex-shrink-0 w-5 h-5 rounded flex items-center justify-center text-xs font-bold ${
                index < 3 ? 'bg-black text-white' : 'text-gray-400'
              }`}>
                {index + 1}
              </span>
              <span className="flex-1 truncate text-sm text-gray-700">
                {doc.title || '未命名文档'}
              </span>
              {doc.price > 0 ? (
                <span className="px-1.5 py-0.5 text-xs bg-yellow-100 text-yellow-700 rounded font-medium">
                  ¥{doc.price}
                </span>
              ) : (
                <span className="px-1.5 py-0.5 text-xs bg-green-100 text-green-700 rounded">
                  免费
                </span>
              )}
            </Link>
          ))
        ) : (
          <div className="px-4 py-8 text-center text-gray-400 text-sm">
            暂无数据
          </div>
        )}
      </div>
    </div>
  );

  // 渲染发现页面内容
  const renderDiscoverContent = () => {
    if (searchResults.length > 0) {
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              搜索结果 ({searchResults.length})
            </h2>
            <button
              onClick={clearSearch}
              className="text-sm text-blue-500"
            >
              清除
            </button>
          </div>
          <div className="space-y-3">
            {searchResults.map((doc, index) => (
              <DocumentCard key={doc._id || doc.id} doc={doc} rank={index + 1} />
            ))}
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* 大家都在看 */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <h2 className="text-lg font-semibold text-gray-900">大家都在看</h2>
          </div>
          <div className="space-y-3">
            {popularDocs.slice(0, 5).map((doc, index) => (
              <DocumentCard key={doc._id || doc.id} doc={doc} rank={index + 1} showRank />
            ))}
          </div>
          {popularDocs.length === 0 && (
            <div className="bg-white rounded-lg px-4 py-8 text-center text-gray-400">
              暂无热门文档
            </div>
          )}
        </section>

        {/* 排行榜 */}
        <section className="space-y-4">
          <RankingList
            title="Top10 飙升榜"
            docs={trendingDocs}
            icon={
              <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            }
          />
          <RankingList
            title="Top10 新 Doc 榜"
            docs={newDocs}
            icon={
              <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            }
          />
        </section>
      </div>
    );
  };

  // 渲染文档列表内容
  const renderDocumentList = () => {
    if (loading) {
      return (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      );
    }

    if (filteredDocuments.length === 0) {
      return (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-gray-500">暂无文档</p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {filteredDocuments.map((doc) => (
          <Link
            key={doc.id}
            to={`/m/document/${doc.id}`}
            className="block bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
          >
            <h3 className="font-medium text-gray-900 mb-1 line-clamp-1">
              {doc.title || '无标题文档'}
            </h3>
            <div className="flex items-center gap-3 text-sm text-gray-500">
              <span>{formatDate(doc.updatedAt)}</span>
              {doc.wordCount && (
                <span>{doc.wordCount} 字</span>
              )}
              {doc.isPublic !== undefined && (
                <span className={`px-2 py-0.5 rounded-full text-xs ${
                  doc.isPublic ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'
                }`}>
                  {doc.isPublic ? '公开' : '私密'}
                </span>
              )}
            </div>
          </Link>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 移动端顶部导航栏 */}
      <MobileHeader user={user} onLogout={onLogout} />

      {/* 搜索框 */}
      <div className="sticky top-[57px] bg-white z-10 px-4 py-3 border-b border-gray-100 shadow-sm">
        <form onSubmit={handleSearch} className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索文档..."
            className="w-full px-4 py-2 pl-10 bg-gray-100 border-none rounded-lg focus:ring-2 focus:ring-blue-500"
          />
          <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          {searchQuery && (
            <button
              type="button"
              onClick={clearSearch}
              className="absolute right-3 top-1/2 transform -translate-y-1/2"
            >
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </form>

        {/* 标签页 */}
        <div className="flex border-b border-gray-100 mt-3">
          <button
            onClick={() => setActiveTab('discover')}
            className={`flex-1 py-3 text-sm font-medium ${
              activeTab === 'discover' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-gray-500'
            }`}
          >
            发现
          </button>
          <button
            onClick={() => setActiveTab('recent')}
            className={`flex-1 py-3 text-sm font-medium ${
              activeTab === 'recent' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-gray-500'
            }`}
          >
            最近阅读
          </button>
          <button
            onClick={() => setActiveTab('created')}
            className={`flex-1 py-3 text-sm font-medium ${
              activeTab === 'created' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-gray-500'
            }`}
          >
            我的文档
          </button>
        </div>
      </div>

      {/* 内容区域 */}
      <main className="px-4 py-4 pb-24">
        {activeTab === 'discover' ? renderDiscoverContent() : renderDocumentList()}
      </main>

      {/* 底部导航 */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 pb-safe">
        <div className="flex justify-around py-2">
          <Link
            to="/m/home"
            className="flex flex-col items-center px-4 py-2 text-blue-500"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span className="text-xs mt-1">首页</span>
          </Link>
          <Link
            to="/m/bookshelf"
            className="flex flex-col items-center px-4 py-2 text-gray-500"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
            <span className="text-xs mt-1">书架</span>
          </Link>
          <button
            onClick={handleCreateNew}
            className="flex flex-col items-center px-4 py-2 text-gray-500"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="text-xs mt-1">新增</span>
          </button>
          <Link
            to="/m/profile"
            className="flex flex-col items-center px-4 py-2 text-gray-500"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="text-xs mt-1">我的</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}
