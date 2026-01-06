/**
 * Android Native Permissions Handler
 * Uses Capacitor for proper native Android permission requests
 */

import { useState, useEffect, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

interface PermissionState {
  microphone: 'granted' | 'denied' | 'prompt' | 'unknown';
  notifications: 'granted' | 'denied' | 'prompt' | 'unknown';
}

// For Android, we need to handle permissions differently
// The SpeechRecognition API on Android WebView requires RECORD_AUDIO permission
// which is requested when you first try to use the microphone

export const useAndroidPermissions = () => {
  const [permissions, setPermissions] = useState<PermissionState>({
    microphone: 'unknown',
    notifications: 'unknown',
  });
  const [isRequestingPermissions, setIsRequestingPermissions] = useState(false);
  
  const isNative = Capacitor.isNativePlatform();
  const platform = Capacitor.getPlatform();

  // Check notification permissions
  const checkNotificationPermission = useCallback(async () => {
    try {
      if (isNative) {
        const result = await LocalNotifications.checkPermissions();
        return result.display as 'granted' | 'denied' | 'prompt';
      } else if ('Notification' in window) {
        const perm = Notification.permission;
        return perm === 'default' ? 'prompt' : perm as 'granted' | 'denied';
      }
    } catch (e) {
      console.error('Error checking notification permission:', e);
    }
    return 'unknown' as const;
  }, [isNative]);

  // Check microphone by attempting to get media stream
  const checkMicrophonePermission = useCallback(async () => {
    try {
      // Try to query permission state first
      if ('permissions' in navigator) {
        try {
          const result = await navigator.permissions.query({ 
            name: 'microphone' as PermissionName 
          });
          return result.state as 'granted' | 'denied' | 'prompt';
        } catch {
          // permissions.query may not support microphone on all platforms
        }
      }
      
      // On Android native, we need to try accessing the mic
      // The permission prompt will appear on first access
      return 'prompt' as const;
    } catch (e) {
      console.error('Error checking microphone permission:', e);
      return 'unknown' as const;
    }
  }, []);

  // Check all permissions
  const checkAllPermissions = useCallback(async () => {
    const [micPerm, notifPerm] = await Promise.all([
      checkMicrophonePermission(),
      checkNotificationPermission(),
    ]);

    const newState: PermissionState = {
      microphone: micPerm,
      notifications: notifPerm,
    };

    setPermissions(newState);
    return newState;
  }, [checkMicrophonePermission, checkNotificationPermission]);

  // Request microphone permission
  const requestMicrophonePermission = useCallback(async (): Promise<boolean> => {
    try {
      // Request microphone access - this triggers the native permission dialog on Android
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } 
      });
      
      // Stop all tracks after getting permission
      stream.getTracks().forEach(track => track.stop());
      
      setPermissions(prev => ({ ...prev, microphone: 'granted' }));
      return true;
    } catch (e) {
      console.error('Microphone permission denied:', e);
      setPermissions(prev => ({ ...prev, microphone: 'denied' }));
      return false;
    }
  }, []);

  // Request notification permission
  const requestNotificationPermission = useCallback(async (): Promise<boolean> => {
    try {
      if (isNative) {
        const result = await LocalNotifications.requestPermissions();
        const granted = result.display === 'granted';
        setPermissions(prev => ({ ...prev, notifications: granted ? 'granted' : 'denied' }));
        return granted;
      } else if ('Notification' in window) {
        const result = await Notification.requestPermission();
        const granted = result === 'granted';
        setPermissions(prev => ({ ...prev, notifications: granted ? 'granted' : 'denied' }));
        return granted;
      }
      return false;
    } catch (e) {
      console.error('Notification permission request failed:', e);
      setPermissions(prev => ({ ...prev, notifications: 'denied' }));
      return false;
    }
  }, [isNative]);

  // Request all permissions in sequence
  const requestAllPermissions = useCallback(async () => {
    setIsRequestingPermissions(true);
    
    const results = {
      microphone: false,
      notifications: false,
    };

    // Request microphone first (most important for voice assistant)
    results.microphone = await requestMicrophonePermission();
    
    // Small delay between permission requests for better UX
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Then notifications
    results.notifications = await requestNotificationPermission();

    setIsRequestingPermissions(false);
    return results;
  }, [requestMicrophonePermission, requestNotificationPermission]);

  // Check permissions on mount
  useEffect(() => {
    checkAllPermissions();
  }, [checkAllPermissions]);

  // Listen for permission changes (when app resumes from settings)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Re-check permissions when app becomes visible (user may have changed settings)
        checkAllPermissions();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [checkAllPermissions]);

  const hasRequiredPermissions = permissions.microphone === 'granted';
  const hasAllPermissions = permissions.microphone === 'granted' && permissions.notifications === 'granted';

  return {
    permissions,
    isRequestingPermissions,
    hasRequiredPermissions,
    hasAllPermissions,
    checkAllPermissions,
    requestMicrophonePermission,
    requestNotificationPermission,
    requestAllPermissions,
    isNative,
    platform,
  };
};
