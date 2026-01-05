import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Capacitor } from '@capacitor/core';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface StoredMessage {
  id: string;
  conversation_id: string;
  role: string;
  content: string;
  created_at: string;
}

// Generate a unique device ID for this installation
const getDeviceId = (): string => {
  const KEY = 'warm_ai_device_id';
  let deviceId = localStorage.getItem(KEY);
  
  if (!deviceId) {
    deviceId = `${Capacitor.getPlatform()}-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
    localStorage.setItem(KEY, deviceId);
  }
  
  return deviceId;
};

export const useConversationHistory = () => {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const deviceId = getDeviceId();

  // Initialize or get existing conversation
  useEffect(() => {
    const initConversation = async () => {
      try {
        // Try to get existing conversation for this device
        const { data: existingConversation, error: fetchError } = await supabase
          .from('conversations')
          .select('id')
          .eq('device_id', deviceId)
          .order('updated_at', { ascending: false })
          .limit(1)
          .single();

        if (existingConversation && !fetchError) {
          setConversationId(existingConversation.id);
          
          // Load existing messages
          const { data: existingMessages } = await supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', existingConversation.id)
            .order('created_at', { ascending: true })
            .limit(50); // Keep last 50 messages for context
          
          if (existingMessages) {
            setMessages(existingMessages.map((m: StoredMessage) => ({
              role: m.role as 'user' | 'assistant',
              content: m.content,
            })));
          }
        } else {
          // Create new conversation
          const { data: newConversation, error: createError } = await supabase
            .from('conversations')
            .insert({ device_id: deviceId })
            .select('id')
            .single();

          if (newConversation && !createError) {
            setConversationId(newConversation.id);
          }
        }
      } catch (e) {
        console.error('Failed to initialize conversation:', e);
      } finally {
        setIsLoading(false);
      }
    };

    initConversation();
  }, [deviceId]);

  // Add a message to history
  const addMessage = useCallback(async (message: Message) => {
    if (!conversationId) return;

    // Update local state immediately
    setMessages(prev => [...prev, message]);

    // Persist to database
    try {
      await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          role: message.role,
          content: message.content,
        });

      // Update conversation timestamp
      await supabase
        .from('conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', conversationId);
    } catch (e) {
      console.error('Failed to save message:', e);
    }
  }, [conversationId]);

  // Get messages formatted for API
  const getMessagesForAPI = useCallback((includeRecent: number = 10): Message[] => {
    // Return last N messages for context
    return messages.slice(-includeRecent);
  }, [messages]);

  // Clear conversation history
  const clearHistory = useCallback(async () => {
    if (!conversationId) return;

    try {
      await supabase
        .from('messages')
        .delete()
        .eq('conversation_id', conversationId);
      
      setMessages([]);
    } catch (e) {
      console.error('Failed to clear history:', e);
    }
  }, [conversationId]);

  // Start new conversation
  const startNewConversation = useCallback(async () => {
    try {
      const { data: newConversation } = await supabase
        .from('conversations')
        .insert({ device_id: deviceId })
        .select('id')
        .single();

      if (newConversation) {
        setConversationId(newConversation.id);
        setMessages([]);
      }
    } catch (e) {
      console.error('Failed to start new conversation:', e);
    }
  }, [deviceId]);

  return {
    messages,
    isLoading,
    conversationId,
    addMessage,
    getMessagesForAPI,
    clearHistory,
    startNewConversation,
  };
};
