import { useState } from 'react';
import { marked } from 'marked';
import { uploadAPI, twitterAPI } from '../services/api';

export default function ImportDocument({ isOpen, onClose, onImport }) {
  const [activeTab, setActiveTab] = useState('file'); // 'file', 'notion', 'paste', 'twitter'
  const [notionUrl, setNotionUrl] = useState('');
  const [twitterUrl, setTwitterUrl] = useState('');
  const [twitterPreview, setTwitterPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState('');

  // 新增：导入确认步骤
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingImport, setPendingImport] = useState(null);
  const [price, setPrice] = useState(0);
  const [isPublic, setIsPublic] = useState(true);

  if (!isOpen) return null;

  // 重置确认步骤
  const resetConfirm = () => {
    setShowConfirm(false);
    setPendingImport(null);
    setPrice(0);
    setIsPublic(true);
  };

  // 显示确认步骤
  const showConfirmStep = (data) => {
    setPendingImport(data);
    setShowConfirm(true);
  };

  // 确认导入
  const handleConfirmImport = () => {
    if (pendingImport) {
      onImport({
        ...pendingImport,
        price: parseFloat(price) || 0,
        isPublic
      });
      resetConfirm();
      onClose();
    }
  };

  // 处理文件上传
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setLoading(true);
    setError('');
    setProgress('');

    try {
      const fileExtension = file.name.split('.').pop().toLowerCase();

      // PDF 和 Word 文件通过后端解析
      if (fileExtension === 'pdf' || fileExtension === 'docx' || fileExtension === 'doc') {
        setProgress(`正在解析 ${fileExtension.toUpperCase()} 文件...`);

        const response = await uploadAPI.parseFile(file);
        const { title, content, warnings, pdfPages, docId } = response.data;

        if (warnings && warnings.length > 0) {
          console.warn('解析警告:', warnings);
        }

        // 处理图片 URL（添加后端地址前缀）
        let processedContent = content;
        const backendUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3001';
        processedContent = processedContent.replace(
          /src="\/uploads\//g,
          `src="${backendUrl}/uploads/`
        );

        // 处理 PDF 页面图片 URL
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

      // 其他文件类型在前端处理
      const text = await file.text();
      let htmlContent = '';
      let title = file.name.replace(/\.(md|markdown|html|txt)$/i, '');

      if (fileExtension === 'md' || fileExtension === 'markdown') {
        // Markdown 转 HTML
        htmlContent = marked.parse(text);
      } else if (fileExtension === 'html' || fileExtension === 'htm') {
        // 直接使用 HTML
        htmlContent = text;

        // 尝试提取标题
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
        // 纯文本转换为段落
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

  // 从 Notion 公开链接获取内容
  const handleNotionImport = async () => {
    if (!notionUrl.trim()) {
      setError('请输入 Notion 链接');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // 检查是否是 Notion 链接
      if (!notionUrl.includes('notion.so') && !notionUrl.includes('notion.site')) {
        throw new Error('请输入有效的 Notion 链接');
      }

      // 由于浏览器 CORS 限制，我们通过后端代理获取
      const proxyUrl = 'https://api.allorigins.win/raw?url=';
      const response = await fetch(proxyUrl + encodeURIComponent(notionUrl));

      if (!response.ok) {
        throw new Error('无法访问该 Notion 页面。请确保页面已公开分享');
      }

      const html = await response.text();

      // 提取标题
      let title = 'Notion 导入文档';
      const titleMatch = html.match(/<title>(.*?)<\/title>/i);
      if (titleMatch) {
        title = titleMatch[1].split('|')[0].trim();
      }

      // 提取主要内容区域
      let content = html;

      // 尝试提取 body 内容
      const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
      if (bodyMatch) {
        content = bodyMatch[1];
      }

      // 清理 Notion 特定的脚本和样式
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

  // 从 Twitter/X 导入
  const handleTwitterFetch = async () => {
    if (!twitterUrl.trim()) {
      setError('请输入 Twitter/X 链接');
      return;
    }

    setLoading(true);
    setError('');
    setProgress('正在获取推文内容...');
    setTwitterPreview(null);

    try {
      const response = await twitterAPI.fetch(twitterUrl);
      setTwitterPreview(response.data);
    } catch (err) {
      setError(err.response?.data?.error || '获取推文失败，请检查链接是否正确');
    } finally {
      setLoading(false);
      setProgress('');
    }
  };

  const handleTwitterImport = () => {
    if (!twitterPreview) return;

    // Convert tweet content to HTML
    const htmlContent = `
      <div class="tweet-content">
        <p>${twitterPreview.content.replace(/\n/g, '<br>')}</p>
        <p class="tweet-meta" style="color: #666; font-size: 0.9em; margin-top: 1em;">
          — ${twitterPreview.author} ${twitterPreview.timestamp ? `(${twitterPreview.timestamp})` : ''}
        </p>
      </div>
    `;

    showConfirmStep({
      title: `Tweet by ${twitterPreview.author}`,
      content: htmlContent,
      sourceType: 'twitter',
      sourceUrl: twitterPreview.originalUrl,
      originalContent: twitterPreview.content, // Keep original for translation
    });
  };

  // 从剪贴板导入
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

      // 检测是否是 Markdown
      if (text.includes('# ') || text.includes('## ') || text.includes('```')) {
        htmlContent = marked.parse(text);
        // 提取第一个标题作为标题
        const titleMatch = text.match(/^#\s+(.+)$/m);
        if (titleMatch) {
          title = titleMatch[1];
        }
      } else if (text.includes('<html') || text.includes('<!DOCTYPE')) {
        // HTML
        htmlContent = text;
        const titleMatch = text.match(/<h1[^>]*>(.*?)<\/h1>/i);
        if (titleMatch) {
          title = titleMatch[1].replace(/<[^>]+>/g, '');
        }
      } else {
        // 纯文本
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">
            {showConfirm ? '确认导入' : '导入文档'}
          </h2>
          <button
            onClick={() => {
              if (showConfirm) {
                resetConfirm();
              } else {
                onClose();
              }
            }}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs - 确认步骤时隐藏 */}
        {!showConfirm && (
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('file')}
              className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === 'file'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              上传文件
            </button>
            <button
              onClick={() => setActiveTab('notion')}
              className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === 'notion'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Notion 导入
            </button>
            <button
              onClick={() => setActiveTab('paste')}
              className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === 'paste'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              粘贴导入
            </button>
            <button
              onClick={() => setActiveTab('twitter')}
              className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === 'twitter'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Twitter/X
            </button>
          </div>
        )}

        {/* Content */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          {!showConfirm && activeTab === 'file' && (
            <div>
              <p className="text-gray-600 mb-4">
                支持上传 PDF、Word (.docx)、Markdown (.md)、HTML (.html) 或纯文本 (.txt) 文件
              </p>

              <label className="block">
                <input
                  type="file"
                  accept=".pdf,.docx,.doc,.md,.markdown,.html,.htm,.txt"
                  onChange={handleFileUpload}
                  disabled={loading}
                  className="block w-full text-sm text-gray-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-lg file:border-0
                    file:text-sm file:font-medium
                    file:bg-blue-50 file:text-blue-700
                    hover:file:bg-blue-100
                    file:cursor-pointer cursor-pointer
                    disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </label>

              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">支持的格式：</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• <strong>PDF (.pdf)</strong> - 自动提取文字和标题</li>
                  <li>• <strong>Word (.docx)</strong> - 保留格式和图片</li>
                  <li>• <strong>Markdown (.md)</strong> - 自动转换为富文本格式</li>
                  <li>• <strong>HTML (.html)</strong> - 保留原有格式</li>
                  <li>• <strong>纯文本 (.txt)</strong> - 转换为段落</li>
                </ul>
              </div>

              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">PDF 和 Word 文件说明：</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• PDF 文件会自动识别章节标题并提取纯文本</li>
                  <li>• Word 文档会保留标题、段落格式和图片</li>
                  <li>• 图片会自动提取并保存</li>
                  <li>• 最大文件大小：50MB</li>
                </ul>
              </div>
            </div>
          )}

          {!showConfirm && activeTab === 'notion' && (
            <div>
              <p className="text-gray-600 mb-4">
                输入公开的 Notion 页面链接来导入内容
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notion 页面链接
                  </label>
                  <input
                    type="url"
                    value={notionUrl}
                    onChange={(e) => setNotionUrl(e.target.value)}
                    placeholder="https://notion.so/your-page-url"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={loading}
                  />
                </div>

                <button
                  onClick={handleNotionImport}
                  disabled={loading || !notionUrl.trim()}
                  className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? '导入中...' : '导入 Notion 页面'}
                </button>
              </div>

              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">使用步骤：</h4>
                <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                  <li>在 Notion 中打开要导入的页面</li>
                  <li>点击右上角的"分享"按钮</li>
                  <li>启用"Share to web"（分享到网络）</li>
                  <li>复制公开链接并粘贴到上面的输入框</li>
                  <li>点击"导入 Notion 页面"按钮</li>
                </ol>
              </div>

              <div className="mt-4 p-4 bg-yellow-50 rounded-lg">
                <p className="text-sm text-yellow-800">
                  <strong>注意：</strong>只能导入已公开分享的 Notion 页面。私有页面无法导入。
                </p>
              </div>
            </div>
          )}

          {!showConfirm && activeTab === 'paste' && (
            <div>
              <p className="text-gray-600 mb-4">
                从剪贴板粘贴 Markdown、HTML 或纯文本内容
              </p>

              <button
                onClick={handlePasteImport}
                disabled={loading}
                className="w-full px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-lg font-medium"
              >
                {loading ? '导入中...' : '从剪贴板粘贴导入'}
              </button>

              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">使用方法：</h4>
                <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
                  <li>复制你想要导入的内容（Markdown、HTML 或纯文本）</li>
                  <li>点击上面的"从剪贴板粘贴导入"按钮</li>
                  <li>内容会自动转换为富文本格式</li>
                </ol>
              </div>

              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">支持的格式：</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Markdown 格式的文本</li>
                  <li>• HTML 代码</li>
                  <li>• 纯文本（会自动分段）</li>
                </ul>
              </div>
            </div>
          )}

          {!showConfirm && activeTab === 'twitter' && (
            <div>
              <p className="text-gray-600 mb-4">
                输入 Twitter/X 推文链接，自动获取内容并支持翻译
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    推文链接
                  </label>
                  <input
                    type="url"
                    value={twitterUrl}
                    onChange={(e) => {
                      setTwitterUrl(e.target.value);
                      setTwitterPreview(null);
                    }}
                    placeholder="https://x.com/username/status/1234567890"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={loading}
                  />
                </div>

                <button
                  onClick={handleTwitterFetch}
                  disabled={loading || !twitterUrl.trim()}
                  className="w-full px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? '获取中...' : '获取推文'}
                </button>

                {/* 推文预览 */}
                {twitterPreview && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-black flex items-center justify-center text-white font-bold">
                        {twitterPreview.author?.[0]?.toUpperCase() || 'X'}
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">{twitterPreview.author}</p>
                        {twitterPreview.timestamp && (
                          <p className="text-xs text-gray-500">{twitterPreview.timestamp}</p>
                        )}
                        <p className="mt-2 text-gray-800 whitespace-pre-wrap">{twitterPreview.content}</p>
                        {twitterPreview.likes !== undefined && (
                          <div className="mt-3 flex items-center gap-4 text-sm text-gray-500">
                            <span>{twitterPreview.likes} likes</span>
                            <span>{twitterPreview.retweets} retweets</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={handleTwitterImport}
                      className="mt-4 w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                    >
                      导入此推文
                    </button>
                  </div>
                )}
              </div>

              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">功能说明：</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• 支持 twitter.com 和 x.com 链接</li>
                  <li>• 自动提取推文文字内容</li>
                  <li>• 导入后支持"边听边看"功能</li>
                  <li>• 支持付费翻译成中文（¥0.5/篇）</li>
                </ul>
              </div>

              <div className="mt-4 p-4 bg-yellow-50 rounded-lg">
                <p className="text-sm text-yellow-800">
                  <strong>提示：</strong>翻译功能为付费服务，导入后在阅读时可选择购买翻译。
                </p>
              </div>
            </div>
          )}

          {!showConfirm && loading && (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              <span className="text-gray-600 mt-3">{progress || '处理中...'}</span>
            </div>
          )}

          {/* 确认步骤：设置价格和可见性 */}
          {showConfirm && pendingImport && (
            <div className="border-t border-gray-200 pt-6 mt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                文档设置
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                即将导入: <strong>{pendingImport.title}</strong>
              </p>

              {/* 可见性设置 */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  文档可见性
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="visibility"
                      checked={isPublic}
                      onChange={() => setIsPublic(true)}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      公开 <span className="text-gray-500">- 所有人可见</span>
                    </span>
                  </label>
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="visibility"
                      checked={!isPublic}
                      onChange={() => setIsPublic(false)}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      私有 <span className="text-gray-500">- 仅自己可见</span>
                    </span>
                  </label>
                </div>
              </div>

              {/* 价格设置 */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  文档价格
                </label>
                <div className="flex items-center gap-3">
                  <div className="relative flex-1 max-w-xs">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">¥</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0"
                    />
                  </div>
                  <span className="text-sm text-gray-500">
                    {price === 0 || price === '' || price === '0' ? '免费' : `付费 ¥${price}`}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  设置为 0 表示免费阅读
                </p>
              </div>

              {/* 提示信息 */}
              {!isPublic && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800 mb-4">
                  私有文档不会出现在公开列表中，只有您自己可以看到。
                </div>
              )}

              {isPublic && price > 0 && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800 mb-4">
                  付费文档将显示在公开列表中，其他用户需要付费后才能阅读全部内容。
                </div>
              )}

              {/* 确认按钮 */}
              <div className="flex gap-3 mt-6">
                <button
                  onClick={resetConfirm}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  返回
                </button>
                <button
                  onClick={handleConfirmImport}
                  className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  确认导入
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer - 确认步骤时隐藏 */}
        {!showConfirm && (
          <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
            <button
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              取消
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
