import { useState, useEffect, useCallback } from "react";
import BaymaxFace from "./BaymaxFace";
import { Volume2, VolumeX } from "lucide-react";
import { useVoiceRecognition } from "@/hooks/useVoiceRecognition";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";
import { toast } from "sonner";

type VoiceState = "idle" | "listening" | "thinking" | "speaking" | "error";

const VoiceMode = () => {
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [isMuted, setIsMuted] = useState(false);
  const [lastResponse, setLastResponse] = useState<string>("");

  const { speak, stop: stopSpeaking, isSpeaking, isSupported: ttsSupported } = useTextToSpeech({
    rate: 0.95,
    pitch: 1.1,
  });

  const handleVoiceResult = useCallback(async (transcript: string) => {
    if (!transcript.trim()) return;
    
    setVoiceState("thinking");
    setLastResponse("");

    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: [{ role: "user", content: transcript }],
          webEnabled: false,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get response");
      }

      // Read the streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullResponse = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const text = decoder.decode(value, { stream: true });
          const lines = text.split('\n');
          
          for (const line of lines) {
            if (line.startsWith('data: ') && line !== 'data: [DONE]') {
              try {
                const json = JSON.parse(line.slice(6));
                const content = json.choices?.[0]?.delta?.content;
                if (content) {
                  fullResponse += content;
                }
              } catch {
                // Ignore parse errors
              }
            }
          }
        }
      }

      setLastResponse(fullResponse || "I'm here to help!");
      
      if (!isMuted && ttsSupported && fullResponse) {
        setVoiceState("speaking");
        speak(fullResponse);
      } else {
        setVoiceState("idle");
      }
    } catch (error) {
      console.error("Voice chat error:", error);
      toast.error("Failed to process your request");
      setVoiceState("error");
      setTimeout(() => setVoiceState("idle"), 2000);
    }
  }, [isMuted, speak, ttsSupported]);

  const { 
    isListening, 
    transcript, 
    startListening, 
    stopListening, 
    resetTranscript,
    isSupported: sttSupported,
    error: sttError
  } = useVoiceRecognition({
    wakeWords: ["wake up buddy", "wake up baymax", "hey buddy", "hey baymax"],
    onWakeWord: () => {
      if (voiceState === "idle") {
        startVoiceInteraction();
      }
    },
  });

  // Watch for TTS completion
  useEffect(() => {
    if (voiceState === "speaking" && !isSpeaking) {
      setVoiceState("idle");
    }
  }, [isSpeaking, voiceState]);

  // Update voice state based on listening
  useEffect(() => {
    if (isListening && voiceState !== "listening") {
      setVoiceState("listening");
    }
  }, [isListening, voiceState]);

  // Handle transcript completion
  useEffect(() => {
    if (!isListening && transcript && voiceState === "listening") {
      handleVoiceResult(transcript);
      resetTranscript();
    }
  }, [isListening, transcript, voiceState, handleVoiceResult, resetTranscript]);

  const startVoiceInteraction = () => {
    if (!sttSupported) {
      toast.error("Speech recognition is not supported in this browser");
      return;
    }
    resetTranscript();
    startListening();
  };

  const handleFaceClick = () => {
    if (voiceState === "idle") {
      startVoiceInteraction();
    } else if (voiceState === "listening") {
      stopListening();
    } else if (voiceState === "speaking") {
      stopSpeaking();
      setVoiceState("idle");
    }
  };

  const handleMuteToggle = () => {
    setIsMuted(!isMuted);
    if (isSpeaking) {
      stopSpeaking();
      setVoiceState("idle");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full px-6 slide-up">
      {/* Top controls */}
      <div className="absolute top-4 right-4">
        <button
          onClick={handleMuteToggle}
          className={`w-10 h-10 rounded-full flex items-center justify-center transition-all pastel-border ${
            isMuted
              ? "bg-surface-2 text-muted-foreground"
              : "bg-primary/15 text-primary"
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

      {/* Transcript display */}
      {isListening && transcript && (
        <div className="absolute bottom-32 left-4 right-4">
          <div className="glass-panel rounded-xl px-4 py-3 text-center">
            <p className="text-sm text-foreground">{transcript}</p>
          </div>
        </div>
      )}

      {/* Response text */}
      <div className="h-24 flex items-start justify-center text-center px-4">
        {lastResponse && (
          <p className="text-sm text-muted-foreground max-w-xs fade-in line-clamp-3">
            {lastResponse}
          </p>
        )}
      </div>

      {/* Wake word hint */}
      <div className="pb-8">
        <p className="text-xs text-muted-foreground/60 text-center">
          {sttSupported 
            ? 'Say "Hey Buddy" or tap the face'
            : 'Tap the face to speak'}
        </p>
        {sttError && (
          <p className="text-xs text-destructive text-center mt-1">{sttError}</p>
        )}
      </div>
    </div>
  );
};

export default VoiceMode;
