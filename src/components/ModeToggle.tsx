import { MessageSquare, Mic } from "lucide-react";
import { useNativeCapabilities } from "@/hooks/useNativeCapabilities";

interface ModeToggleProps {
  mode: "text" | "voice";
  onModeChange: (mode: "text" | "voice") => void;
}

const ModeToggle = ({ mode, onModeChange }: ModeToggleProps) => {
  const { hapticImpact } = useNativeCapabilities();

  const handleModeChange = async (newMode: "text" | "voice") => {
    if (newMode !== mode) {
      await hapticImpact('light');
      onModeChange(newMode);
    }
  };

  return (
    <div className="flex items-center gap-0.5 p-1 rounded-full bg-surface-1/80 backdrop-blur-lg pastel-border">
      <button
        onClick={() => handleModeChange("text")}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 active:scale-95 ${
          mode === "text" 
            ? "mode-toggle-active" 
            : "mode-toggle-inactive hover:bg-surface-2/80"
        }`}
        aria-label="Text mode - Jarvis"
      >
        <MessageSquare className="w-3.5 h-3.5" />
        <span className="text-xs">Jarvis</span>
      </button>
      <button
        onClick={() => handleModeChange("voice")}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 active:scale-95 ${
          mode === "voice" 
            ? "mode-toggle-active" 
            : "mode-toggle-inactive hover:bg-surface-2/80"
        }`}
        aria-label="Voice mode - Baymax"
      >
        <Mic className="w-3.5 h-3.5" />
        <span className="text-xs">Baymax</span>
      </button>
    </div>
  );
};

export default ModeToggle;
