import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { documentsAPI, bookshelfAPI } from '../services/api';
import MobileHeader from '../components/MobileHeader';
import ImportDocument from '../components/ImportDocument';

export default function MobileBookshelf({ user, onLogout }) {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('my');
  const [showActionMenu, setShowActionMenu] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);

  useEffect(() => {
    loadDocuments();
  }, [activeTab]);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const response = await documentsAPI.list({
        filter: activeTab,
        limit: 50
      });
      setDocuments(response.data.documents || []);
    } catch (error) {
      console.error('Load documents error:', error);
    } finally {
      setLoading(false);
    }
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
      navigate(`/m/document/${response.data.id}`);
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
      navigate(`/m/document/${response.data.id}`);
    } catch (error) {
      console.error('Import document error:', error);
      alert('导入文档失败');
    }
  };

  const handleDeleteDocument = async (docId) => {
    try {
      await documentsAPI.delete(docId);
      setDocuments(documents.filter(doc => doc.id !== docId));
      setShowDeleteConfirm(null);
      setShowActionMenu(null);
      alert('文档已删除');
    } catch (error) {
      console.error('Delete document error:', error);
      alert('删除失败');
    }
  };

  const handleRemoveFromFavorites = async (docId) => {
    try {
      await bookshelfAPI.remove(docId);
      setDocuments(documents.filter(doc => doc.id !== docId));
      setShowActionMenu(null);
      alert('已从收藏移除');
    } catch (error) {
      console.error('Remove from favorites error:', error);
      alert('移除失败');
    }
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 移动端顶部导航栏 */}
      <MobileHeader user={user} onLogout={onLogout} />

      {/* 标签页 */}
      <div className="sticky top-[57px] bg-white z-10 border-b border-gray-100 shadow-sm">
        <div className="flex">
          <button
            onClick={() => setActiveTab('my')}
            className={`flex-1 py-3 text-sm font-medium ${
              activeTab === 'my' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-gray-500'
            }`}
          >
            我的文档
          </button>
          <button
            onClick={() => setActiveTab('favorites')}
            className={`flex-1 py-3 text-sm font-medium ${
              activeTab === 'favorites' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-gray-500'
            }`}
          >
            我的收藏
          </button>
        </div>
      </div>

      {/* 文档列表 */}
      <main className="px-4 py-4 pb-24">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : documents.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
            </div>
            <p className="text-gray-500">暂无文档</p>
            {activeTab === 'created' && (
              <button
                onClick={handleCreateNew}
                className="mt-4 px-6 py-2 bg-blue-500 text-white rounded-lg text-sm"
              >
                创建新文档
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="bg-white rounded-lg p-4 shadow-sm"
              >
                <div className="flex items-start justify-between">
                  <Link
                    to={`/m/document/${doc.id}`}
                    className="flex-1 min-w-0"
                  >
                    <h3 className="font-medium text-gray-900 line-clamp-1">
                      {doc.title || '无标题文档'}
                    </h3>
                    <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
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
                  <button
                    onClick={() => setShowActionMenu(showActionMenu === doc.id ? null : doc.id)}
                    className="p-2 -mr-2 text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                    </svg>
                  </button>
                </div>

                {/* 操作菜单 */}
                {showActionMenu === doc.id && (
                  <div className="mt-3 pt-3 border-t border-gray-100 flex gap-2">
                    {activeTab === 'my' ? (
                      <>
                        <button
                          onClick={() => navigate(`/m/document/${doc.id}`)}
                          className="flex-1 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium"
                        >
                          编辑
                        </button>
                        <button
                          onClick={() => setShowDeleteConfirm(doc.id)}
                          className="flex-1 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-medium"
                        >
                          删除
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => handleRemoveFromFavorites(doc.id)}
                        className="flex-1 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-medium"
                      >
                        取消收藏
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {/* 删除确认弹窗 */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowDeleteConfirm(null)}
          />
          <div className="relative bg-white rounded-xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">确认删除</h3>
            <p className="text-gray-500 mb-6">确定要删除这个文档吗？此操作不可恢复。</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium"
              >
                取消
              </button>
              <button
                onClick={() => handleDeleteDocument(showDeleteConfirm)}
                className="flex-1 py-3 bg-red-500 text-white rounded-lg font-medium"
              >
                删除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 导入文档弹窗 */}
      <ImportDocument
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImport={handleImport}
      />

      {/* 底部导航 */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 pb-safe">
        <div className="flex justify-around py-2">
          <Link
            to="/m/home"
            className="flex flex-col items-center px-4 py-2 text-gray-500"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span className="text-xs mt-1">首页</span>
          </Link>
          <Link
            to="/m/bookshelf"
            className="flex flex-col items-center px-4 py-2 text-blue-500"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
            <span className="text-xs mt-1">书架</span>
          </Link>
          <button
            onClick={() => setShowAddMenu(!showAddMenu)}
            className="flex flex-col items-center px-4 py-2 text-gray-500"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="text-xs mt-1">新增</span>
          </button>

          {/* 新增菜单 */}
          {showAddMenu && (
            <div className="absolute bottom-16 left-1/2 -translate-x-1/2 bg-white rounded-xl shadow-lg border border-gray-200 p-2 z-50 min-w-[140px]">
              <button
                onClick={() => {
                  setShowAddMenu(false);
                  setShowImportModal(true);
                }}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 rounded-lg"
              >
                <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                导入文档
              </button>
              <button
                onClick={() => {
                  setShowAddMenu(false);
                  handleCreateNew();
                }}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 rounded-lg"
              >
                <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                新建文档
              </button>
            </div>
          )}
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
