import { useCallback, useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { LocalNotifications, ScheduleResult } from '@capacitor/local-notifications';
import { App } from '@capacitor/app';

export const useNativeCapabilities = () => {
  const [notificationPermission, setNotificationPermission] = useState<boolean>(false);
  const isNative = Capacitor.isNativePlatform();

  // Request notification permissions on mount
  useEffect(() => {
    const requestPermissions = async () => {
      if (isNative) {
        try {
          const result = await LocalNotifications.requestPermissions();
          setNotificationPermission(result.display === 'granted');
        } catch (e) {
          console.error('Failed to request notification permissions:', e);
        }
      }
    };
    requestPermissions();
  }, [isNative]);

  // Haptic feedback functions
  const hapticImpact = useCallback(async (style: 'light' | 'medium' | 'heavy' = 'medium') => {
    if (!isNative) return;
    try {
      const impactStyle = {
        light: ImpactStyle.Light,
        medium: ImpactStyle.Medium,
        heavy: ImpactStyle.Heavy,
      }[style];
      await Haptics.impact({ style: impactStyle });
    } catch (e) {
      console.error('Haptic impact failed:', e);
    }
  }, [isNative]);

  const hapticNotification = useCallback(async (type: 'success' | 'warning' | 'error' = 'success') => {
    if (!isNative) return;
    try {
      const notifType = {
        success: NotificationType.Success,
        warning: NotificationType.Warning,
        error: NotificationType.Error,
      }[type];
      await Haptics.notification({ type: notifType });
    } catch (e) {
      console.error('Haptic notification failed:', e);
    }
  }, [isNative]);

  const hapticVibrate = useCallback(async (duration: number = 300) => {
    if (!isNative) return;
    try {
      await Haptics.vibrate({ duration });
    } catch (e) {
      console.error('Haptic vibrate failed:', e);
    }
  }, [isNative]);

  // Local notification functions
  const showNotification = useCallback(async (title: string, body: string, id?: number): Promise<ScheduleResult | null> => {
    if (!isNative || !notificationPermission) {
      // Fallback to web notification
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, { body });
      }
      return null;
    }
    try {
      const result = await LocalNotifications.schedule({
        notifications: [{
          title,
          body,
          id: id || Date.now(),
          schedule: { at: new Date(Date.now() + 100) }, // Immediately
          sound: 'default',
          actionTypeId: '',
          extra: null,
        }],
      });
      return result;
    } catch (e) {
      console.error('Failed to show notification:', e);
      return null;
    }
  }, [isNative, notificationPermission]);

  const scheduleNotification = useCallback(async (
    title: string, 
    body: string, 
    scheduledAt: Date, 
    id?: number
  ): Promise<ScheduleResult | null> => {
    if (!isNative || !notificationPermission) return null;
    try {
      const result = await LocalNotifications.schedule({
        notifications: [{
          title,
          body,
          id: id || Date.now(),
          schedule: { at: scheduledAt },
          sound: 'default',
          actionTypeId: '',
          extra: null,
        }],
      });
      return result;
    } catch (e) {
      console.error('Failed to schedule notification:', e);
      return null;
    }
  }, [isNative, notificationPermission]);

  // App intent functions for opening other apps
  const openAppByIntent = useCallback(async (packageName: string, fallbackUrl?: string): Promise<boolean> => {
    if (!isNative) {
      // Web fallback
      if (fallbackUrl) {
        window.open(fallbackUrl, '_blank');
        return true;
      }
      return false;
    }
    
    try {
      // On Android, we use intent URLs
      // Common app package names and intents
      const intentMap: Record<string, string> = {
        'spotify': 'spotify://',
        'youtube': 'vnd.youtube://',
        'whatsapp': 'whatsapp://',
        'instagram': 'instagram://',
        'twitter': 'twitter://',
        'facebook': 'fb://',
        'chrome': 'googlechrome://',
        'maps': 'geo:',
        'camera': 'intent:#Intent;action=android.media.action.IMAGE_CAPTURE;end',
        'phone': 'tel:',
        'sms': 'sms:',
        'email': 'mailto:',
        'clock': 'android.intent.action.SET_ALARM',
        'calendar': 'content://com.android.calendar/time/',
      };

      const intent = intentMap[packageName.toLowerCase()];
      if (intent) {
        window.location.href = intent;
        return true;
      }
      
      // Try package name directly for Android
      window.location.href = `intent://#Intent;package=${packageName};end`;
      return true;
    } catch (e) {
      console.error('Failed to open app:', e);
      if (fallbackUrl) {
        window.open(fallbackUrl, '_blank');
      }
      return false;
    }
  }, [isNative]);

  // Set alarm using Android intent
  const setNativeAlarm = useCallback(async (hour: number, minute: number, message?: string): Promise<boolean> => {
    if (!isNative) return false;
    
    try {
      // Android intent for setting alarm
      const intent = `intent:#Intent;action=android.intent.action.SET_ALARM;i.android.intent.extra.alarm.HOUR=${hour};i.android.intent.extra.alarm.MINUTES=${minute};S.android.intent.extra.alarm.MESSAGE=${encodeURIComponent(message || 'Alarm')};end`;
      window.location.href = intent;
      return true;
    } catch (e) {
      console.error('Failed to set alarm:', e);
      return false;
    }
  }, [isNative]);

  // Set timer using Android intent
  const setNativeTimer = useCallback(async (seconds: number, message?: string): Promise<boolean> => {
    if (!isNative) return false;
    
    try {
      // Android intent for setting timer
      const intent = `intent:#Intent;action=android.intent.action.SET_TIMER;i.android.intent.extra.alarm.LENGTH=${seconds};S.android.intent.extra.alarm.MESSAGE=${encodeURIComponent(message || 'Timer')};B.android.intent.extra.alarm.SKIP_UI=false;end`;
      window.location.href = intent;
      return true;
    } catch (e) {
      console.error('Failed to set timer:', e);
      return false;
    }
  }, [isNative]);

  // Play music on Spotify
  const playOnSpotify = useCallback(async (query: string): Promise<boolean> => {
    if (!isNative) {
      window.open(`https://open.spotify.com/search/${encodeURIComponent(query)}`, '_blank');
      return true;
    }
    
    try {
      // Try Spotify deep link first
      const spotifyUri = `spotify:search:${encodeURIComponent(query)}`;
      window.location.href = spotifyUri;
      return true;
    } catch (e) {
      console.error('Failed to open Spotify:', e);
      window.open(`https://open.spotify.com/search/${encodeURIComponent(query)}`, '_blank');
      return true;
    }
  }, [isNative]);

  // Listen for app state changes
  useEffect(() => {
    if (!isNative) return;

    const handleStateChange = App.addListener('appStateChange', ({ isActive }) => {
      console.log('App state changed. Is active?', isActive);
    });

    return () => {
      handleStateChange.then(handle => handle.remove());
    };
  }, [isNative]);

  return {
    isNative,
    notificationPermission,
    // Haptics
    hapticImpact,
    hapticNotification,
    hapticVibrate,
    // Notifications
    showNotification,
    scheduleNotification,
    // App intents
    openAppByIntent,
    setNativeAlarm,
    setNativeTimer,
    playOnSpotify,
  };
};
