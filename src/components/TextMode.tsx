import { useState, useRef, useEffect } from "react";
import ChatMessage from "./ChatMessage";
import ChatInput from "./ChatInput";
import { Sparkles, Shield, Trash2 } from "lucide-react";
import { useLocalAI } from "@/hooks/useLocalAI";
import { useLocalConversationHistory } from "@/hooks/useLocalConversationHistory";
import { useNativeCapabilities } from "@/hooks/useNativeCapabilities";
import { toast } from "sonner";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const TextMode = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { streamResponse } = useLocalAI();
  const { addMessage, clearHistory, messages: storedMessages, isLoading: historyLoading } = useLocalConversationHistory();
  const { hapticImpact, hapticNotification } = useNativeCapabilities();

  // Load stored messages on mount
  useEffect(() => {
    if (!historyLoading && storedMessages.length > 0) {
      setMessages(storedMessages.map((m, i) => ({
        id: `stored-${i}`,
        role: m.role,
        content: m.content,
      })));
    }
  }, [historyLoading, storedMessages]);

  const scrollToBottom = (smooth = true) => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: smooth ? "smooth" : "auto",
      });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleClearHistory = async () => {
    await hapticImpact('medium');
    clearHistory();
    setMessages([]);
    toast.success("Conversation cleared");
  };

  const handleSend = async (content: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content,
    };
    setMessages((prev) => [...prev, userMessage]);
    addMessage({ role: 'user', content });

    setIsLoading(true);
    let assistantContent = "";
    const assistantId = (Date.now() + 1).toString();

    // Add placeholder assistant message
    setMessages((prev) => [
      ...prev,
      { id: assistantId, role: "assistant", content: "" },
    ]);

    const conversationContext = messages.map(m => ({
      role: m.role,
      content: m.content,
    }));

    await streamResponse(
      content,
      conversationContext as any,
      (chunk) => {
        assistantContent += chunk;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, content: assistantContent } : m
          )
        );
      },
      async () => {
        setIsLoading(false);
        addMessage({ role: 'assistant', content: assistantContent });
        await hapticNotification('success');
      }
    );
  };

  return (
    <div className="flex flex-col h-full slide-up">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 glass-panel border-b border-border/30">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary/12 flex items-center justify-center pastel-border">
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-sm text-primary">Jarvis</span>
            <div className="flex items-center gap-1 text-[10px] text-green-500">
              <Shield className="w-2.5 h-2.5" />
              <span>Offline • Private</span>
            </div>
          </div>
        </div>
        {messages.length > 0 && (
          <button
            onClick={handleClearHistory}
            className="p-2 rounded-xl hover:bg-surface-2/80 text-muted-foreground transition-all active:scale-90"
            title="Clear conversation"
            aria-label="Clear conversation history"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Messages */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-3 overscroll-contain"
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <div className="w-16 h-16 rounded-full bg-primary/8 flex items-center justify-center mb-4 pastel-border">
              <Sparkles className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-lg font-semibold text-foreground mb-1.5">
              How can I help you?
            </h2>
            <p className="text-xs text-muted-foreground max-w-[280px] leading-relaxed">
              I'm your offline assistant. All conversations stay private on your device.
            </p>
            <div className="flex items-center gap-1.5 mt-4 px-3 py-1.5 rounded-full bg-green-500/10 text-green-500 text-xs">
              <Shield className="w-3 h-3" />
              <span>100% Private & Offline</span>
            </div>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <ChatMessage
                key={message.id}
                role={message.role}
                content={message.content}
              />
            ))}
            {isLoading && messages[messages.length - 1]?.content === "" && (
              <div className="flex gap-2.5">
                <div className="w-7 h-7 rounded-full bg-surface-2 flex items-center justify-center pastel-border">
                  <div className="flex gap-0.5">
                    <span className="w-1 h-1 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-1 h-1 bg-primary rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-1 h-1 bg-primary rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} className="h-1" />
      </div>

      {/* Input */}
      <ChatInput onSend={handleSend} disabled={isLoading} />
    </div>
  );
};

export default TextMode;
