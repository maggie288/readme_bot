import { useState } from 'react';
import AIChat from './AIChat';
import Notes from './Notes';
import TableOfContents from './TableOfContents';

export default function MobileSidebar({
  isOpen,
  onClose,
  documentId,
  content,
  chapters,
  onSentenceChange,
  onPlayStateChange,
  startFromSentence = 0,
  initialProgress = null,
  onProgressChange,
  onCloseReading,
  jumpToSentence,
  setJumpToSentence
}) {
  const [activePanel, setActivePanel] = useState('toc'); // 'toc', 'ai', 'notes'

  const handlePanelChange = (panel) => {
    setActivePanel(panel);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* 遮罩层 */}
      <div 
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      
      {/* 侧边栏内容 */}
      <div className="absolute right-0 top-0 bottom-0 w-4/5 max-w-sm bg-white shadow-xl flex flex-col">
        {/* 头部 */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {activePanel === 'toc' && '目录'}
            {activePanel === 'ai' && 'AI 问答'}
            {activePanel === 'notes' && '笔记'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 -mr-2 text-gray-500 hover:text-gray-700"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 面板切换按钮 */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => handlePanelChange('toc')}
            className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 ${
              activePanel === 'toc'
                ? 'text-blue-500 border-b-2 border-blue-500'
                : 'text-gray-500'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            目录
          </button>
          <button
            onClick={() => handlePanelChange('ai')}
            className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 ${
              activePanel === 'ai'
                ? 'text-blue-500 border-b-2 border-blue-500'
                : 'text-gray-500'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            AI
          </button>
          <button
            onClick={() => handlePanelChange('notes')}
            className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 ${
              activePanel === 'notes'
                ? 'text-blue-500 border-b-2 border-blue-500'
                : 'text-gray-500'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            笔记
          </button>
        </div>

        {/* 内容区域 */}
        <div className="flex-1 overflow-y-auto p-4">
          {activePanel === 'toc' && (
            <TableOfContents 
              chapters={chapters} 
              content={content}
            />
          )}
          {activePanel === 'ai' && (
            <AIChat content={content} />
          )}
          {activePanel === 'notes' && (
            <Notes documentId={documentId} />
          )}
        </div>
      </div>
    </div>
  );
}
