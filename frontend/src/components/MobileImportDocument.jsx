import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { marked } from 'marked';
import { uploadAPI, twitterAPI } from '../services/api';

export default function MobileImportDocument({ isOpen, onClose, onImport }) {
  const [activeTab, setActiveTab] = useState('file');
  const [notionUrl, setNotionUrl] = useState('');
  const [twitterUrl, setTwitterUrl] = useState('');
  const [twitterPreview, setTwitterPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingImport, setPendingImport] = useState(null);
  const [price, setPrice] = useState(0);
  const [isPublic, setIsPublic] = useState(true);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  const isStandalone = isOpen === undefined;
  const shouldShow = isOpen !== false;

  useEffect(() => {
    if (isStandalone && onClose) {
      const handleBeforeUnload = () => {
        onClose();
      };
      window.addEventListener('beforeunload', handleBeforeUnload);
      return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }
  }, [isStandalone, onClose]);

  if (!shouldShow) return null;

  const resetConfirm = () => {
    setShowConfirm(false);
    setPendingImport(null);
    setPrice(0);
    setIsPublic(true);
  };

  const showConfirmStep = (data) => {
    setPendingImport(data);
    setShowConfirm(true);
  };

  const handleConfirmImport = () => {
    if (pendingImport) {
      onImport({
        ...pendingImport,
        price: parseFloat(price) || 0,
        isPublic
      });
      resetConfirm();
      handleClose();
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setLoading(true);
    setError('');
    setProgress('');

    try {
      const fileExtension = file.name.split('.').pop().toLowerCase();

      if (fileExtension === 'pdf' || fileExtension === 'docx' || fileExtension === 'doc') {
        setProgress(`正在解析 ${fileExtension.toUpperCase()} 文件...`);
        const response = await uploadAPI.parseFile(file);
        const { title, content, warnings, pdfPages, docId } = response.data;

        if (warnings && warnings.length > 0) {
          console.warn('解析警告:', warnings);
        }

        let processedContent = content;
        const backendUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3001';
        processedContent = processedContent.replace(
          /src="\/uploads\//g,
          `src="${backendUrl}/uploads/"`
        );

        let processedPdfPages = pdfPages;
        if (pdfPages && pdfPages.length > 0) {
          processedPdfPages = pdfPages.map(page => ({
            ...page,
            url: `${backendUrl}${page.url}`
          }));
        }

        showConfirmStep({
          title,
          content: processedContent,
          pdfPages: processedPdfPages || [],
          docId: docId || null
        });
        return;
      }

      const text = await file.text();
      let htmlContent = '';
      let title = file.name.replace(/\.(md|markdown|html|txt)$/i, '');

      if (fileExtension === 'md' || fileExtension === 'markdown') {
        htmlContent = marked.parse(text);
      } else if (fileExtension === 'html' || fileExtension === 'htm') {
        htmlContent = text;
        const titleMatch = text.match(/<title>(.*?)<\/title>/i);
        if (titleMatch) {
          title = titleMatch[1];
        } else {
          const h1Match = text.match(/<h1[^>]*>(.*?)<\/h1>/i);
          if (h1Match) {
            title = h1Match[1].replace(/<[^>]+>/g, '');
          }
        }
      } else if (fileExtension === 'txt') {
        htmlContent = text
          .split('\n\n')
          .map(para => `<p>${para.replace(/\n/g, '<br>')}</p>`)
          .join('');
      } else {
        throw new Error('不支持的文件格式');
      }

      showConfirmStep({ title, content: htmlContent });
    } catch (err) {
      console.error('File upload error:', err);
      setError(err.response?.data?.error || err.message || '文件处理失败');
    } finally {
      setLoading(false);
      setProgress('');
    }
  };

  const handleNotionImport = async () => {
    if (!notionUrl.trim()) {
      setError('请输入 Notion 链接');
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (!notionUrl.includes('notion.so') && !notionUrl.includes('notion.site')) {
        throw new Error('请输入有效的 Notion 链接');
      }

      const proxyUrl = 'https://api.allorigins.win/raw?url=';
      const response = await fetch(proxyUrl + encodeURIComponent(notionUrl));

      if (!response.ok) {
        throw new Error('无法访问该 Notion 页面');
      }

      const html = await response.text();
      let title = 'Notion 导入文档';
      const titleMatch = html.match(/<title>(.*?)<\/title>/i);
      if (titleMatch) {
        title = titleMatch[1].split('|')[0].trim();
      }

      let content = html;
      const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
      if (bodyMatch) {
        content = bodyMatch[1];
      }

      content = content
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<link[^>]*>/gi, '')
        .replace(/<meta[^>]*>/gi, '')
        .replace(/class="[^"]*"/gi, '')
        .replace(/id="[^"]*"/gi, '')
        .replace(/data-[^=]*="[^"]*"/gi, '');

      showConfirmStep({ title, content });
    } catch (err) {
      setError(err.message || 'Notion 导入失败');
    } finally {
      setLoading(false);
    }
  };

  const handlePasteImport = async () => {
    setLoading(true);
    setError('');

    try {
      const text = await navigator.clipboard.readText();

      if (!text.trim()) {
        throw new Error('剪贴板为空');
      }

      let htmlContent = '';
      let title = '粘贴的文档';

      if (text.includes('# ') || text.includes('## ') || text.includes('```')) {
        htmlContent = marked.parse(text);
        const titleMatch = text.match(/^#\s+(.+)$/m);
        if (titleMatch) {
          title = titleMatch[1];
        }
      } else if (text.includes('<html') || text.includes('<!DOCTYPE')) {
        htmlContent = text;
        const titleMatch = text.match(/<h1[^>]*>(.*?)<\/h1>/i);
        if (titleMatch) {
          title = titleMatch[1].replace(/<[^>]+>/g, '');
        }
      } else {
        htmlContent = text
          .split('\n\n')
          .map(para => `<p>${para.replace(/\n/g, '<br>')}</p>`)
          .join('');
      }

      showConfirmStep({ title, content: htmlContent });
    } catch (err) {
      setError(err.message || '粘贴导入失败');
    } finally {
      setLoading(false);
    }
  };

  const handleTwitterFetch = async () => {
    if (!twitterUrl.trim()) {
      setError('请输入 Twitter/X 链接');
      return;
    }

    setLoading(true);
    setError('');
    setProgress('正在获取推文...');
    setTwitterPreview(null);

    try {
      const response = await twitterAPI.fetch(twitterUrl);
      setTwitterPreview(response.data);
    } catch (err) {
      setError(err.response?.data?.error || '获取推文失败');
    } finally {
      setLoading(false);
      setProgress('');
    }
  };

  const handleTwitterImport = () => {
    if (!twitterPreview) return;

    let htmlContent = `
      <div style="border: 1px solid #e1e8ed; border-radius: 12px; padding: 16px;">
        <div style="display: flex; align-items: center; margin-bottom: 12px;">
          ${twitterPreview.avatar ? `
            <img src="${twitterPreview.avatar}" alt="${twitterPreview.author}" style="width: 48px; height: 48px; border-radius: 50%; margin-right: 12px;">
          ` : `
            <div style="width: 48px; height: 48px; border-radius: 50%; background: #1da1f2; color: white; display: flex; align-items: center; justify-content: center; font-weight: bold; margin-right: 12px;">
              ${twitterPreview.author?.[0]?.toUpperCase() || 'X'}
            </div>
          `}
          <div>
            <div style="font-weight: bold; color: #0f1419;">${twitterPreview.author}</div>
            <div style="color: #536471; font-size: 14px;">@${twitterPreview.authorUsername || ''}</div>
          </div>
        </div>
        <div style="font-size: 16px; line-height: 1.5; color: #0f1419; margin-bottom: 12px;">
          ${twitterPreview.formattedContent || twitterPreview.content?.replace(/\n/g, '<br>') || ''}
        </div>
    `;

    if (twitterPreview.images && twitterPreview.images.length > 0) {
      htmlContent += `
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; margin-bottom: 12px; border-radius: 12px; overflow: hidden;">
          ${twitterPreview.images.map(img => `
            <img src="${img}" alt="Tweet image" style="width: 100%; height: 200px; object-fit: cover;">
          `).join('')}
        </div>
      `;
    }

    htmlContent += `
        <div style="color: #536471; font-size: 14px; padding-top: 12px; border-top: 1px solid #eff3f4;">
          ${twitterPreview.timestamp ? new Date(twitterPreview.timestamp).toLocaleString('zh-CN') : ''}
        </div>
      </div>
    `;

    showConfirmStep({
      title: twitterPreview.content?.substring(0, 50) + '...' || 'Tweet',
      content: htmlContent,
      sourceType: 'twitter',
      sourceUrl: twitterPreview.originalUrl,
      originalContent: twitterPreview.content,
    });
  };

  const tabs = [
    { id: 'file', label: '上传文件', icon: '📁' },
    { id: 'paste', label: '粘贴', icon: '📋' },
    { id: 'notion', label: 'Notion', icon: '📝' },
    { id: 'twitter', label: 'Twitter', icon: '🐦' },
  ];

  const handleClose = () => {
    if (isStandalone) {
      navigate(-1);
    } else if (onClose) {
      onClose();
    }
  };

  return (
    <div className={`${isStandalone ? 'min-h-screen bg-gray-50' : 'fixed inset-0 bg-black bg-opacity-50 z-50'}`}>
      <div className={`${isStandalone ? '' : 'absolute bottom-0 left-0 right-0'} bg-white ${isStandalone ? '' : 'rounded-t-2xl'} max-h-[85vh] overflow-hidden flex flex-col ${isStandalone ? '' : 'animate-slide-up'}`}>
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">
            {showConfirm ? '确认导入' : '导入文档'}
          </h2>
          <button
            onClick={() => {
              if (showConfirm) {
                resetConfirm();
              } else {
                handleClose();
              }
            }}
            className="p-2 -mr-2 rounded-full hover:bg-gray-100"
          >
            <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          {error && (
            <div className="mx-4 mt-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          {showConfirm ? (
            <div className="p-4 space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-2">文档标题</p>
                <p className="font-medium text-gray-900">{pendingImport?.title}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  价格 (¥)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0"
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">设为公开</span>
                <button
                  onClick={() => setIsPublic(!isPublic)}
                  className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                    isPublic ? 'bg-blue-500' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                      isPublic ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="pt-2">
                <button
                  onClick={handleConfirmImport}
                  className="w-full py-3 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition-colors"
                >
                  确认导入
                </button>
              </div>
            </div>
          ) : (
            <div>
              {/* Tabs */}
              <div className="flex border-b border-gray-100 px-2">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 px-3 py-3 text-sm font-medium transition-colors flex flex-col items-center gap-1 ${
                      activeTab === tab.id
                        ? 'text-blue-600 border-b-2 border-blue-600'
                        : 'text-gray-500'
                    }`}
                  >
                    <span className="text-lg">{tab.icon}</span>
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              <div className="p-4">
                {activeTab === 'file' && (
                  <div className="space-y-4">
                    <p className="text-sm text-gray-600">
                      支持 PDF、Word、Markdown、HTML、纯文本文件
                    </p>

                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={loading}
                      className="w-full py-8 border-2 border-dashed border-gray-300 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-colors flex flex-col items-center gap-2"
                    >
                      <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      <span className="text-gray-600">点击选择文件</span>
                      <span className="text-xs text-gray-400">最大 50MB</span>
                    </button>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.docx,.doc,.md,.markdown,.html,.htm,.txt"
                      onChange={handleFileUpload}
                      disabled={loading}
                      className="hidden"
                    />

                    {loading && progress && (
                      <div className="text-center py-2">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto"></div>
                        <p className="text-sm text-gray-500 mt-2">{progress}</p>
                      </div>
                    )}

                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">支持格式</h4>
                      <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                        <span>📄 PDF</span>
                        <span>📝 Word</span>
                        <span>📋 Markdown</span>
                        <span>🌐 HTML</span>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'paste' && (
                  <div className="space-y-4">
                    <p className="text-sm text-gray-600">
                      从剪贴板粘贴内容，支持 Markdown、HTML、纯文本
                    </p>

                    <button
                      onClick={handlePasteImport}
                      disabled={loading}
                      className="w-full py-4 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      {loading ? '导入中...' : '从剪贴板粘贴'}
                    </button>

                    <div className="bg-blue-50 rounded-lg p-4 text-sm text-blue-800">
                      <p>1. 复制要导入的内容</p>
                      <p>2. 点击上方按钮导入</p>
                    </div>
                  </div>
                )}

                {activeTab === 'notion' && (
                  <div className="space-y-4">
                    <input
                      type="url"
                      value={notionUrl}
                      onChange={(e) => setNotionUrl(e.target.value)}
                      placeholder="https://notion.so/your-page"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={loading}
                    />

                    <button
                      onClick={handleNotionImport}
                      disabled={loading || !notionUrl.trim()}
                      className="w-full py-3 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                    >
                      {loading ? '导入中...' : '导入 Notion 页面'}
                    </button>

                    <div className="bg-yellow-50 rounded-lg p-4 text-sm text-yellow-800">
                      <p className="font-medium mb-1">注意事项：</p>
                      <p>• 页面需设置为公开分享</p>
                      <p>• 复制完整的分享链接</p>
                    </div>
                  </div>
                )}

                {activeTab === 'twitter' && (
                  <div className="space-y-4">
                    <input
                      type="url"
                      value={twitterUrl}
                      onChange={(e) => setTwitterUrl(e.target.value)}
                      placeholder="https://twitter.com/user/status/xxx"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={loading}
                    />

                    <button
                      onClick={handleTwitterFetch}
                      disabled={loading || !twitterUrl.trim()}
                      className="w-full py-3 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                    >
                      {loading ? '获取中...' : '获取推文'}
                    </button>

                    {twitterPreview && (
                      <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-sm font-medium text-gray-700 mb-2">{twitterPreview.author}</p>
                        <p className="text-sm text-gray-600 line-clamp-2">{twitterPreview.content}</p>
                        <button
                          onClick={handleTwitterImport}
                          className="mt-3 w-full py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600"
                        >
                          导入此推文
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
