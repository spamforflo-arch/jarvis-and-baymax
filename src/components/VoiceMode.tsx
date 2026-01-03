import { useState, useEffect, useCallback, useRef } from "react";
import BaymaxFace from "./BaymaxFace";
import { Volume2, VolumeX, Square } from "lucide-react";
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
  const abortControllerRef = useRef<AbortController | null>(null);

  const { speak, stop: stopSpeaking, isSpeaking, isSupported: ttsSupported, voicesLoaded } = useTextToSpeech({
    rate: 1.0,
    pitch: 1.0,
  });

  const { checkAndExecute } = usePhoneActions();

  const stopEverything = useCallback(() => {
    console.log("Stopping everything");
    // Abort any ongoing fetch
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    // Stop speech
    stopSpeaking();
    processingRef.current = false;
    setVoiceState("idle");
  }, [stopSpeaking]);

  const speakResponse = useCallback(async (text: string) => {
    if (!text || isMuted || !ttsSupported) {
      console.log("Skipping TTS - muted:", isMuted, "supported:", ttsSupported);
      setVoiceState("idle");
      return;
    }

    console.log("Starting TTS for response");
    setVoiceState("speaking");
    
    try {
      await speak(text);
      console.log("TTS completed");
    } catch (err) {
      console.error("TTS error:", err);
    } finally {
      setVoiceState("idle");
    }
  }, [isMuted, ttsSupported, speak]);

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
      processingRef.current = false;
      await speakResponse(phoneAction.response);
      return;
    }

    // Create abort controller for this request
    abortControllerRef.current = new AbortController();

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
        signal: abortControllerRef.current.signal,
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

      console.log("AI response received:", fullResponse);
      setLastResponse(fullResponse || "I'm here to help!");
      processingRef.current = false;
      
      // Speak the response
      await speakResponse(fullResponse || "I'm here to help!");
      
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        console.log("Request aborted");
        return;
      }
      console.error("Voice chat error:", error);
      toast.error("Failed to process your request");
      setVoiceState("error");
      setTimeout(() => setVoiceState("idle"), 2000);
    } finally {
      processingRef.current = false;
      abortControllerRef.current = null;
    }
  }, [checkAndExecute, speakResponse]);

  const { 
    isListening, 
    transcript, 
    startListening, 
    stopListening, 
    resetTranscript,
    isSupported: sttSupported,
    error: sttError
  } = useVoiceRecognition({
    wakeWords: ["wake up buddy", "wake up max"],
    onWakeWord: () => {
      if (voiceState === "idle") {
        startVoiceInteraction();
      }
    },
  });

  // Watch for TTS completion
  useEffect(() => {
    if (voiceState === "speaking" && !isSpeaking) {
      const timer = setTimeout(() => {
        if (!isSpeaking && voiceState === "speaking") {
          setVoiceState("idle");
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isSpeaking, voiceState]);

  // Update voice state based on listening
  useEffect(() => {
    if (isListening && voiceState === "idle") {
      setVoiceState("listening");
    }
  }, [isListening, voiceState]);

  // Handle transcript completion
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
    
    stopEverything();
    resetTranscript();
    startListening();
    setVoiceState("listening");
  }, [sttSupported, resetTranscript, startListening, stopEverything]);

  const handleFaceClick = useCallback(() => {
    console.log("Face clicked, current state:", voiceState);
    
    if (voiceState === "idle") {
      startVoiceInteraction();
    } else if (voiceState === "listening") {
      stopListening();
    } else if (voiceState === "speaking" || voiceState === "thinking") {
      stopEverything();
    }
  }, [voiceState, startVoiceInteraction, stopListening, stopEverything]);

  const handleMuteToggle = useCallback(() => {
    setIsMuted(!isMuted);
    if (isSpeaking) {
      stopSpeaking();
      setVoiceState("idle");
    }
  }, [isMuted, isSpeaking, stopSpeaking]);

  const isProcessing = voiceState === "thinking" || voiceState === "speaking" || voiceState === "listening";

  return (
    <div className="flex flex-col items-center justify-center h-full px-6 slide-up">
      {/* Top controls */}
      <div className="absolute top-4 right-4 flex gap-2">
        {isProcessing && (
          <button
            onClick={stopEverything}
            className="w-10 h-10 rounded-full flex items-center justify-center transition-all pastel-border bg-destructive/20 text-destructive hover:bg-destructive/30"
          >
            <Square className="w-4 h-4 fill-current" />
          </button>
        )}
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
            ? 'Say "Wake up Buddy" or tap the face'
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