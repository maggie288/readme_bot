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
import DOMPurify from 'dompurify';

// 编辑器工具栏组件 - 可独立使用
export function EditorToolbar({ editor }) {
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [showMoreTools, setShowMoreTools] = useState(false);

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
    <div className="bg-white border-b border-gray-200 px-3 py-2">
      {/* 主工具栏 - 常用功能 */}
      <div className="flex flex-wrap items-center gap-1">
        {/* 文本格式 */}
        <div className="flex items-center gap-0.5 mr-2">
          <button
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`p-1.5 rounded text-sm font-bold ${
              editor.isActive('bold')
                ? 'bg-gray-900 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
            title="粗体"
          >
            B
          </button>
          <button
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`p-1.5 rounded text-sm italic ${
              editor.isActive('italic')
                ? 'bg-gray-900 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
            title="斜体"
          >
            I
          </button>
          <button
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            className={`p-1.5 rounded text-sm underline ${
              editor.isActive('underline')
                ? 'bg-gray-900 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
            title="下划线"
          >
            U
          </button>
          <button
            onClick={() => editor.chain().focus().toggleStrike().run()}
            className={`p-1.5 rounded text-sm line-through ${
              editor.isActive('strike')
                ? 'bg-gray-900 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
            title="删除线"
          >
            S
          </button>
        </div>

        {/* 分隔线 */}
        <div className="w-px h-5 bg-gray-200 mx-1"></div>

        {/* 标题 */}
        <div className="flex items-center gap-0.5 mr-2">
          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            className={`p-1.5 rounded text-xs font-semibold ${
              editor.isActive('heading', { level: 1 })
                ? 'bg-gray-900 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
            title="标题1"
          >
            H1
          </button>
          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={`p-1.5 rounded text-xs font-semibold ${
              editor.isActive('heading', { level: 2 })
                ? 'bg-gray-900 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
            title="标题2"
          >
            H2
          </button>
          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            className={`p-1.5 rounded text-xs font-semibold ${
              editor.isActive('heading', { level: 3 })
                ? 'bg-gray-900 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
            title="标题3"
          >
            H3
          </button>
        </div>

        {/* 分隔线 */}
        <div className="w-px h-5 bg-gray-200 mx-1"></div>

        {/* 列表 */}
        <div className="flex items-center gap-0.5 mr-2">
          <button
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={`p-1.5 rounded text-sm ${
              editor.isActive('bulletList')
                ? 'bg-gray-900 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
            title="无序列表"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <button
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={`p-1.5 rounded text-sm ${
              editor.isActive('orderedList')
                ? 'bg-gray-900 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
            title="有序列表"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
            </svg>
          </button>
        </div>

        {/* 分隔线 */}
        <div className="w-px h-5 bg-gray-200 mx-1"></div>

        {/* 撤销/重做 */}
        <div className="flex items-center gap-0.5 mr-2">
          <button
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            className="p-1.5 rounded text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
            title="撤销"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
          </button>
          <button
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            className="p-1.5 rounded text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
            title="重做"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" />
            </svg>
          </button>
        </div>

        {/* 更多工具按钮 */}
        <button
          onClick={() => setShowMoreTools(!showMoreTools)}
          className={`p-1.5 rounded text-sm flex items-center gap-1 ${
            showMoreTools ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:bg-gray-100'
          }`}
          title="更多工具"
        >
          <svg className={`w-4 h-4 transition-transform ${showMoreTools ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
          <span className="text-xs">更多</span>
        </button>
      </div>

      {/* 展开的更多工具 */}
      {showMoreTools && (
        <div className="flex flex-wrap items-center gap-1 mt-2 pt-2 border-t border-gray-100">
          {/* 更多标题级别 */}
          <div className="flex items-center gap-0.5 mr-2">
            {[4, 5, 6].map((level) => (
              <button
                key={level}
                onClick={() => editor.chain().focus().toggleHeading({ level }).run()}
                className={`p-1.5 rounded text-xs ${
                  editor.isActive('heading', { level })
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-500 hover:bg-gray-100'
                }`}
                title={`标题${level}`}
              >
                H{level}
              </button>
            ))}
            <button
              onClick={() => editor.chain().focus().setParagraph().run()}
              className={`p-1.5 rounded text-xs ${
                editor.isActive('paragraph')
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
              title="段落"
            >
              P
            </button>
          </div>

          <div className="w-px h-5 bg-gray-200 mx-1"></div>

          {/* 高亮和代码 */}
          <div className="flex items-center gap-0.5 mr-2">
            <button
              onClick={() => editor.chain().focus().toggleHighlight().run()}
              className={`p-1.5 rounded text-xs ${
                editor.isActive('highlight')
                  ? 'bg-yellow-400 text-gray-900'
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
              title="高亮"
            >
              高亮
            </button>
            <button
              onClick={() => editor.chain().focus().toggleCode().run()}
              className={`p-1.5 rounded text-xs font-mono ${
                editor.isActive('code')
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
              title="行内代码"
            >
              {'</>'}
            </button>
            <button
              onClick={() => editor.chain().focus().toggleCodeBlock().run()}
              className={`p-1.5 rounded text-xs ${
                editor.isActive('codeBlock')
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
              title="代码块"
            >
              代码块
            </button>
          </div>

          <div className="w-px h-5 bg-gray-200 mx-1"></div>

          {/* 对齐 */}
          <div className="flex items-center gap-0.5 mr-2">
            <button
              onClick={() => editor.chain().focus().setTextAlign('left').run()}
              className={`p-1.5 rounded ${
                editor.isActive({ textAlign: 'left' })
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
              title="左对齐"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h10M4 18h16" />
              </svg>
            </button>
            <button
              onClick={() => editor.chain().focus().setTextAlign('center').run()}
              className={`p-1.5 rounded ${
                editor.isActive({ textAlign: 'center' })
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
              title="居中"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M7 12h10M4 18h16" />
              </svg>
            </button>
            <button
              onClick={() => editor.chain().focus().setTextAlign('right').run()}
              className={`p-1.5 rounded ${
                editor.isActive({ textAlign: 'right' })
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
              title="右对齐"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M10 12h10M4 18h16" />
              </svg>
            </button>
          </div>

          <div className="w-px h-5 bg-gray-200 mx-1"></div>

          {/* 任务列表和引用 */}
          <div className="flex items-center gap-0.5 mr-2">
            <button
              onClick={() => editor.chain().focus().toggleTaskList().run()}
              className={`p-1.5 rounded text-xs ${
                editor.isActive('taskList')
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
              title="任务列表"
            >
              ☑ 任务
            </button>
            <button
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              className={`p-1.5 rounded text-xs ${
                editor.isActive('blockquote')
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
              title="引用"
            >
              引用
            </button>
            <button
              onClick={() => editor.chain().focus().setHorizontalRule().run()}
              className="p-1.5 rounded text-xs text-gray-500 hover:bg-gray-100"
              title="分隔线"
            >
              分隔线
            </button>
          </div>

          <div className="w-px h-5 bg-gray-200 mx-1"></div>

          {/* 链接、图片、表格 */}
          <div className="flex items-center gap-0.5">
            <button
              onClick={() => setShowLinkInput(!showLinkInput)}
              className={`p-1.5 rounded text-xs ${
                editor.isActive('link')
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
              title="链接"
            >
              链接
            </button>
            {editor.isActive('link') && (
              <button
                onClick={() => editor.chain().focus().unsetLink().run()}
                className="p-1.5 rounded text-xs text-red-500 hover:bg-red-50"
                title="移除链接"
              >
                移除
              </button>
            )}
            <button
              onClick={addImage}
              className="p-1.5 rounded text-xs text-gray-500 hover:bg-gray-100"
              title="图片"
            >
              图片
            </button>
            <button
              onClick={insertTable}
              className="p-1.5 rounded text-xs text-gray-500 hover:bg-gray-100"
              title="表格"
            >
              表格
            </button>
          </div>
        </div>
      )}

      {/* 链接输入框 */}
      {showLinkInput && (
        <div className="flex gap-2 items-center mt-2 pt-2 border-t border-gray-100">
          <input
            type="url"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder="输入链接URL (https://...)"
            className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-gray-400"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                addLink();
              }
            }}
          />
          <button
            onClick={addLink}
            className="px-3 py-1 bg-gray-900 text-white rounded text-xs hover:bg-gray-800"
          >
            确定
          </button>
          <button
            onClick={() => {
              setShowLinkInput(false);
              setLinkUrl('');
            }}
            className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-xs hover:bg-gray-300"
          >
            取消
          </button>
        </div>
      )}
    </div>
  );
}

// 将文本按句子分割，返回句子数组和位置映射
function segmentTextBySentences(text) {
  if (!text || !text.trim()) return { sentences: [], positions: [] };

  const sentences = [];
  const positions = [];
  let lastIndex = 0;

  // 中英文句末符
  const endPattern = /[。！？.!?]/g;
  let match;

  while ((match = endPattern.exec(text)) !== null) {
    const sentence = text.substring(lastIndex, match.index + 1).trim();
    if (sentence.length > 0) {
      sentences.push(sentence);
      positions.push({ start: lastIndex, end: match.index + 1 });
    }
    lastIndex = match.index + 1;
  }

  // 处理最后一段
  const lastSentence = text.substring(lastIndex).trim();
  if (lastSentence.length > 0) {
    sentences.push(lastSentence);
    positions.push({ start: lastIndex, end: text.length });
  }

  return { sentences, positions };
}

// 在HTML中查找句子的位置（考虑HTML标签）
function findSentenceInHtml(html, sentence) {
  // 创建临时DOM
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;

  // 获取纯文本
  const htmlText = tempDiv.textContent || tempDiv.innerText || '';

  // 在纯文本中查找句子
  const normalizedHtmlText = htmlText.replace(/\s+/g, ' ').trim();
  const normalizedSentence = sentence.replace(/\s+/g, ' ').trim();

  const index = normalizedHtmlText.indexOf(normalizedSentence);
  if (index < 0) return null;

  // 找到在纯文本中的位置后，映射回HTML
  // 遍历HTML找到对应的位置
  let htmlIndex = 0;
  let textIndex = 0;
  let tagDepth = 0;

  for (let i = 0; i < html.length; i++) {
    const char = html[i];

    if (char === '<') {
      // 跳过标签
      while (i < html.length && html[i] !== '>') i++;
      continue;
    }

    if (textIndex === index) {
      // 找到起始位置
      return { start: i };
    }

    if (char !== ' ' && char !== '\n' && char !== '\t') {
      textIndex++;
    }
  }

  return null;
}

// 可朗读内容组件 - 渲染完整HTML内容，支持句子高亮和点击
function ReadableContent({
  content,
  currentSentenceIndex,
  onSentenceClick,
  isReading,
  readPosition = 0
}) {
  const sentences = useMemo(() => {
    return splitIntoSentences(content || '');
  }, [content]);

  const containerRef = useRef(null);

  // 处理HTML内容，高亮当前句子
  const processedContent = useMemo(() => {
    if (!content || content.trim() === '' || content === '<p></p>') {
      return '';
    }

    let html = DOMPurify.sanitize(content, {
      ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 's', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'ul', 'ol', 'li', 'blockquote', 'pre', 'code', 'a', 'img', 'table', 'thead', 'tbody',
        'tr', 'th', 'td', 'mark', 'span', 'div', 'hr', 'input', 'figure', 'figcaption'],
      ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'target', 'rel', 'width', 'height',
        'type', 'checked', 'disabled', 'data-type', 'data-checked', 'style'],
      ALLOW_DATA_ATTR: true,
    });

    // 高亮当前朗读的句子或阅读位置
    const targetSentence = isReading && currentSentenceIndex >= 0
      ? sentences[currentSentenceIndex]
      : (readPosition > 0 ? sentences[readPosition] : null);

    if (!targetSentence) return html;

    // 规范化句子用于匹配
    const normalizedSentence = targetSentence.replace(/\s+/g, ' ').trim();
    if (!normalizedSentence) return html;

    // 使用更可靠的方法：在临时div中处理
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;

    // 递归处理所有文本节点
    const processNode = (node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent;
        const normalizedText = text.replace(/\s+/g, ' ');

        if (normalizedText.includes(normalizedSentence)) {
          // 找到匹配的文本，进行替换
          const parts = normalizedText.split(normalizedSentence);
          if (parts.length >= 2) {
            // 构建新的HTML
            const parent = node.parentNode;
            const beforeText = text.substring(0, parts[0].length);
            const afterText = text.substring(parts[0].length + normalizedSentence.length - 1);

            if (beforeText) {
              parent.insertBefore(document.createTextNode(beforeText), node);
            }

            const mark = document.createElement('mark');
            mark.className = 'sentence-highlight bg-yellow-300 text-gray-900 rounded px-0.5';
            mark.setAttribute('data-index', currentSentenceIndex);
            mark.textContent = normalizedSentence;

            parent.insertBefore(mark, node);

            if (afterText) {
              parent.insertBefore(document.createTextNode(afterText), node);
            }

            parent.removeChild(node);
          }
        }
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        // 递归处理子节点
        Array.from(node.childNodes).forEach(processNode);
      }
    };

    processNode(tempDiv);

    return tempDiv.innerHTML;
  }, [content, sentences, currentSentenceIndex, isReading, readPosition]);

  // 自动滚动到当前高亮句子
  useEffect(() => {
    if (currentSentenceIndex >= 0 && containerRef.current) {
      const highlightedEl = containerRef.current.querySelector('.sentence-highlight');
      if (highlightedEl) {
        highlightedEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [currentSentenceIndex]);

  // 处理点击事件
  const handleClick = useCallback((e) => {
    if (!onSentenceClick || sentences.length === 0) return;

    // 查找点击位置最近的句子
    let target = e.target;
    let sentenceIndex = -1;

    // 如果点击的是高亮元素，直接获取索引
    if (target.classList.contains('sentence-highlight')) {
      sentenceIndex = parseInt(target.getAttribute('data-index') || '-1');
    } else {
      // 否则查找最近的句子元素
      const highlightEl = target.closest('.sentence-highlight');
      if (highlightEl) {
        sentenceIndex = parseInt(highlightEl.getAttribute('data-index') || '-1');
      } else {
        // 如果点击的是普通文本，尝试找到它所属的句子
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = processedContent;

        // 使用caretRangeFromPoint获取点击位置的文本
        const range = document.caretRangeFromPoint
          ? document.caretRangeFromPoint(e.clientX, e.clientY)
          : null;

        if (range) {
          const textNode = range.startContainer;
          if (textNode.nodeType === Node.TEXT_NODE) {
            const fullText = textNode.textContent || '';
            const offset = range.startOffset;
            const clickedText = fullText.substring(Math.max(0, offset - 20), Math.min(fullText.length, offset + 20));

            // 查找匹配的句子
            for (let i = 0; i < sentences.length; i++) {
              if (sentences[i].replace(/\s+/g, ' ').includes(clickedText.replace(/\s+/g, ' '))) {
                sentenceIndex = i;
                break;
              }
            }
          }
        }
      }
    }

    if (sentenceIndex >= 0 && sentenceIndex < sentences.length) {
      onSentenceClick(sentenceIndex);
    } else if (sentences.length > 0) {
      onSentenceClick(0);
    }
  }, [sentences, processedContent, onSentenceClick]);

  if (!content || content.trim() === '' || content === '<p></p>') {
    return (
      <div className="text-gray-400 italic">文档内容为空</div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="readable-content cursor-pointer"
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
  readPosition = 0,
  // 工具栏控制
  showToolbar = false, // 默认不显示内部工具栏
  onEditorReady, // 向父组件暴露 editor 实例
}) {
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

  // 向父组件暴露 editor 实例
  useEffect(() => {
    if (editor && onEditorReady) {
      onEditorReady(editor);
    }
  }, [editor, onEditorReady]);

  // 追踪朗读相关 props 的变化
  useEffect(() => {
    console.log('[DocumentEditor] 朗读 props 变化:', {
      isReading,
      currentSentenceIndex,
      readPosition,
      timestamp: new Date().toISOString()
    });
  }, [isReading, currentSentenceIndex, readPosition]);

  // 追踪 content 变化
  useEffect(() => {
    console.log('[DocumentEditor] content 变化:', {
      contentLength: content?.length,
      contentPreview: content?.substring(0, 50),
      timestamp: new Date().toISOString()
    });
  }, [content]);

  if (!editor) {
    return <div className="p-8 text-gray-400">加载编辑器...</div>;
  }

  // 如果不是编辑模式，显示可朗读视图（支持点击句子跳转）
  const showReadableView = !editable || isReading;

  console.log('[DocumentEditor] 渲染判断:', {
    editable,
    showReadableView,
    isReading,
    currentSentenceIndex,
    timestamp: new Date().toISOString()
  });

  return (
    <div className="prose prose-sm sm:prose lg:prose-lg max-w-none">
      {/* 内部工具栏 - 仅在 showToolbar 为 true 时显示 */}
      {editable && showToolbar && (
        <div className="mb-4">
          <EditorToolbar editor={editor} />
        </div>
      )}

      {/* 阅读模式提示 */}
      {showReadableView && !editable && (
        <div className="mb-4 p-2 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700 flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>点击任意句子可从该位置开始朗读</span>
        </div>
      )}

      {/* 编辑模式下的朗读提示 */}
      {showReadableView && editable && (
        <div className="mb-4 p-2 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15.536a5 5 0 001.414 1.414m2.828-9.9a9 9 0 012.828-2.828" />
            </svg>
            <span>朗读中，点击任意句子可跳转</span>
          </div>
          <button
            onClick={() => {
              if (onSentenceClick) {
                onSentenceClick(-1); // -1 表示停止朗读
              }
            }}
            className="px-3 py-1 bg-yellow-200 hover:bg-yellow-300 rounded text-yellow-800 text-xs"
          >
            停止朗读
          </button>
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
