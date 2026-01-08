/**
 * Android Native Permissions Handler
 * Uses Capacitor for proper native Android permission requests
 * Fixed to properly request permissions on native platforms
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

interface PermissionState {
  microphone: 'granted' | 'denied' | 'prompt' | 'unknown';
  notifications: 'granted' | 'denied' | 'prompt' | 'unknown';
}

export const useAndroidPermissions = () => {
  const [permissions, setPermissions] = useState<PermissionState>({
    microphone: 'unknown',
    notifications: 'unknown',
  });
  const [isRequestingPermissions, setIsRequestingPermissions] = useState(false);
  const hasCheckedRef = useRef(false);
  
  const isNative = Capacitor.isNativePlatform();
  const platform = Capacitor.getPlatform();

  // Check notification permissions
  const checkNotificationPermission = useCallback(async (): Promise<'granted' | 'denied' | 'prompt' | 'unknown'> => {
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
    return 'unknown';
  }, [isNative]);

  // Check microphone permission
  const checkMicrophonePermission = useCallback(async (): Promise<'granted' | 'denied' | 'prompt' | 'unknown'> => {
    try {
      // Try to query permission state first (works on web and some native)
      if ('permissions' in navigator) {
        try {
          const result = await navigator.permissions.query({ 
            name: 'microphone' as PermissionName 
          });
          if (result.state === 'granted' || result.state === 'denied') {
            return result.state as 'granted' | 'denied';
          }
        } catch {
          // permissions.query may not support microphone on all platforms
        }
      }
      
      // On Android native, we assume prompt until user tries to access
      return 'prompt';
    } catch (e) {
      console.error('Error checking microphone permission:', e);
      return 'unknown';
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

  // Request microphone permission - this MUST trigger native Android dialog
  const requestMicrophonePermission = useCallback(async (): Promise<boolean> => {
    console.log('Requesting microphone permission...');
    try {
      // This triggers the native Android permission dialog
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } 
      });
      
      // Stop all tracks after getting permission
      stream.getTracks().forEach(track => track.stop());
      
      console.log('Microphone permission granted!');
      setPermissions(prev => ({ ...prev, microphone: 'granted' }));
      return true;
    } catch (e: any) {
      console.error('Microphone permission denied:', e);
      // Check if it's a permission denial vs other error
      if (e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError') {
        setPermissions(prev => ({ ...prev, microphone: 'denied' }));
      } else {
        // Other errors (no microphone, etc) - still mark as denied for UX
        setPermissions(prev => ({ ...prev, microphone: 'denied' }));
      }
      return false;
    }
  }, []);

  // Request notification permission
  const requestNotificationPermission = useCallback(async (): Promise<boolean> => {
    console.log('Requesting notification permission...');
    try {
      if (isNative) {
        const result = await LocalNotifications.requestPermissions();
        const granted = result.display === 'granted';
        console.log('Notification permission result:', result.display);
        setPermissions(prev => ({ ...prev, notifications: granted ? 'granted' : 'denied' }));
        return granted;
      } else if ('Notification' in window) {
        const result = await Notification.requestPermission();
        const granted = result === 'granted';
        console.log('Notification permission result:', result);
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

  // Request all permissions in sequence - THIS ACTUALLY TRIGGERS DIALOGS
  const requestAllPermissions = useCallback(async () => {
    console.log('Starting permission request flow...');
    setIsRequestingPermissions(true);
    
    const results = {
      microphone: false,
      notifications: false,
    };

    // Request microphone first (most important for voice assistant)
    // This WILL trigger the native Android permission dialog
    results.microphone = await requestMicrophonePermission();
    console.log('Microphone result:', results.microphone);
    
    // Small delay between permission requests for better UX
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Then notifications
    results.notifications = await requestNotificationPermission();
    console.log('Notifications result:', results.notifications);

    setIsRequestingPermissions(false);
    console.log('Permission flow complete:', results);
    return results;
  }, [requestMicrophonePermission, requestNotificationPermission]);

  // Check permissions on mount - only once
  useEffect(() => {
    if (!hasCheckedRef.current) {
      hasCheckedRef.current = true;
      checkAllPermissions();
    }
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
