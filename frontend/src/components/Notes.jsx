import { useState, useEffect } from 'react';
import { notesAPI } from '../services/api';

export default function Notes({ documentId }) {
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');

  useEffect(() => {
    if (documentId) {
      loadNotes();
    }
  }, [documentId]);

  const loadNotes = async () => {
    try {
      const response = await notesAPI.getByDocument(documentId);
      setNotes(response.data);
    } catch (error) {
      console.error('Load notes error:', error);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newNote.trim()) return;

    setLoading(true);
    try {
      await notesAPI.create({
        documentId,
        content: newNote.trim(),
      });
      setNewNote('');
      await loadNotes();
    } catch (error) {
      console.error('Create note error:', error);
      alert('创建备注失败');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (id) => {
    if (!editText.trim()) return;

    try {
      await notesAPI.update(id, editText.trim());
      setEditingId(null);
      setEditText('');
      await loadNotes();
    } catch (error) {
      console.error('Update note error:', error);
      alert('更新备注失败');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('确定要删除这条备注吗？')) return;

    try {
      await notesAPI.delete(id);
      await loadNotes();
    } catch (error) {
      console.error('Delete note error:', error);
      alert('删除备注失败');
    }
  };

  const startEdit = (note) => {
    setEditingId(note.id);
    setEditText(note.content);
  };

  return (
    <div className="space-y-4">
      {/* Create Note Form */}
      <form onSubmit={handleCreate} className="space-y-2">
        <textarea
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          placeholder="添加新备注..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none"
          rows="3"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !newNote.trim()}
          className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm"
        >
          添加备注
        </button>
      </form>

      {/* Notes List */}
      <div className="space-y-3 max-h-[500px] overflow-y-auto">
        {notes.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-8">
            还没有备注
          </p>
        ) : (
          notes.map((note) => (
            <div
              key={note.id}
              className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg"
            >
              {editingId === note.id ? (
                <div className="space-y-2">
                  <textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm resize-none"
                    rows="3"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleUpdate(note.id)}
                      className="flex-1 px-3 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600"
                    >
                      保存
                    </button>
                    <button
                      onClick={() => {
                        setEditingId(null);
                        setEditText('');
                      }}
                      className="flex-1 px-3 py-1 bg-gray-300 text-gray-700 rounded text-xs hover:bg-gray-400"
                    >
                      取消
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-sm text-gray-800 whitespace-pre-wrap mb-2">
                    {note.content}
                  </p>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>
                      {new Date(note.createdAt).toLocaleDateString('zh-CN')}
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => startEdit(note)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        编辑
                      </button>
                      <button
                        onClick={() => handleDelete(note.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        删除
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
