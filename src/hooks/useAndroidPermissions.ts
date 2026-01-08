/**
 * Android Native Permissions Handler
 * Uses Capacitor for proper native Android permission requests
 * Refined for reliable permission handling on native platforms
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

type PermissionStatus = 'granted' | 'denied' | 'prompt' | 'unknown';

interface PermissionState {
  microphone: PermissionStatus;
  notifications: PermissionStatus;
}

export const useAndroidPermissions = () => {
  const [permissions, setPermissions] = useState<PermissionState>({
    microphone: 'unknown',
    notifications: 'unknown',
  });
  const [isRequestingPermissions, setIsRequestingPermissions] = useState(false);
  const hasCheckedRef = useRef(false);
  const mountedRef = useRef(true);
  
  const isNative = Capacitor.isNativePlatform();
  const platform = Capacitor.getPlatform();

  // Safe state update
  const safeSetPermissions = useCallback((updater: (prev: PermissionState) => PermissionState) => {
    if (mountedRef.current) {
      setPermissions(updater);
    }
  }, []);

  // Check notification permissions
  const checkNotificationPermission = useCallback(async (): Promise<PermissionStatus> => {
    try {
      if (isNative) {
        const result = await LocalNotifications.checkPermissions();
        return result.display as PermissionStatus;
      } else if ('Notification' in window) {
        const perm = Notification.permission;
        return perm === 'default' ? 'prompt' : perm as 'granted' | 'denied';
      }
    } catch (e) {
      console.error('[Permissions] Error checking notification permission:', e);
    }
    return 'unknown';
  }, [isNative]);

  // Check microphone permission
  const checkMicrophonePermission = useCallback(async (): Promise<PermissionStatus> => {
    try {
      // Try to query permission state first
      if ('permissions' in navigator) {
        try {
          const result = await navigator.permissions.query({ 
            name: 'microphone' as PermissionName 
          });
          if (result.state === 'granted' || result.state === 'denied') {
            return result.state as 'granted' | 'denied';
          }
          // Add listener for permission changes
          result.addEventListener('change', () => {
            safeSetPermissions(prev => ({
              ...prev,
              microphone: result.state as PermissionStatus
            }));
          });
        } catch {
          // permissions.query may not support microphone on all platforms
        }
      }
      
      // On Android native or unsupported browsers, we assume prompt until user tries to access
      return 'prompt';
    } catch (e) {
      console.error('[Permissions] Error checking microphone permission:', e);
      return 'unknown';
    }
  }, [safeSetPermissions]);

  // Check all permissions
  const checkAllPermissions = useCallback(async () => {
    console.log('[Permissions] Checking all permissions...');
    const [micPerm, notifPerm] = await Promise.all([
      checkMicrophonePermission(),
      checkNotificationPermission(),
    ]);

    const newState: PermissionState = {
      microphone: micPerm,
      notifications: notifPerm,
    };

    console.log('[Permissions] Current state:', newState);
    safeSetPermissions(() => newState);
    return newState;
  }, [checkMicrophonePermission, checkNotificationPermission, safeSetPermissions]);

  // Request microphone permission - triggers native Android dialog
  const requestMicrophonePermission = useCallback(async (): Promise<boolean> => {
    console.log('[Permissions] Requesting microphone permission...');
    try {
      // This triggers the native Android permission dialog via WebView
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } 
      });
      
      // Immediately stop tracks - we just needed to trigger the permission
      stream.getTracks().forEach(track => {
        track.stop();
      });
      
      console.log('[Permissions] Microphone permission GRANTED');
      safeSetPermissions(prev => ({ ...prev, microphone: 'granted' }));
      return true;
    } catch (e: any) {
      console.error('[Permissions] Microphone permission DENIED:', e.name, e.message);
      
      // Distinguish between permission denial and other errors
      const isDenied = e.name === 'NotAllowedError' || 
                       e.name === 'PermissionDeniedError' ||
                       e.name === 'SecurityError';
      
      safeSetPermissions(prev => ({ 
        ...prev, 
        microphone: isDenied ? 'denied' : 'denied' // Mark as denied for UX consistency
      }));
      return false;
    }
  }, [safeSetPermissions]);

  // Request notification permission
  const requestNotificationPermission = useCallback(async (): Promise<boolean> => {
    console.log('[Permissions] Requesting notification permission...');
    try {
      if (isNative) {
        const result = await LocalNotifications.requestPermissions();
        const granted = result.display === 'granted';
        console.log('[Permissions] Notification permission result:', result.display);
        safeSetPermissions(prev => ({ 
          ...prev, 
          notifications: granted ? 'granted' : 'denied' 
        }));
        return granted;
      } else if ('Notification' in window) {
        const result = await Notification.requestPermission();
        const granted = result === 'granted';
        console.log('[Permissions] Notification permission result:', result);
        safeSetPermissions(prev => ({ 
          ...prev, 
          notifications: granted ? 'granted' : 'denied' 
        }));
        return granted;
      }
      return false;
    } catch (e) {
      console.error('[Permissions] Notification permission request failed:', e);
      safeSetPermissions(prev => ({ ...prev, notifications: 'denied' }));
      return false;
    }
  }, [isNative, safeSetPermissions]);

  // Request all permissions in sequence
  const requestAllPermissions = useCallback(async () => {
    console.log('[Permissions] Starting permission request flow...');
    setIsRequestingPermissions(true);
    
    const results = {
      microphone: false,
      notifications: false,
    };

    try {
      // Request microphone first (most important for voice assistant)
      results.microphone = await requestMicrophonePermission();
      console.log('[Permissions] Microphone result:', results.microphone);
      
      // Small delay between permission requests for better UX
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Then notifications
      results.notifications = await requestNotificationPermission();
      console.log('[Permissions] Notifications result:', results.notifications);
    } finally {
      if (mountedRef.current) {
        setIsRequestingPermissions(false);
      }
    }

    console.log('[Permissions] Permission flow complete:', results);
    return results;
  }, [requestMicrophonePermission, requestNotificationPermission]);

  // Check permissions on mount - only once
  useEffect(() => {
    mountedRef.current = true;
    
    if (!hasCheckedRef.current) {
      hasCheckedRef.current = true;
      // Delay initial check slightly for Android WebView initialization
      const timer = setTimeout(() => {
        checkAllPermissions();
      }, 100);
      return () => clearTimeout(timer);
    }
    
    return () => {
      mountedRef.current = false;
    };
  }, [checkAllPermissions]);

  // Listen for permission changes when app resumes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Re-check permissions when app becomes visible
        console.log('[Permissions] App resumed, re-checking permissions...');
        checkAllPermissions();
      }
    };

    // Also handle Android app resume
    const handleResume = () => {
      console.log('[Permissions] App resumed from background');
      checkAllPermissions();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('resume', handleResume);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('resume', handleResume);
    };
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
