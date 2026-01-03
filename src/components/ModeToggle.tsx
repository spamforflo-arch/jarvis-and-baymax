import { MessageSquare, Mic } from "lucide-react";

interface ModeToggleProps {
  mode: "text" | "voice";
  onModeChange: (mode: "text" | "voice") => void;
}

const ModeToggle = ({ mode, onModeChange }: ModeToggleProps) => {
  return (
    <div className="flex items-center gap-1 p-1 rounded-full bg-surface-1 border border-border">
      <button
        onClick={() => onModeChange("text")}
        className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
          mode === "text" ? "mode-toggle-active" : "mode-toggle-inactive hover:bg-surface-2"
        }`}
      >
        <MessageSquare className="w-4 h-4" />
        <span>Text</span>
      </button>
      <button
        onClick={() => onModeChange("voice")}
        className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
          mode === "voice" ? "mode-toggle-active" : "mode-toggle-inactive hover:bg-surface-2"
        }`}
      >
        <Mic className="w-4 h-4" />
        <span>Voice</span>
      </button>
    </div>
  );
};

export default ModeToggle;
