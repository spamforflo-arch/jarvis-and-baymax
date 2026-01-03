import { useState, useCallback, useRef, useEffect } from 'react';

interface UseTextToSpeechOptions {
  rate?: number;
  pitch?: number;
  volume?: number;
}

export const useTextToSpeech = (options: UseTextToSpeechOptions = {}) => {
  const { rate = 1, pitch = 1, volume = 1 } = options;
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [voicesLoaded, setVoicesLoaded] = useState(false);
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);
  const speakingRef = useRef(false);

  const isSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  // Load voices properly (they load async in Chrome)
  useEffect(() => {
    if (!isSupported) return;

    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      console.log('Available voices:', voices.length);
      if (voices.length > 0) {
        voicesRef.current = voices;
        setVoicesLoaded(true);
      }
    };

    // Try loading immediately
    loadVoices();

    // Chrome needs this event
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    // Fallback: try again after a delay
    const timer = setTimeout(loadVoices, 500);

    return () => {
      clearTimeout(timer);
      window.speechSynthesis.cancel();
    };
  }, [isSupported]);

  const speak = useCallback((text: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (!isSupported) {
        console.error('TTS not supported');
        reject(new Error('TTS not supported'));
        return;
      }

      if (!text || text.trim() === '') {
        console.log('Empty text, skipping TTS');
        resolve();
        return;
      }

      console.log('TTS: Starting speech for:', text.substring(0, 50) + '...');

      // Cancel any ongoing speech
      window.speechSynthesis.cancel();
      speakingRef.current = false;

      // Create utterance after a small delay to ensure cancel completed
      setTimeout(() => {
        try {
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.rate = rate;
          utterance.pitch = pitch;
          utterance.volume = volume;
          utterance.lang = 'en-US';

          // Get voices
          const voices = voicesRef.current.length > 0 
            ? voicesRef.current 
            : window.speechSynthesis.getVoices();
          
          console.log('TTS: Found', voices.length, 'voices');

          // Find a good English voice
          const preferredVoice = voices.find(v => 
            v.name.includes('Google US English') ||
            v.name.includes('Google UK English') ||
            v.name.includes('Samantha') ||
            v.name.includes('Alex')
          ) || voices.find(v => 
            v.lang.startsWith('en') && v.localService
          ) || voices.find(v => 
            v.lang.startsWith('en')
          ) || voices[0];
          
          if (preferredVoice) {
            utterance.voice = preferredVoice;
            console.log('TTS: Using voice:', preferredVoice.name);
          } else {
            console.log('TTS: No preferred voice found, using default');
          }

          utterance.onstart = () => {
            console.log('TTS: Speech started');
            speakingRef.current = true;
            setIsSpeaking(true);
            setIsPaused(false);
          };

          utterance.onend = () => {
            console.log('TTS: Speech ended');
            speakingRef.current = false;
            setIsSpeaking(false);
            setIsPaused(false);
            resolve();
          };

          utterance.onerror = (event) => {
            console.error('TTS: Speech error:', event.error);
            speakingRef.current = false;
            setIsSpeaking(false);
            setIsPaused(false);
            // Don't reject on 'interrupted' or 'canceled' errors
            if (event.error !== 'interrupted' && event.error !== 'canceled') {
              reject(new Error(event.error));
            } else {
              resolve();
            }
          };

          // Actually speak
          window.speechSynthesis.speak(utterance);
          console.log('TTS: Speech queued');

          // Chrome bug workaround: resume if paused
          if (window.speechSynthesis.paused) {
            window.speechSynthesis.resume();
          }

        } catch (err) {
          console.error('TTS: Error creating utterance:', err);
          reject(err);
        }
      }, 150);
    });
  }, [isSupported, rate, pitch, volume]);

  const stop = useCallback(() => {
    if (isSupported) {
      console.log('TTS: Stopping speech');
      window.speechSynthesis.cancel();
      speakingRef.current = false;
      setIsSpeaking(false);
      setIsPaused(false);
    }
  }, [isSupported]);

  const pause = useCallback(() => {
    if (isSupported && speakingRef.current) {
      window.speechSynthesis.pause();
      setIsPaused(true);
    }
  }, [isSupported]);

  const resume = useCallback(() => {
    if (isSupported && isPaused) {
      window.speechSynthesis.resume();
      setIsPaused(false);
    }
  }, [isSupported, isPaused]);

  return {
    isSpeaking,
    isPaused,
    isSupported,
    voicesLoaded,
    speak,
    stop,
    pause,
    resume,
  };
};
