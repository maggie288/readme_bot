import { useState, useRef, useEffect } from 'react';

export default function PDFViewer({ pages = [] }) {
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1);
  const containerRef = useRef(null);

  const totalPages = pages.length;

  // 页面导航
  const goToPage = (pageNum) => {
    if (pageNum >= 1 && pageNum <= totalPages) {
      setCurrentPage(pageNum);
      // 滚动到对应页面
      const pageElement = document.getElementById(`pdf-page-${pageNum}`);
      if (pageElement) {
        pageElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  // 缩放控制
  const zoomIn = () => setScale(prev => Math.min(prev + 0.25, 3));
  const zoomOut = () => setScale(prev => Math.max(prev - 0.25, 0.5));
  const resetZoom = () => setScale(1);

  // 监听滚动更新当前页码
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const pageElements = container.querySelectorAll('[data-page]');
      let currentVisible = 1;

      pageElements.forEach((el) => {
        const rect = el.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        if (rect.top < containerRect.top + containerRect.height / 2) {
          currentVisible = parseInt(el.dataset.page);
        }
      });

      setCurrentPage(currentVisible);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  if (!pages || pages.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        <div className="text-center">
          <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p>暂无 PDF 页面预览</p>
          <p className="text-sm mt-1">此文档未提供原始排版视图</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-100">
      {/* 工具栏 */}
      <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-gray-200 sticky top-0 z-10">
        {/* 页码导航 */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage <= 1}
            className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            title="上一页"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="text-sm text-gray-600">
            <input
              type="number"
              min={1}
              max={totalPages}
              value={currentPage}
              onChange={(e) => goToPage(parseInt(e.target.value) || 1)}
              className="w-12 px-2 py-1 text-center border border-gray-300 rounded text-sm"
            />
            <span className="mx-1">/</span>
            <span>{totalPages}</span>
          </span>
          <button
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            title="下一页"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* 缩放控制 */}
        <div className="flex items-center gap-2">
          <button
            onClick={zoomOut}
            disabled={scale <= 0.5}
            className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            title="缩小"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
            </svg>
          </button>
          <button
            onClick={resetZoom}
            className="px-2 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded"
            title="重置缩放"
          >
            {Math.round(scale * 100)}%
          </button>
          <button
            onClick={zoomIn}
            disabled={scale >= 3}
            className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            title="放大"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
      </div>

      {/* PDF 页面容器 */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto p-4"
        style={{ backgroundColor: '#525659' }}
      >
        <div className="flex flex-col items-center gap-4">
          {pages.map((page, index) => (
            <div
              key={page.page}
              id={`pdf-page-${page.page}`}
              data-page={page.page}
              className="bg-white shadow-lg"
              style={{
                transform: `scale(${scale})`,
                transformOrigin: 'top center',
                marginBottom: scale > 1 ? `${(scale - 1) * page.height}px` : 0,
              }}
            >
              <img
                src={page.url}
                alt={`第 ${page.page} 页`}
                className="block max-w-full"
                style={{
                  width: page.width / 2, // 原始渲染是 2x 的，这里缩小回正常大小
                  height: 'auto',
                }}
                loading={index < 3 ? 'eager' : 'lazy'}
              />
              <div className="text-center py-2 text-xs text-gray-500 bg-gray-50 border-t border-gray-200">
                第 {page.page} 页
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 页面缩略图侧边栏 */}
      <div className="absolute right-4 top-16 bottom-4 w-24 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden hidden lg:block">
        <div className="p-2 text-xs font-medium text-gray-600 border-b border-gray-200 text-center">
          页面导航
        </div>
        <div className="overflow-auto h-full pb-8">
          {pages.map((page) => (
            <button
              key={page.page}
              onClick={() => goToPage(page.page)}
              className={`w-full p-1 hover:bg-gray-100 ${
                currentPage === page.page ? 'bg-blue-50 border-l-2 border-blue-500' : ''
              }`}
            >
              <img
                src={page.url}
                alt={`缩略图 ${page.page}`}
                className="w-full h-auto border border-gray-200"
                loading="lazy"
              />
              <span className="text-xs text-gray-500">{page.page}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
