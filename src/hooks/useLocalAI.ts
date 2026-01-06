/**
 * Offline Local AI - ZERO data leaves your device
 * All processing happens locally with pattern matching and stored responses
 */

import { useCallback } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface AIResponse {
  response: string;
  confidence: number;
}

// Knowledge base for common responses
const KNOWLEDGE_BASE: Record<string, string[]> = {
  greeting: [
    "Hey! Good to hear from you! How can I help?",
    "Hi there! What's on your mind?",
    "Hello! I'm here and ready to help!",
    "Hey! What can I do for you today?",
  ],
  farewell: [
    "Take care! I'll be here whenever you need me.",
    "Goodbye! Have a great day!",
    "See you later! Stay awesome!",
    "Bye! Don't hesitate to come back anytime.",
  ],
  thanks: [
    "You're welcome! Happy to help!",
    "No problem at all!",
    "Anytime! That's what I'm here for.",
    "Glad I could help!",
  ],
  howAreYou: [
    "I'm doing great, thanks for asking! How about you?",
    "All systems running smoothly! How are you doing?",
    "I'm here and ready to help! What's up with you?",
  ],
  whoAreYou: [
    "I'm Jarvis, your personal AI assistant. I run completely offline on your device for maximum privacy - no data ever leaves your phone!",
    "I'm Jarvis! I'm an offline AI companion designed to help you while keeping all your data completely private on your device.",
  ],
  weather: [
    "I can't check the weather since I'm completely offline to protect your privacy. But you could check a weather app or look outside!",
    "Since I work offline for your privacy, I don't have access to weather data. Try checking your weather app!",
  ],
  time: [
    `It's currently ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
  ],
  date: [
    `Today is ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`,
  ],
  capabilities: [
    "I can help with basic questions, set reminders through your phone's apps, tell you the time and date, and have friendly conversations - all completely offline! Your privacy is my top priority.",
    "I'm your offline assistant! I can chat, help with general knowledge, and interact with your phone's apps. Everything stays on your device.",
  ],
  privacy: [
    "I take your privacy very seriously! I run 100% offline - no data is ever sent to any server, cloud, or third party. Everything stays on your device.",
    "Your privacy is absolute with me. I don't use the internet, I don't send data anywhere, and I don't track anything. Everything is local on your phone.",
  ],
  unknown: [
    "I'm not sure about that, but I'd love to learn! As an offline assistant, my knowledge is limited but I'm always here to try my best.",
    "That's outside my offline knowledge base. I keep everything local for your privacy, which means I can't look things up online.",
    "I don't have information about that since I work completely offline. Is there something else I can help with?",
  ],
  joke: [
    "Why don't scientists trust atoms? Because they make up everything! 😄",
    "What do you call a fake noodle? An impasta! 🍝",
    "Why did the scarecrow win an award? He was outstanding in his field! 🌾",
    "I told my wife she was drawing her eyebrows too high. She looked surprised! 😮",
  ],
  motivation: [
    "You've got this! Every step forward is progress, no matter how small.",
    "Remember: the only bad workout is the one that didn't happen. Same goes for any effort you make!",
    "You're stronger than you think. Keep pushing forward!",
    "Today's a new opportunity. Make it count!",
  ],
  tired: [
    "It sounds like you could use some rest. Taking breaks is important for your well-being!",
    "Listen to your body - if you're tired, rest is productive too. Take care of yourself!",
  ],
  stressed: [
    "I'm sorry you're feeling stressed. Try taking a few deep breaths - it really helps! Would you like to talk about what's bothering you?",
    "Stress can be tough. Remember to take things one step at a time. Is there anything specific I can help you think through?",
  ],
  bored: [
    "Bored? How about learning something new, going for a walk, or calling a friend? Sometimes the best cure for boredom is doing something different!",
    "Boredom can be an opportunity! You could try reading, exercise, a hobby, or just relaxing guilt-free.",
  ],
};

// Intent patterns for matching user input
const INTENT_PATTERNS: Array<{ patterns: RegExp[]; intent: string }> = [
  {
    patterns: [/^(hi|hello|hey|good morning|good afternoon|good evening|howdy|yo)\b/i],
    intent: 'greeting',
  },
  {
    patterns: [/^(bye|goodbye|see you|later|farewell|take care)\b/i, /\b(gotta go|talk later)\b/i],
    intent: 'farewell',
  },
  {
    patterns: [/\b(thank|thanks|thx|appreciate)\b/i],
    intent: 'thanks',
  },
  {
    patterns: [/\b(how are you|how('| a)re you doing|how('| a)re things|what's up|wassup)\b/i],
    intent: 'howAreYou',
  },
  {
    patterns: [/\b(who are you|what are you|your name|about you)\b/i],
    intent: 'whoAreYou',
  },
  {
    patterns: [/\b(weather|temperature|rain|sunny|cloudy|forecast)\b/i],
    intent: 'weather',
  },
  {
    patterns: [/\b(what time|current time|time is it)\b/i],
    intent: 'time',
  },
  {
    patterns: [/\b(what date|today's date|what day|current date)\b/i],
    intent: 'date',
  },
  {
    patterns: [/\b(what can you do|capabilities|help me with|your features)\b/i],
    intent: 'capabilities',
  },
  {
    patterns: [/\b(privacy|data|secure|safe|track|spy|send data)\b/i],
    intent: 'privacy',
  },
  {
    patterns: [/\b(joke|funny|make me laugh|humor)\b/i],
    intent: 'joke',
  },
  {
    patterns: [/\b(motivat|inspire|encourage|cheer me up|feeling down)\b/i],
    intent: 'motivation',
  },
  {
    patterns: [/\b(tired|exhausted|sleepy|no energy)\b/i],
    intent: 'tired',
  },
  {
    patterns: [/\b(stressed|anxious|overwhelmed|worried|nervous)\b/i],
    intent: 'stressed',
  },
  {
    patterns: [/\b(bored|boring|nothing to do)\b/i],
    intent: 'bored',
  },
];

// Get random response from array
const getRandomResponse = (responses: string[]): string => {
  return responses[Math.floor(Math.random() * responses.length)];
};

// Detect intent from user message
const detectIntent = (message: string): string => {
  const lowerMessage = message.toLowerCase().trim();
  
  for (const { patterns, intent } of INTENT_PATTERNS) {
    for (const pattern of patterns) {
      if (pattern.test(lowerMessage)) {
        return intent;
      }
    }
  }
  
  return 'unknown';
};

// Generate contextual response based on conversation history
const generateContextualResponse = (
  message: string,
  history: Message[]
): AIResponse => {
  const intent = detectIntent(message);
  const responses = KNOWLEDGE_BASE[intent] || KNOWLEDGE_BASE.unknown;
  
  let response = getRandomResponse(responses);
  let confidence = intent === 'unknown' ? 0.3 : 0.8;
  
  // Add context awareness
  if (history.length > 0) {
    const lastUserMessage = history
      .filter(m => m.role === 'user')
      .slice(-1)[0];
    
    // If user is continuing a topic, acknowledge it
    if (lastUserMessage && intent === 'unknown') {
      const previousIntent = detectIntent(lastUserMessage.content);
      if (previousIntent !== 'unknown') {
        response = "I understand you're still thinking about that. " + response;
      }
    }
  }
  
  // Dynamic time/date responses
  if (intent === 'time') {
    response = `It's currently ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    confidence = 1.0;
  }
  
  if (intent === 'date') {
    response = `Today is ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`;
    confidence = 1.0;
  }
  
  return { response, confidence };
};

export const useLocalAI = () => {
  const processMessage = useCallback(async (
    message: string,
    conversationHistory: Message[] = []
  ): Promise<string> => {
    // Simulate slight processing delay for natural feel
    await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 300));
    
    const { response } = generateContextualResponse(message, conversationHistory);
    return response;
  }, []);
  
  // Stream-like response for UI consistency
  const streamResponse = useCallback(async (
    message: string,
    conversationHistory: Message[],
    onChunk: (chunk: string) => void,
    onComplete: () => void
  ): Promise<void> => {
    const fullResponse = await processMessage(message, conversationHistory);
    
    // Simulate streaming by sending words one at a time
    const words = fullResponse.split(' ');
    for (let i = 0; i < words.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 30 + Math.random() * 50));
      onChunk(words[i] + (i < words.length - 1 ? ' ' : ''));
    }
    
    onComplete();
  }, [processMessage]);
  
  return {
    processMessage,
    streamResponse,
  };
};
