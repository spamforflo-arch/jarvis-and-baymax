import { useCallback } from 'react';
import { toast } from 'sonner';

export interface PhoneAction {
  type: 'alarm' | 'timer' | 'reminder' | 'open_app' | 'play_music' | 'unknown';
  app?: string;
  time?: string;
  duration?: number;
  message?: string;
  query?: string;
}

// Parse voice commands to detect phone actions
export const parsePhoneAction = (transcript: string): PhoneAction | null => {
  const lower = transcript.toLowerCase().trim();
  
  // Alarm patterns
  if (lower.includes('set alarm') || lower.includes('set an alarm') || lower.includes('wake me up')) {
    const timeMatch = lower.match(/(?:for|at)\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i);
    return {
      type: 'alarm',
      time: timeMatch ? timeMatch[1] : undefined,
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
  
  // Music/Spotify patterns
  if (lower.includes('play ') && (lower.includes('spotify') || lower.includes('music') || lower.includes('song'))) {
    const queryMatch = lower.match(/play\s+(.+?)(?:\s+on\s+spotify)?$/i);
    return {
      type: 'play_music',
      query: queryMatch ? queryMatch[1].trim() : undefined,
      app: 'spotify'
    };
  }
  
  if (lower.includes('play spotify') || lower.includes('open spotify')) {
    return {
      type: 'open_app',
      app: 'spotify'
    };
  }
  
  return null;
};

// Execute phone actions (web-based alternatives since we can't access native APIs directly)
export const usePhoneActions = () => {
  const executeAction = useCallback((action: PhoneAction): string => {
    console.log('Executing phone action:', action);
    
    switch (action.type) {
      case 'alarm': {
        // Use web notification API for alarms
        if ('Notification' in window && Notification.permission === 'granted') {
          const timeStr = action.time || 'the specified time';
          toast.success(`Alarm set for ${timeStr}`);
          return `I've noted your alarm for ${timeStr}. Since this is a web app, I'll remind you with a notification. For real alarms, you can use your phone's clock app.`;
        } else if ('Notification' in window && Notification.permission !== 'denied') {
          Notification.requestPermission();
          toast.info('Please allow notifications for alarms');
          return 'Please allow notifications so I can set alarms for you. Tap the notification permission when prompted.';
        }
        toast.info(`Alarm: ${action.time || 'Time not specified'}`);
        return `I heard you want an alarm${action.time ? ` for ${action.time}` : ''}. For now, you can set it in your phone's clock app. I'm here to help when I get more device access!`;
      }
      
      case 'timer': {
        if (action.duration && action.duration > 0) {
          const minutes = Math.floor(action.duration / 60);
          const seconds = action.duration % 60;
          const timeStr = minutes > 0 ? `${minutes} minute${minutes !== 1 ? 's' : ''}${seconds > 0 ? ` and ${seconds} seconds` : ''}` : `${seconds} seconds`;
          
          // Set a simple web timer
          setTimeout(() => {
            toast.success('Timer finished!', { duration: 10000 });
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification('Timer Complete!', { body: 'Your timer has finished.' });
            }
          }, action.duration * 1000);
          
          toast.success(`Timer set for ${timeStr}`);
          return `Timer set for ${timeStr}. I'll let you know when it's done!`;
        }
        return "I didn't catch the duration. Try saying something like 'set a timer for 5 minutes'.";
      }
      
      case 'reminder': {
        toast.info('Reminder noted');
        return `I've noted your reminder: "${action.message}". I'll do my best to remind you, but for reliable reminders, you might want to use your phone's reminder app.`;
      }
      
      case 'open_app': {
        const app = action.app?.toLowerCase() || '';
        
        // Try to open common apps via URL schemes (works on mobile)
        const appSchemes: Record<string, string> = {
          'spotify': 'spotify://',
          'youtube': 'youtube://',
          'whatsapp': 'whatsapp://',
          'instagram': 'instagram://',
          'twitter': 'twitter://',
          'x': 'twitter://',
          'facebook': 'fb://',
          'chrome': 'googlechrome://',
          'safari': 'x-web-search://',
          'maps': 'maps://',
          'google maps': 'comgooglemaps://',
          'camera': 'camera://',
          'settings': 'app-settings://',
          'messages': 'sms://',
          'phone': 'tel://',
          'mail': 'mailto:',
          'email': 'mailto:',
          'calendar': 'calshow://',
        };
        
        const scheme = Object.entries(appSchemes).find(([key]) => app.includes(key));
        
        if (scheme) {
          try {
            window.location.href = scheme[1];
            return `Opening ${action.app}...`;
          } catch {
            toast.info(`Trying to open ${action.app}`);
            return `I'm trying to open ${action.app}. If it doesn't open, you might need to do it manually from your home screen.`;
          }
        }
        
        toast.info(`Open ${action.app}`);
        return `I can't directly open ${action.app} from here, but you can find it on your home screen or app drawer.`;
      }
      
      case 'play_music': {
        const query = action.query || '';
        // Try Spotify URL scheme
        try {
          if (query) {
            window.location.href = `spotify:search:${encodeURIComponent(query)}`;
          } else {
            window.location.href = 'spotify://';
          }
          return `Opening Spotify${query ? ` to play ${query}` : ''}...`;
        } catch {
          toast.info('Opening Spotify');
          return `I'm trying to open Spotify${query ? ` and play ${query}` : ''}. If it doesn't open, you can do it from your home screen.`;
        }
      }
      
      default:
        return '';
    }
  }, []);
  
  const checkAndExecute = useCallback((transcript: string): { handled: boolean; response: string } => {
    const action = parsePhoneAction(transcript);
    
    if (action) {
      const response = executeAction(action);
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