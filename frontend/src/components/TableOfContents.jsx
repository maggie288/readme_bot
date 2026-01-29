import { useMemo } from 'react';

// 从 HTML 内容中提取标题
function extractHeadingsFromContent(htmlContent) {
  if (!htmlContent) return [];

  const div = document.createElement('div');
  div.innerHTML = htmlContent;

  const headings = [];
  const headingElements = div.querySelectorAll('h1, h2, h3, h4, h5, h6');

  headingElements.forEach((heading, index) => {
    const level = parseInt(heading.tagName.charAt(1));
    const text = heading.textContent?.trim();
    if (text) {
      headings.push({
        id: `heading-${index}`,
        title: text,
        level,
        order: index + 1
      });
    }
  });

  return headings;
}

export default function TableOfContents({ chapters = [], content = '' }) {
  // 优先使用从内容中提取的标题，如果没有则使用传入的 chapters
  const tocItems = useMemo(() => {
    const extractedHeadings = extractHeadingsFromContent(content);
    if (extractedHeadings.length > 0) {
      return extractedHeadings;
    }
    return chapters;
  }, [content, chapters]);

  const handleChapterClick = (item) => {
    // 尝试滚动到对应的标题位置
    // 查找编辑器内容中的标题
    const editorContent = document.querySelector('.ProseMirror, .readable-content');
    if (editorContent) {
      const headings = editorContent.querySelectorAll('h1, h2, h3, h4, h5, h6');
      const targetIndex = tocItems.findIndex(t => t.id === item.id);
      if (targetIndex >= 0 && headings[targetIndex]) {
        headings[targetIndex].scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
    }
  };

  // 根据标题级别计算缩进
  const getIndentClass = (level) => {
    const indents = {
      1: 'pl-0',
      2: 'pl-3',
      3: 'pl-6',
      4: 'pl-9',
      5: 'pl-12',
      6: 'pl-15'
    };
    return indents[level] || 'pl-0';
  };

  // 根据标题级别获取字体大小
  const getFontClass = (level) => {
    const fonts = {
      1: 'text-sm font-semibold',
      2: 'text-sm font-medium',
      3: 'text-xs font-medium',
      4: 'text-xs',
      5: 'text-xs text-gray-500',
      6: 'text-xs text-gray-400'
    };
    return fonts[level] || 'text-sm';
  };

  return (
    <div className="space-y-2">
      {tocItems.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-400 text-sm mb-2">
            文档还没有目录
          </p>
          <p className="text-gray-300 text-xs">
            在文档中使用标题（H1-H6）即可自动生成目录
          </p>
        </div>
      ) : (
        <ul className="space-y-0.5">
          {tocItems.map((item) => (
            <li key={item.id} className={getIndentClass(item.level)}>
              <button
                onClick={() => handleChapterClick(item)}
                className={`w-full text-left px-3 py-1.5 rounded hover:bg-gray-50 transition-colors text-gray-700 hover:text-gray-900 ${getFontClass(item.level)}`}
              >
                {item.level && (
                  <span className="text-gray-300 mr-1.5 text-xs">
                    {'─'.repeat(item.level - 1)}
                  </span>
                )}
                {item.title}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
