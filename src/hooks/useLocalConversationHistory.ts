/**
 * LOCAL-ONLY Conversation History - ZERO network calls
 * All data stays on device using localStorage only
 */

import { useState, useEffect, useCallback } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

interface Conversation {
  id: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}

const STORAGE_KEY = 'jarvis_local_conversations';
const MAX_MESSAGES = 100; // Keep last 100 messages per conversation

// Generate unique ID locally
const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
};

// Get all conversations from localStorage
const getStoredConversations = (): Record<string, Conversation> => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
};

// Save conversations to localStorage
const saveConversations = (conversations: Record<string, Conversation>) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
  } catch (e) {
    console.error('Failed to save conversations locally:', e);
  }
};

export const useLocalConversationHistory = () => {
  const [conversationId, setConversationId] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize conversation on mount
  useEffect(() => {
    const initConversation = () => {
      const conversations = getStoredConversations();
      const conversationIds = Object.keys(conversations);
      
      if (conversationIds.length > 0) {
        // Get most recent conversation
        const sorted = conversationIds.sort((a, b) => 
          conversations[b].updatedAt - conversations[a].updatedAt
        );
        const recentId = sorted[0];
        setConversationId(recentId);
        setMessages(conversations[recentId].messages || []);
      } else {
        // Create new conversation
        const newId = generateId();
        const newConversation: Conversation = {
          id: newId,
          messages: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        conversations[newId] = newConversation;
        saveConversations(conversations);
        setConversationId(newId);
      }
      
      setIsLoading(false);
    };

    initConversation();
  }, []);

  // Add message to conversation
  const addMessage = useCallback((message: Omit<Message, 'timestamp'>) => {
    if (!conversationId) return;

    const newMessage: Message = {
      ...message,
      timestamp: Date.now(),
    };

    setMessages(prev => {
      const updated = [...prev, newMessage];
      // Keep only last MAX_MESSAGES
      const trimmed = updated.slice(-MAX_MESSAGES);
      
      // Persist to localStorage
      const conversations = getStoredConversations();
      if (conversations[conversationId]) {
        conversations[conversationId].messages = trimmed;
        conversations[conversationId].updatedAt = Date.now();
        saveConversations(conversations);
      }
      
      return trimmed;
    });
  }, [conversationId]);

  // Get messages formatted for AI context
  const getMessagesForContext = useCallback((count: number = 10): Array<{ role: string; content: string }> => {
    return messages.slice(-count).map(m => ({
      role: m.role,
      content: m.content,
    }));
  }, [messages]);

  // Clear conversation history
  const clearHistory = useCallback(() => {
    if (!conversationId) return;

    setMessages([]);
    
    const conversations = getStoredConversations();
    if (conversations[conversationId]) {
      conversations[conversationId].messages = [];
      conversations[conversationId].updatedAt = Date.now();
      saveConversations(conversations);
    }
  }, [conversationId]);

  // Start new conversation
  const startNewConversation = useCallback(() => {
    const newId = generateId();
    const conversations = getStoredConversations();
    
    const newConversation: Conversation = {
      id: newId,
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    
    conversations[newId] = newConversation;
    saveConversations(conversations);
    
    setConversationId(newId);
    setMessages([]);
  }, []);

  // Delete all data (complete privacy wipe)
  const deleteAllData = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setMessages([]);
    startNewConversation();
  }, [startNewConversation]);

  return {
    messages,
    isLoading,
    conversationId,
    addMessage,
    getMessagesForContext,
    clearHistory,
    startNewConversation,
    deleteAllData,
  };
};
