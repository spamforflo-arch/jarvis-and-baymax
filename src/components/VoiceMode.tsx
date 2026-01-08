import { useState, useEffect, useCallback, useRef } from "react";
import BaymaxFace from "./BaymaxFace";
import { Volume2, VolumeX, Square, Mic, Bell, Trash2, Shield } from "lucide-react";
import { useVoiceRecognition } from "@/hooks/useVoiceRecognition";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";
import { usePhoneActions } from "@/hooks/usePhoneActions";
import { useNativeCapabilities } from "@/hooks/useNativeCapabilities";
import { useLocalConversationHistory } from "@/hooks/useLocalConversationHistory";
import { useLocalAI } from "@/hooks/useLocalAI";
import { useAndroidPermissions } from "@/hooks/useAndroidPermissions";
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

  const { speak, stop: stopSpeaking, isSpeaking, isSupported: ttsSupported, voicesLoaded } = useTextToSpeech({
    rate: 1.0,
    pitch: 1.0,
  });

  const { checkAndExecute } = usePhoneActions();
  const { hapticImpact, hapticNotification, showNotification, isNative } = useNativeCapabilities();
  const { messages, addMessage, getMessagesForContext, clearHistory, isLoading: historyLoading } = useLocalConversationHistory();
  const { processMessage } = useLocalAI();
  const { 
    permissions, 
    hasRequiredPermissions, 
    requestAllPermissions, 
    isRequestingPermissions,
    platform,
  } = useAndroidPermissions();

  // Only show permissions screen if we've confirmed mic is not granted
  // Don't show while still checking (unknown state)
  useEffect(() => {
    if (!historyLoading && permissions.microphone !== 'granted' && permissions.microphone !== 'unknown') {
      setVoiceState("permissions");
    } else if (permissions.microphone === 'granted' && voiceState === 'permissions') {
      setVoiceState("idle");
    }
  }, [historyLoading, permissions.microphone, voiceState]);

  const handleRequestPermissions = async () => {
    const results = await requestAllPermissions();
    if (results.microphone) {
      setVoiceState("idle");
      toast.success("Permissions granted! Voice commands ready.");
    } else {
      toast.error("Microphone access is required for voice commands.");
    }
  };

  const stopEverything = useCallback(() => {
    console.log("Stopping everything");
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

    console.log("Processing voice input locally:", transcript);
    await hapticImpact('light');

    // Save user message locally
    addMessage({ role: 'user', content: transcript });

    // Check for phone actions first
    const phoneAction = await checkAndExecute(transcript);
    if (phoneAction.handled) {
      console.log("Phone action handled:", phoneAction.response);
      setLastResponse(phoneAction.response);
      addMessage({ role: 'assistant', content: phoneAction.response });
      processingRef.current = false;
      await speakResponse(phoneAction.response);
      return;
    }

    try {
      // Use LOCAL AI - no network calls
      const conversationContext = getMessagesForContext(10);
      const response = await processMessage(transcript, conversationContext as any);
      
      console.log("Local AI response:", response);
      setLastResponse(response);
      
      // Save assistant response locally
      addMessage({ role: 'assistant', content: response });
      
      await hapticNotification('success');
      if (isNative) {
        await showNotification('Jarvis', response.substring(0, 100));
      }
      
      processingRef.current = false;
      await speakResponse(response);
      
    } catch (error) {
      console.error("Local AI error:", error);
      await hapticNotification('error');
      const fallbackResponse = "I had a small hiccup, but I'm here! Try again?";
      setLastResponse(fallbackResponse);
      addMessage({ role: 'assistant', content: fallbackResponse });
      processingRef.current = false;
      await speakResponse(fallbackResponse);
    }
  }, [checkAndExecute, speakResponse, hapticImpact, hapticNotification, showNotification, isNative, addMessage, getMessagesForContext, processMessage]);

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
      toast.error("Speech recognition is not supported");
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
    clearHistory();
    toast.success("Conversation cleared (local only)");
  }, [clearHistory, hapticImpact]);

  const isProcessing = voiceState === "thinking" || voiceState === "speaking" || voiceState === "listening";

  // Permission request UI - only show when we know permissions are not granted
  const showPermissionScreen = voiceState === "permissions" || 
    (!hasRequiredPermissions && permissions.microphone !== 'unknown' && !historyLoading);
    
  if (showPermissionScreen) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-6 slide-up">
        <div className="flex-1 flex flex-col items-center justify-center gap-8">
          <BaymaxFace state="idle" onClick={handleRequestPermissions} />
          
          <div className="text-center space-y-4 max-w-xs">
            <div className="flex items-center justify-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">Privacy-First Permissions</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Tap the button below to allow microphone access. This triggers the {isNative ? 'Android' : 'browser'} permission dialog. All processing stays on your device.
            </p>
            
            <div className="flex flex-col gap-3 mt-6">
              <button
                onClick={handleRequestPermissions}
                disabled={isRequestingPermissions}
                className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-medium transition-all hover:opacity-90 disabled:opacity-50 active:scale-95"
              >
                <Mic className="w-5 h-5" />
                {isRequestingPermissions ? "Opening Permission Dialog..." : "Allow Microphone Access"}
              </button>
              
              {permissions.microphone === 'denied' && (
                <p className="text-xs text-destructive text-center">
                  Permission was denied. Please enable microphone access in your {isNative ? 'Android Settings > Apps > jarvis-and-baymax > Permissions' : 'browser settings'}.
                </p>
              )}
              
              <div className="flex flex-col gap-2 text-xs text-muted-foreground mt-2">
                <div className="flex items-center justify-center gap-4">
                  <div className={`flex items-center gap-1 ${permissions.microphone === 'granted' ? 'text-green-500' : permissions.microphone === 'denied' ? 'text-red-500' : ''}`}>
                    <Mic className="w-4 h-4" />
                    <span>Mic: {permissions.microphone}</span>
                  </div>
                  <div className={`flex items-center gap-1 ${permissions.notifications === 'granted' ? 'text-green-500' : permissions.notifications === 'denied' ? 'text-red-500' : ''}`}>
                    <Bell className="w-4 h-4" />
                    <span>Notif: {permissions.notifications}</span>
                  </div>
                </div>
                <p className="text-center text-muted-foreground/60">
                  Platform: {platform} | {isNative ? 'Native Android' : 'Web Browser'}
                </p>
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
            title="Clear local history"
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

      {/* Privacy indicator */}
      <div className="absolute top-4 left-4">
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/10 text-green-600 text-xs">
          <Shield className="w-3 h-3" />
          <span>Offline</span>
        </div>
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
            {messages.length} messages stored locally
          </p>
        )}
      </div>
    </div>
  );
};

export default VoiceMode;
