import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { publicAPI } from '../services/api';

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [popularDocs, setPopularDocs] = useState([]);
  const [trendingDocs, setTrendingDocs] = useState([]);
  const [newDocs, setNewDocs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [popularRes, trendingRes, newRes] = await Promise.all([
        publicAPI.getPopular(),
        publicAPI.getTrending(),
        publicAPI.getNew(),
      ]);
      setPopularDocs(popularRes.data || []);
      setTrendingDocs(trendingRes.data || []);
      setNewDocs(newRes.data || []);
    } catch (error) {
      console.error('Load data error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

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

  // 文档卡片组件
  const DocumentCard = ({ doc, rank, showRank = false }) => (
    <Link
      to={`/document/${doc._id || doc.id}`}
      className="relative flex items-start gap-3 p-4 bg-white rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all group"
    >
      {/* 价格标签 */}
      <div className="absolute top-3 right-3">
        {doc.price > 0 ? (
          <span className="px-2 py-0.5 text-xs bg-yellow-100 text-yellow-700 rounded-full font-medium">
            ¥{doc.price}
          </span>
        ) : (
          <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded-full">
            免费
          </span>
        )}
      </div>

      {showRank && (
        <span className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
          rank <= 3 ? 'bg-black text-white' : 'bg-gray-200 text-gray-600'
        }`}>
          {rank}
        </span>
      )}
      <div className="flex-1 min-w-0 pr-12">
        <h3 className="font-medium text-gray-900 truncate group-hover:text-black">
          {doc.title || '未命名文档'}
        </h3>
        <p className="mt-1 text-sm text-gray-500 line-clamp-2">
          {doc.summary || '暂无描述'}
        </p>
        <div className="mt-2 flex items-center gap-4 text-xs text-gray-400">
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
    </Link>
  );

  // 排行榜组件
  const RankingList = ({ title, docs, icon }) => (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
        {icon}
        <h2 className="font-semibold text-gray-900">{title}</h2>
      </div>
      <div className="divide-y divide-gray-100">
        {docs.length > 0 ? (
          docs.slice(0, 10).map((doc, index) => (
            <Link
              key={doc._id || doc.id}
              to={`/document/${doc._id || doc.id}`}
              className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors"
            >
              <span className={`flex-shrink-0 w-5 h-5 rounded flex items-center justify-center text-xs font-bold ${
                index < 3 ? 'bg-black text-white' : 'text-gray-400'
              }`}>
                {index + 1}
              </span>
              <span className="flex-1 truncate text-sm text-gray-700 hover:text-black">
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
              <span className="text-xs text-gray-400 flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                {doc.viewCount || 0}
              </span>
            </Link>
          ))
        ) : (
          <div className="px-5 py-8 text-center text-gray-400 text-sm">
            暂无数据
          </div>
        )}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 搜索区域 */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-900">发现文档</h1>
            <Link
              to="/bookshelf?tab=my"
              className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors flex items-center gap-2 text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              去创作
            </Link>
          </div>

          {/* 搜索框 */}
          <form onSubmit={handleSearch} className="max-w-2xl">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索文档标题或内容..."
                className="w-full px-5 py-3 pl-12 text-base border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
              />
              <svg
                className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <button
                type="submit"
                disabled={isSearching}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-1.5 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
              >
                {isSearching ? '搜索中...' : '搜索'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* 搜索结果 */}
      {searchResults.length > 0 && (
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              搜索结果 ({searchResults.length})
            </h2>
            <button
              onClick={() => {
                setSearchResults([]);
                setSearchQuery('');
              }}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              清除结果
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {searchResults.map((doc, index) => (
              <DocumentCard key={doc._id || doc.id} doc={doc} rank={index + 1} />
            ))}
          </div>
        </div>
      )}

      {/* 主要内容 */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="space-y-8">
          {/* 大家都在看 */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <h2 className="text-lg font-semibold text-gray-900">大家都在看</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {popularDocs.slice(0, 6).map((doc, index) => (
                <DocumentCard key={doc._id || doc.id} doc={doc} rank={index + 1} showRank />
              ))}
            </div>
            {popularDocs.length === 0 && (
              <div className="bg-white rounded-xl border border-gray-200 px-6 py-12 text-center text-gray-400">
                暂无热门文档
              </div>
            )}
          </div>

          {/* 排行榜 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <RankingList
              title="Top10 飙升榜"
              docs={trendingDocs}
              icon={
                <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              }
            />

            <RankingList
              title="Top10 新 Doc 榜"
              docs={newDocs}
              icon={
                <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              }
            />
          </div>
        </div>
      </div>

          </div>
  );
}
