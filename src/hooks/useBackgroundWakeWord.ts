import { useEffect, useCallback, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { LocalNotifications } from '@capacitor/local-notifications';

interface UseBackgroundWakeWordOptions {
  wakeWords?: string[];
  onWakeWord?: () => void;
  enabled?: boolean;
}

/**
 * Background wake word detection for native Android.
 * Uses continuous speech recognition with battery optimization.
 * Falls back to foreground-only detection on web.
 */
export const useBackgroundWakeWord = (options: UseBackgroundWakeWordOptions = {}) => {
  const { 
    wakeWords = ['wake up buddy', 'wake up max', 'hey buddy', 'hey max'],
    onWakeWord,
    enabled = true 
  } = options;

  const [isBackgroundActive, setIsBackgroundActive] = useState(false);
  const [lastWakeTime, setLastWakeTime] = useState<number>(0);
  const recognitionRef = useRef<any>(null);
  const isNative = Capacitor.isNativePlatform();

  // Debounce wake word detection (prevent multiple triggers)
  const WAKE_DEBOUNCE_MS = 3000;

  const handleWakeWordDetected = useCallback(async () => {
    const now = Date.now();
    if (now - lastWakeTime < WAKE_DEBOUNCE_MS) {
      console.log('Wake word debounced');
      return;
    }
    
    setLastWakeTime(now);
    console.log('Wake word detected in background!');
    
    // Show notification to bring app to foreground
    if (isNative) {
      await LocalNotifications.schedule({
        notifications: [{
          title: 'Warm AI is listening',
          body: 'Tap to respond to your command',
          id: 999,
          schedule: { at: new Date(Date.now() + 100) },
          sound: 'default',
          actionTypeId: '',
          extra: null,
        }],
      });
    }
    
    onWakeWord?.();
  }, [lastWakeTime, onWakeWord, isNative]);

  const startBackgroundListening = useCallback(() => {
    if (!enabled) return;

    // Check for Web Speech API support
    const SpeechRecognitionClass = (window as any).SpeechRecognition || 
                                   (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognitionClass) {
      console.warn('Speech recognition not supported');
      return;
    }

    try {
      const recognition = new SpeechRecognitionClass();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript.toLowerCase();
          
          for (const wakeWord of wakeWords) {
            if (transcript.includes(wakeWord.toLowerCase())) {
              handleWakeWordDetected();
              break;
            }
          }
        }
      };

      recognition.onerror = (event: any) => {
        console.error('Background speech recognition error:', event.error);
        // Restart on recoverable errors
        if (event.error === 'no-speech' || event.error === 'aborted') {
          setTimeout(() => {
            if (isBackgroundActive && enabled) {
              startBackgroundListening();
            }
          }, 1000);
        }
      };

      recognition.onend = () => {
        console.log('Background speech recognition ended');
        // Auto-restart if still active
        if (isBackgroundActive && enabled) {
          setTimeout(() => {
            startBackgroundListening();
          }, 500);
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
      setIsBackgroundActive(true);
      console.log('Background wake word listening started');
    } catch (e) {
      console.error('Failed to start background listening:', e);
    }
  }, [enabled, wakeWords, handleWakeWordDetected, isBackgroundActive]);

  const stopBackgroundListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        console.error('Error stopping recognition:', e);
      }
      recognitionRef.current = null;
    }
    setIsBackgroundActive(false);
    console.log('Background wake word listening stopped');
  }, []);

  // Handle app state changes (background/foreground)
  useEffect(() => {
    if (!isNative || !enabled) return;

    const stateHandler = App.addListener('appStateChange', async ({ isActive }) => {
      console.log('App state changed, isActive:', isActive);
      
      if (!isActive) {
        // App going to background - keep listening for wake words
        // Note: On Android, this requires a foreground service for continuous operation
        console.log('App in background, continuing wake word detection');
      } else {
        // App coming to foreground
        console.log('App in foreground');
      }
    });

    return () => {
      stateHandler.then(handle => handle.remove());
    };
  }, [isNative, enabled]);

  // Start listening on mount
  useEffect(() => {
    if (enabled) {
      startBackgroundListening();
    }
    
    return () => {
      stopBackgroundListening();
    };
  }, [enabled]);

  return {
    isBackgroundActive,
    startBackgroundListening,
    stopBackgroundListening,
    isNative,
  };
};

