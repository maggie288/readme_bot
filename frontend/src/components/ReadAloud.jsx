import { useState, useEffect, useRef, useCallback } from 'react';
import { voiceAPI } from '../services/api';
import VoiceRecorder from './VoiceRecorder';

// 将 HTML 内容按句子拆分
export function splitIntoSentences(html) {
  if (!html || typeof html !== 'string') {
    return [];
  }

  const div = document.createElement('div');
  div.innerHTML = html;
  let text = div.textContent || div.innerText || '';

  if (!text.trim()) {
    return [];
  }

  // 预处理：统一换行符为空格，合并多个空格
  text = text.replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim();

  if (!text) {
    return [];
  }

  // 按中英文句号、问号、感叹号、分号分割，保留分隔符
  // 添加更多分隔符：分号、冒号、换行（段落分割）
  const sentences = text
    .split(/(?<=[。！？.!?;；:：\n])\s*/g)
    .map(s => s.trim())
    .filter(s => s.length > 0);

  // 如果分割结果太少（少于3个句子），可能是纯英文或特殊格式
  // 尝试用换行符再次分割
  if (sentences.length < 3) {
    const lines = text.split(/\n+/g).map(s => s.trim()).filter(s => s.length > 0);
    if (lines.length > sentences.length) {
      return lines;
    }
  }

  // 如果还是没有句子，返回整个文本作为一个句子
  if (sentences.length === 0) {
    return [text];
  }

  return sentences;
}

export default function ReadAloud({
  content,
  onSentenceChange,
  startFromSentence = 0,
  onPlayStateChange,
  // 新增：阅读进度相关
  documentId,
  initialProgress = null,
  onProgressChange
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);
  const [sentences, setSentences] = useState([]);
  const [speed, setSpeed] = useState(initialProgress?.speed || 1.0);
  const utteranceRef = useRef(null);
  const isCancelledRef = useRef(false);
  const speedRef = useRef(speed);
  const isSpeedChangingRef = useRef(false);

  // 自定义声音相关状态
  const [useCustomVoice, setUseCustomVoice] = useState(false);
  const [customVoiceInfo, setCustomVoiceInfo] = useState(null);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [loadingVoiceInfo, setLoadingVoiceInfo] = useState(true);
  const [synthesizingAudio, setSynthesizingAudio] = useState(false);
  const audioRef = useRef(null);

  // 保持 speedRef 同步
  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  // 加载自定义声音信息
  useEffect(() => {
    loadCustomVoiceInfo();
  }, []);

  const loadCustomVoiceInfo = async () => {
    setLoadingVoiceInfo(true);
    try {
      const response = await voiceAPI.getMy();
      setCustomVoiceInfo(response.data);
      // 如果有自定义声音，默认启用
      if (response.data.hasVoice) {
        setUseCustomVoice(true);
      }
    } catch (error) {
      console.error('Load custom voice info error:', error);
    } finally {
      setLoadingVoiceInfo(false);
    }
  };

  // 处理声音克隆成功
  const handleVoiceCloned = (data) => {
    setCustomVoiceInfo({
      hasVoice: true,
      voiceId: data.voiceId,
      voiceName: data.voiceName,
      createdAt: new Date().toISOString(),
    });
    setUseCustomVoice(true);
    setShowVoiceRecorder(false);
  };

  // 使用自定义声音朗读句子
  const speakWithCustomVoice = useCallback(async (index) => {
    if (index >= sentences.length || isCancelledRef.current) {
      setIsPlaying(false);
      setIsPaused(false);
      setSynthesizingAudio(false);
      if (onSentenceChange) {
        onSentenceChange(-1);
      }
      return;
    }

    const sentence = sentences[index];
    setCurrentSentenceIndex(index);
    if (onSentenceChange) {
      onSentenceChange(index);
    }

    setSynthesizingAudio(true);
    try {
      const response = await voiceAPI.synthesize(sentence, customVoiceInfo.voiceId);

      if (isCancelledRef.current) return;

      if (response.data.success && response.data.audioData) {
        // 播放 base64 编码的音频
        const audioSrc = `data:audio/mp3;base64,${response.data.audioData}`;

        if (audioRef.current) {
          audioRef.current.pause();
        }

        const audio = new Audio(audioSrc);
        audio.playbackRate = speedRef.current;
        audioRef.current = audio;

        audio.onended = () => {
          if (!isCancelledRef.current) {
            speakWithCustomVoice(index + 1);
          }
        };

        audio.onerror = () => {
          console.error('Audio playback error');
          if (!isCancelledRef.current) {
            speakWithCustomVoice(index + 1);
          }
        };

        await audio.play();
      } else {
        // 如果合成失败，跳到下一句
        speakWithCustomVoice(index + 1);
      }
    } catch (error) {
      console.error('Custom voice synthesis error:', error);
      // 失败时跳到下一句
      if (!isCancelledRef.current) {
        speakWithCustomVoice(index + 1);
      }
    } finally {
      setSynthesizingAudio(false);
    }
  }, [sentences, customVoiceInfo, onSentenceChange]);

  // 解析内容为句子并同步初始位置
  useEffect(() => {
    if (content) {
      const parsed = splitIntoSentences(content);
      setSentences(parsed);
      // 同步初始位置
      const initialIndex = initialProgress?.listenPosition || startFromSentence;
      if (initialIndex > 0 && initialIndex < (initialProgress?.totalSentences || Infinity)) {
        setCurrentSentenceIndex(initialIndex);
      } else {
        setCurrentSentenceIndex(startFromSentence);
      }
    }
  }, [content, initialProgress, startFromSentence]);

  // 使用 ref 存储最新的 handleJumpToSentence，避免 useEffect 循环依赖
  const handleJumpToSentenceRef = useRef(null);

  // 当外部 startFromSentence 改变时更新（点击句子触发）
  useEffect(() => {
    if (startFromSentence !== currentSentenceIndex) {
      if (isPlaying || isPaused) {
        // 使用 ref 来避免依赖 handleJumpToSentence
        if (handleJumpToSentenceRef.current) {
          handleJumpToSentenceRef.current(startFromSentence);
        }
      } else {
        setCurrentSentenceIndex(startFromSentence);
      }
    }
  }, [startFromSentence, currentSentenceIndex, isPlaying, isPaused]);

  // 通知父组件播放状态变化
  useEffect(() => {
    if (onPlayStateChange) {
      onPlayStateChange({ isPlaying, isPaused, currentSentenceIndex });
    }
  }, [isPlaying, isPaused, currentSentenceIndex, onPlayStateChange]);

  // 通知进度变化（用于保存到后端和同步到父组件）
  useEffect(() => {
    const progressData = {
      listenPosition: currentSentenceIndex,
      listenPercent: sentences.length > 0
        ? Math.round((currentSentenceIndex / sentences.length) * 100)
        : 0,
      speed: speed
    };

    // 保存到后端
    if (onProgressChange && sentences.length > 0) {
      onProgressChange(progressData);
    }

    // 同步状态到父组件（用于高亮和进度条）
    if (onPlayStateChange) {
      onPlayStateChange({
        isPlaying,
        isPaused,
        currentSentenceIndex
      });
    }
  }, [currentSentenceIndex, speed, sentences.length, isPlaying, isPaused, onProgressChange, onPlayStateChange]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // 语速实时变化处理 - 当语速改变且正在播放时，重新开始当前句子
  useEffect(() => {
    if (isPlaying && !isSpeedChangingRef.current) {
      isSpeedChangingRef.current = true;

      // 取消当前朗读
      window.speechSynthesis.cancel();

      // 短暂延迟后从当前句子重新开始
      setTimeout(() => {
        if (!isCancelledRef.current) {
          speakSentence(currentSentenceIndex);
        }
        isSpeedChangingRef.current = false;
      }, 100);
    }
  }, [speed]);

  // 朗读单个句子
  const speakSentence = useCallback((index) => {
    if (index >= sentences.length || isCancelledRef.current) {
      // 所有句子朗读完毕
      setIsPlaying(false);
      setIsPaused(false);
      if (onSentenceChange) {
        onSentenceChange(-1);
      }
      return;
    }

    const sentence = sentences[index];
    const utterance = new SpeechSynthesisUtterance(sentence);
    utterance.lang = 'zh-CN';
    utterance.rate = speedRef.current; // 使用 ref 获取最新值
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    utterance.onstart = () => {
      setCurrentSentenceIndex(index);
      if (onSentenceChange) {
        onSentenceChange(index);
      }
    };

    utterance.onend = () => {
      if (!isCancelledRef.current && !isSpeedChangingRef.current) {
        speakSentence(index + 1);
      }
    };

    utterance.onerror = (event) => {
      if (event.error !== 'canceled') {
        console.error('Speech synthesis error:', event);
      }
      if (!isCancelledRef.current && !isSpeedChangingRef.current) {
        speakSentence(index + 1);
      }
    };

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, [sentences, onSentenceChange]);

  const handlePlay = () => {
    if (!content || sentences.length === 0) {
      alert('文档内容为空');
      return;
    }

    if (isPaused && !useCustomVoice) {
      window.speechSynthesis.resume();
      setIsPaused(false);
      setIsPlaying(true);
    } else {
      isCancelledRef.current = false;
      window.speechSynthesis.cancel();
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setIsPlaying(true);
      setIsPaused(false);

      setTimeout(() => {
        if (useCustomVoice && customVoiceInfo?.hasVoice) {
          speakWithCustomVoice(currentSentenceIndex);
        } else {
          speakSentence(currentSentenceIndex);
        }
      }, 100);
    }
  };

  const handlePause = () => {
    if (window.speechSynthesis && isPlaying) {
      window.speechSynthesis.pause();
      setIsPaused(true);
      setIsPlaying(false);
    }
  };

  const handleStop = () => {
    isCancelledRef.current = true;

    // 停止浏览器 TTS
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    // 停止自定义声音播放
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    setIsPlaying(false);
    setIsPaused(false);
    setSynthesizingAudio(false);
    setCurrentSentenceIndex(0);
    if (onSentenceChange) {
      onSentenceChange(-1);
    }
  };

  // 跳转到指定句子并开始朗读
  const handleJumpToSentence = useCallback((index) => {
    if (index >= 0 && index < sentences.length) {
      isCancelledRef.current = true;
      window.speechSynthesis.cancel();
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setIsPaused(false);

      setTimeout(() => {
        isCancelledRef.current = false;
        setCurrentSentenceIndex(index);
        setIsPlaying(true);
        if (useCustomVoice && customVoiceInfo?.hasVoice) {
          speakWithCustomVoice(index);
        } else {
          speakSentence(index);
        }
      }, 100);
    }
  }, [sentences.length, speakSentence, speakWithCustomVoice, useCustomVoice, customVoiceInfo]);

  // 更新 ref 以供 useEffect 使用
  useEffect(() => {
    handleJumpToSentenceRef.current = handleJumpToSentence;
  }, [handleJumpToSentence]);

  // 上一句
  const handlePrevSentence = () => {
    const newIndex = Math.max(0, currentSentenceIndex - 1);
    handleJumpToSentence(newIndex);
  };

  // 下一句
  const handleNextSentence = () => {
    const newIndex = Math.min(sentences.length - 1, currentSentenceIndex + 1);
    handleJumpToSentence(newIndex);
  };

  // 处理语速变化
  const handleSpeedChange = (newSpeed) => {
    setSpeed(newSpeed);
  };

  // 计算进度百分比
  const progressPercent = sentences.length > 0
    ? Math.round((currentSentenceIndex / sentences.length) * 100)
    : 0;

  return (
    <div className="space-y-3">
      {/* 自定义声音控制 */}
      <div className="p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-100">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
            <span className="text-sm font-medium text-gray-700">声音选择</span>
          </div>
          {customVoiceInfo?.hasVoice && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={useCustomVoice}
                onChange={(e) => setUseCustomVoice(e.target.checked)}
                className="w-4 h-4 text-purple-500 rounded focus:ring-purple-500"
                disabled={isPlaying}
              />
              <span className="text-xs text-gray-600">使用我的声音</span>
            </label>
          )}
        </div>

        {loadingVoiceInfo ? (
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <div className="animate-spin rounded-full h-3 w-3 border-b border-purple-500"></div>
            加载中...
          </div>
        ) : customVoiceInfo?.hasVoice ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-purple-500" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                </svg>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-700">{customVoiceInfo.voiceName}</p>
                <p className="text-xs text-gray-500">
                  {useCustomVoice ? '已启用' : '未启用'}
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowVoiceRecorder(true)}
              className="text-xs text-purple-600 hover:text-purple-700"
              disabled={isPlaying}
            >
              管理
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowVoiceRecorder(true)}
            className="w-full py-2 px-3 bg-white border border-purple-200 rounded-lg text-sm text-purple-600 hover:bg-purple-50 transition-colors flex items-center justify-center gap-2"
            disabled={isPlaying}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            克隆我的声音
          </button>
        )}

        {synthesizingAudio && (
          <div className="mt-2 flex items-center gap-2 text-xs text-purple-600">
            <div className="animate-spin rounded-full h-3 w-3 border-b border-purple-500"></div>
            正在生成语音...
          </div>
        )}
      </div>

      {/* 声音录制弹窗 */}
      <VoiceRecorder
        isOpen={showVoiceRecorder}
        onClose={() => setShowVoiceRecorder(false)}
        onVoiceCloned={handleVoiceCloned}
      />

      {/* 朗读进度条 */}
      {sentences.length > 0 && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-gray-500">
            <span>朗读进度</span>
            <span>{progressPercent}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <input
            type="range"
            min="0"
            max={sentences.length - 1}
            value={currentSentenceIndex}
            onChange={(e) => {
              const newIndex = parseInt(e.target.value);
              if (isPlaying || isPaused) {
                handleJumpToSentence(newIndex);
              } else {
                setCurrentSentenceIndex(newIndex);
              }
            }}
            className="w-full h-1 bg-transparent cursor-pointer opacity-0 hover:opacity-100 -mt-2 relative z-10"
            title="拖动调整朗读位置"
          />
        </div>
      )}

      {/* 播放控制按钮 */}
      <div className="flex gap-2">
        {!isPlaying && !isPaused && (
          <button
            onClick={handlePlay}
            className="flex-1 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors text-sm flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z"/>
            </svg>
            开始朗读
          </button>
        )}
        {isPlaying && (
          <button
            onClick={handlePause}
            className="flex-1 px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 transition-colors text-sm flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
            </svg>
            暂停
          </button>
        )}
        {isPaused && (
          <button
            onClick={handlePlay}
            className="flex-1 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors text-sm flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z"/>
            </svg>
            继续
          </button>
        )}
        {(isPlaying || isPaused) && (
          <button
            onClick={handleStop}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors text-sm flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 6h12v12H6z"/>
            </svg>
            停止
          </button>
        )}
      </div>

      {/* 上一句/下一句控制 */}
      {sentences.length > 0 && (
        <div className="flex gap-2">
          <button
            onClick={handlePrevSentence}
            disabled={currentSentenceIndex === 0}
            className="flex-1 px-3 py-1.5 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors text-xs disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1"
          >
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
            </svg>
            上一句
          </button>
          <button
            onClick={handleNextSentence}
            disabled={currentSentenceIndex >= sentences.length - 1}
            className="flex-1 px-3 py-1.5 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors text-xs disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1"
          >
            下一句
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/>
            </svg>
          </button>
        </div>
      )}

      {/* 语速控制 - 实时生效 */}
      <div className="p-2 bg-gray-50 rounded-lg">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-gray-600 font-medium">语速调整</span>
          <span className="text-xs text-blue-600 font-bold">{speed.toFixed(1)}x</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">慢</span>
          <input
            type="range"
            min="0.5"
            max="2"
            step="0.1"
            value={speed}
            onChange={(e) => handleSpeedChange(parseFloat(e.target.value))}
            className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
          <span className="text-xs text-gray-400">快</span>
        </div>
        {isPlaying && (
          <p className="text-xs text-blue-500 mt-1 text-center">
            语速实时生效中
          </p>
        )}
      </div>

      {/* 进度显示 */}
      {sentences.length > 0 && (
        <div className="text-xs text-gray-500 text-center">
          第 {currentSentenceIndex + 1} 句 / 共 {sentences.length} 句
        </div>
      )}

      {/* 状态提示 */}
      {isPlaying && (
        <div className="flex items-center justify-center gap-2 text-xs text-blue-500">
          <span className="animate-pulse">●</span>
          正在朗读...
        </div>
      )}
      {isPaused && (
        <div className="flex items-center justify-center gap-2 text-xs text-yellow-600">
          <span>⏸</span>
          已暂停
        </div>
      )}

      {/* 当前句子预览 */}
      {sentences.length > 0 && (isPlaying || isPaused) && (
        <div className="p-2 bg-blue-50 rounded text-xs text-gray-700 max-h-20 overflow-y-auto border border-blue-100">
          <span className="text-blue-600 font-medium">当前: </span>
          {sentences[currentSentenceIndex]}
        </div>
      )}

      {/* 提示 */}
      <div className="text-xs text-gray-400 text-center space-y-1">
        <p>点击文档中的句子可从该位置开始朗读</p>
        <p>拖动进度条可快速跳转</p>
      </div>
    </div>
  );
}
