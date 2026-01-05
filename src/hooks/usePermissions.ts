import { useState, useEffect, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

interface PermissionStatus {
  microphone: 'granted' | 'denied' | 'prompt' | 'unknown';
  notifications: 'granted' | 'denied' | 'prompt' | 'unknown';
}

export const usePermissions = () => {
  const [permissions, setPermissions] = useState<PermissionStatus>({
    microphone: 'unknown',
    notifications: 'unknown',
  });
  const [isRequestingPermissions, setIsRequestingPermissions] = useState(false);
  const isNative = Capacitor.isNativePlatform();

  // Check current permission status
  const checkPermissions = useCallback(async () => {
    const status: PermissionStatus = {
      microphone: 'unknown',
      notifications: 'unknown',
    };

    // Check microphone permission
    try {
      if ('permissions' in navigator) {
        const micResult = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        status.microphone = micResult.state as 'granted' | 'denied' | 'prompt';
      }
    } catch (e) {
      console.log('Could not query microphone permission:', e);
    }

    // Check notification permission
    try {
      if (isNative) {
        const notifResult = await LocalNotifications.checkPermissions();
        status.notifications = notifResult.display as 'granted' | 'denied' | 'prompt';
      } else if ('Notification' in window) {
        status.notifications = Notification.permission === 'default' ? 'prompt' : Notification.permission;
      }
    } catch (e) {
      console.log('Could not check notification permission:', e);
    }

    setPermissions(status);
    return status;
  }, [isNative]);

  // Request microphone permission
  const requestMicrophonePermission = useCallback(async (): Promise<boolean> => {
    try {
      // Request microphone access by trying to get audio stream
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
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
      console.error('Notification permission denied:', e);
      return false;
    }
  }, [isNative]);

  // Request all permissions
  const requestAllPermissions = useCallback(async () => {
    setIsRequestingPermissions(true);
    
    const results = {
      microphone: false,
      notifications: false,
    };

    // Request microphone first (most important for voice)
    results.microphone = await requestMicrophonePermission();
    
    // Then notifications
    results.notifications = await requestNotificationPermission();

    setIsRequestingPermissions(false);
    return results;
  }, [requestMicrophonePermission, requestNotificationPermission]);

  // Check permissions on mount
  useEffect(() => {
    checkPermissions();
  }, [checkPermissions]);

  // Check if all required permissions are granted
  const hasRequiredPermissions = permissions.microphone === 'granted';
  const hasAllPermissions = permissions.microphone === 'granted' && permissions.notifications === 'granted';

  return {
    permissions,
    isRequestingPermissions,
    hasRequiredPermissions,
    hasAllPermissions,
    checkPermissions,
    requestMicrophonePermission,
    requestNotificationPermission,
    requestAllPermissions,
    isNative,
  };
};
