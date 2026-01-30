import { useEditor, EditorContent } from '@tiptap/react';
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
import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { splitIntoSentences } from './ReadAloud';

export { splitIntoSentences } from './ReadAloud';

function MobileEditorToolbar({ editor }) {
  const [showFormatPanel, setShowFormatPanel] = useState(false);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');

  const addLink = useCallback(() => {
    if (linkUrl && editor) {
      editor.chain().focus().setLink({ href: linkUrl }).run();
      setLinkUrl('');
      setShowLinkInput(false);
    }
  }, [linkUrl, editor]);

  const addImage = useCallback(() => {
    const url = prompt('请输入图片URL:');
    if (url && editor) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  }, [editor]);

  const insertTable = useCallback(() => {
    if (editor) {
      editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
    }
  }, [editor]);

  if (!editor) return null;

  return (
    <>
      <div className="bg-white border-b border-gray-200 px-3 py-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1 overflow-x-auto">
            <button
              onClick={() => editor.chain().focus().undo().run()}
              disabled={!editor.can().undo()}
              className="p-3 rounded-lg text-gray-600 hover:bg-gray-100 disabled:opacity-30 flex-shrink-0"
              title="撤销"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
            </button>
            <button
              onClick={() => editor.chain().focus().redo().run()}
              disabled={!editor.can().redo()}
              className="p-3 rounded-lg text-gray-600 hover:bg-gray-100 disabled:opacity-30 flex-shrink-0"
              title="重做"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" />
              </svg>
            </button>
            <div className="w-px h-6 bg-gray-200 mx-1 flex-shrink-0"></div>
            <button
              onClick={() => editor.chain().focus().toggleBold().run()}
              className={`p-3 rounded-lg font-bold flex-shrink-0 ${
                editor.isActive('bold') ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
              title="粗体"
            >
              B
            </button>
            <button
              onClick={() => editor.chain().focus().toggleItalic().run()}
              className={`p-3 rounded-lg italic flex-shrink-0 ${
                editor.isActive('italic') ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
              title="斜体"
            >
              I
            </button>
            <button
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              className={`p-3 rounded-lg underline flex-shrink-0 ${
                editor.isActive('underline') ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
              title="下划线"
            >
              U
            </button>
            <button
              onClick={() => editor.chain().focus().toggleStrike().run()}
              className={`p-3 rounded-lg line-through flex-shrink-0 ${
                editor.isActive('strike') ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
              title="删除线"
            >
              S
            </button>
            <button
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              className={`p-3 rounded-lg text-sm font-semibold flex-shrink-0 ${
                editor.isActive('heading', { level: 2 }) ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
              title="标题"
            >
              H2
            </button>
            <button
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              className={`p-3 rounded-lg flex-shrink-0 ${
                editor.isActive('bulletList') ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
              title="列表"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="w-px h-6 bg-gray-200 mx-1 flex-shrink-0"></div>
            <button
              onClick={() => {
                if (editor.state.selection.empty) {
                  alert('请先选择要删除的内容');
                  return;
                }
                if (confirm('确定要删除选中的内容吗？')) {
                  editor.chain().focus().deleteSelection().run();
                }
              }}
              className="p-3 rounded-lg text-red-600 hover:bg-red-50 flex-shrink-0"
              title="删除选中内容"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
          <button
            onClick={() => setShowFormatPanel(!showFormatPanel)}
            className={`p-3 rounded-lg flex-shrink-0 ${
              showFormatPanel ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </button>
        </div>
      </div>

      {showFormatPanel && (
        <div className="bg-white border-b border-gray-200 px-3 py-3 animate-slide-down">
          <div className="grid grid-cols-4 gap-2 mb-3">
            <button
              onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
              className={`p-3 rounded-lg text-sm font-bold ${
                editor.isActive('heading', { level: 1 }) ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700'
              }`}
            >
              H1
            </button>
            <button
              onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
              className={`p-3 rounded-lg text-sm font-semibold ${
                editor.isActive('heading', { level: 3 }) ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700'
              }`}
            >
              H3
            </button>
            <button
              onClick={() => editor.chain().focus().toggleHeading({ level: 4 }).run()}
              className={`p-3 rounded-lg text-sm ${
                editor.isActive('heading', { level: 4 }) ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700'
              }`}
            >
              H4
            </button>
            <button
              onClick={() => editor.chain().focus().setParagraph().run()}
              className={`p-3 rounded-lg text-sm ${
                editor.isActive('paragraph') ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700'
              }`}
            >
              P
            </button>
          </div>

          <div className="grid grid-cols-4 gap-2 mb-3">
            <button
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              className={`p-3 rounded-lg flex flex-col items-center gap-1 ${
                editor.isActive('orderedList') ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
              </svg>
              <span className="text-xs">123</span>
            </button>
            <button
              onClick={() => editor.chain().focus().toggleTaskList().run()}
              className={`p-3 rounded-lg flex flex-col items-center gap-1 ${
                editor.isActive('taskList') ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              <span className="text-xs">待办</span>
            </button>
            <button
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              className={`p-3 rounded-lg flex flex-col items-center gap-1 ${
                editor.isActive('blockquote') ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
              <span className="text-xs">引用</span>
            </button>
            <button
              onClick={() => editor.chain().focus().setHorizontalRule().run()}
              className="p-3 rounded-lg flex flex-col items-center gap-1 bg-gray-100 text-gray-700"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 12h16" />
              </svg>
              <span className="text-xs">分隔</span>
            </button>
          </div>

          <div className="grid grid-cols-4 gap-2 mb-3">
            <button
              onClick={() => editor.chain().focus().toggleCode().run()}
              className={`p-3 rounded-lg flex flex-col items-center gap-1 ${
                editor.isActive('code') ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
              <span className="text-xs font-mono">&lt;/&gt;</span>
            </button>
            <button
              onClick={() => editor.chain().focus().toggleCodeBlock().run()}
              className={`p-3 rounded-lg flex flex-col items-center gap-1 ${
                editor.isActive('codeBlock') ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
              </svg>
              <span className="text-xs">块</span>
            </button>
            <button
              onClick={() => editor.chain().focus().setTextAlign('left').run()}
              className={`p-3 rounded-lg flex flex-col items-center gap-1 ${
                editor.isActive({ textAlign: 'left' }) ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h10M4 18h16" />
              </svg>
              <span className="text-xs">左</span>
            </button>
            <button
              onClick={() => editor.chain().focus().setTextAlign('center').run()}
              className={`p-3 rounded-lg flex flex-col items-center gap-1 ${
                editor.isActive({ textAlign: 'center' }) ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M7 12h10M5 18h14" />
              </svg>
              <span className="text-xs">中</span>
            </button>
          </div>

          <div className="grid grid-cols-4 gap-2 mb-3">
            <button
              onClick={() => editor.chain().focus().setTextAlign('right').run()}
              className={`p-3 rounded-lg flex flex-col items-center gap-1 ${
                editor.isActive({ textAlign: 'right' }) ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M10 12h10M6 18h14" />
              </svg>
              <span className="text-xs">右</span>
            </button>
            <button
              onClick={() => editor.chain().focus().toggleHighlight().run()}
              className={`p-3 rounded-lg flex flex-col items-center gap-1 ${
                editor.isActive('highlight') ? 'bg-yellow-400 text-gray-900' : 'bg-gray-100 text-gray-700'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
              </svg>
              <span className="text-xs">高亮</span>
            </button>
            <button
              onClick={() => setShowLinkInput(!showLinkInput)}
              className={`p-3 rounded-lg flex flex-col items-center gap-1 ${
                editor.isActive('link') ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              <span className="text-xs">链接</span>
            </button>
            {editor.isActive('link') && (
              <button
                onClick={() => editor.chain().focus().unsetLink().run()}
                className="p-3 rounded-lg flex flex-col items-center gap-1 bg-red-50 text-red-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                <span className="text-xs">移除</span>
              </button>
            )}
          </div>

          <div className="flex gap-2">
            <button
              onClick={addImage}
              className="flex-1 p-3 rounded-lg flex items-center justify-center gap-2 bg-gray-100 text-gray-700"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>图片</span>
            </button>
            <button
              onClick={insertTable}
              className="flex-1 p-3 rounded-lg flex items-center justify-center gap-2 bg-gray-100 text-gray-700"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <span>表格</span>
            </button>
          </div>

          {showLinkInput && (
            <div className="flex gap-2 mt-3">
              <input
                type="url"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="输入链接URL (https://...)"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    addLink();
                  }
                }}
              />
              <button
                onClick={addLink}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm"
              >
                确定
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}

function splitHtmlBySentences(html) {
  if (!html || !html.trim()) return '';

  // 使用与 MobileReadAloud 相同的分割逻辑
  const sentences = splitIntoSentences(html);

  if (!sentences || sentences.length === 0) {
    return '';
  }

  const fragment = document.createDocumentFragment();
  sentences.forEach((sentence, index) => {
    const span = document.createElement('span');
    span.className = 'sentence-segment cursor-pointer hover:bg-blue-100 transition-colors px-1 rounded';
    span.textContent = sentence;
    span.setAttribute('data-sentence-index', index);
    fragment.appendChild(span);
  });

  return fragment;
}

function MobileReadableContent({
  content,
  currentSentenceIndex,
  onSentenceClick,
  isReading,
  readPosition = 0
}) {
  const containerRef = useRef(null);

  const documentFragment = useMemo(() => {
    if (!content || content.trim() === '' || content === '<p></p>') {
      return null;
    }

    return splitHtmlBySentences(content);
  }, [content]);

  useEffect(() => {
    if (!containerRef.current || !documentFragment) return;

    containerRef.current.innerHTML = '';
    containerRef.current.appendChild(documentFragment.cloneNode(true));

    const sentenceSegments = containerRef.current.querySelectorAll('.sentence-segment');
  }, [documentFragment]);

  useEffect(() => {
    if (!containerRef.current) return;

    const allSegments = containerRef.current.querySelectorAll('.sentence-segment');
    allSegments.forEach(seg => {
      seg.classList.remove('bg-blue-500', 'text-white');
    });

    if (isReading && currentSentenceIndex >= 0) {
      const currentSeg = containerRef.current.querySelector(
        `[data-sentence-index="${currentSentenceIndex}"]`
      );
      if (currentSeg) {
        currentSeg.classList.add('bg-blue-500', 'text-white');
      }
    }
  }, [currentSentenceIndex, isReading]);

  useEffect(() => {
    if (!containerRef.current || !isReading || readPosition === 0) return;

    const targetSeg = containerRef.current.querySelector(
      `[data-sentence-index="${readPosition}"]`
    );
    if (targetSeg) {
      targetSeg.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [readPosition, isReading]);

  const handleClick = useCallback((e) => {
    const target = e.target.closest('.sentence-segment');
    if (target && onSentenceClick) {
      const index = parseInt(target.getAttribute('data-sentence-index'), 10);
      if (!isNaN(index)) {
        onSentenceClick(index);
      }
    }
  }, [onSentenceClick, isReading]);

  if (!documentFragment) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        <p>暂无内容</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="prose max-w-none p-4 leading-loose text-lg"
      onClick={handleClick}
    />
  );
}

export default function MobileDocumentEditor({
  content,
  onChange,
  editable = false,
  isReading = false,
  currentSentenceIndex = -1,
  onSentenceClick,
  readPosition = 0,
  onEditorReady
}) {
  const editorRef = useRef(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3, 4, 5, 6],
        },
        blockquote: false,
        codeBlock: false,
        horizontalRule: false,
        bulletList: false,
        orderedList: false,
        listItem: false,
        history: false,
      }),
      Placeholder.configure({
        placeholder: '在此输入内容...',
      }),
      Link.configure({
        openOnClick: false,
      }),
      Underline,
      Image,
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableCell,
      TableHeader,
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      Highlight,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
    ],
    content,
    editable,
    onUpdate: ({ editor }) => {
      if (onChange) {
        onChange(editor.getHTML());
      }
    },
    editorProps: {
      attributes: {
        class: 'prose max-w-none focus:outline-none min-h-screen p-4',
      },
    },
  });

  useEffect(() => {
    if (editor && onEditorReady) {
      onEditorReady(editor);
    }
  }, [editor, onEditorReady]);

  useEffect(() => {
    if (editor) {
      console.log('[MobileDocumentEditor] isReading 变化:', isReading);
    }
  }, [isReading, editor]);

  useEffect(() => {
    if (editor && content) {
      const currentContent = editor.getHTML();
      if (currentContent !== content) {
        console.log('[MobileDocumentEditor] content 变化，更新编辑器');
        editor.commands.setContent(content, false);
      }
    }
  }, [content, editor]);

  useEffect(() => {
    if (editor) {
      console.log('[MobileDocumentEditor] 渲染判断:', {
        isReading,
        currentSentenceIndex,
        editable
      });
    }
  }, [isReading, currentSentenceIndex, editable, editor]);

  const showReadableView = isReading;

  return (
    <div className="flex flex-col h-full bg-white">
      {editable && editor ? (
        <MobileEditorToolbar editor={editor} />
      ) : (
        <div className="hidden">
          {editable && !editor && <span>等待編輯器初始化...</span>}
        </div>
      )}

      <div className="flex-1 overflow-auto">
        {showReadableView ? (
          <MobileReadableContent
            content={content}
            currentSentenceIndex={currentSentenceIndex}
            onSentenceClick={onSentenceClick}
            isReading={isReading}
            readPosition={readPosition}
          />
        ) : editor ? (
          <EditorContent editor={editor} className="min-h-[500px]" />
        ) : (
          <div className="p-4 text-center text-gray-400">
            編輯器載入中...
          </div>
        )}
      </div>
    </div>
  );
}
