import { useState } from 'react';
import ReadAloud from './ReadAloud';
import AIChat from './AIChat';
import Notes from './Notes';
import TableOfContents from './TableOfContents';

export default function Sidebar({
  documentId,
  content,
  chapters,
  // 朗读相关 props
  onSentenceChange,
  onPlayStateChange,
  startFromSentence = 0,
  // 阅读进度相关
  initialProgress = null,
  onProgressChange
}) {
  const [activePanel, setActivePanel] = useState(null);

  const togglePanel = (panel) => {
    setActivePanel(activePanel === panel ? null : panel);
  };

  return (
    <div className="relative">
      {/* Button Column */}
      <div className="fixed right-0 top-20 bg-gray-50 border-l border-gray-200 p-2 flex flex-col gap-2 z-30">
        <button
          type="button"
          onClick={() => togglePanel('toc')}
          className={`p-3 rounded-lg transition-colors ${
            activePanel === 'toc'
              ? 'bg-blue-500 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-100'
          }`}
          title="查看目录"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>

        <button
          type="button"
          onClick={() => togglePanel('read')}
          className={`p-3 rounded-lg transition-colors ${
            activePanel === 'read'
              ? 'bg-blue-500 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-100'
          }`}
          title="边听边看"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
            />
          </svg>
        </button>

        <button
          type="button"
          onClick={() => togglePanel('ai')}
          className={`p-3 rounded-lg transition-colors ${
            activePanel === 'ai'
              ? 'bg-blue-500 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-100'
          }`}
          title="AI提问"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </button>

        <button
          type="button"
          onClick={() => togglePanel('notes')}
          className={`p-3 rounded-lg transition-colors ${
            activePanel === 'notes'
              ? 'bg-blue-500 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-100'
          }`}
          title="备注"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
            />
          </svg>
        </button>
      </div>

      {/* Expandable Panel - 绝对定位覆盖层，不挤压正文 */}
      {activePanel && (
        <div className="fixed right-14 top-20 bottom-4 w-80 bg-white border-l border-gray-200 shadow-lg overflow-y-auto z-20 rounded-l-lg">
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">
                {activePanel === 'toc' && '目录'}
                {activePanel === 'read' && '边听边看'}
                {activePanel === 'ai' && 'AI 提问'}
                {activePanel === 'notes' && '我的备注'}
              </h3>
              <button
                type="button"
                onClick={() => setActivePanel(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {activePanel === 'toc' && <TableOfContents chapters={chapters} content={content} />}
            {activePanel === 'read' && (
              <ReadAloud
                content={content}
                documentId={documentId}
                onSentenceChange={onSentenceChange}
                onPlayStateChange={onPlayStateChange}
                startFromSentence={startFromSentence}
                initialProgress={initialProgress}
                onProgressChange={onProgressChange}
              />
            )}
            {activePanel === 'ai' && <AIChat content={content} />}
            {activePanel === 'notes' && <Notes documentId={documentId} />}
          </div>
        </div>
      )}
    </div>
  );
}
