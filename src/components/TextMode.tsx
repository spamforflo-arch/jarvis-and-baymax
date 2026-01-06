import { useState, useRef, useEffect } from "react";
import ChatMessage from "./ChatMessage";
import ChatInput from "./ChatInput";
import { Sparkles, Shield, Trash2 } from "lucide-react";
import { useLocalAI } from "@/hooks/useLocalAI";
import { useLocalConversationHistory } from "@/hooks/useLocalConversationHistory";
import { toast } from "sonner";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const TextMode = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { streamResponse } = useLocalAI();
  const { addMessage, clearHistory, messages: storedMessages, isLoading: historyLoading } = useLocalConversationHistory();

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

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleClearHistory = () => {
    clearHistory();
    setMessages([]);
    toast.success("Conversation cleared (local only)");
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
      () => {
        setIsLoading(false);
        addMessage({ role: 'assistant', content: assistantContent });
      }
    );
  };

  return (
    <div className="flex flex-col h-full slide-up">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 glass-panel border-b border-border/40">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center pastel-border">
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          <span className="font-semibold text-primary">Jarvis</span>
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/10 text-green-600 text-xs">
            <Shield className="w-3 h-3" />
            <span>Offline</span>
          </div>
        </div>
        {messages.length > 0 && (
          <button
            onClick={handleClearHistory}
            className="p-2 rounded-lg hover:bg-surface-2 text-muted-foreground transition-colors"
            title="Clear local history"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-20 h-20 rounded-full bg-primary/8 flex items-center justify-center mb-4 pastel-border">
              <Sparkles className="w-10 h-10 text-primary" />
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-2">
              How can I help you?
            </h2>
            <p className="text-sm text-muted-foreground max-w-xs">
              I'm your offline assistant. All conversations stay private on your device - no data ever leaves your phone.
            </p>
            <div className="flex items-center gap-1.5 mt-4 px-3 py-1.5 rounded-full bg-green-500/10 text-green-600 text-xs">
              <Shield className="w-3.5 h-3.5" />
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
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-surface-2 flex items-center justify-center pastel-border">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <ChatInput onSend={handleSend} disabled={isLoading} />
    </div>
  );
};

export default TextMode;
