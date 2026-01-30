import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { documentsAPI, bookshelfAPI, translateAPI } from '../services/api';
import DocumentEditor, { EditorToolbar } from '../components/DocumentEditor';
import Sidebar from '../components/Sidebar';
import PDFViewer from '../components/PDFViewer';

export default function DocumentPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [document, setDocument] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const [editedContent, setEditedContent] = useState('');
  const [editedPrice, setEditedPrice] = useState(0);
  const [editedIsPublic, setEditedIsPublic] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isInBookshelf, setIsInBookshelf] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  // 翻译相关状态
  const [contentTab, setContentTab] = useState('original'); // 'original' | 'translation'
  const [translationPurchased, setTranslationPurchased] = useState(false);
  const [translatedContent, setTranslatedContent] = useState('');
  const [purchasingTranslation, setPurchasingTranslation] = useState(false);
  const [loadingTranslation, setLoadingTranslation] = useState(false);

  // 视图切换状态
  const [viewMode, setViewMode] = useState('text'); // 'text' | 'original'

  // 朗读状态管理
  const [isReading, setIsReading] = useState(false);
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(-1);
  const [startFromSentence, setStartFromSentence] = useState(0);

  // 阅读进度状态
  const [readingProgress, setReadingProgress] = useState(null);
  const progressSaveTimerRef = useRef(null);

  // 自动保存相关状态
  const [autoSaveStatus, setAutoSaveStatus] = useState(''); // '' | 'saving' | 'saved' | 'error'
  const autoSaveTimerRef = useRef(null);
  const lastSavedContentRef = useRef('');
  const lastSavedTitleRef = useRef('');

  // 编辑器实例（用于外部工具栏）
  const [editor, setEditor] = useState(null);

  useEffect(() => {
    loadDocument();
    checkBookshelf();
    loadReadingProgress();

    // 组件卸载时保存进度和清理定时器
    return () => {
      if (progressSaveTimerRef.current) {
        clearTimeout(progressSaveTimerRef.current);
      }
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [id]);

  // 自动保存功能 - 编辑模式下内容变化时触发
  useEffect(() => {
    const isDocOwner = document?.author?.id === user?.id;
    if (!isEditing || !isDocOwner) return;

    // 检查内容是否有变化
    const contentChanged = editedContent !== lastSavedContentRef.current;
    const titleChanged = editedTitle !== lastSavedTitleRef.current;

    if (!contentChanged && !titleChanged) return;

    // 清除之前的定时器
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    // 设置新的自动保存定时器（2秒后保存）
    autoSaveTimerRef.current = setTimeout(async () => {
      try {
        setAutoSaveStatus('saving');
        await documentsAPI.update(id, {
          title: editedTitle,
          content: editedContent,
          mode: 'edit',
          price: parseFloat(editedPrice) || 0,
          isPublic: editedIsPublic,
        });
        lastSavedContentRef.current = editedContent;
        lastSavedTitleRef.current = editedTitle;
        setAutoSaveStatus('saved');

        // 3秒后清除保存状态
        setTimeout(() => setAutoSaveStatus(''), 3000);
      } catch (error) {
        console.error('Auto-save error:', error);
        setAutoSaveStatus('error');
      }
    }, 2000);
  }, [editedContent, editedTitle, isEditing, id, editedPrice, editedIsPublic]);

  // 初始化 lastSaved refs
  useEffect(() => {
    if (document) {
      lastSavedContentRef.current = document.content;
      lastSavedTitleRef.current = document.title;
    }
  }, [document]);

  // 检查翻译购买状态
  useEffect(() => {
    if (document?.sourceType === 'twitter') {
      checkTranslationStatus();
    }
  }, [document?.id, document?.sourceType]);

  const checkTranslationStatus = async () => {
    try {
      const response = await translateAPI.checkPurchase(id);
      setTranslationPurchased(response.data.purchased);
      if (response.data.purchased && document?.translatedContent) {
        setTranslatedContent(document.translatedContent);
      }
    } catch (error) {
      console.error('Check translation status error:', error);
    }
  };

  // 购买翻译
  const handlePurchaseTranslation = async () => {
    if (!confirm('确定要购买翻译吗？价格：¥0.5')) return;

    setPurchasingTranslation(true);
    try {
      const response = await translateAPI.charge(id);
      if (response.data.success) {
        setTranslationPurchased(true);
        setTranslatedContent(response.data.translatedContent);
        alert('购买成功！');
      }
    } catch (error) {
      console.error('Purchase translation error:', error);
      const message = error.response?.data?.error || '购买翻译失败';
      alert(message);
    } finally {
      setPurchasingTranslation(false);
    }
  };

  // 加载翻译内容（已购买的情况）
  const loadTranslationContent = async () => {
    if (translatedContent) return; // 已有内容则不重复加载

    setLoadingTranslation(true);
    try {
      const response = await translateAPI.getContent(id);
      setTranslatedContent(response.data.translatedContent);
    } catch (error) {
      console.error('Load translation error:', error);
    } finally {
      setLoadingTranslation(false);
    }
  };

  // 切换到翻译标签时加载内容
  useEffect(() => {
    if (contentTab === 'translation' && translationPurchased && !translatedContent) {
      loadTranslationContent();
    }
  }, [contentTab, translationPurchased]);

  const loadDocument = async () => {
    try {
      const response = await documentsAPI.getById(id);
      setDocument(response.data);
      setEditedTitle(response.data.title);
      setEditedContent(response.data.content);
      setEditedPrice(response.data.price || 0);
      setEditedIsPublic(response.data.isPublic !== false);
      // 默认为预览模式，用户需要手动点击"编辑"按钮才能进入编辑模式
      setIsEditing(false);
    } catch (error) {
      console.error('Load document error:', error);
      alert('文档加载失败');
      navigate('/home');
    } finally {
      setLoading(false);
    }
  };

  const checkBookshelf = async () => {
    try {
      const response = await bookshelfAPI.getAll();
      const inBookshelf = response.data.some(
        (item) => item.document.id === parseInt(id)
      );
      setIsInBookshelf(inBookshelf);
    } catch (error) {
      console.error('Check bookshelf error:', error);
    }
  };

  // 加载阅读进度
  const loadReadingProgress = async () => {
    try {
      const response = await bookshelfAPI.getProgress(id);
      setReadingProgress(response.data);

      // 如果有保存的进度，恢复位置
      if (response.data.listenPosition > 0) {
        setStartFromSentence(response.data.listenPosition);
        setCurrentSentenceIndex(response.data.listenPosition);
      }
    } catch (error) {
      console.error('Load reading progress error:', error);
    }
  };

  // 保存阅读进度（防抖）
  const saveReadingProgress = useCallback((progressData) => {
    if (progressSaveTimerRef.current) {
      clearTimeout(progressSaveTimerRef.current);
    }

    progressSaveTimerRef.current = setTimeout(async () => {
      try {
        await bookshelfAPI.updateProgress(id, progressData);
      } catch (error) {
        console.error('Save reading progress error:', error);
      }
    }, 1000); // 1秒防抖
  }, [id]);

  // 处理进度变化（来自 ReadAloud 组件）
  const handleProgressChange = useCallback((progress) => {
    setReadingProgress(prev => ({ ...prev, ...progress }));
    saveReadingProgress(progress);
  }, [saveReadingProgress]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await documentsAPI.update(id, {
        title: editedTitle,
        content: editedContent,
        mode: isEditing ? 'edit' : 'read',
        price: parseFloat(editedPrice) || 0,
        isPublic: editedIsPublic,
      });
      await loadDocument();
    } catch (error) {
      console.error('Save document error:', error);
      alert('保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleMode = async () => {
    if (isEditing) {
      await handleSave();
    }
    setIsEditing(!isEditing);
  };

  const handleDelete = async () => {
    if (!confirm('确定要删除这个文档吗？此操作不可恢复。')) return;

    try {
      await documentsAPI.delete(id);
      navigate('/home');
    } catch (error) {
      console.error('Delete document error:', error);
      alert('删除失败');
    }
  };

  const handleToggleBookshelf = async () => {
    try {
      if (isInBookshelf) {
        await bookshelfAPI.remove(id);
        setIsInBookshelf(false);
      } else {
        await bookshelfAPI.add(parseInt(id));
        setIsInBookshelf(true);
      }
    } catch (error) {
      console.error('Toggle bookshelf error:', error);
      alert('操作失败');
    }
  };

  // 购买文档
  const handlePurchase = async () => {
    if (!confirm(`确定要购买此文档吗？价格：¥${document.price}`)) return;

    setPurchasing(true);
    try {
      await documentsAPI.purchase(id);
      alert('购买成功！');
      await loadDocument(); // 重新加载文档以获取完整内容
    } catch (error) {
      console.error('Purchase error:', error);
      const message = error.response?.data?.error || '购买失败';
      alert(message);
    } finally {
      setPurchasing(false);
    }
  };

  // 处理朗读句子变化
  const handleSentenceChange = useCallback((index) => {
    setCurrentSentenceIndex(index);
    if (index === -1) {
      // 朗读结束
      setIsReading(false);
    }
  }, []);

  // 处理播放状态变化 - 同步 ReadAloud 的状态到父组件
  const handlePlayStateChange = useCallback(({ isPlaying, isPaused, currentSentenceIndex: idx }) => {
    setIsReading(isPlaying || isPaused);
    if (typeof idx === 'number' && idx >= 0) {
      setCurrentSentenceIndex(idx);
    }
  }, []);

  // 处理点击句子（从该句子开始朗读）
  const handleSentenceClick = useCallback((index) => {
    setStartFromSentence(index);
    setCurrentSentenceIndex(index);
  }, []);

  const isOwner = document?.author?.id === user?.id;
  const hasPdfPages = document?.pdfPages && document.pdfPages.length > 0;
  const hasAccess = document?.hasAccess !== false;
  const needPurchase = document?.needPurchase === true;
  const isTwitterSource = document?.sourceType === 'twitter';
  const isPdfSource = document?.sourceType === 'pdf';
  const isWordSource = document?.sourceType === 'word';

  // 获取当前显示的内容（根据标签切换）
  const displayContent = contentTab === 'translation' && translatedContent
    ? translatedContent
    : editedContent;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
      </div>
    );
  }

  // 需要购买的页面
  if (!hasAccess && needPurchase) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-16">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
          {/* 头部 */}
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 px-8 py-6 text-white">
            <h1 className="text-2xl font-bold mb-2">{document.title}</h1>
            <p className="text-blue-100">
              作者: {document.author?.username}
            </p>
          </div>

          {/* 内容 */}
          <div className="px-8 py-8">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-yellow-100 rounded-full mb-4">
                <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                此文档需要付费阅读
              </h2>
              <p className="text-gray-500">
                购买后即可阅读完整内容，并支持边听边读功能
              </p>
            </div>

            {/* 价格 */}
            <div className="bg-gray-50 rounded-xl p-6 mb-6">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">文档价格</span>
                <span className="text-3xl font-bold text-gray-900">
                  ¥{document.price}
                </span>
              </div>
            </div>

            {/* 购买按钮 */}
            <button
              onClick={handlePurchase}
              disabled={purchasing}
              className="w-full py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-semibold text-lg hover:from-blue-600 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
            >
              {purchasing ? '购买中...' : '立即购买'}
            </button>

            {/* 返回按钮 */}
            <button
              onClick={() => navigate(-1)}
              className="w-full mt-4 py-3 text-gray-600 hover:text-gray-900 transition-colors"
            >
              返回
            </button>
          </div>

          {/* 底部说明 */}
          <div className="px-8 py-4 bg-gray-50 border-t border-gray-200">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <span>购买后永久有效，支持无限次阅读</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex">
      {/* Main Content */}
      <div className="flex-1 max-w-4xl mx-auto px-6 mb-20">
        {/* 吸顶头部区域 */}
        <div className="sticky top-0 z-20 bg-white pt-6 pb-4">
          {/* Title Section */}
          <div className="mb-3">
            {isEditing ? (
              <input
                type="text"
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                className="text-2xl font-bold w-full border-b-2 border-gray-300 focus:border-black focus:outline-none pb-2 bg-transparent"
                placeholder="文档标题"
              />
            ) : (
              <h1 className="text-2xl font-bold text-gray-900">
                {document.title}
              </h1>
            )}
          </div>

          {/* Metadata & Actions Row */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3 text-sm text-gray-500">
              <span>{document.author.username}</span>
              <span className="text-gray-300">·</span>
              <span>
                {new Date(document.updatedAt).toLocaleDateString('zh-CN')}
              </span>
              {isReading && (
                <>
                  <span className="text-gray-300">·</span>
                  <span className="text-black font-medium flex items-center gap-1">
                    <span className="animate-pulse text-red-500">●</span>
                    朗读中
                  </span>
                </>
              )}
              {readingProgress && readingProgress.listenPercent > 0 && !isReading && (
                <>
                  <span className="text-gray-300">·</span>
                  <span className="text-blue-600">
                    已听 {readingProgress.listenPercent}%
                  </span>
                </>
              )}
              {/* 自动保存状态指示器 */}
              {isEditing && autoSaveStatus && (
                <>
                  <span className="text-gray-300">·</span>
                  <span className={`flex items-center gap-1 ${
                    autoSaveStatus === 'saving' ? 'text-yellow-600' :
                    autoSaveStatus === 'saved' ? 'text-green-600' :
                    autoSaveStatus === 'error' ? 'text-red-600' : ''
                  }`}>
                    {autoSaveStatus === 'saving' && (
                      <>
                        <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        保存中...
                      </>
                    )}
                    {autoSaveStatus === 'saved' && (
                      <>
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        已保存
                      </>
                    )}
                    {autoSaveStatus === 'error' && (
                      <>
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        保存失败
                      </>
                    )}
                  </span>
                </>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleToggleBookshelf}
                className={`p-2 rounded-lg text-sm transition-colors ${
                  isInBookshelf
                    ? 'text-yellow-500 hover:bg-yellow-50'
                    : 'text-gray-400 hover:bg-gray-100'
                }`}
                title={isInBookshelf ? '取消收藏' : '收藏'}
              >
                <svg className="w-5 h-5" fill={isInBookshelf ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
              </button>

              {isOwner && (
                <>
                  {isEditing && (
                    <button
                      onClick={() => setShowSettings(!showSettings)}
                      className={`p-2 rounded-lg text-sm transition-colors ${
                        showSettings
                          ? 'bg-gray-100 text-gray-900'
                          : 'text-gray-400 hover:bg-gray-100'
                      }`}
                      title="设置"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </button>
                  )}

                  <button
                    onClick={handleToggleMode}
                    disabled={saving}
                    className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                      isEditing
                        ? 'bg-green-600 text-white hover:bg-green-700'
                        : 'bg-gray-900 text-white hover:bg-gray-800'
                    } disabled:bg-gray-400 disabled:cursor-not-allowed`}
                  >
                    {saving
                      ? '保存中...'
                      : isEditing
                      ? '完成编辑'
                      : '编辑'}
                  </button>

                  {isEditing && (
                    <button
                      onClick={handleDelete}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="删除"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* 编辑器工具栏 - 仅编辑模式显示 */}
          {isEditing && editor && (
            <div className="border-t border-gray-100">
              <EditorToolbar editor={editor} />
            </div>
          )}

          {/* 底部分隔线 */}
          <div className="border-b border-gray-200"></div>
        </div>

        {/* Settings Panel - 仅在编辑模式且作者本人时显示 */}
        {isOwner && isEditing && showSettings && (
          <div className="mb-6 p-5 bg-gray-50 rounded-xl border border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              文档设置
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 可见性设置 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  可见性
                </label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setEditedIsPublic(true)}
                    className={`flex-1 px-4 py-3 rounded-lg border-2 transition-all ${
                      editedIsPublic
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="font-medium">公开</span>
                    </div>
                    <p className="text-xs mt-1 text-gray-500">所有人可见</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditedIsPublic(false)}
                    className={`flex-1 px-4 py-3 rounded-lg border-2 transition-all ${
                      !editedIsPublic
                        ? 'border-gray-700 bg-gray-100 text-gray-800'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      <span className="font-medium">私有</span>
                    </div>
                    <p className="text-xs mt-1 text-gray-500">仅自己可见</p>
                  </button>
                </div>
              </div>

              {/* 定价设置 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  定价
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">¥</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={editedPrice}
                    onChange={(e) => setEditedPrice(e.target.value)}
                    className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0 表示免费"
                  />
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  {parseFloat(editedPrice) > 0
                    ? `其他用户需要支付 ¥${parseFloat(editedPrice).toFixed(2)} 才能阅读此文档`
                    : '免费文档，所有人可免费阅读'}
                </p>
              </div>
            </div>

            {/* 当前状态预览 */}
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center gap-3 text-sm">
                <span className="text-gray-500">当前状态：</span>
                {editedIsPublic ? (
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs">公开</span>
                ) : (
                  <span className="px-2 py-0.5 bg-gray-200 text-gray-600 rounded-full text-xs">私有</span>
                )}
                {parseFloat(editedPrice) > 0 ? (
                  <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">¥{parseFloat(editedPrice).toFixed(2)}</span>
                ) : (
                  <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs">免费</span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Twitter 翻译标签 - 仅当是 Twitter 来源文档时显示 */}
        {isTwitterSource && (
          <div className="mb-6">
            <div className="flex border-b border-gray-200">
              <button
                onClick={() => setContentTab('original')}
                className={`px-4 py-2.5 text-sm font-medium transition-colors relative ${
                  contentTab === 'original'
                    ? 'text-black'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                  </svg>
                  原文
                </div>
                {contentTab === 'original' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black"></div>
                )}
              </button>
              <button
                onClick={() => {
                  setContentTab('translation');
                  if (translationPurchased && !translatedContent) {
                    loadTranslationContent();
                  }
                }}
                className={`px-4 py-2.5 text-sm font-medium transition-colors relative ${
                  contentTab === 'translation'
                    ? 'text-black'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                  </svg>
                  中文翻译
                  {!translationPurchased && (
                    <span className="px-1.5 py-0.5 text-xs bg-yellow-100 text-yellow-700 rounded font-medium">
                      ¥0.5
                    </span>
                  )}
                  {translationPurchased && (
                    <span className="px-1.5 py-0.5 text-xs bg-green-100 text-green-700 rounded">
                      已购买
                    </span>
                  )}
                </div>
                {contentTab === 'translation' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black"></div>
                )}
              </button>
            </div>

            {/* 翻译购买提示 - 仅在翻译标签且未购买时显示 */}
            {contentTab === 'translation' && !translationPurchased && (
              <div className="mt-4 p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-200">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-1">解锁中文翻译</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      购买后即可查看该推文的中文翻译，并支持边听边读功能
                    </p>
                    <button
                      onClick={handlePurchaseTranslation}
                      disabled={purchasingTranslation}
                      className="px-6 py-2.5 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg font-medium hover:from-blue-600 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
                    >
                      {purchasingTranslation ? '购买中...' : '购买翻译 ¥0.5'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 翻译加载中 */}
            {contentTab === 'translation' && translationPurchased && loadingTranslation && (
              <div className="mt-4 flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
                <span className="ml-3 text-gray-600">加载翻译中...</span>
              </div>
            )}
          </div>
        )}

        {/* View Mode Tabs - 所有文档都显示两种预览模式 */}
        <div className="flex border-b border-gray-200 mb-6">
          <button
            onClick={() => setViewMode('text')}
            className={`px-4 py-2.5 text-sm font-medium transition-colors relative ${
              viewMode === 'text'
                ? 'text-black'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              文字视图
            </div>
            {viewMode === 'text' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black"></div>
            )}
          </button>
          <button
            onClick={() => setViewMode('original')}
            className={`px-4 py-2.5 text-sm font-medium transition-colors relative ${
              viewMode === 'original'
                ? 'text-black'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              原始视图
              {hasPdfPages && (
                <span className="px-1.5 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
                  {document.pdfPages.length} 页
                </span>
              )}
            </div>
            {viewMode === 'original' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black"></div>
            )}
          </button>
        </div>

        {/* Content Area */}
        {viewMode === 'text' ? (
          <div className="bg-white">
            {/* 文字视图：使用 DocumentEditor 显示富文本内容，保留图片、样式、表格 */}
            {!(isTwitterSource && contentTab === 'translation' && !translationPurchased) && (
              <DocumentEditor
                content={contentTab === 'translation' && translatedContent ? translatedContent : editedContent}
                onChange={contentTab === 'original' ? setEditedContent : undefined}
                editable={isOwner && isEditing && contentTab === 'original'}
                isReading={isReading}
                currentSentenceIndex={currentSentenceIndex}
                onSentenceClick={handleSentenceClick}
                readPosition={readingProgress?.listenPosition || 0}
                onEditorReady={setEditor}
              />
            )}
          </div>
        ) : (
          <div className="bg-white rounded-lg overflow-hidden" style={{ height: 'calc(100vh - 300px)', minHeight: '600px' }}>
            {/* 原始视图：根据文档类型显示 */}
            {hasPdfPages ? (
              <PDFViewer pages={document.pdfPages} />
            ) : (
              /* 没有 PDF 页面的文档，显示只读的富文本编辑器 */
              <DocumentEditor
                content={contentTab === 'translation' && translatedContent ? translatedContent : editedContent}
                editable={false}
                isReading={isReading}
                currentSentenceIndex={currentSentenceIndex}
                onSentenceClick={handleSentenceClick}
                readPosition={readingProgress?.listenPosition || 0}
              />
            )}
          </div>
        )}

        {/* 视图说明 */}
        <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-gray-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-sm text-gray-600">
              <p className="font-medium text-gray-700 mb-1">
                {viewMode === 'text' ? '文字视图' : '原始视图'}
              </p>
              <p>
                {viewMode === 'text' 
                  ? '此视图优化了阅读体验，支持边听边读功能，保留文档的图片、格式和表格。'
                  : hasPdfPages 
                    ? '此视图显示文档的原始排版（包含图片、表格等）。'
                    : '此视图显示文档的原始富文本格式。'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Sidebar - 仅在文字视图显示 */}
      {viewMode === 'text' && (
        <Sidebar
          documentId={parseInt(id)}
          content={contentTab === 'translation' && translatedContent ? translatedContent : editedContent}
          chapters={document?.chapters || []}
          onSentenceChange={handleSentenceChange}
          onPlayStateChange={handlePlayStateChange}
          startFromSentence={startFromSentence}
          initialProgress={readingProgress}
          onProgressChange={handleProgressChange}
        />
      )}
    </div>
  );
}
