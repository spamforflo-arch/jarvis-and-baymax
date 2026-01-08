import { User, Sparkles } from "lucide-react";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
}

const ChatMessage = ({ role, content }: ChatMessageProps) => {
  const isUser = role === "user";

  // Simple markdown-like formatting for code blocks
  const formatContent = (text: string) => {
    if (!text) return "";
    
    // Handle inline code
    return text.split('`').map((part, index) => {
      if (index % 2 === 1) {
        return (
          <code 
            key={index} 
            className="px-1.5 py-0.5 rounded bg-surface-2/80 text-primary text-xs font-mono"
          >
            {part}
          </code>
        );
      }
      return part;
    });
  };

  return (
    <div 
      className={`flex gap-2.5 fade-in ${isUser ? "flex-row-reverse" : ""}`}
      role="article"
      aria-label={`${isUser ? "Your" : "Assistant"} message`}
    >
      {/* Avatar */}
      <div
        className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${
          isUser 
            ? "bg-primary/15 text-primary" 
            : "bg-surface-2 text-primary/80 pastel-border"
        }`}
      >
        {isUser ? (
          <User className="w-3.5 h-3.5" />
        ) : (
          <Sparkles className="w-3.5 h-3.5" />
        )}
      </div>
      
      {/* Message bubble */}
      <div
        className={`max-w-[82%] px-3.5 py-2.5 rounded-2xl ${
          isUser 
            ? "chat-bubble-user rounded-br-md" 
            : "chat-bubble-assistant rounded-bl-md"
        }`}
      >
        <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
          {formatContent(content)}
        </p>
      </div>
    </div>
  );
};

export default ChatMessage;
