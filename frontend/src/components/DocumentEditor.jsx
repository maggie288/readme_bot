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
import { useEffect, useState, useMemo, useRef } from 'react';
import { splitIntoSentences } from './ReadAloud';

// 可朗读内容组件 - 渲染完整HTML内容，支持句子高亮和点击
function ReadableContent({ content, currentSentenceIndex, onSentenceClick, isReading, readPosition = 0 }) {
  const sentences = useMemo(() => splitIntoSentences(content), [content]);
  const containerRef = useRef(null);

  // 自动滚动到当前高亮句子
  useEffect(() => {
    if (currentSentenceIndex >= 0 && containerRef.current) {
      const highlightedEl = containerRef.current.querySelector('.sentence-highlight');
      if (highlightedEl) {
        highlightedEl.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
      }
    }
  }, [currentSentenceIndex]);

  // 处理点击事件 - 判断点击的是哪个句子
  const handleClick = (e) => {
    if (!onSentenceClick) return;

    const text = e.target.textContent || '';
    // 查找点击位置对应的句子索引
    for (let i = 0; i < sentences.length; i++) {
      if (text.includes(sentences[i]) || sentences[i].includes(text.trim())) {
        onSentenceClick(i);
        return;
      }
    }
    // 如果没找到精确匹配，尝试从点击位置推断
    const selection = window.getSelection();
    if (selection && selection.toString()) {
      const selectedText = selection.toString().trim();
      for (let i = 0; i < sentences.length; i++) {
        if (sentences[i].includes(selectedText)) {
          onSentenceClick(i);
          return;
        }
      }
    }
  };

  if (!content || content.trim() === '' || content === '<p></p>') {
    return (
      <div className="text-gray-400 italic">文档内容为空</div>
    );
  }

  // 当前高亮的句子
  const currentSentence = sentences[currentSentenceIndex];
  const readPositionSentence = sentences[readPosition];

  // 处理 HTML 内容，高亮当前句子
  const processedContent = useMemo(() => {
    let html = content;

    // 高亮当前朗读的句子
    if (isReading && currentSentence) {
      const escapedSentence = currentSentence.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(${escapedSentence})`, 'g');
      html = html.replace(regex, '<mark class="sentence-highlight bg-yellow-300 text-gray-900 rounded px-0.5">$1</mark>');
    } else if (!isReading && readPositionSentence && readPosition > 0) {
      // 高亮上次阅读位置
      const escapedSentence = readPositionSentence.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(${escapedSentence})`, 'g');
      html = html.replace(regex, '<mark class="sentence-highlight bg-blue-100 text-gray-900 rounded px-0.5">$1</mark>');
    }

    return html;
  }, [content, currentSentence, readPositionSentence, isReading, readPosition]);

  return (
    <div
      ref={containerRef}
      className="readable-content prose prose-sm sm:prose lg:prose-lg max-w-none cursor-pointer"
      onClick={handleClick}
      dangerouslySetInnerHTML={{ __html: processedContent }}
      title="点击任意位置可从该句子开始朗读"
    />
  );
}

export default function DocumentEditor({
  content,
  onChange,
  editable = true,
  // 朗读相关 props
  isReading = false,
  currentSentenceIndex = -1,
  onSentenceClick,
  // 阅读进度相关
  readPosition = 0
}) {
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3, 4, 5, 6],
        },
      }),
      Placeholder.configure({
        placeholder: '开始编写您的文档...',
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-500 underline cursor-pointer',
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded-lg',
        },
      }),
      Table.configure({
        resizable: true,
        HTMLAttributes: {
          class: 'border-collapse table-auto w-full',
        },
      }),
      TableRow,
      TableCell,
      TableHeader,
      TaskList.configure({
        HTMLAttributes: {
          class: 'task-list',
        },
      }),
      TaskItem.configure({
        nested: true,
        HTMLAttributes: {
          class: 'task-item',
        },
      }),
      Highlight.configure({
        multicolor: true,
      }),
      Underline,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
    ],
    content: content || '',
    editable,
    onUpdate: ({ editor }) => {
      if (onChange) {
        onChange(editor.getHTML());
      }
    },
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content || '');
    }
  }, [content, editor]);

  useEffect(() => {
    if (editor) {
      editor.setEditable(editable);
    }
  }, [editable, editor]);

  const addLink = () => {
    if (linkUrl) {
      editor.chain().focus().setLink({ href: linkUrl }).run();
      setLinkUrl('');
      setShowLinkInput(false);
    }
  };

  const addImage = () => {
    const url = prompt('请输入图片URL:');
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  };

  const insertTable = () => {
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  };

  if (!editor) {
    return <div className="p-8 text-gray-400">加载编辑器...</div>;
  }

  // 如果不是编辑模式，显示可朗读视图（支持点击句子跳转）
  const showReadableView = !editable;

  return (
    <div className="prose prose-sm sm:prose lg:prose-lg max-w-none">
      {editable && (
        <div className="sticky top-0 bg-white border border-gray-200 rounded-lg p-2 mb-4 shadow-sm z-10">
          {/* 第一行：文本格式 */}
          <div className="flex flex-wrap gap-1 mb-2 pb-2 border-b border-gray-200">
            <button
              onClick={() => editor.chain().focus().toggleBold().run()}
              className={`px-2 py-1 rounded text-xs font-bold ${
                editor.isActive('bold')
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              title="粗体 (Ctrl+B)"
            >
              B
            </button>
            <button
              onClick={() => editor.chain().focus().toggleItalic().run()}
              className={`px-2 py-1 rounded text-xs italic ${
                editor.isActive('italic')
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              title="斜体 (Ctrl+I)"
            >
              I
            </button>
            <button
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              className={`px-2 py-1 rounded text-xs underline ${
                editor.isActive('underline')
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              title="下划线 (Ctrl+U)"
            >
              U
            </button>
            <button
              onClick={() => editor.chain().focus().toggleStrike().run()}
              className={`px-2 py-1 rounded text-xs line-through ${
                editor.isActive('strike')
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              title="删除线"
            >
              S
            </button>
            <button
              onClick={() => editor.chain().focus().toggleHighlight().run()}
              className={`px-2 py-1 rounded text-xs ${
                editor.isActive('highlight')
                  ? 'bg-yellow-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              title="高亮"
            >
              高亮
            </button>
            <button
              onClick={() => editor.chain().focus().toggleCode().run()}
              className={`px-2 py-1 rounded text-xs font-mono ${
                editor.isActive('code')
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              title="行内代码"
            >
              {'</>'}
            </button>
          </div>

          {/* 第二行：标题 */}
          <div className="flex flex-wrap gap-1 mb-2 pb-2 border-b border-gray-200">
            {[1, 2, 3, 4, 5, 6].map((level) => (
              <button
                key={level}
                onClick={() =>
                  editor.chain().focus().toggleHeading({ level }).run()
                }
                className={`px-2 py-1 rounded text-xs ${
                  editor.isActive('heading', { level })
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                title={`标题 ${level}`}
              >
                H{level}
              </button>
            ))}
            <button
              onClick={() => editor.chain().focus().setParagraph().run()}
              className={`px-2 py-1 rounded text-xs ${
                editor.isActive('paragraph')
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              title="段落"
            >
              P
            </button>
          </div>

          {/* 第三行：列表和对齐 */}
          <div className="flex flex-wrap gap-1 mb-2 pb-2 border-b border-gray-200">
            <button
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              className={`px-2 py-1 rounded text-xs ${
                editor.isActive('bulletList')
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              title="无序列表"
            >
              • 列表
            </button>
            <button
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              className={`px-2 py-1 rounded text-xs ${
                editor.isActive('orderedList')
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              title="有序列表"
            >
              1. 列表
            </button>
            <button
              onClick={() => editor.chain().focus().toggleTaskList().run()}
              className={`px-2 py-1 rounded text-xs ${
                editor.isActive('taskList')
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              title="任务列表"
            >
              ☑ 任务
            </button>
            <div className="w-px bg-gray-300 mx-1"></div>
            <button
              onClick={() => editor.chain().focus().setTextAlign('left').run()}
              className={`px-2 py-1 rounded text-xs ${
                editor.isActive({ textAlign: 'left' })
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              title="左对齐"
            >
              ⬅
            </button>
            <button
              onClick={() => editor.chain().focus().setTextAlign('center').run()}
              className={`px-2 py-1 rounded text-xs ${
                editor.isActive({ textAlign: 'center' })
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              title="居中"
            >
              ↔
            </button>
            <button
              onClick={() => editor.chain().focus().setTextAlign('right').run()}
              className={`px-2 py-1 rounded text-xs ${
                editor.isActive({ textAlign: 'right' })
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              title="右对齐"
            >
              ➡
            </button>
          </div>

          {/* 第四行：引用、代码块、链接等 */}
          <div className="flex flex-wrap gap-1 mb-2 pb-2 border-b border-gray-200">
            <button
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              className={`px-2 py-1 rounded text-xs ${
                editor.isActive('blockquote')
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              title="引用"
            >
              " 引用
            </button>
            <button
              onClick={() => editor.chain().focus().toggleCodeBlock().run()}
              className={`px-2 py-1 rounded text-xs ${
                editor.isActive('codeBlock')
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              title="代码块"
            >
              {'{ } 代码'}
            </button>
            <button
              onClick={() => editor.chain().focus().setHorizontalRule().run()}
              className="px-2 py-1 rounded text-xs bg-gray-100 text-gray-700 hover:bg-gray-200"
              title="分隔线"
            >
              ─ 分隔线
            </button>
            <div className="w-px bg-gray-300 mx-1"></div>
            <button
              onClick={() => setShowLinkInput(!showLinkInput)}
              className={`px-2 py-1 rounded text-xs ${
                editor.isActive('link')
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              title="插入链接"
            >
              链接
            </button>
            {editor.isActive('link') && (
              <button
                onClick={() => editor.chain().focus().unsetLink().run()}
                className="px-2 py-1 rounded text-xs bg-red-100 text-red-700 hover:bg-red-200"
                title="移除链接"
              >
                移除链接
              </button>
            )}
            <button
              onClick={addImage}
              className="px-2 py-1 rounded text-xs bg-gray-100 text-gray-700 hover:bg-gray-200"
              title="插入图片"
            >
              图片
            </button>
            <button
              onClick={insertTable}
              className="px-2 py-1 rounded text-xs bg-gray-100 text-gray-700 hover:bg-gray-200"
              title="插入表格"
            >
              表格
            </button>
          </div>

          {/* 链接输入框 */}
          {showLinkInput && (
            <div className="flex gap-2 items-center">
              <input
                type="url"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="输入链接URL (https://...)"
                className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    addLink();
                  }
                }}
              />
              <button
                onClick={addLink}
                className="px-3 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
              >
                确定
              </button>
              <button
                onClick={() => {
                  setShowLinkInput(false);
                  setLinkUrl('');
                }}
                className="px-3 py-1 bg-gray-300 text-gray-700 rounded text-xs hover:bg-gray-400"
              >
                取消
              </button>
            </div>
          )}

          {/* 第五行：撤销重做 */}
          <div className="flex gap-1">
            <button
              onClick={() => editor.chain().focus().undo().run()}
              disabled={!editor.can().undo()}
              className="px-2 py-1 rounded text-xs bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
              title="撤销 (Ctrl+Z)"
            >
              撤销
            </button>
            <button
              onClick={() => editor.chain().focus().redo().run()}
              disabled={!editor.can().redo()}
              className="px-2 py-1 rounded text-xs bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
              title="重做 (Ctrl+Y)"
            >
              重做
            </button>
          </div>
        </div>
      )}

      {/* 阅读模式提示 */}
      {showReadableView && (
        <div className="mb-4 p-2 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700 flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>点击任意句子可从该位置开始朗读</span>
        </div>
      )}

      {/* 内容区域 */}
      <div className="relative">
        {showReadableView ? (
          <ReadableContent
            content={content}
            currentSentenceIndex={currentSentenceIndex}
            onSentenceClick={onSentenceClick}
            isReading={isReading}
            readPosition={readPosition}
          />
        ) : (
          <EditorContent editor={editor} className="min-h-[400px]" />
        )}
      </div>
    </div>
  );
}
