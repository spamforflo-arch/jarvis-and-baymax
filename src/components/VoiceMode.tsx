import { useState, useEffect, useCallback, useRef } from "react";
import BaymaxFace from "./BaymaxFace";
import { Volume2, VolumeX } from "lucide-react";
import { useVoiceRecognition } from "@/hooks/useVoiceRecognition";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";
import { usePhoneActions } from "@/hooks/usePhoneActions";
import { toast } from "sonner";

type VoiceState = "idle" | "listening" | "thinking" | "speaking" | "error";

const VoiceMode = () => {
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [isMuted, setIsMuted] = useState(false);
  const [lastResponse, setLastResponse] = useState<string>("");
  const processingRef = useRef(false);

  const { speak, stop: stopSpeaking, isSpeaking, isSupported: ttsSupported, voicesLoaded } = useTextToSpeech({
    rate: 0.95,
    pitch: 1.1,
  });

  const { checkAndExecute } = usePhoneActions();

  const handleVoiceResult = useCallback(async (transcript: string) => {
    if (!transcript.trim() || processingRef.current) return;
    
    processingRef.current = true;
    setVoiceState("thinking");
    setLastResponse("");

    console.log("Processing voice input:", transcript);

    // Check for phone actions first
    const phoneAction = checkAndExecute(transcript);
    if (phoneAction.handled) {
      console.log("Phone action handled:", phoneAction.response);
      setLastResponse(phoneAction.response);
      
      if (!isMuted && ttsSupported && voicesLoaded) {
        setVoiceState("speaking");
        speak(phoneAction.response);
      } else {
        setVoiceState("idle");
      }
      processingRef.current = false;
      return;
    }

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
          isVoiceMode: true,
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

      console.log("AI response:", fullResponse);
      setLastResponse(fullResponse || "I'm here to help!");
      
      if (!isMuted && ttsSupported && voicesLoaded && fullResponse) {
        setVoiceState("speaking");
        // Small delay to ensure state updates
        setTimeout(() => {
          speak(fullResponse);
        }, 50);
      } else {
        console.log("Not speaking - muted:", isMuted, "ttsSupported:", ttsSupported, "voicesLoaded:", voicesLoaded);
        setVoiceState("idle");
      }
    } catch (error) {
      console.error("Voice chat error:", error);
      toast.error("Failed to process your request");
      setVoiceState("error");
      setTimeout(() => setVoiceState("idle"), 2000);
    } finally {
      processingRef.current = false;
    }
  }, [isMuted, speak, ttsSupported, voicesLoaded, checkAndExecute]);

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
      // Small delay to ensure speech has actually finished
      const timer = setTimeout(() => {
        if (!isSpeaking) {
          setVoiceState("idle");
        }
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [isSpeaking, voiceState]);

  // Update voice state based on listening
  useEffect(() => {
    if (isListening && voiceState !== "listening" && voiceState !== "thinking" && voiceState !== "speaking") {
      setVoiceState("listening");
    }
  }, [isListening, voiceState]);

  // Handle transcript completion - process when listening ends with final transcript
  useEffect(() => {
    if (!isListening && transcript && voiceState === "listening" && !processingRef.current) {
      console.log("Transcript complete, processing:", transcript);
      handleVoiceResult(transcript);
      resetTranscript();
    }
  }, [isListening, transcript, voiceState, handleVoiceResult, resetTranscript]);

  const startVoiceInteraction = useCallback(() => {
    if (!sttSupported) {
      toast.error("Speech recognition is not supported in this browser");
      return;
    }
    
    // Stop any ongoing speech first
    stopSpeaking();
    processingRef.current = false;
    
    resetTranscript();
    startListening();
    setVoiceState("listening");
  }, [sttSupported, resetTranscript, startListening, stopSpeaking]);

  const handleFaceClick = useCallback(() => {
    console.log("Face clicked, current state:", voiceState);
    
    if (voiceState === "idle") {
      startVoiceInteraction();
    } else if (voiceState === "listening") {
      stopListening();
    } else if (voiceState === "speaking") {
      stopSpeaking();
      setVoiceState("idle");
    } else if (voiceState === "thinking") {
      // Allow canceling during thinking
      processingRef.current = false;
      setVoiceState("idle");
    }
  }, [voiceState, startVoiceInteraction, stopListening, stopSpeaking]);

  const handleMuteToggle = useCallback(() => {
    setIsMuted(!isMuted);
    if (isSpeaking) {
      stopSpeaking();
      setVoiceState("idle");
    }
  }, [isMuted, isSpeaking, stopSpeaking]);

  return (
    <div className="flex flex-col items-center justify-center h-full px-6 slide-up">
      {/* Top controls */}
      <div className="absolute top-4 right-4">
        <button
          onClick={handleMuteToggle}
          className={`w-10 h-10 rounded-full flex items-center justify-center transition-all pastel-border ${
            isMuted
              ? "bg-surface-2/70 text-muted-foreground"
              : "bg-primary/12 text-primary"
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
        {!voicesLoaded && ttsSupported && (
          <p className="text-xs text-muted-foreground/40 text-center mt-1">Loading voices...</p>
        )}
      </div>
    </div>
  );
};

export default VoiceMode;