import { useState, useRef, useEffect } from "react";
import ChatMessage from "./ChatMessage";
import ChatInput from "./ChatInput";
import WebToggle from "./WebToggle";
import { Sparkles } from "lucide-react";
import { useStreamChat } from "@/hooks/useStreamChat";
import { toast } from "sonner";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const TextMode = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [webEnabled, setWebEnabled] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { streamChat, isLoading } = useStreamChat();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (content: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content,
    };
    setMessages((prev) => [...prev, userMessage]);

    let assistantContent = "";
    const assistantId = (Date.now() + 1).toString();

    // Add placeholder assistant message
    setMessages((prev) => [
      ...prev,
      { id: assistantId, role: "assistant", content: "" },
    ]);

    const chatMessages = [...messages, userMessage].map((m) => ({
      role: m.role,
      content: m.content,
    }));

    await streamChat({
      messages: chatMessages,
      webEnabled,
      onDelta: (delta) => {
        assistantContent += delta;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, content: assistantContent } : m
          )
        );
      },
      onDone: () => {
        // Done streaming
      },
      onError: (error) => {
        toast.error(error);
        // Remove the empty assistant message on error
        setMessages((prev) => prev.filter((m) => m.id !== assistantId));
      },
    });
  };

  return (
    <div className="flex flex-col h-full slide-up">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 glass-panel border-b border-border/50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center glow-border">
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          <span className="font-semibold text-foreground">Warm AI</span>
        </div>
        <WebToggle enabled={webEnabled} onToggle={setWebEnabled} />
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4 glow-border">
              <Sparkles className="w-10 h-10 text-primary" />
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-2">
              How can I help you?
            </h2>
            <p className="text-sm text-muted-foreground max-w-xs">
              Ask me anything. Toggle Web mode for real-time search results.
            </p>
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
