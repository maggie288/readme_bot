import { useState, useRef, useEffect } from 'react';
import { voiceAPI } from '../services/api';

export default function VoiceRecorder({ isOpen, onClose, onVoiceCloned }) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const [voiceInfo, setVoiceInfo] = useState(null);
  const [loadingVoiceInfo, setLoadingVoiceInfo] = useState(true);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const audioRef = useRef(null);

  // 加载现有声音信息
  useEffect(() => {
    if (isOpen) {
      loadVoiceInfo();
    }
  }, [isOpen]);

  const loadVoiceInfo = async () => {
    setLoadingVoiceInfo(true);
    try {
      const response = await voiceAPI.getMy();
      setVoiceInfo(response.data);
    } catch (error) {
      console.error('Load voice info error:', error);
    } finally {
      setLoadingVoiceInfo(false);
    }
  };

  // 清理资源
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  const startRecording = async () => {
    setError('');
    setAudioBlob(null);
    setAudioUrl(null);
    audioChunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // 使用 webm 格式以获得更好的兼容性
      const mimeType = MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/ogg';

      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType });

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);

        // 停止所有音轨
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start(100); // 每100ms收集一次数据
      setIsRecording(true);
      setRecordingTime(0);

      // 开始计时
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          // 最长录制30秒
          if (prev >= 30) {
            stopRecording();
            return 30;
          }
          return prev + 1;
        });
      }, 1000);

    } catch (error) {
      console.error('Start recording error:', error);
      setError('无法访问麦克风，请确保已授权麦克风权限');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const handleUpload = async () => {
    if (!audioBlob) return;

    setIsUploading(true);
    setError('');

    try {
      // 将 blob 转换为 File 对象
      const file = new File([audioBlob], 'voice_sample.webm', { type: audioBlob.type });

      const response = await voiceAPI.clone(file);

      if (response.data.success) {
        setVoiceInfo({
          hasVoice: true,
          voiceId: response.data.voiceId,
          voiceName: response.data.voiceName,
          createdAt: new Date().toISOString(),
        });

        if (onVoiceCloned) {
          onVoiceCloned(response.data);
        }

        // 清理录音
        setAudioBlob(null);
        setAudioUrl(null);
        setRecordingTime(0);
      }
    } catch (error) {
      console.error('Upload voice error:', error);
      setError(error.response?.data?.error || '声音上传失败，请重试');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteVoice = async () => {
    if (!confirm('确定要删除自定义声音吗？')) return;

    try {
      await voiceAPI.delete();
      setVoiceInfo({ hasVoice: false });
    } catch (error) {
      console.error('Delete voice error:', error);
      setError('删除失败，请重试');
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]">
      <div className="bg-white rounded-2xl w-full max-w-md mx-4 overflow-hidden shadow-2xl">
        {/* 头部 */}
        <div className="bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-4 text-white">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">声音克隆</h2>
            <button
              onClick={onClose}
              className="p-1 hover:bg-white/20 rounded-full transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-purple-100 text-sm mt-1">
            录制您的声音，用于朗读文档
          </p>
        </div>

        {/* 内容 */}
        <div className="p-6">
          {loadingVoiceInfo ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
            </div>
          ) : voiceInfo?.hasVoice ? (
            /* 已有声音 */
            <div className="text-center">
              <div className="w-20 h-20 mx-auto bg-purple-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-10 h-10 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                {voiceInfo.voiceName || '我的声音'}
              </h3>
              <p className="text-sm text-gray-500 mb-6">
                创建于 {new Date(voiceInfo.createdAt).toLocaleDateString('zh-CN')}
              </p>

              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => {
                    setVoiceInfo({ hasVoice: false });
                  }}
                  className="px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors"
                >
                  重新录制
                </button>
                <button
                  onClick={handleDeleteVoice}
                  className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                >
                  删除声音
                </button>
              </div>
            </div>
          ) : (
            /* 录制界面 */
            <div>
              {/* 录音按钮区域 */}
              <div className="text-center mb-6">
                {!audioBlob ? (
                  <>
                    {/* 录音按钮 */}
                    <button
                      onClick={isRecording ? stopRecording : startRecording}
                      className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto transition-all ${
                        isRecording
                          ? 'bg-red-500 hover:bg-red-600 animate-pulse'
                          : 'bg-purple-500 hover:bg-purple-600'
                      }`}
                    >
                      {isRecording ? (
                        <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
                          <rect x="6" y="6" width="12" height="12" rx="2" />
                        </svg>
                      ) : (
                        <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                        </svg>
                      )}
                    </button>

                    {/* 录制时间 */}
                    <div className="mt-4">
                      <span className={`text-2xl font-mono ${isRecording ? 'text-red-500' : 'text-gray-400'}`}>
                        {formatTime(recordingTime)}
                      </span>
                      <span className="text-gray-400 text-sm"> / 00:30</span>
                    </div>

                    {/* 提示 */}
                    <p className="mt-4 text-sm text-gray-500">
                      {isRecording
                        ? '正在录制，点击停止...'
                        : '点击开始录制，建议录制 10-30 秒'}
                    </p>
                  </>
                ) : (
                  /* 预览区域 */
                  <>
                    <div className="w-20 h-20 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-4">
                      <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <p className="text-gray-700 font-medium mb-2">录制完成！</p>
                    <p className="text-sm text-gray-500 mb-4">时长: {formatTime(recordingTime)}</p>

                    {/* 音频预览 */}
                    <audio
                      ref={audioRef}
                      src={audioUrl}
                      controls
                      className="w-full mb-4"
                    />

                    {/* 操作按钮 */}
                    <div className="flex gap-3 justify-center">
                      <button
                        onClick={() => {
                          setAudioBlob(null);
                          setAudioUrl(null);
                          setRecordingTime(0);
                        }}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        重新录制
                      </button>
                      <button
                        onClick={handleUpload}
                        disabled={isUploading}
                        className="px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isUploading ? (
                          <span className="flex items-center gap-2">
                            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            克隆中...
                          </span>
                        ) : '开始克隆'}
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* 错误提示 */}
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {error}
                </div>
              )}

              {/* 说明 */}
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                  <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  录制建议
                </h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>- 在安静的环境中录制</li>
                  <li>- 使用清晰、自然的语调朗读</li>
                  <li>- 建议录制 10-30 秒</li>
                  <li>- 可以朗读任意中文内容</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
