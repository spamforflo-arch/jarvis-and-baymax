import { useState, KeyboardEvent, useRef, useEffect } from "react";
import { Send } from "lucide-react";
import { useNativeCapabilities } from "@/hooks/useNativeCapabilities";

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

const ChatInput = ({ onSend, disabled }: ChatInputProps) => {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { hapticImpact } = useNativeCapabilities();

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [input]);

  const handleSend = async () => {
    if (input.trim() && !disabled) {
      await hapticImpact('light');
      onSend(input.trim());
      setInput("");
      // Reset height after send
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const hasInput = input.trim().length > 0;

  return (
    <div className="relative flex items-end gap-2 p-3 glass-panel border-t border-border/30 safe-area-bottom">
      <div className="flex-1 relative">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          disabled={disabled}
          rows={1}
          className="w-full px-4 py-2.5 bg-surface-2/90 pastel-border rounded-2xl text-sm text-foreground placeholder:text-muted-foreground/60 resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/30 transition-all disabled:opacity-50"
          style={{ minHeight: "44px", maxHeight: "120px" }}
          aria-label="Message input"
        />
      </div>
      <button
        onClick={handleSend}
        disabled={!hasInput || disabled}
        className={`flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-200 active:scale-90 ${
          hasInput && !disabled
            ? "bg-primary text-primary-foreground shadow-glow-sm"
            : "bg-surface-2 text-muted-foreground/40"
        }`}
        aria-label="Send message"
      >
        <Send className={`w-4.5 h-4.5 transition-transform ${hasInput ? "translate-x-0.5" : ""}`} />
      </button>
    </div>
  );
};

export default ChatInput;
