import { useEffect, useState } from "react";

type FaceState = "idle" | "listening" | "thinking" | "speaking" | "error";

interface BaymaxFaceProps {
  state: FaceState;
  onClick?: () => void;
}

const BaymaxFace = ({ state, onClick }: BaymaxFaceProps) => {
  const [blinkState, setBlinkState] = useState(false);

  // Natural random blinking for idle state
  useEffect(() => {
    if (state === "idle") {
      const scheduleNextBlink = () => {
        const delay = 2500 + Math.random() * 3000;
        return setTimeout(() => {
          setBlinkState(true);
          setTimeout(() => setBlinkState(false), 120);
          scheduleNextBlink();
        }, delay);
      };
      
      const timerId = scheduleNextBlink();
      return () => clearTimeout(timerId);
    }
  }, [state]);

  const getEyeStyle = () => {
    switch (state) {
      case "listening":
        return "scale-110 fill-primary";
      case "thinking":
        return "thinking-blink";
      case "speaking":
        return "speaking-bounce";
      case "error":
        return "scale-90 opacity-60";
      default:
        return blinkState ? "scale-y-[0.08]" : "";
    }
  };

  const getLineStyle = () => {
    switch (state) {
      case "listening":
        return "stroke-primary drop-shadow-glow";
      case "thinking":
        return "stroke-primary/60 thinking-blink";
      case "speaking":
        return "stroke-primary speaking-bounce drop-shadow-glow";
      case "error":
        return "stroke-destructive";
      default:
        return "";
    }
  };

  const getStatusText = () => {
    switch (state) {
      case "idle":
        return "Tap to speak";
      case "listening":
        return "Listening...";
      case "thinking":
        return "Thinking...";
      case "speaking":
        return "Speaking...";
      case "error":
        return "Error";
      default:
        return state;
    }
  };

  const getPulseRings = () => {
    if (state === "listening") {
      return (
        <>
          <circle
            cx="200"
            cy="200"
            r="170"
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth="1.5"
            opacity="0.4"
            className="pulse-ring"
          />
          <circle
            cx="200"
            cy="200"
            r="155"
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth="1"
            opacity="0.25"
            className="pulse-ring"
            style={{ animationDelay: "0.4s" }}
          />
          <circle
            cx="200"
            cy="200"
            r="140"
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth="0.5"
            opacity="0.15"
            className="pulse-ring"
            style={{ animationDelay: "0.8s" }}
          />
        </>
      );
    }
    return null;
  };

  return (
    <div
      onClick={onClick}
      className={`relative cursor-pointer select-none transition-all duration-300 active:scale-95 ${
        state === "listening" ? "listening-pulse" : ""
      }`}
      role="button"
      aria-label={`Baymax face - ${getStatusText()}`}
      tabIndex={0}
    >
      {/* Ambient glow background */}
      <div 
        className={`absolute inset-0 rounded-full transition-opacity duration-500 ${
          state === "listening" || state === "speaking" 
            ? "opacity-100" 
            : "opacity-0"
        }`}
        style={{
          background: "radial-gradient(circle, hsl(var(--primary) / 0.15) 0%, transparent 70%)",
          transform: "scale(1.5)",
        }}
      />
      
      <svg
        viewBox="0 0 400 400"
        className="w-56 h-56 sm:w-64 sm:h-64 md:w-72 md:h-72 baymax-face relative z-10"
      >
        {getPulseRings()}
        
        {/* Left Eye */}
        <circle
          cx="120"
          cy="200"
          r="32"
          className={`baymax-eye transition-all duration-150 ${getEyeStyle()}`}
          style={{ transformOrigin: "120px 200px" }}
        />
        
        {/* Right Eye */}
        <circle
          cx="280"
          cy="200"
          r="32"
          className={`baymax-eye transition-all duration-150 ${getEyeStyle()}`}
          style={{ transformOrigin: "280px 200px" }}
        />
        
        {/* Connecting Line */}
        <line
          x1="152"
          y1="200"
          x2="248"
          y2="200"
          strokeWidth="3.5"
          strokeLinecap="round"
          className={`baymax-line transition-all duration-150 ${getLineStyle()}`}
        />
      </svg>

      {/* Status indicator */}
      <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 w-full text-center">
        <span
          className={`inline-block text-xs font-medium uppercase tracking-widest transition-all duration-300 px-3 py-1 rounded-full ${
            state === "listening"
              ? "text-primary bg-primary/10 glow-text"
              : state === "speaking"
              ? "text-primary bg-primary/5"
              : state === "thinking"
              ? "text-muted-foreground bg-surface-2/50"
              : state === "error"
              ? "text-destructive bg-destructive/10"
              : "text-muted-foreground/70"
          }`}
        >
          {getStatusText()}
        </span>
      </div>
    </div>
  );
};

export default BaymaxFace;
