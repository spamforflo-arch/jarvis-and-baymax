import { useState, useEffect, useCallback, useRef } from "react";
import BaymaxFace from "./BaymaxFace";
import { Volume2, VolumeX, Square, Mic, Bell, Trash2 } from "lucide-react";
import { useVoiceRecognition } from "@/hooks/useVoiceRecognition";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";
import { usePhoneActions } from "@/hooks/usePhoneActions";
import { useNativeCapabilities } from "@/hooks/useNativeCapabilities";
import { useConversationHistory } from "@/hooks/useConversationHistory";
import { usePermissions } from "@/hooks/usePermissions";
import { toast } from "sonner";

type FaceState = "idle" | "listening" | "thinking" | "speaking" | "error";
type VoiceState = FaceState | "permissions";

const getFaceState = (voiceState: VoiceState): FaceState => {
  return voiceState === "permissions" ? "idle" : voiceState;
};

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
  const { hapticImpact, hapticNotification, showNotification, isNative } = useNativeCapabilities();
  const { messages, addMessage, getMessagesForAPI, clearHistory, isLoading: historyLoading } = useConversationHistory();
  const { 
    permissions, 
    hasRequiredPermissions, 
    requestAllPermissions, 
    isRequestingPermissions 
  } = usePermissions();

  // Check and request permissions on mount
  useEffect(() => {
    if (!historyLoading && permissions.microphone === 'prompt') {
      setVoiceState("permissions");
    }
  }, [historyLoading, permissions.microphone]);

  const handleRequestPermissions = async () => {
    const results = await requestAllPermissions();
    if (results.microphone) {
      setVoiceState("idle");
      toast.success("Permissions granted! You can now use voice commands.");
    } else {
      toast.error("Microphone permission is required for voice commands.");
    }
  };

  const stopEverything = useCallback(() => {
    console.log("Stopping everything");
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
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
    await hapticImpact('light');

    // Save user message to history
    await addMessage({ role: 'user', content: transcript });

    // Check for phone actions first
    const phoneAction = await checkAndExecute(transcript);
    if (phoneAction.handled) {
      console.log("Phone action handled:", phoneAction.response);
      setLastResponse(phoneAction.response);
      await addMessage({ role: 'assistant', content: phoneAction.response });
      processingRef.current = false;
      await speakResponse(phoneAction.response);
      return;
    }

    abortControllerRef.current = new AbortController();

    try {
      // Include conversation history for context
      const conversationHistory = getMessagesForAPI(10);
      
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: [{ role: "user", content: transcript }],
          conversationHistory,
          webEnabled: false,
          isVoiceMode: true,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error("Failed to get response");
      }

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
      const finalResponse = fullResponse || "I'm here to help!";
      setLastResponse(finalResponse);
      
      // Save assistant response to history
      await addMessage({ role: 'assistant', content: finalResponse });
      
      await hapticNotification('success');
      if (isNative) {
        await showNotification('Jarvis', finalResponse.substring(0, 100));
      }
      
      processingRef.current = false;
      await speakResponse(finalResponse);
      
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        console.log("Request aborted");
        return;
      }
      console.error("Voice chat error:", error);
      await hapticNotification('error');
      toast.error("Failed to process your request");
      setVoiceState("error");
      setTimeout(() => setVoiceState("idle"), 2000);
    } finally {
      processingRef.current = false;
      abortControllerRef.current = null;
    }
  }, [checkAndExecute, speakResponse, hapticImpact, hapticNotification, showNotification, isNative, addMessage, getMessagesForAPI]);

  const { 
    isListening, 
    transcript, 
    startListening, 
    stopListening, 
    resetTranscript,
    isSupported: sttSupported,
    error: sttError
  } = useVoiceRecognition({
    wakeWords: [
      "hey jarvis", "hi jarvis", "jarvis",
      "wake up buddy", "wake up max", "wakeup buddy", "wakeup max", 
      "hey buddy", "hey max", "hi buddy", "hi max"
    ],
    onWakeWord: async () => {
      console.log("Wake word detected!");
      if (voiceState === "idle" && hasRequiredPermissions) {
        await hapticImpact('medium');
        toast.success("I'm listening!");
        startVoiceInteraction();
      }
    },
    continuous: true,
  });

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

  useEffect(() => {
    if (isListening && voiceState === "idle") {
      setVoiceState("listening");
    }
  }, [isListening, voiceState]);

  useEffect(() => {
    if (!isListening && transcript && voiceState === "listening" && !processingRef.current) {
      console.log("Transcript complete, processing:", transcript);
      handleVoiceResult(transcript);
      resetTranscript();
    }
  }, [isListening, transcript, voiceState, handleVoiceResult, resetTranscript]);

  const startVoiceInteraction = useCallback(() => {
    if (!hasRequiredPermissions) {
      setVoiceState("permissions");
      return;
    }
    
    if (!sttSupported) {
      toast.error("Speech recognition is not supported in this browser");
      return;
    }
    
    stopEverything();
    resetTranscript();
    startListening();
    setVoiceState("listening");
  }, [hasRequiredPermissions, sttSupported, resetTranscript, startListening, stopEverything]);

  const handleFaceClick = useCallback(async () => {
    console.log("Face clicked, current state:", voiceState);
    await hapticImpact('light');
    
    if (voiceState === "permissions") {
      handleRequestPermissions();
    } else if (voiceState === "idle") {
      startVoiceInteraction();
    } else if (voiceState === "listening") {
      stopListening();
    } else if (voiceState === "speaking" || voiceState === "thinking") {
      stopEverything();
    }
  }, [voiceState, startVoiceInteraction, stopListening, stopEverything, hapticImpact]);

  const handleMuteToggle = useCallback(async () => {
    await hapticImpact('light');
    setIsMuted(!isMuted);
    if (isSpeaking) {
      stopSpeaking();
      setVoiceState("idle");
    }
  }, [isMuted, isSpeaking, stopSpeaking, hapticImpact]);

  const handleClearHistory = useCallback(async () => {
    await hapticImpact('light');
    await clearHistory();
    toast.success("Conversation history cleared");
  }, [clearHistory, hapticImpact]);

  const isProcessing = voiceState === "thinking" || voiceState === "speaking" || voiceState === "listening";

  // Permission request UI
  if (voiceState === "permissions" || (!hasRequiredPermissions && !historyLoading)) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-6 slide-up">
        <div className="flex-1 flex flex-col items-center justify-center gap-8">
          <BaymaxFace state="idle" onClick={handleRequestPermissions} />
          
          <div className="text-center space-y-4 max-w-xs">
            <h2 className="text-lg font-semibold text-foreground">Permissions Required</h2>
            <p className="text-sm text-muted-foreground">
              Jarvis needs access to your microphone to hear your voice commands, and notifications to alert you.
            </p>
            
            <div className="flex flex-col gap-3 mt-6">
              <button
                onClick={handleRequestPermissions}
                disabled={isRequestingPermissions}
                className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-medium transition-all hover:opacity-90 disabled:opacity-50"
              >
                <Mic className="w-5 h-5" />
                {isRequestingPermissions ? "Requesting..." : "Grant Permissions"}
              </button>
              
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Mic className="w-4 h-4" />
                  <span>Microphone: {permissions.microphone}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Bell className="w-4 h-4" />
                  <span>Notifications: {permissions.notifications}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full px-6 slide-up">
      {/* Top controls */}
      <div className="absolute top-4 right-4 flex gap-2">
        {messages.length > 0 && (
          <button
            onClick={handleClearHistory}
            className="w-10 h-10 rounded-full flex items-center justify-center transition-all pastel-border bg-surface-2/50 text-muted-foreground hover:bg-surface-2"
            title="Clear conversation history"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
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
        <BaymaxFace 
          state={getFaceState(voiceState)} 
          onClick={handleFaceClick} 
        />
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
            ? 'Say "Hey Jarvis" or tap the face'
            : 'Tap the face to speak'}
        </p>
        {sttError && (
          <p className="text-xs text-destructive text-center mt-1">{sttError}</p>
        )}
        {!voicesLoaded && ttsSupported && (
          <p className="text-xs text-muted-foreground/40 text-center mt-1">Loading voices...</p>
        )}
        {messages.length > 0 && (
          <p className="text-xs text-muted-foreground/40 text-center mt-1">
            {messages.length} messages in history
          </p>
        )}
      </div>
    </div>
  );
};

export default VoiceMode;