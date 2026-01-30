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
import { uploadAPI } from '../services/api';

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

// 可朗读内容组件 - 渲染完整HTML内容，支持句子高亮和点击
function ReadableContent({
  content,
  currentSentenceIndex,
  onSentenceClick,
  isReading,
  readPosition = 0
}) {
  console.log('[ReadableContent] 渲染 props:', {
    hasContent: !!content,
    contentLength: content?.length,
    currentSentenceIndex,
    isReading,
    readPosition,
    timestamp: new Date().toISOString()
  });

  const sentences = useMemo(() => {
    const result = splitIntoSentences(content || '');
    console.log('[ReadableContent] splitIntoSentences 结果:', {
      sentenceCount: result.length,
      firstSentences: result.slice(0, 3),
      timestamp: new Date().toISOString()
    });
    return result;
  }, [content]);

  const containerRef = useRef(null);

  // 当前高亮的句子
  const currentSentence = sentences[currentSentenceIndex];
  const readPositionSentence = sentences[readPosition];

  console.log('[ReadableContent] 当前高亮句子:', {
    currentSentenceIndex,
    currentSentence: currentSentence ? currentSentence.substring(0, 20) + '...' : null,
    readPosition,
    readPositionSentence: readPositionSentence ? readPositionSentence.substring(0, 20) + '...' : null,
    timestamp: new Date().toISOString()
  });

  // 处理 HTML 内容，高亮当前句子 - 必须在早期返回之前调用
  const processedContent = useMemo(() => {
    if (!content || content.trim() === '' || content === '<p></p>') {
      console.log('[ReadableContent] 内容为空，返回空字符串');
      return '';
    }

    console.log('[ReadableContent] 原始 content:', {
      contentLength: content.length,
      contentPreview: content.substring(0, 100),
      contentFull: content,  // 完整内容
      timestamp: new Date().toISOString()
    });

    let html = DOMPurify.sanitize(content, {
      ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 's', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'ul', 'ol', 'li', 'blockquote', 'pre', 'code', 'a', 'img', 'table', 'thead', 'tbody',
        'tr', 'th', 'td', 'mark', 'span', 'div', 'hr', 'input', 'figure', 'figcaption'],
      ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'target', 'rel', 'width', 'height',
        'type', 'checked', 'disabled', 'data-type', 'data-checked', 'style'],
      ALLOW_DATA_ATTR: true,
    });

    // 详细对比 content 和 html
    console.log('[ReadableContent] DOMPurify 详细对比:', {
      contentLength: content.length,
      htmlLength: html.length,
      contentCodeUnits: Array.from(content).slice(0, 30).map(c => c.charCodeAt(0)),
      htmlCodeUnits: Array.from(html).slice(0, 30).map(c => c.charCodeAt(0)),
      contentHasWenzi: content.includes('蚊子'),
      htmlHasWenzi: html.includes('蚊子'),
      contentPreview: content.substring(0, 50),
      htmlPreview: html.substring(0, 50),
      timestamp: new Date().toISOString()
    });

    // 调试：如果 content 和 html 不同，记录差异
    if (html !== content) {
      console.log('[ReadableContent] DOMPurify 修改了 content!', {
        originalContent: content,
        sanitizedHtml: html,
        originalLength: content.length,
        sanitizedLength: html.length,
        timestamp: new Date().toISOString()
      });
    } else {
      console.log('[ReadableContent] DOMPurify 未修改 content');
    }

    console.log('[ReadableContent] DOMPurify 后:', {
      htmlLength: html.length,
      htmlPreview: html.substring(0, 100),
      htmlFull: html,  // 完整 HTML
      contentChanged: html !== content,
      contentLengthDiff: html.length - content.length,
      timestamp: new Date().toISOString()
    });

    // 提取纯文本用于句子分割
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    const htmlText = tempDiv.textContent || tempDiv.innerText || '';
    
    console.log('[ReadableContent] HTML 纯文本:', {
      htmlTextLength: htmlText.length,
      htmlTextPreview: htmlText.substring(0, 100),
      htmlTextFull: htmlText,  // 完整纯文本
      contentTextLength: content.length,
      timestamp: new Date().toISOString()
    });

    // 高亮当前朗读的句子
    if (isReading && currentSentence) {
      // 添加诊断日志：对比 HTML 纯文本和句子
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = html;
      const htmlText = tempDiv.textContent || tempDiv.innerText || '';
      const normalizedHtmlText = htmlText.replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ');
      const normalizedSentence = currentSentence.replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ');

      console.log('[ReadableContent] 诊断 - HTML纯文本 vs 句子:', {
        htmlTextLength: htmlText.length,
        htmlTextPreview: htmlText.substring(0, 100),
        htmlTextFull: htmlText,  // 添加完整文本
        sentence: normalizedSentence,
        sentenceLength: normalizedSentence.length,
        sentenceFull: normalizedSentence,  // 添加完整句子
        foundInHtml: normalizedHtmlText.includes(normalizedSentence),
        htmlTextContains: normalizedHtmlText.includes(normalizedSentence.substring(0, 20)),
        timestamp: new Date().toISOString()
      });

      // 方法1: 尝试直接匹配（适用于纯文本或简单格式）
      let highlightedHtml = html;
      let matchCount = 0;

      const escapedSentence = currentSentence.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const directRegex = new RegExp(`(${escapedSentence})`, 'g');
      const beforeCount = (html.match(/<mark/g) || []).length;
      highlightedHtml = html.replace(directRegex, '<mark class="sentence-highlight bg-yellow-300 text-gray-900 rounded px-0.5">$1</mark>');
      matchCount = (highlightedHtml.match(/<mark/g) || []).length - beforeCount;

      // 如果直接匹配失败，尝试模糊匹配
      if (matchCount === 0) {
        console.log('[ReadableContent] 直接匹配失败，尝试模糊匹配:', {
          currentSentence: currentSentence.substring(0, 40),
          timestamp: new Date().toISOString()
        });

        // 规范化 HTML 和句子文本
        const normalizedHtml = html.replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ');
        const normalizedSentence = currentSentence.replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ');

        // 尝试找到规范化后的句子在 HTML 中的位置
        const sentenceIndex = normalizedHtml.indexOf(normalizedSentence);

        if (sentenceIndex >= 0) {
          // 找到位置，尝试在原始 HTML 中找到对应的文本片段
          // 从找到的位置向前后扩展，找到最近的标签边界
          const beforeText = normalizedHtml.substring(0, sentenceIndex);
          const afterText = normalizedHtml.substring(sentenceIndex);

          // 在原始 HTML 中找到匹配的位置
          const htmlBeforeMatch = beforeText;
          const htmlAfterMatch = normalizedSentence + afterText.substring(normalizedSentence.length);

          // 使用正则找到 HTML 中对应的文本并高亮
          const cleanSentence = normalizedSentence.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const fuzzyRegex = new RegExp(`(${cleanSentence})`, 'g');
          highlightedHtml = html.replace(fuzzyRegex, '<mark class="sentence-highlight bg-yellow-300 text-gray-900 rounded px-0.5">$1</mark>');
          matchCount = (highlightedHtml.match(/<mark/g) || []).length;

          console.log('[ReadableContent] 模糊匹配结果:', {
            foundPosition: sentenceIndex,
            matchCount,
            timestamp: new Date().toISOString()
          });
        } else {
          // 最后尝试：使用句子中较长的连续字符片段进行匹配
          // 找到句子中最长的一段连续字符（不含空格）
          const charSequenceMatch = currentSentence.match(/[^\s，。！？.!?;；:：]{10,}/);
          if (charSequenceMatch) {
            const charSequence = charSequenceMatch[0];
            const charRegex = new RegExp(`(${charSequence.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'g');
            highlightedHtml = html.replace(charRegex, '<mark class="sentence-highlight bg-yellow-300 text-gray-900 rounded px-0.5">$1</mark>');
            matchCount = (highlightedHtml.match(/<mark/g) || []).length;
            console.log('[ReadableContent] 字符片段匹配:', {
              charSequence,
              matchCount,
              timestamp: new Date().toISOString()
            });
          }
        }
      }

      const afterCount = (highlightedHtml.match(/<mark/g) || []).length;
      console.log('[ReadableContent] 高亮处理 (isReading):', {
        currentSentence: currentSentence.substring(0, 30),
        matchCount,
        markBefore: beforeCount,
        markAfter: afterCount,
        timestamp: new Date().toISOString()
      });

      html = highlightedHtml;
    } else if (!isReading && readPositionSentence && readPosition >= 0) {
      // 高亮上次阅读位置或点击位置
      const escapedSentence = readPositionSentence.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(${escapedSentence})`, 'g');
      html = html.replace(regex, '<mark class="sentence-highlight bg-blue-100 text-gray-900 rounded px-0.5">$1</mark>');
      console.log('[ReadableContent] 高亮处理 (readPosition):', {
        readPosition,
        readPositionSentence: readPositionSentence.substring(0, 30),
        timestamp: new Date().toISOString()
      });
    } else {
      console.log('[ReadableContent] 未执行高亮:', {
        isReading,
        hasCurrentSentence: !!currentSentence,
        hasReadPositionSentence: !!readPositionSentence,
        readPosition,
        timestamp: new Date().toISOString()
      });
    }

    return html;
  }, [content, currentSentence, readPositionSentence, isReading, readPosition]);

  // 自动滚动到当前高亮句子
  useEffect(() => {
    if (currentSentenceIndex >= 0 && containerRef.current) {
      const highlightedEl = containerRef.current.querySelector('.sentence-highlight');
      console.log('[ReadableContent] 自动滚动:', {
        currentSentenceIndex,
        hasHighlightedEl: !!highlightedEl,
        timestamp: new Date().toISOString()
      });
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
    if (!onSentenceClick || sentences.length === 0) return;

    // 方法1: 尝试使用 caretRangeFromPoint 获取点击位置的精确文本
    let clickedText = '';
    try {
      const range = document.caretRangeFromPoint
        ? document.caretRangeFromPoint(e.clientX, e.clientY)
        : null;

      if (range) {
        const textNode = range.startContainer;
        if (textNode.nodeType === Node.TEXT_NODE) {
          const fullText = textNode.textContent || '';
          const offset = range.startOffset;
          const start = Math.max(0, offset - 30);
          const end = Math.min(fullText.length, offset + 30);
          clickedText = fullText.slice(start, end).trim();
        }
      }
    } catch (err) {
    }

    if (!clickedText) {
      clickedText = e.target.textContent || '';
    }

    if (!clickedText || sentences.length === 0) {
      onSentenceClick(0);
      return;
    }

    let bestMatchIndex = 0;
    let bestMatchScore = 0;

    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i];
      if (!sentence) continue;

      const cleanClicked = clickedText.replace(/\s+/g, ' ').trim();
      const cleanSentence = sentence.replace(/\s+/g, ' ').trim();

      if (cleanClicked === cleanSentence) {
        bestMatchIndex = i;
        bestMatchScore = 1;
        break;
      }

      // 计算相似度
      const clickedLen = cleanClicked.length;
      const sentenceLen = cleanSentence.length;

      // 句子包含点击文本
      if (sentenceLen > 0 && cleanSentence.includes(cleanClicked) && clickedLen > 2) {
        const score = clickedLen / sentenceLen;
        if (score > bestMatchScore) {
          bestMatchScore = score;
          bestMatchIndex = i;
        }
      }
      // 点击文本包含句子
      else if (clickedLen > 0 && cleanClicked.includes(cleanSentence)) {
        const score = (cleanSentence.length / clickedLen) * 0.9;
        if (score > bestMatchScore) {
          bestMatchScore = score;
          bestMatchIndex = i;
        }
      }
      // 部分匹配 - 检查是否有共同子串
      else {
        const minLen = Math.min(cleanClicked.length, cleanSentence.length);
        if (minLen >= 5) {
          let matchCount = 0;
          for (let j = 0; j <= minLen - 3; j += 3) {
            const sub = cleanClicked.substring(j, j + 3);
            if (cleanSentence.includes(sub)) {
              matchCount++;
            }
          }
          if (matchCount > 0) {
            const score = (matchCount * 3 / minLen) * 0.5;
            if (score > bestMatchScore) {
              bestMatchScore = score;
              bestMatchIndex = i;
            }
          }
        }
      }
    }

    // 如果用户有选中的文本，优先匹配
    const selection = window.getSelection();
    if (selection && selection.toString().trim()) {
      const selectedText = selection.toString().trim().replace(/\s+/g, ' ');
      for (let i = 0; i < sentences.length; i++) {
        const cleanSentence = sentences[i].replace(/\s+/g, ' ');
        if (cleanSentence.includes(selectedText) || selectedText.includes(cleanSentence)) {
          bestMatchIndex = i;
          break;
        }
      }
    }

    onSentenceClick(bestMatchIndex);
  };

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
    editorProps: {
      handlePaste: (view, event, slice) => {
        const items = event.clipboardData?.items;
        if (!items) return false;

        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          if (item.type.indexOf('image') === 0) {
            event.preventDefault();
            const file = item.getAsFile();
            if (file) {
              uploadAPI.uploadImage(file)
                .then(response => {
                  if (response.data.url) {
                    const { schema } = view.state;
                    const coordinates = view.posAtCoords({ left: event.clientX, top: event.clientY });
                    if (coordinates) {
                      const node = schema.nodes.image.create({ src: response.data.url });
                      const transaction = schema.tr.replaceWith(coordinates.pos, coordinates.pos, node);
                      view.dispatch(transaction);
                    }
                  }
                })
                .catch(error => {
                  console.error('Upload image error:', error);
                  alert('图片上传失败，请重试');
                });
            }
            return true;
          }
        }
        return false;
      },
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
  const showReadableView = !editable;

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
