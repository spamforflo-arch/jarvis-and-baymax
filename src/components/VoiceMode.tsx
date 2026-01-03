import { useState, useEffect } from "react";
import BaymaxFace from "./BaymaxFace";
import { Volume2, VolumeX } from "lucide-react";

type VoiceState = "idle" | "listening" | "thinking" | "speaking" | "error";

const VoiceMode = () => {
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [isMuted, setIsMuted] = useState(false);
  const [lastResponse, setLastResponse] = useState<string>("");

  const handleFaceClick = () => {
    if (voiceState === "idle") {
      startListening();
    } else if (voiceState === "listening") {
      stopListening();
    }
  };

  const startListening = () => {
    setVoiceState("listening");
    setLastResponse("");
    
    // Simulate listening for 3 seconds, then thinking, then speaking
    setTimeout(() => {
      setVoiceState("thinking");
      setTimeout(() => {
        setVoiceState("speaking");
        setLastResponse("I heard you! This is a demo. Connect to a voice backend for real voice interactions.");
        setTimeout(() => {
          setVoiceState("idle");
        }, 3000);
      }, 1500);
    }, 3000);
  };

  const stopListening = () => {
    setVoiceState("thinking");
    setTimeout(() => {
      setVoiceState("speaking");
      setLastResponse("Processing your request...");
      setTimeout(() => {
        setVoiceState("idle");
      }, 2000);
    }, 1000);
  };

  return (
    <div className="flex flex-col items-center justify-center h-full px-6 slide-up">
      {/* Top controls */}
      <div className="absolute top-4 right-4">
        <button
          onClick={() => setIsMuted(!isMuted)}
          className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
            isMuted
              ? "bg-surface-2 text-muted-foreground"
              : "bg-primary/20 text-primary"
          }`}
        >
          {isMuted ? (
            <VolumeX className="w-5 h-5" />
          ) : (
            <Volume2 className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* Baymax Face */}
      <div className="flex-1 flex items-center justify-center">
        <BaymaxFace state={voiceState} onClick={handleFaceClick} />
      </div>

      {/* Response text */}
      <div className="h-24 flex items-start justify-center text-center px-4">
        {lastResponse && (
          <p className="text-sm text-muted-foreground max-w-xs fade-in">
            {lastResponse}
          </p>
        )}
      </div>

      {/* Wake word hint */}
      <div className="pb-8">
        <p className="text-xs text-muted-foreground/60 text-center">
          Say "Wake up buddy" or tap the face
        </p>
      </div>
    </div>
  );
};

export default VoiceMode;
