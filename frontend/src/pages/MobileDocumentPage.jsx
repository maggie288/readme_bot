import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { documentsAPI, bookshelfAPI } from '../services/api';
import MobileDocumentEditor from '../components/MobileDocumentEditor';
import MobileReadAloud from '../components/MobileReadAloud';
import MobileSidebar from '../components/MobileSidebar';
import PDFViewer from '../components/PDFViewer';
import { EditorContent } from '@tiptap/react';
import { StarterKit } from '@tiptap/starter-kit';
import { Placeholder } from '@tiptap/extension-placeholder';
import { Link } from '@tiptap/extension-link';
import { Image } from '@tiptap/extension-image';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { TaskList } from '@tiptap/extension-task-list';
import { TaskItem } from '@tiptap/extension-task-item';
import { Highlight } from '@tiptap/extension-highlight';
import { Underline } from '@tiptap/extension-underline';
import { TextAlign } from '@tiptap/extension-text-align';
import { useEditor } from '@tiptap/react';

export default function MobileDocumentPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [document, setDocument] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const [editedContent, setEditedContent] = useState('');
  const [contentTab, setContentTab] = useState('original');
  const [translatedContent, setTranslatedContent] = useState(null);
  const [isReading, setIsReading] = useState(false);
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(-1);
  const [startFromSentence, setStartFromSentence] = useState(0);
  const [jumpToSentence, setJumpToSentence] = useState(null);
  const [viewMode, setViewMode] = useState('text');
  const [showTabBar, setShowTabBar] = useState(true);
  const [showFloatingCapsule, setShowFloatingCapsule] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [isInBookshelf, setIsInBookshelf] = useState(false);
  const [purchasing, setPurchasing] = useState(false);

  const editorRef = useRef(null);
  const progressSaveTimerRef = useRef(null);
  const autoSaveTimerRef = useRef(null);
  const [lastSaved, setLastSaved] = useState(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isAutoSaving, setIsAutoSaving] = useState(false);

  const loadDocument = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await documentsAPI.getById(id);
      const doc = response.data;
      setDocument(doc);
      setEditedTitle(doc.title);
      setEditedContent(doc.content || '');
      if (doc.translatedContent) {
        setTranslatedContent(doc.translatedContent);
      }

      // 如果是新创建的文档（标题为默认"新文档"或内容为空），默认进入编辑模式
      const isNewDocument = doc.title === '新文档' || !doc.content || doc.content === '<p></p>' || doc.content === '';
      setIsEditing(isNewDocument);

      // 重置自动保存状态
      setHasUnsavedChanges(false);
      setLastSaved(null);
    } catch (error) {
      console.error('Load document error:', error);
      setError(error.response?.data?.error || '加载文档失败');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        console.error('Failed to parse user:', e);
      }
    }
  }, []);

  useEffect(() => {
    loadDocument();
    checkBookshelf();
  }, [loadDocument]);

  const checkBookshelf = async () => {
    try {
      const response = await bookshelfAPI.check(id);
      setIsInBookshelf(response.data.isInBookshelf);
    } catch (error) {
      console.error('Check bookshelf error:', error);
    }
  };

  const handleToggleBookshelf = async () => {
    try {
      if (isInBookshelf) {
        await bookshelfAPI.remove(id);
        setIsInBookshelf(false);
        alert('已从书架移除');
      } else {
        await bookshelfAPI.add(id);
        setIsInBookshelf(true);
        alert('已添加到书架');
      }
    } catch (error) {
      console.error('Toggle bookshelf error:', error);
      alert('操作失败');
    }
  };

  const handleSave = async () => {
    try {
      await documentsAPI.update(id, {
        title: editedTitle,
        content: editedContent,
        mode: 'edit',
      });
      await loadDocument();
      setIsEditing(false);
    } catch (error) {
      console.error('Save document error:', error);
      alert('保存失败');
    }
  };

  const handleToggleMode = async () => {
    console.log('[MobileDocumentPage] handleToggleMode called, current isEditing:', isEditing);
    if (isEditing) {
      await handleSave();
    }
    const newEditingState = !isEditing;
    console.log('[MobileDocumentPage] 將 isEditing 設置為:', newEditingState);
    setIsEditing(newEditingState);
  };

  useEffect(() => {
    console.log('[MobileDocumentPage] isEditing 變化:', isEditing);
  }, [isEditing]);

  const handleEditorReady = (editor) => {
    editorRef.current = editor;
  };

  const handleContentChange = (newContent) => {
    setEditedContent(newContent);
    setHasUnsavedChanges(true);
  };

  // 检查内容是否有实际内容需要保存
  const hasMeaningfulContent = () => {
    const title = editedTitle?.trim() || '';
    const content = editedContent?.trim() || '';
    // 检查HTML内容是否有实际文本
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = content;
    const plainText = tempDiv.textContent || tempDiv.innerText || '';
    const hasText = plainText.trim().length > 0;
    // 标题不是默认标题
    const isDefaultTitle = title === '新文档' || title === '';
    return hasText && !isDefaultTitle;
  };

  // 自动保存功能
  const autoSave = useCallback(async () => {
    if (!hasUnsavedChanges || !isEditing) return;
    
    // 检查是否有实际内容需要保存，避免保存空文档
    if (!hasMeaningfulContent()) {
      console.log('[MobileDocumentPage] 自动保存跳过：没有实际内容');
      return;
    }
    
    try {
      setIsAutoSaving(true);
      await documentsAPI.update(id, {
        title: editedTitle,
        content: editedContent,
        mode: 'edit',
      });
      setLastSaved(new Date());
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('Auto save error:', error);
    } finally {
      setIsAutoSaving(false);
    }
  }, [hasUnsavedChanges, isEditing, editedTitle, editedContent, id]);

  // 设置自动保存定时器
  useEffect(() => {
    if (isEditing) {
      autoSaveTimerRef.current = setInterval(() => {
        autoSave();
      }, 30000); // 30秒自动保存一次
    }
    
    return () => {
      if (autoSaveTimerRef.current) {
        clearInterval(autoSaveTimerRef.current);
      }
    };
  }, [isEditing, autoSave]);

  // 页面离开前保存
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const handleSentenceChange = useCallback((index) => {
    console.log('[MobileDocumentPage] handleSentenceChange 调用: index=', index);
    setCurrentSentenceIndex(index);
    if (index === -1) {
      console.log('[MobileDocumentPage] handleSentenceChange 设置 isReading = false');
      setIsReading(false);
    }
  }, []);

  const handlePlayStateChange = useCallback(({ isPlaying, isPaused, currentSentenceIndex: idx }) => {
    console.log('[MobileDocumentPage] handlePlayStateChange: isPlaying=', isPlaying, 'isPaused=', isPaused);
    setIsReading(isPlaying || isPaused);
    if (idx >= 0) {
      setCurrentSentenceIndex(idx);
    }
  }, []);

  useEffect(() => {
    console.log('[MobileDocumentPage] isReading 变化: ', isReading);
  }, [isReading]);

  const handleSentenceClick = useCallback((index) => {
    console.log('[MobileDocumentPage] handleSentenceClick 被调用: index=', index, '当前 isReading=', isReading, '当前 currentSentenceIndex=', currentSentenceIndex);
    if (index === -1) {
      console.log('[MobileDocumentPage] 停止朗读');
      setIsReading(false);
      setCurrentSentenceIndex(-1);
      return;
    }
    console.log('[MobileDocumentPage] 跳转到句子: index=', index, '设置 startFromSentence=', index, 'jumpToSentence=', index);
    setStartFromSentence(index);
    setCurrentSentenceIndex(index);
    setJumpToSentence(index);
  }, []);

  const currentContent = contentTab === 'translation' && translatedContent
    ? translatedContent
    : editedContent;

  const isPdfSource = document?.sourceType === 'pdf';
  const hasPdfPages = document?.pdfPages && Array.isArray(document.pdfPages) && document.pdfPages.length > 0;
  const isOwner = document?.author?.id === user?.id;

  const topEditor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4, 5, 6] },
        blockquote: false,
        codeBlock: false,
        horizontalRule: false,
        bulletList: false,
        orderedList: false,
        listItem: false,
        history: false,
        link: false,
        underline: false,
      }),
      Placeholder.configure({ placeholder: '在此输入内容...' }),
      Link.configure({ openOnClick: false }),
      Underline,
      Image,
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
      TaskList,
      TaskItem.configure({ nested: true }),
      Highlight,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
    ],
    content: editedContent,
    editable: isEditing,
    onUpdate: ({ editor }) => {
      setEditedContent(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose max-w-none focus:outline-none min-h-[200px] p-4',
      },
    },
  });

  useEffect(() => {
    if (topEditor && editedContent) {
      const currentContent = topEditor.getHTML();
      if (currentContent !== editedContent) {
        topEditor.commands.setContent(editedContent, false);
      }
    }
  }, [editedContent, topEditor]);

  function TopToolbar({ editor }) {
    if (!editor) return null;

    return (
      <div className="bg-white border-b border-gray-200 px-2 py-2 overflow-x-auto">
        <div className="flex items-center gap-1 min-w-max">
          <button
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 disabled:opacity-30"
            title="撤销"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
          </button>
          <button
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 disabled:opacity-30"
            title="重做"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" />
            </svg>
          </button>
          <div className="w-px h-6 bg-gray-200 mx-1"></div>
          <button
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`p-2 rounded-lg font-bold ${editor.isActive('bold') ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
            title="粗体"
          >
            B
          </button>
          <button
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`p-2 rounded-lg italic ${editor.isActive('italic') ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
            title="斜体"
          >
            I
          </button>
          <button
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            className={`p-2 rounded-lg underline ${editor.isActive('underline') ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
            title="下划线"
          >
            U
          </button>
          <button
            onClick={() => editor.chain().focus().toggleStrike().run()}
            className={`p-2 rounded-lg line-through ${editor.isActive('strike') ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
            title="删除线"
          >
            S
          </button>
          <div className="w-px h-6 bg-gray-200 mx-1"></div>
          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={`p-2 rounded-lg text-sm font-semibold ${editor.isActive('heading', { level: 2 }) ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
            title="标题"
          >
            H2
          </button>
          <button
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={`p-2 rounded-lg ${editor.isActive('bulletList') ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
            title="列表"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  function FloatingCapsule({ isReading, onToggleReading, onExpand }) {
    const [isExpanded, setIsExpanded] = useState(false);

    const toggleExpand = () => {
      setIsExpanded(!isExpanded);
      onExpand?.(!isExpanded);
    };

    return (
      <div className={`fixed right-4 transition-all duration-300 z-50 ${
        isReading ? 'bottom-36' : 'bottom-24'
      }`}>
        <div className={`bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden transition-all duration-300 ${
          isExpanded ? 'w-40' : 'w-12'
        }`}>
          <button
            onClick={toggleExpand}
            className="w-12 h-12 flex items-center justify-center text-blue-500 hover:bg-gray-50"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
          </button>
          {isExpanded && (
            <div className="border-t border-gray-100">
              <button
                onClick={() => {
                  onToggleReading();
                  setIsExpanded(false);
                }}
                className={`w-full px-3 py-3 text-sm flex items-center gap-2 ${
                  isReading ? 'text-red-500 hover:bg-red-50' : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                </svg>
                {isReading ? '停止朗读' : '边听边看'}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        <p className="text-gray-500 mt-4">加载中...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
        <div className="text-red-500 mb-4">{error}</div>
        <div className="flex gap-2">
          <button
            onClick={() => loadDocument()}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg"
          >
            重试
          </button>
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg"
          >
            返回
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
        <div className="flex-1 flex flex-col">
          <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
            <button
              onClick={() => navigate(-1)}
              className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="flex-1 text-center">
              {isEditing ? (
                <input
                  type="text"
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  placeholder="输入文档标题..."
                  className="w-full text-lg font-semibold text-gray-900 text-center border-b border-gray-300 focus:border-blue-500 focus:outline-none px-2 py-1"
                />
              ) : (
                <h1 className="text-lg font-semibold text-gray-900 truncate">
                  {document?.title}
                </h1>
              )}
              {isEditing && (
                <div className="flex items-center justify-center gap-1 text-xs mt-0.5">
                  {isAutoSaving ? (
                    <span className="text-blue-500 flex items-center gap-1">
                      <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      保存中...
                    </span>
                  ) : hasUnsavedChanges ? (
                    <span className="text-yellow-600">未保存</span>
                  ) : lastSaved ? (
                    <span className="text-green-600">
                      已保存 {lastSaved.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  ) : null}
                </div>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={handleToggleBookshelf}
                className={`p-2 rounded-lg ${isInBookshelf ? 'text-yellow-500' : 'text-gray-600 hover:bg-gray-100'}`}
                title={isInBookshelf ? '已收藏' : '收藏'}
              >
                <svg className="w-5 h-5" fill={isInBookshelf ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
              </button>
              {isEditing ? (
                <>
                  <button
                    onClick={handleSave}
                    className="p-2 rounded-lg text-green-600 hover:bg-green-50"
                    title="保存"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="p-2 rounded-lg text-gray-600 hover:bg-gray-100"
                    title="取消编辑"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </>
              ) : isOwner ? (
                <button
                  onClick={() => setIsEditing(true)}
                  className="p-2 rounded-lg text-blue-600 hover:bg-blue-50"
                  title="编辑"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
              ) : null}
            </div>
          </div>
          {isOwner && isEditing && <TopToolbar editor={topEditor} />}
          <div
            className={`flex-1 overflow-auto transition-all duration-300 ${
              isReading ? 'pb-32' : 'pb-20'
            }`}
          >
            <div className="bg-white min-h-full">
              <div className="px-4 py-4">
                <div className="flex items-center gap-2 mt-2 mb-4 text-sm text-gray-500">
                  <span>{document?.author?.username}</span>
                  <span>·</span>
                  <span>{new Date(document?.updatedAt).toLocaleDateString('zh-CN')}</span>
                  {isReading && (
                    <>
                      <span>·</span>
                      <span className="text-red-500 flex items-center gap-1">
                        <span className="animate-pulse">●</span>
                        朗读中
                      </span>
                    </>
                  )}
                </div>

                {/* 翻译切换 - 仅在非编辑模式下显示 */}
                {!isEditing && document?.hasTranslation && (
                  <div className="flex gap-2 mb-4">
                    <button
                      onClick={() => setContentTab('original')}
                      className={`px-3 py-1 rounded-full text-sm font-medium ${
                        contentTab === 'original'
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-200 text-gray-700'
                      }`}
                    >
                      原文
                    </button>
                    <button
                      onClick={() => setContentTab('translation')}
                      className={`px-3 py-1 rounded-full text-sm font-medium ${
                        contentTab === 'translation'
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-200 text-gray-700'
                      }`}
                    >
                      翻译
                    </button>
                  </div>
                )}

                {/* 视图切换标签 - 仅在非编辑模式下且PDF文档显示 */}
                {!isEditing && (
                  <div className="flex border-b border-gray-200 mb-4">
                    <button
                      onClick={() => setViewMode('text')}
                      className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors relative ${
                        viewMode === 'text'
                          ? 'text-blue-600'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      <div className="flex items-center justify-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15.536a5 5 0 001.414 1.414m2.828-9.9a9 9 0 012.828-2.828" />
                        </svg>
                        朗读视图
                      </div>
                      {viewMode === 'text' && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"></div>
                      )}
                    </button>
                    {hasPdfPages && (
                      <button
                        onClick={() => setViewMode('pdf')}
                        className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors relative ${
                          viewMode === 'pdf'
                            ? 'text-blue-600'
                            : 'text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        <div className="flex items-center justify-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 2 002 2z" />
                          </svg>
                          PDF视图
                          <span className="px-1.5 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
                            {document.pdfPages.length} 页
                          </span>
                        </div>
                        {viewMode === 'pdf' && (
                          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"></div>
                        )}
                      </button>
                    )}
                  </div>
                )}

                {/* 内容区域 */}
                {viewMode === 'text' ? (
                  <MobileDocumentEditor
                    content={currentContent}
                    onChange={handleContentChange}
                    editable={isOwner && isEditing}
                    isReading={isReading}
                    currentSentenceIndex={currentSentenceIndex}
                    onSentenceClick={handleSentenceClick}
                    readPosition={currentSentenceIndex}
                    onEditorReady={handleEditorReady}
                  />
                ) : (
                  <div className="bg-white rounded-lg overflow-hidden" style={{ height: 'calc(100vh - 300px)', minHeight: '400px' }}>
                    <PDFViewer pdfPages={document.pdfPages} />
                  </div>
                )}

                {/* 视图说明 - 仅在非编辑模式下显示 */}
                {!isEditing && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-start gap-2">
                      <svg className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div className="text-xs text-gray-600">
                        <p className="font-medium text-gray-700 mb-0.5">
                          {viewMode === 'text' ? '朗读视图' : 'PDF视图'}
                        </p>
                        <p>
                          {viewMode === 'text'
                            ? '此视图优化了阅读体验，支持边听边读功能。'
                            : '显示PDF原始页面，支持缩放查看。'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {isReading && (
            <MobileReadAloud
              content={currentContent}
              onSentenceChange={handleSentenceChange}
              startFromSentence={startFromSentence}
              onPlayStateChange={handlePlayStateChange}
              documentId={id}
              onClose={() => setIsReading(false)}
              jumpToTarget={jumpToSentence}
              setJumpToTarget={setJumpToSentence}
            />
          )}

          <div className={`fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 transition-transform duration-300 z-40 ${
            showTabBar && !isReading ? 'translate-y-0' : 'translate-y-full'
          }`}>
            <div className="flex items-center justify-around py-2 px-4">
              <button
                onPointerDown={(e) => {
                  e.preventDefault();
                  console.log('[MobileDocumentPage] 朗读按钮点击: isReading=', isReading);
                  const newValue = !isReading;
                  console.log('[MobileDocumentPage] 设置 isReading =', newValue);
                  setIsReading(newValue);
                }}
                className={`flex flex-col items-center p-2 touch-manipulation ${
                  isReading ? 'text-red-500' : 'text-gray-600'
                }`}
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                </svg>
                <span className="text-xs mt-1">{isReading ? '停止' : '朗读'}</span>
              </button>

              <button
                onPointerDown={(e) => {
                  e.preventDefault();
                  setShowSidebar(true);
                }}
                className="flex flex-col items-center p-2 text-gray-600 touch-manipulation"
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
                <span className="text-xs mt-1">更多</span>
              </button>
            </div>
          </div>

          {/* 侧边栏 */}
          <MobileSidebar
            isOpen={showSidebar}
            onClose={() => setShowSidebar(false)}
            documentId={id}
            content={currentContent}
            chapters={document?.chapters || []}
            onSentenceChange={handleSentenceChange}
            onPlayStateChange={handlePlayStateChange}
            startFromSentence={startFromSentence}
            jumpToSentence={jumpToSentence}
            setJumpToSentence={setJumpToSentence}
          />
        </div>

      <div className="h-16"></div>
    </div>
  );
}
