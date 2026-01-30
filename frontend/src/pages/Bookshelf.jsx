import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { bookshelfAPI, documentsAPI } from '../services/api';
import ImportDocument from '../components/ImportDocument';

export default function Bookshelf() {
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') === 'my' ? 'my' : 'favorites';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [favorites, setFavorites] = useState([]);
  const [myDocuments, setMyDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showImportModal, setShowImportModal] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  // Handle URL parameter changes
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'my') {
      setActiveTab('my');
    }
  }, [searchParams]);

  const loadData = async () => {
    try {
      const [favoritesRes, myDocsRes] = await Promise.all([
        bookshelfAPI.getAll(),
        documentsAPI.getMy(),
      ]);
      setFavorites(favoritesRes.data || []);
      setMyDocuments(myDocsRes.data || []);
    } catch (error) {
      console.error('Load data error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFromFavorites = async (documentId, e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm('确定要从收藏中移除这个文档吗？')) return;

    try {
      await bookshelfAPI.remove(documentId);
      setFavorites(favorites.filter(item => item.document.id !== documentId));
    } catch (error) {
      console.error('Remove from favorites error:', error);
      alert('移除失败');
    }
  };

  const handleDeleteDocument = async (documentId, e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm('确定要删除这个文档吗？此操作不可恢复。')) return;

    try {
      await documentsAPI.delete(documentId);
      setMyDocuments(myDocuments.filter(doc => doc.id !== documentId));
    } catch (error) {
      console.error('Delete document error:', error);
      alert('删除失败');
    }
  };

  const handleCreateNew = async () => {
    try {
      const response = await documentsAPI.create({
        title: '新文档',
        content: '',
        mode: 'edit',
      });
      window.location.href = `/document/${response.data.id}`;
    } catch (error) {
      console.error('Create document error:', error);
      alert('创建文档失败');
    }
  };

  const handleImport = async ({ title, content, pdfPages, docId, price, isPublic }) => {
    try {
      const response = await documentsAPI.create({
        title,
        content,
        mode: 'edit',
        pdfPages: pdfPages || [],
        docId: docId || null,
        price: price || 0,
        isPublic: isPublic !== undefined ? isPublic : true,
      });
      window.location.href = `/document/${response.data.id}`;
    } catch (error) {
      console.error('Import document error:', error);
      alert('导入文档失败');
    }
  };

  // 收藏卡片组件
  const FavoriteCard = ({ item }) => (
    <Link
      to={`/document/${item.document.id}`}
      className="relative block p-5 bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-all hover:border-gray-300"
    >
      {/* 价格标签 */}
      <div className="absolute top-4 right-12">
        {item.document.price > 0 ? (
          <span className="px-2 py-0.5 text-xs bg-yellow-100 text-yellow-700 rounded-full font-medium">
            ¥{item.document.price}
          </span>
        ) : (
          <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded-full">
            免费
          </span>
        )}
      </div>

      <h3 className="text-lg font-semibold text-gray-900 mb-2 pr-20 truncate">
        {item.document.title || '未命名文档'}
      </h3>
      <p className="text-sm text-gray-500 mb-3">
        作者: {item.document.author?.username || '匿名'}
      </p>

      {/* 阅读进度条 */}
      {item.listenPercent > 0 && (
        <div className="mb-3">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
            <span className="flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              </svg>
              朗读进度
            </span>
            <span>{item.listenPercent}%</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-blue-500 h-1.5 rounded-full transition-all"
              style={{ width: `${item.listenPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* 底部信息 */}
      <div className="flex items-center justify-between text-xs text-gray-400">
        <span>
          {item.lastReadAt && new Date(item.lastReadAt).getTime() > new Date(item.addedAt).getTime()
            ? `上次阅读 ${new Date(item.lastReadAt).toLocaleDateString('zh-CN')}`
            : `添加于 ${new Date(item.addedAt).toLocaleDateString('zh-CN')}`
          }
        </span>
        {item.speed !== 1.0 && (
          <span className="text-blue-500">
            {item.speed?.toFixed(1)}x 语速
          </span>
        )}
      </div>

      {/* 继续阅读按钮 */}
      {item.listenPercent > 0 && item.listenPercent < 100 && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <span className="text-sm text-blue-600 font-medium flex items-center gap-1">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z"/>
            </svg>
            继续朗读
          </span>
        </div>
      )}

      {/* 移除按钮 */}
      <button
        onClick={(e) => handleRemoveFromFavorites(item.document.id, e)}
        className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
        title="从收藏移除"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </Link>
  );

  // 我的文档卡片组件
  const MyDocumentCard = ({ doc }) => (
    <Link
      to={`/document/${doc.id}`}
      className="relative block p-5 bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-all hover:border-gray-300"
    >
      {/* 标签区域 */}
      <div className="absolute top-4 right-12 flex items-center gap-2">
        {/* 公开/私有标签 */}
        {doc.isPublic ? (
          <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full">
            公开
          </span>
        ) : (
          <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full">
            私有
          </span>
        )}
        {/* 价格标签 */}
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

      <h3 className="text-lg font-semibold text-gray-900 mb-2 pr-28 truncate">
        {doc.title || '未命名文档'}
      </h3>

      {/* 文档统计 */}
      <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
        <span className="flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          {doc.viewCount || 0} 浏览
        </span>
        {doc.purchaseCount > 0 && (
          <span className="flex items-center gap-1 text-purple-600">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {doc.purchaseCount} 人购买
          </span>
        )}
      </div>

      {/* 底部信息 */}
      <div className="text-xs text-gray-400">
        更新于 {new Date(doc.updatedAt).toLocaleDateString('zh-CN')}
      </div>

      {/* 删除按钮 */}
      <button
        onClick={(e) => handleDeleteDocument(doc.id, e)}
        className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
        title="删除文档"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </Link>
  );

  // 空状态组件
  const EmptyState = ({ type }) => (
    <div className="text-center py-16">
      <div className="mb-4">
        <svg className="mx-auto w-24 h-24 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      </div>
      <p className="text-gray-500 mb-6 text-lg">
        {type === 'favorites' ? '还没有收藏的文档' : '还没有创建文档'}
      </p>
      <Link
        to="/"
        className="inline-block px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
      >
        {type === 'favorites' ? '去发现文档' : '创建新文档'}
      </Link>
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
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">我的书架</h1>
        <div className="flex gap-3">
          <button
            onClick={() => setShowImportModal(true)}
            className="px-4 py-2 bg-white border-2 border-black text-black rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            导入文档
          </button>
          <button
            onClick={handleCreateNew}
            className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors flex items-center gap-2 text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            新增文档
          </button>
        </div>
      </div>

      {/* Tab 切换 */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab('favorites')}
          className={`px-5 py-2 text-sm font-medium rounded-md transition-all ${
            activeTab === 'favorites'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <span className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            我的收藏
            {favorites.length > 0 && (
              <span className="px-1.5 py-0.5 text-xs bg-gray-200 text-gray-600 rounded-full">
                {favorites.length}
              </span>
            )}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('my')}
          className={`px-5 py-2 text-sm font-medium rounded-md transition-all ${
            activeTab === 'my'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <span className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            我的文档
            {myDocuments.length > 0 && (
              <span className="px-1.5 py-0.5 text-xs bg-gray-200 text-gray-600 rounded-full">
                {myDocuments.length}
              </span>
            )}
          </span>
        </button>
      </div>

      {/* 内容区域 */}
      {activeTab === 'favorites' ? (
        favorites.length === 0 ? (
          <EmptyState type="favorites" />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {favorites.map((item) => (
              <FavoriteCard key={item.id} item={item} />
            ))}
          </div>
        )
      ) : (
        myDocuments.length === 0 ? (
          <EmptyState type="my" />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {myDocuments.map((doc) => (
              <MyDocumentCard key={doc.id} doc={doc} />
            ))}
          </div>
        )
      )}

      {/* Import Modal */}
      <ImportDocument
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImport={handleImport}
      />
    </div>
  );
}
