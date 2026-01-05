import { useCallback } from 'react';
import { toast } from 'sonner';
import { useNativeCapabilities } from './useNativeCapabilities';

export interface PhoneAction {
  type: 'alarm' | 'timer' | 'reminder' | 'open_app' | 'play_music' | 'pause_music' | 'unknown';
  app?: string;
  time?: string;
  hour?: number;
  minute?: number;
  duration?: number;
  message?: string;
  query?: string;
}

// Parse voice commands to detect phone actions
export const parsePhoneAction = (transcript: string): PhoneAction | null => {
  const lower = transcript.toLowerCase().trim();
  
  // Alarm patterns - improved parsing
  if (lower.includes('set alarm') || lower.includes('set an alarm') || lower.includes('wake me up')) {
    const timeMatch = lower.match(/(?:for|at)\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
    let hour = 0;
    let minute = 0;
    
    if (timeMatch) {
      hour = parseInt(timeMatch[1]);
      minute = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
      const period = timeMatch[3]?.toLowerCase();
      
      if (period === 'pm' && hour !== 12) hour += 12;
      if (period === 'am' && hour === 12) hour = 0;
    }
    
    return {
      type: 'alarm',
      time: timeMatch ? timeMatch[0] : undefined,
      hour,
      minute,
      message: transcript
    };
  }
  
  // Timer patterns
  if (lower.includes('set timer') || lower.includes('set a timer') || lower.includes('start timer')) {
    const durationMatch = lower.match(/(\d+)\s*(minute|min|second|sec|hour|hr)s?/i);
    let duration = 0;
    if (durationMatch) {
      const value = parseInt(durationMatch[1]);
      const unit = durationMatch[2].toLowerCase();
      if (unit.startsWith('hour') || unit === 'hr') duration = value * 3600;
      else if (unit.startsWith('min')) duration = value * 60;
      else duration = value;
    }
    return {
      type: 'timer',
      duration,
      message: transcript
    };
  }
  
  // Reminder patterns
  if (lower.includes('remind me') || lower.includes('set reminder') || lower.includes('set a reminder')) {
    return {
      type: 'reminder',
      message: transcript
    };
  }
  
  // Pause/Stop music patterns
  if (lower.includes('pause') || lower.includes('stop music') || lower.includes('stop playing')) {
    return {
      type: 'pause_music'
    };
  }
  
  // Open app patterns
  if (lower.includes('open ') || lower.includes('launch ') || lower.includes('start ')) {
    const appMatch = lower.match(/(?:open|launch|start)\s+(.+?)(?:\s+app)?$/i);
    if (appMatch) {
      return {
        type: 'open_app',
        app: appMatch[1].trim()
      };
    }
  }
  
  // Music/Spotify patterns - expanded detection
  if (lower.includes('play ')) {
    // Extract what to play - remove common prefixes
    let query = lower.replace(/^.*?play\s+/, '').trim();
    // Remove trailing "on spotify", "on music", etc.
    query = query.replace(/\s+on\s+(spotify|music).*$/i, '').trim();
    // Remove "music", "song", "spotify" from the end if standalone
    query = query.replace(/\s+(music|song|spotify)$/i, '').trim();
    
    if (query && query !== 'spotify' && query !== 'music') {
      return {
        type: 'play_music',
        query: query,
        app: 'spotify'
      };
    }
  }
  
  if (lower.includes('play spotify') || lower.includes('open spotify') || lower === 'spotify') {
    return {
      type: 'open_app',
      app: 'spotify'
    };
  }
  
  return null;
};

// Execute phone actions with native Capacitor support
export const usePhoneActions = () => {
  const {
    isNative,
    hapticNotification,
    showNotification,
    scheduleNotification,
    setNativeAlarm,
    setNativeTimer,
    playOnSpotify,
    openAppByIntent,
  } = useNativeCapabilities();

  const executeAction = useCallback(async (action: PhoneAction): Promise<string> => {
    console.log('Executing phone action:', action, 'isNative:', isNative);
    
    // Provide haptic feedback for all actions
    await hapticNotification('success');
    
    switch (action.type) {
      case 'alarm': {
        if (isNative && action.hour !== undefined) {
          const success = await setNativeAlarm(action.hour, action.minute || 0, action.message);
          if (success) {
            const timeStr = action.time || `${action.hour}:${String(action.minute || 0).padStart(2, '0')}`;
            toast.success(`Setting alarm for ${timeStr}`);
            return `I'm opening your clock app to set an alarm for ${timeStr}.`;
          }
        }
        
        // Web fallback with notification
        if (action.time) {
          toast.success(`Alarm noted for ${action.time}`);
          return `I've noted your alarm for ${action.time}. On this device, I'll use a notification to remind you.`;
        }
        
        return `I heard you want to set an alarm. Try saying "Set alarm for 7:30 AM".`;
      }
      
      case 'timer': {
        if (action.duration && action.duration > 0) {
          const minutes = Math.floor(action.duration / 60);
          const seconds = action.duration % 60;
          const timeStr = minutes > 0 
            ? `${minutes} minute${minutes !== 1 ? 's' : ''}${seconds > 0 ? ` and ${seconds} seconds` : ''}` 
            : `${seconds} seconds`;
          
          if (isNative) {
            const success = await setNativeTimer(action.duration, `Timer for ${timeStr}`);
            if (success) {
              toast.success(`Setting timer for ${timeStr}`);
              return `I'm opening your clock app to set a timer for ${timeStr}.`;
            }
          }
          
          // Web fallback - use local notification
          setTimeout(async () => {
            await hapticNotification('success');
            await showNotification('Timer Complete!', `Your ${timeStr} timer has finished.`);
            toast.success('Timer finished!', { duration: 10000 });
          }, action.duration * 1000);
          
          toast.success(`Timer set for ${timeStr}`);
          return `Timer set for ${timeStr}. I'll notify you when it's done!`;
        }
        return "I didn't catch the duration. Try saying something like 'set a timer for 5 minutes'.";
      }
      
      case 'reminder': {
        // Schedule a notification reminder
        const reminderTime = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now default
        await scheduleNotification('Reminder', action.message || 'You asked me to remind you!', reminderTime);
        toast.info('Reminder set');
        return `I've set a reminder for you. I'll notify you in about an hour with: "${action.message}"`;
      }
      
      case 'open_app': {
        const app = action.app?.toLowerCase() || '';
        
        // App package mappings for Android
        const appMappings: Record<string, { package: string; fallback: string }> = {
          'spotify': { package: 'com.spotify.music', fallback: 'https://open.spotify.com' },
          'youtube': { package: 'com.google.android.youtube', fallback: 'https://youtube.com' },
          'whatsapp': { package: 'com.whatsapp', fallback: 'https://web.whatsapp.com' },
          'instagram': { package: 'com.instagram.android', fallback: 'https://instagram.com' },
          'twitter': { package: 'com.twitter.android', fallback: 'https://twitter.com' },
          'x': { package: 'com.twitter.android', fallback: 'https://x.com' },
          'facebook': { package: 'com.facebook.katana', fallback: 'https://facebook.com' },
          'chrome': { package: 'com.android.chrome', fallback: 'https://google.com' },
          'maps': { package: 'com.google.android.apps.maps', fallback: 'https://maps.google.com' },
          'google maps': { package: 'com.google.android.apps.maps', fallback: 'https://maps.google.com' },
          'gmail': { package: 'com.google.android.gm', fallback: 'https://mail.google.com' },
          'camera': { package: 'camera', fallback: '' },
          'clock': { package: 'clock', fallback: '' },
          'calendar': { package: 'com.google.android.calendar', fallback: 'https://calendar.google.com' },
          'messages': { package: 'sms', fallback: '' },
          'phone': { package: 'phone', fallback: '' },
        };
        
        const mapping = Object.entries(appMappings).find(([key]) => app.includes(key));
        
        if (mapping) {
          const [appName, { package: pkg, fallback }] = mapping;
          await openAppByIntent(pkg, fallback);
          toast.success(`Opening ${appName}`);
          return `Opening ${appName}...`;
        }
        
        toast.info(`I don't know how to open ${action.app}`);
        return `I'm not sure how to open ${action.app}. Try opening it from your app drawer.`;
      }
      
      case 'play_music': {
        const query = action.query || '';
        if (query) {
          await playOnSpotify(query);
          toast.success(`Playing "${query}" on Spotify`);
          return `Opening Spotify to play ${query}. Enjoy!`;
        }
        
        await openAppByIntent('spotify', 'https://open.spotify.com');
        return 'Opening Spotify...';
      }

      case 'pause_music': {
        // We can't directly control media, but we can provide feedback
        toast.info('Use your phone\'s media controls to pause');
        return "I can't directly pause music from here, but you can use your phone's media controls or say 'Hey Google, pause'.";
      }
      
      default:
        return '';
    }
  }, [isNative, hapticNotification, setNativeAlarm, setNativeTimer, showNotification, scheduleNotification, openAppByIntent, playOnSpotify]);
  
  const checkAndExecute = useCallback(async (transcript: string): Promise<{ handled: boolean; response: string }> => {
    const action = parsePhoneAction(transcript);
    
    if (action) {
      const response = await executeAction(action);
      return { handled: true, response };
    }
    
    return { handled: false, response: '' };
  }, [executeAction]);
  
  return {
    parsePhoneAction,
    executeAction,
    checkAndExecute
  };
};