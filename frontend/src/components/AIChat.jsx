import { useState } from 'react';
import { aiAPI } from '../services/api';

export default function AIChat({ content }) {
  const [question, setQuestion] = useState('');
  const [conversation, setConversation] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleAsk = async (e) => {
    e.preventDefault();
    if (!question.trim()) return;

    const userQuestion = question.trim();
    setQuestion('');
    setConversation((prev) => [
      ...prev,
      { role: 'user', text: userQuestion },
    ]);
    setLoading(true);

    try {
      const response = await aiAPI.ask(userQuestion, content);
      setConversation((prev) => [
        ...prev,
        { role: 'assistant', text: response.data.answer },
      ]);
    } catch (error) {
      console.error('AI error:', error);
      setConversation((prev) => [
        ...prev,
        {
          role: 'error',
          text: error.response?.data?.error || '抱歉，AI 服务暂时不可用',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-200px)]">
      <div className="flex-1 overflow-y-auto space-y-4 mb-4">
        {conversation.length === 0 ? (
          <div className="text-center text-gray-400 mt-8">
            <p>向 AI 提问关于文档的任何问题</p>
            <p className="text-sm mt-2">AI 会基于文档内容回答您</p>
          </div>
        ) : (
          conversation.map((msg, index) => (
            <div
              key={index}
              className={`p-3 rounded-lg ${
                msg.role === 'user'
                  ? 'bg-blue-50 text-blue-900'
                  : msg.role === 'error'
                  ? 'bg-red-50 text-red-900'
                  : 'bg-gray-50 text-gray-900'
              }`}
            >
              <div className="text-xs font-semibold mb-1">
                {msg.role === 'user' ? '您' : msg.role === 'error' ? '错误' : 'AI'}
              </div>
              <div className="text-sm whitespace-pre-wrap">{msg.text}</div>
            </div>
          ))
        )}
        {loading && (
          <div className="flex items-center justify-center p-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
          </div>
        )}
      </div>

      <form onSubmit={handleAsk} className="flex gap-2">
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="输入您的问题..."
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !question.trim()}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm"
        >
          发送
        </button>
      </form>
    </div>
  );
}
