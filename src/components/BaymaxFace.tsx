import { useEffect, useState } from "react";

type FaceState = "idle" | "listening" | "thinking" | "speaking" | "error";

interface BaymaxFaceProps {
  state: FaceState;
  onClick?: () => void;
}

const BaymaxFace = ({ state, onClick }: BaymaxFaceProps) => {
  const [blinkState, setBlinkState] = useState(false);

  // Random blinking for idle state
  useEffect(() => {
    if (state === "idle") {
      const blinkInterval = setInterval(() => {
        setBlinkState(true);
        setTimeout(() => setBlinkState(false), 150);
      }, 3000 + Math.random() * 2000);
      return () => clearInterval(blinkInterval);
    }
  }, [state]);

  const getEyeStyle = () => {
    switch (state) {
      case "listening":
        return "scale-110";
      case "thinking":
        return "thinking-blink";
      case "speaking":
        return "speaking-bounce";
      case "error":
        return "scale-90 opacity-70";
      default:
        return blinkState ? "scale-y-[0.1]" : "";
    }
  };

  const getLineStyle = () => {
    switch (state) {
      case "listening":
        return "stroke-primary";
      case "thinking":
        return "stroke-primary/50 thinking-blink";
      case "speaking":
        return "stroke-primary speaking-bounce";
      case "error":
        return "stroke-destructive";
      default:
        return "";
    }
  };

  const getPulseRings = () => {
    if (state === "listening") {
      return (
        <>
          <circle
            cx="200"
            cy="200"
            r="180"
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth="1"
            opacity="0.3"
            className="pulse-ring"
          />
          <circle
            cx="200"
            cy="200"
            r="160"
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth="1"
            opacity="0.2"
            className="pulse-ring"
            style={{ animationDelay: "0.5s" }}
          />
        </>
      );
    }
    return null;
  };

  return (
    <div
      onClick={onClick}
      className={`relative cursor-pointer select-none transition-all duration-300 ${
        state === "listening" ? "listening-pulse" : ""
      }`}
    >
      <svg
        viewBox="0 0 400 400"
        className="w-64 h-64 md:w-80 md:h-80 baymax-face"
      >
        {getPulseRings()}
        
        {/* Left Eye */}
        <circle
          cx="120"
          cy="200"
          r="35"
          className={`baymax-eye transition-all duration-200 ${getEyeStyle()}`}
          style={{ transformOrigin: "120px 200px" }}
        />
        
        {/* Right Eye */}
        <circle
          cx="280"
          cy="200"
          r="35"
          className={`baymax-eye transition-all duration-200 ${getEyeStyle()}`}
          style={{ transformOrigin: "280px 200px" }}
        />
        
        {/* Connecting Line */}
        <line
          x1="155"
          y1="200"
          x2="245"
          y2="200"
          strokeWidth="4"
          strokeLinecap="round"
          className={`baymax-line transition-all duration-200 ${getLineStyle()}`}
        />
      </svg>

      {/* Status indicator */}
      <div className="absolute -bottom-8 left-1/2 -translate-x-1/2">
        <span
          className={`text-xs font-medium uppercase tracking-wider transition-all duration-300 ${
            state === "listening"
              ? "text-primary glow-text"
              : state === "speaking"
              ? "text-primary"
              : state === "error"
              ? "text-destructive"
              : "text-muted-foreground"
          }`}
        >
          {state === "idle" ? "Tap to speak" : state}
        </span>
      </div>
    </div>
  );
};

export default BaymaxFace;
