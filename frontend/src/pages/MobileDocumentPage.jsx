import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { documentsAPI } from '../services/api';

export default function MobileDocumentPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [document, setDocument] = useState(null);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fontSize, setFontSize] = useState(16);
  const [showControls, setShowControls] = useState(true);
  const [isReading, setIsReading] = useState(false);
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);
  const [sentences, setSentences] = useState([]);
  const [contentTab, setContentTab] = useState('original');
  const [translatedContent, setTranslatedContent] = useState(null);
  const [showTranslationPanel, setShowTranslationPanel] = useState(false);
  const [debugInfo, setDebugInfo] = useState('');

  const contentRef = useRef(null);
  const controlsTimeoutRef = useRef(null);
  const speechSynthesisRef = useRef(null);

  const logDebug = useCallback((msg) => {
    const timestamp = new Date().toLocaleTimeString();
    const logMsg = `[${timestamp}] ${msg}`;
    console.log(logMsg);
    setDebugInfo(prev => prev ? `${prev}\n${logMsg}` : logMsg);
  }, []);

  const loadDocument = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      logDebug(`开始加载文档: ${id}`);
      
      const response = await documentsAPI.getById(id);
      logDebug(`文档加载成功: ${response.data.title}`);
      
      setDocument(response.data);
      setContent(response.data.content || '');
      if (response.data.translatedContent) {
        setTranslatedContent(response.data.translatedContent);
        logDebug('翻译内容已加载');
      }
    } catch (error) {
      console.error('Load document error:', error);
      logDebug(`加载失败: ${error.message}`);
      setError(error.response?.data?.error || '加载文档失败');
    } finally {
      setLoading(false);
      logDebug(`加载完成, loading=${false}`);
    }
  }, [id, logDebug]);

  useEffect(() => {
    loadDocument();
    return () => {
      if (speechSynthesisRef.current) {
        window.speechSynthesis.cancel();
      }
    };
  }, [loadDocument]);

  const splitIntoSentences = useCallback((html) => {
    if (!html || typeof html !== 'string') return [];
    const div = document.createElement('div');
    div.innerHTML = html;
    let text = div.textContent || div.innerText || '';
    text = text.replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim();
    if (!text) return [];
    let sentences = text
      .split(/(?<=[。！？.!?;；:：])\s*/g)
      .map(s => s.trim())
      .filter(s => s.length > 0);
    if (sentences.length < 3) {
      const lines = text.split(/\n+/g).map(s => s.trim()).filter(s => s.length > 0);
      if (lines.length > sentences.length) sentences = lines;
    }
    sentences = sentences.filter(s => {
      const cleaned = s.replace(/[\s，。！？.!?;；:：]+/g, '').trim();
      return cleaned.length > 5;
    });
    return sentences.length > 0 ? sentences : [text];
  }, []);

  useEffect(() => {
    if (content) {
      const parsed = splitIntoSentences(content);
      setSentences(parsed);
    }
  }, [content, splitIntoSentences]);

  const handleTouchStart = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      if (isReading) {
        setShowControls(false);
      }
    }, 3000);
  };

  const toggleRead = () => {
    if (isReading) {
      stopReading();
    } else {
      startReading();
    }
  };

  const startReading = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsReading(true);
      setCurrentSentenceIndex(0);
      speakSentence(0);
    }
  };

  const stopReading = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsReading(false);
  };

  const speakSentence = useCallback((index) => {
    if (index >= sentences.length || !isReading) return;
    const sentence = sentences[index];
    const utterance = new SpeechSynthesisUtterance(sentence);
    utterance.lang = 'zh-CN';
    utterance.rate = 1.0;
    utterance.onend = () => {
      if (index + 1 < sentences.length && isReading) {
        setCurrentSentenceIndex(index + 1);
        speakSentence(index + 1);
      } else {
        setIsReading(false);
      }
    };
    utterance.onerror = () => {
      setIsReading(false);
    };
    window.speechSynthesis.speak(utterance);
  }, [sentences, isReading]);

  const speakCurrentSentence = () => {
    if (sentences[currentSentenceIndex]) {
      const utterance = new SpeechSynthesisUtterance(sentences[currentSentenceIndex]);
      utterance.lang = 'zh-CN';
      window.speechSynthesis.speak(utterance);
    }
  };

  const goToPrevSentence = () => {
    const newIndex = Math.max(0, currentSentenceIndex - 1);
    setCurrentSentenceIndex(newIndex);
    scrollToSentence(newIndex);
    if (isReading) {
      window.speechSynthesis.cancel();
      speakSentence(newIndex);
    }
  };

  const goToNextSentence = () => {
    const newIndex = Math.min(sentences.length - 1, currentSentenceIndex + 1);
    setCurrentSentenceIndex(newIndex);
    scrollToSentence(newIndex);
    if (isReading) {
      window.speechSynthesis.cancel();
      speakSentence(newIndex);
    }
  };

  const scrollToSentence = (index) => {
    const element = document.querySelector(`[data-sentence-index="${index}"]`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const increaseFont = () => setFontSize(prev => Math.min(prev + 2, 24));
  const decreaseFont = () => setFontSize(prev => Math.max(prev - 2, 12));

  const currentContent = contentTab === 'translation' && translatedContent ? translatedContent : content;

  const switchToDesktop = () => {
    const url = new URL(window.location.href);
    url.searchParams.set('view', 'desktop');
    window.location.href = url.toString();
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
        <div className="text-gray-500">加载中...</div>
        {debugInfo && (
          <div className="mt-4 p-4 bg-gray-100 rounded text-xs text-gray-600 max-w-xs whitespace-pre-wrap">
            {debugInfo}
          </div>
        )}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
        <div className="text-red-500 mb-4">{error}</div>
        <div className="text-sm text-gray-500 mb-4">文档 ID: {id}</div>
        {debugInfo && (
          <div className="mb-4 p-4 bg-gray-100 rounded text-xs text-gray-600 max-w-xs whitespace-pre-wrap max-h-40 overflow-auto">
            {debugInfo}
          </div>
        )}
        <div className="flex gap-2">
          <button
            onClick={() => loadDocument()}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg"
          >
            重试
          </button>
          <button
            onClick={switchToDesktop}
            className="px-4 py-2 bg-gray-500 text-white rounded-lg"
          >
            切换桌面版
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
    <div
      className="min-h-screen bg-gray-50"
      onTouchStart={handleTouchStart}
    >
      {/* 顶部导航栏 */}
      <div
        className={`fixed top-0 left-0 right-0 bg-white shadow-sm z-50 transition-transform duration-300 ${
          showControls ? 'translate-y-0' : '-translate-y-full'
        }`}
      >
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 rounded-full hover:bg-gray-100"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="flex-1 text-center text-lg font-medium truncate mx-2">
            {document?.title || '文档阅读'}
          </h1>
          <button
            onClick={() => setShowTranslationPanel(!showTranslationPanel)}
            className="p-2 -mr-2 rounded-full hover:bg-gray-100"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
            </svg>
          </button>
        </div>
      </div>

      {/* 内容区域 */}
      <div className="pt-16 pb-24 px-4">
        {/* 标题 */}
        <h1 className="text-2xl font-bold text-gray-900 mb-6">{document?.title}</h1>

        {/* 内容标签 */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setContentTab('original')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              contentTab === 'original'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-700'
            }`}
          >
            原文
          </button>
          {document?.hasTranslation && (
            <button
              onClick={() => setContentTab('translation')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                contentTab === 'translation'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-700'
              }`}
            >
              翻译
            </button>
          )}
        </div>

        {/* 正文内容 */}
        <div
          ref={contentRef}
          className="readable-content"
          style={{ fontSize: `${fontSize}px` }}
          dangerouslySetInnerHTML={{ __html: currentContent }}
        />
      </div>

      {/* 底部控制栏 */}
      <div
        className={`fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 transition-transform duration-300 ${
          showControls ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        {/* 朗读进度 */}
        {sentences.length > 0 && (
          <div className="px-4 py-2">
            <div className="flex items-center justify-between text-sm text-gray-500 mb-1">
              <span>{currentSentenceIndex + 1}/{sentences.length}</span>
              <span>{Math.round((currentSentenceIndex / sentences.length) * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max={sentences.length - 1}
              value={currentSentenceIndex}
              onChange={(e) => {
                const index = parseInt(e.target.value);
                setCurrentSentenceIndex(index);
                scrollToSentence(index);
              }}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
          </div>
        )}

        {/* 控制按钮 */}
        <div className="flex items-center justify-around px-4 py-3">
          {/* 字体大小 */}
          <div className="flex items-center gap-2">
            <button
              onClick={decreaseFont}
              className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-700"
            >
              <span className="text-sm font-bold">A-</span>
            </button>
            <button
              onClick={increaseFont}
              className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-700"
            >
              <span className="text-lg font-bold">A+</span>
            </button>
          </div>

          {/* 上一句 */}
          <button
            onClick={goToPrevSentence}
            className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* 播放/暂停 */}
          <button
            onClick={toggleRead}
            className={`w-14 h-14 rounded-full flex items-center justify-center ${
              isReading ? 'bg-red-500' : 'bg-blue-500'
            }`}
          >
            {isReading ? (
              <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
              </svg>
            ) : (
              <svg className="w-7 h-7 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>

          {/* 下一句 */}
          <button
            onClick={goToNextSentence}
            className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {/* 当前句子朗读 */}
          <button
            onClick={speakCurrentSentence}
            className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            </svg>
          </button>
        </div>
      </div>

      {/* 翻译面板 */}
      {showTranslationPanel && (
        <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowTranslationPanel(false)}>
          <div
            className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl p-4 max-h-96 overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">翻译</h3>
              <button
                onClick={() => setShowTranslationPanel(false)}
                className="p-2 rounded-full hover:bg-gray-100"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {!translatedContent ? (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">购买翻译后即可查看双语对照</p>
                <button className="px-6 py-2 bg-blue-500 text-white rounded-lg">
                  购买翻译 ¥0.5
                </button>
              </div>
            ) : (
              <div
                className="readable-content"
                style={{ fontSize: `${fontSize}px` }}
                dangerouslySetInnerHTML={{ __html: translatedContent }}
              />
            )}
          </div>
        </div>
      )}

      {/* 显示控制提示 */}
      <div className="fixed bottom-24 left-1/2 transform -translate-x-1/2 text-sm text-gray-400 pointer-events-none">
        点击屏幕显示/隐藏控制栏
      </div>

      {/* 切换桌面版按钮 */}
      <button
        onClick={switchToDesktop}
        className="fixed bottom-24 right-4 bg-gray-800 text-white px-3 py-2 rounded-full text-sm shadow-lg z-40"
      >
        桌面版
      </button>
    </div>
  );
}
