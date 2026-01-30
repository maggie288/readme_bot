import { useState, useEffect, useRef, useCallback } from 'react';
import { voiceAPI } from '../services/api';
import { splitIntoSentences } from './ReadAloud';

export default function MobileReadAloud({
  content,
  onSentenceChange,
  startFromSentence = 0,
  onPlayStateChange,
  documentId,
  initialProgress = null,
  onProgressChange,
  onClose,
  jumpToTarget,
  setJumpToTarget
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(
    initialProgress?.listenPosition || startFromSentence
  );
  const [sentences, setSentences] = useState([]);
  const [speed, setSpeed] = useState(initialProgress?.speed || 1.0);
  const [showSpeedPanel, setShowSpeedPanel] = useState(false);
  const [showVoicePanel, setShowVoicePanel] = useState(false);
  const [useCustomVoice, setUseCustomVoice] = useState(false);
  const [customVoiceInfo, setCustomVoiceInfo] = useState(null);
  const [loadingVoiceInfo, setLoadingVoiceInfo] = useState(true);
  const [synthesizingAudio, setSynthesizingAudio] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showCurrentSentence, setShowCurrentSentence] = useState(false);

  const utteranceRef = useRef(null);
  const isCancelledRef = useRef(false);
  const speedRef = useRef(speed);
  const audioRef = useRef(null);
  const targetSentenceRef = useRef(null);
  const handleJumpToSentenceRef = useRef(null);
  const controlsTimeoutRef = useRef(null);
  const isSpeedChangingRef = useRef(false);
  const wasPlayingRef = useRef(false);
  const isInitialRenderRef = useRef(true);
  const currentSpeakingIndexRef = useRef(null);

  useEffect(() => {
    console.log('[MobileReadAloud] jumpToTarget 变化: ', jumpToTarget, '当前 isPlaying=', isPlaying, 'isPaused=', isPaused);
    if (jumpToTarget === undefined || jumpToTarget === null) return;
    if (jumpToTarget < 0 || jumpToTarget >= sentences.length) {
      console.log('[MobileReadAloud] jumpToTarget 无效，跳过');
      return;
    }

    console.log('[MobileReadAloud] 跳转到句子: index=', jumpToTarget);
    if (handleJumpToSentenceRef.current) {
      handleJumpToSentenceRef.current(jumpToTarget);
    }
    if (setJumpToTarget) {
      setJumpToTarget(null);
    }
  }, [jumpToTarget, sentences.length, setJumpToTarget]);

  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  useEffect(() => {
    loadCustomVoiceInfo();
  }, []);

  const loadCustomVoiceInfo = async () => {
    setLoadingVoiceInfo(true);
    try {
      const response = await voiceAPI.getMy();
      setCustomVoiceInfo(response.data);
      if (response.data.hasVoice) {
        setUseCustomVoice(true);
      }
    } catch (error) {
      console.error('Load custom voice info error:', error);
    } finally {
      setLoadingVoiceInfo(false);
    }
  };

  useEffect(() => {
    if (content) {
      const parsed = splitIntoSentences(content);
      setSentences(parsed);
    }
  }, [content]);

  useEffect(() => {
    if (sentences.length === 0) return;

    if (targetSentenceRef.current !== null) {
      const targetIndex = targetSentenceRef.current;

      if (isPlaying || isPaused) {
        if (handleJumpToSentenceRef.current) {
          handleJumpToSentenceRef.current(targetIndex);
        }
      } else {
        setCurrentSentenceIndex(targetIndex);
      }
      targetSentenceRef.current = null;
      return;
    }

    if (startFromSentence > 0 && currentSentenceIndex === 0) {
      setCurrentSentenceIndex(startFromSentence);
    }
  }, [startFromSentence, sentences.length, isPlaying, isPaused]);

  useEffect(() => {
    if (isInitialRenderRef.current) {
      isInitialRenderRef.current = false;
      return;
    }
    if (onPlayStateChange && (isPlaying || isPaused)) {
      onPlayStateChange({ isPlaying, isPaused, currentSentenceIndex });
    }
  }, [isPlaying, isPaused, currentSentenceIndex]);

  useEffect(() => {
    if (onProgressChange && sentences.length > 0) {
      onProgressChange({
        listenPosition: currentSentenceIndex,
        listenPercent: Math.round((currentSentenceIndex / sentences.length) * 100),
        speed: speed
      });
    }
  }, [currentSentenceIndex, speed, sentences.length, onProgressChange]);

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  useEffect(() => {
    if (isPlaying || isPaused) {
      setIsExpanded(true);
      setShowCurrentSentence(true);
    }
  }, [isPlaying, isPaused]);

  useEffect(() => {
    if (isPlaying || isPaused) {
      setIsExpanded(true);
      setShowCurrentSentence(true);
    }
  }, []);

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
        speakWithCustomVoice(index + 1);
      }
    } catch (error) {
      console.error('Custom voice synthesis error:', error);
      if (!isCancelledRef.current) {
        speakWithCustomVoice(index + 1);
      }
    } finally {
      setSynthesizingAudio(false);
    }
  }, [sentences, customVoiceInfo, onSentenceChange]);

  const speakSentence = useCallback((index, retryCount = 0) => {
    console.log('[MobileReadAloud] speakSentence 被调用: index=', index, 'sentences.length=', sentences.length, 'retryCount=', retryCount, 'isCancelled=', isCancelledRef.current, 'currentSpeakingIndex=', currentSpeakingIndexRef.current);
    if (index >= sentences.length || isCancelledRef.current) {
      console.log('[MobileReadAloud] 朗读结束，停止播放');
      currentSpeakingIndexRef.current = null;
      setIsPlaying(false);
      setIsPaused(false);
      if (onSentenceChange) {
        onSentenceChange(-1);
      }
      return;
    }

    if (currentSpeakingIndexRef.current !== null && currentSpeakingIndexRef.current > index) {
      console.log('[MobileReadAloud] 忽略过时的 speakSentence 请求: index=', index, '已有更新请求: currentSpeakingIndex=', currentSpeakingIndexRef.current);
      return;
    }

    currentSpeakingIndexRef.current = index;
    const sentence = sentences[index];
    console.log('[MobileReadAloud] 开始朗读句子: index=', index, '内容=', sentence.substring(0, 50));
    const utterance = new SpeechSynthesisUtterance(sentence);
    utterance.lang = 'zh-CN';
    utterance.rate = speedRef.current;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    utterance.onstart = () => {
      setCurrentSentenceIndex(index);
      if (onSentenceChange) {
        onSentenceChange(index);
      }
    };

    utterance.onend = () => {
      currentSpeakingIndexRef.current = null;
      if (!isCancelledRef.current && !isSpeedChangingRef.current) {
        speakSentence(index + 1);
      }
    };

    utterance.onerror = (event) => {
      if (event.error === 'interrupted' && retryCount < 3 && !isCancelledRef.current && !isSpeedChangingRef.current) {
        setTimeout(() => {
          speakSentence(index, retryCount + 1);
        }, 200);
        return;
      }

      if (event.error === 'canceled') {
        return;
      }

      currentSpeakingIndexRef.current = null;
      if (!isCancelledRef.current && !isSpeedChangingRef.current) {
        speakSentence(index + 1);
      }
    };

    utteranceRef.current = utterance;

    if (typeof window !== 'undefined') {
      window.speechSynthesis.cancel();
    }

    setTimeout(() => {
      if (!isCancelledRef.current && typeof window !== 'undefined') {
        window.speechSynthesis.speak(utterance);
      }
    }, 50);
  }, [sentences, onSentenceChange]);

  // 语速实时变化处理 - 当语速改变且正在播放时，重新开始当前句子
  useEffect(() => {
    if (isPlaying && !isSpeedChangingRef.current) {
      isSpeedChangingRef.current = true;

      if (typeof window !== 'undefined') {
        window.speechSynthesis.cancel();
      }

      setTimeout(() => {
        if (!isCancelledRef.current) {
          speakSentence(currentSentenceIndex);
        }
        isSpeedChangingRef.current = false;
      }, 100);
    }
  }, [speed, isPlaying, currentSentenceIndex, speakSentence]);

  const handlePlay = () => {
    if (!content || sentences.length === 0) {
      alert('文档内容为空');
      return;
    }

    if (isPaused && !useCustomVoice) {
      if (typeof window !== 'undefined') {
        window.speechSynthesis.resume();
      }
      setIsPaused(false);
      setIsPlaying(true);
    } else {
      isCancelledRef.current = false;
      if (typeof window !== 'undefined') {
        window.speechSynthesis.cancel();
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setIsPlaying(true);
      setIsPaused(false);
      setIsExpanded(true);

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
    if (typeof window !== 'undefined' && window.speechSynthesis && isPlaying) {
      window.speechSynthesis.pause();
      setIsPaused(true);
      setIsPlaying(false);
    }
  };

  const handleStop = () => {
    isCancelledRef.current = true;

    if (typeof window !== 'undefined') {
      window.speechSynthesis.cancel();
    }

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

  const handleJumpToSentence = useCallback((index) => {
    console.log('[MobileReadAloud] handleJumpToSentence 被调用: index=', index, 'sentences.length=', sentences.length);
    if (index >= 0 && index < sentences.length) {
      targetSentenceRef.current = index;
      console.log('[MobileReadAloud] 跳转到有效句子: index=', index);

      isCancelledRef.current = true;
      if (typeof window !== 'undefined') {
        window.speechSynthesis.cancel();
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setIsPaused(false);
      setIsExpanded(true);

      setTimeout(() => {
        isCancelledRef.current = false;
        setCurrentSentenceIndex(index);
        setIsPlaying(true);
        console.log('[MobileReadAloud] 开始播放句子: index=', index);
        if (useCustomVoice && customVoiceInfo?.hasVoice) {
          speakWithCustomVoice(index);
        } else {
          speakSentence(index);
        }
      }, 100);
    } else {
      console.log('[MobileReadAloud] 跳转到无效句子，跳过: index=', index, '有效范围: 0-', sentences.length - 1);
    }
  }, [sentences.length, speakSentence, speakWithCustomVoice, useCustomVoice, customVoiceInfo]);

  useEffect(() => {
    handleJumpToSentenceRef.current = handleJumpToSentence;
  }, [handleJumpToSentence]);

  // 监听页面可见性变化，页面重新可见时恢复朗读
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // 页面隐藏时记录当前状态
        wasPlayingRef.current = isPlaying;
        console.log('[MobileReadAloud] 页面隐藏，记录播放状态:', isPlaying);
      } else {
        // 页面重新可见时，如果之前在播放则恢复
        console.log('[MobileReadAloud] 页面显示，之前状态:', wasPlayingRef.current, '当前状态:', isPlaying, isPaused);
        if (wasPlayingRef.current) {
          // 延迟一点恢复，让浏览器准备好
          setTimeout(() => {
            if (currentSentenceIndex < sentences.length) {
              console.log('[MobileReadAloud] 恢复朗读，从句子:', currentSentenceIndex);
              // 先停止当前的，再重新开始
              if (typeof window !== 'undefined') {
                window.speechSynthesis.cancel();
              }
              if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
              }
              // 重新从当前句子开始
              speakSentence(currentSentenceIndex);
            }
          }, 500);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isPlaying, isPaused, currentSentenceIndex, sentences.length, speakSentence]);

  const handlePrevSentence = () => {
    const newIndex = Math.max(0, currentSentenceIndex - 1);
    handleJumpToSentence(newIndex);
  };

  const handleNextSentence = () => {
    const newIndex = Math.min(sentences.length - 1, currentSentenceIndex + 1);
    handleJumpToSentence(newIndex);
  };

  const handleSpeedChange = (newSpeed) => {
    setSpeed(newSpeed);
    setShowSpeedPanel(false);
  };

  const progressPercent = sentences.length > 0
    ? Math.round((currentSentenceIndex / sentences.length) * 100)
    : 0;

  const speeds = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  const handleControlsMouseEnter = () => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    setIsExpanded(true);
  };

  const handleControlsMouseLeave = () => {
    if (isPlaying || isPaused) {
      controlsTimeoutRef.current = setTimeout(() => {
        setIsExpanded(false);
      }, 2000);
    }
  };

  const currentSentence = sentences[currentSentenceIndex];

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 bg-gradient-to-t from-white via-white to-transparent z-[60] safe-area-bottom transition-all duration-300 ${
        isExpanded ? 'pb-8' : 'pb-0'
      }`}
      onMouseEnter={handleControlsMouseEnter}
      onMouseLeave={handleControlsMouseLeave}
    >
      {isExpanded ? (
        <>
          <div className="px-4 py-3 border-b border-gray-100">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-gray-500">
                {sentences.length > 0 ? `${currentSentenceIndex + 1} / ${sentences.length}` : '0 / 0'}
              </span>
              <span className="text-blue-600 font-medium">{progressPercent}%</span>
            </div>
            <input
              type="range"
              min="0"
              max={Math.max(1, sentences.length - 1)}
              value={currentSentenceIndex}
              onChange={(e) => {
                const index = parseInt(e.target.value);
                setCurrentSentenceIndex(index);
              }}
              onMouseUp={(e) => {
                const index = parseInt(e.target.value);
                handleJumpToSentence(index);
              }}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-blue-500 [&::-webkit-slider-thumb]:rounded-full"
            />
          </div>

          {showCurrentSentence && currentSentence && (
            <div className="px-4 py-2 bg-blue-50 border-b border-blue-100">
              <p className="text-sm text-gray-700 line-clamp-2">
                <span className="text-blue-600 font-medium">当前: </span>
                {currentSentence}
              </p>
            </div>
          )}

          <div className="flex items-center justify-around px-4 py-3">
            <button
              onClick={() => setShowSpeedPanel(true)}
              className="flex flex-col items-center gap-1 p-2 min-w-[60px]"
            >
              <span className="text-sm text-gray-600 font-medium">{speed}x</span>
              <span className="text-xs text-gray-400">语速</span>
            </button>

            <button
              onClick={handlePrevSentence}
              className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
              disabled={currentSentenceIndex <= 0}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <button
              onClick={isPlaying ? handlePause : handlePlay}
              className={`w-16 h-16 rounded-full flex items-center justify-center shadow-lg transition-all ${
                isPlaying ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-500 hover:bg-blue-600'
              }`}
            >
              {isPlaying ? (
                <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                </svg>
              ) : (
                <svg className="w-7 h-7 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>

            <button
              onClick={handleNextSentence}
              className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
              disabled={currentSentenceIndex >= sentences.length - 1}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            <button
              onClick={() => setShowVoicePanel(!showVoicePanel)}
              className={`flex flex-col items-center gap-1 p-2 min-w-[60px] ${
                useCustomVoice ? 'text-purple-600' : 'text-gray-600'
              }`}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
              <span className="text-xs text-gray-400">声音</span>
            </button>

            <button
              onClick={() => {
                handleStop();
                if (onClose) onClose();
              }}
              className="flex flex-col items-center gap-1 p-2 min-w-[60px] text-red-500"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              <span className="text-xs text-gray-400">关闭</span>
            </button>
          </div>

          {synthesizingAudio && (
            <div className="flex items-center justify-center gap-2 py-2 text-sm text-purple-600">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-500"></div>
              正在生成语音...
            </div>
          )}

          <div className="flex justify-center py-2">
            <button
              onClick={toggleExpand}
              className="p-1 -mb-1 text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        </>
      ) : (
        <div className="flex items-center justify-center py-2">
          <button
            onClick={toggleExpand}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-full shadow-lg hover:bg-blue-600 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            </svg>
            <span className="text-sm font-medium">
              {isPlaying ? `${progressPercent}% 朗读中` : '点击朗读'}
            </span>
          </button>
        </div>
      )}

      {showSpeedPanel && (
        <div className="absolute bottom-full left-0 right-0 bg-white border-t border-gray-200 rounded-t-2xl p-4 animate-slide-up">
          <div className="flex items-center justify-between mb-3">
            <span className="font-medium">语速选择</span>
            <button
              onClick={() => setShowSpeedPanel(false)}
              className="p-1 -mr-1 text-gray-400 hover:text-gray-600"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {speeds.map((s) => (
              <button
                key={s}
                onClick={() => handleSpeedChange(s)}
                className={`py-3 rounded-lg text-sm font-medium transition-colors ${
                  speed === s
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>
      )}

      {showVoicePanel && (
        <div className="absolute bottom-full left-0 right-0 bg-white border-t border-gray-200 rounded-t-2xl p-4 animate-slide-up">
          <div className="flex items-center justify-between mb-3">
            <span className="font-medium">声音选择</span>
            <button
              onClick={() => setShowVoicePanel(false)}
              className="p-1 -mr-1 text-gray-400 hover:text-gray-600"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {loadingVoiceInfo ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
            </div>
          ) : customVoiceInfo?.hasVoice ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-purple-500" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium">{customVoiceInfo.voiceName}</p>
                    <p className="text-xs text-gray-500">
                      {useCustomVoice ? '已启用' : '未启用'}
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useCustomVoice}
                    onChange={(e) => setUseCustomVoice(e.target.checked)}
                    className="sr-only peer"
                    disabled={isPlaying}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-500"></div>
                </label>
              </div>
              <button
                className="w-full py-2 text-sm text-purple-600 hover:text-purple-700"
                disabled={isPlaying}
              >
                克隆新声音
              </button>
            </div>
          ) : (
            <button
              className="w-full py-3 bg-purple-500 text-white rounded-lg font-medium hover:bg-purple-600 transition-colors"
              disabled={isPlaying}
            >
              克隆我的声音
            </button>
          )}

          {synthesizingAudio && (
            <div className="flex items-center justify-center gap-2 mt-4 text-sm text-purple-600">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-500"></div>
              正在生成语音...
            </div>
          )}
        </div>
      )}

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
          animation: slide-up 0.2s ease-out;
        }
        .safe-area-bottom {
          padding-bottom: env(safe-area-inset-bottom);
        }
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
}
