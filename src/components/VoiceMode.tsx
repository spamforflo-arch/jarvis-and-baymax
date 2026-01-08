import { useState, useEffect, useCallback, useRef } from "react";
import BaymaxFace from "./BaymaxFace";
import { Volume2, VolumeX, Square, Mic, Bell, Trash2, Shield, ChevronRight } from "lucide-react";
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
  useEffect(() => {
    if (!historyLoading && permissions.microphone !== 'granted' && permissions.microphone !== 'unknown') {
      setVoiceState("permissions");
    } else if (permissions.microphone === 'granted' && voiceState === 'permissions') {
      setVoiceState("idle");
    }
  }, [historyLoading, permissions.microphone, voiceState]);

  const handleRequestPermissions = async () => {
    await hapticImpact('medium');
    const results = await requestAllPermissions();
    if (results.microphone) {
      setVoiceState("idle");
      await hapticNotification('success');
      toast.success("Permissions granted! Voice commands ready.");
    } else {
      await hapticNotification('error');
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
      setVoiceState("idle");
      return;
    }

    setVoiceState("speaking");
    
    try {
      await speak(text);
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

    await hapticImpact('light');

    // Save user message locally
    addMessage({ role: 'user', content: transcript });

    // Check for phone actions first
    const phoneAction = await checkAndExecute(transcript);
    if (phoneAction.handled) {
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
      
      setLastResponse(response);
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
  }, [voiceState, startVoiceInteraction, stopListening, stopEverything, hapticImpact, handleRequestPermissions]);

  const handleMuteToggle = useCallback(async () => {
    await hapticImpact('light');
    setIsMuted(!isMuted);
    if (isSpeaking) {
      stopSpeaking();
      setVoiceState("idle");
    }
    toast.success(isMuted ? "Sound enabled" : "Sound muted");
  }, [isMuted, isSpeaking, stopSpeaking, hapticImpact]);

  const handleClearHistory = useCallback(async () => {
    await hapticImpact('medium');
    clearHistory();
    setLastResponse("");
    toast.success("Conversation cleared");
  }, [clearHistory, hapticImpact]);

  const isProcessing = voiceState === "thinking" || voiceState === "speaking" || voiceState === "listening";

  // Permission request UI
  const showPermissionScreen = voiceState === "permissions" || 
    (!hasRequiredPermissions && permissions.microphone !== 'unknown' && !historyLoading);
    
  if (showPermissionScreen) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-6 slide-up">
        <div className="flex-1 flex flex-col items-center justify-center gap-6 max-w-sm">
          <BaymaxFace state="idle" onClick={handleRequestPermissions} />
          
          <div className="text-center space-y-3">
            <div className="flex items-center justify-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">Privacy-First Voice</h2>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Tap the button below to grant microphone access. All processing stays on your device.
            </p>
          </div>
          
          {/* Permission Button */}
          <button
            onClick={handleRequestPermissions}
            disabled={isRequestingPermissions}
            className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-2xl bg-primary text-primary-foreground font-medium transition-all active:scale-[0.98] disabled:opacity-50 shadow-glow-sm"
          >
            <Mic className="w-5 h-5" />
            <span>{isRequestingPermissions ? "Requesting..." : "Allow Microphone Access"}</span>
            <ChevronRight className="w-4 h-4 ml-auto" />
          </button>
          
          {permissions.microphone === 'denied' && (
            <div className="w-full p-3 rounded-xl bg-destructive/10 border border-destructive/20">
              <p className="text-xs text-destructive text-center leading-relaxed">
                Permission denied. Please enable microphone in {isNative ? 'Settings → Apps → jarvis-and-baymax → Permissions' : 'browser settings'}.
              </p>
            </div>
          )}
          
          {/* Permission Status */}
          <div className="flex flex-col items-center gap-2 text-xs text-muted-foreground/70">
            <div className="flex items-center gap-4">
              <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full ${
                permissions.microphone === 'granted' ? 'bg-green-500/10 text-green-500' : 
                permissions.microphone === 'denied' ? 'bg-red-500/10 text-red-500' : 
                'bg-surface-2/50'
              }`}>
                <Mic className="w-3 h-3" />
                <span className="capitalize">{permissions.microphone}</span>
              </div>
              <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full ${
                permissions.notifications === 'granted' ? 'bg-green-500/10 text-green-500' : 
                permissions.notifications === 'denied' ? 'bg-red-500/10 text-red-500' : 
                'bg-surface-2/50'
              }`}>
                <Bell className="w-3 h-3" />
                <span className="capitalize">{permissions.notifications}</span>
              </div>
            </div>
            <p className="text-muted-foreground/50">
              {isNative ? 'Native Android' : 'Web Browser'} • {platform}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full px-6 slide-up relative">
      {/* Top controls */}
      <div className="absolute top-3 right-3 flex gap-2 z-10">
        {messages.length > 0 && (
          <button
            onClick={handleClearHistory}
            className="w-10 h-10 rounded-xl flex items-center justify-center transition-all pastel-border bg-surface-2/50 text-muted-foreground hover:bg-surface-2 active:scale-90"
            title="Clear conversation"
            aria-label="Clear conversation history"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
        {isProcessing && (
          <button
            onClick={stopEverything}
            className="w-10 h-10 rounded-xl flex items-center justify-center transition-all pastel-border bg-destructive/15 text-destructive hover:bg-destructive/25 active:scale-90"
            aria-label="Stop"
          >
            <Square className="w-4 h-4 fill-current" />
          </button>
        )}
        <button
          onClick={handleMuteToggle}
          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all pastel-border active:scale-90 ${
            isMuted
              ? "bg-surface-2/70 text-muted-foreground"
              : "bg-primary/12 text-primary"
          }`}
          aria-label={isMuted ? "Unmute" : "Mute"}
        >
          {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
        </button>
      </div>

      {/* Privacy indicator */}
      <div className="absolute top-3 left-3">
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-green-500/10 text-green-500 text-xs font-medium">
          <Shield className="w-3 h-3" />
          <span>Offline</span>
        </div>
      </div>

      {/* Baymax Face */}
      <div className="flex-1 flex items-center justify-center pb-8">
        <BaymaxFace 
          state={getFaceState(voiceState)} 
          onClick={handleFaceClick} 
        />
      </div>

      {/* Transcript display */}
      {isListening && transcript && (
        <div className="absolute bottom-36 left-4 right-4">
          <div className="glass-panel rounded-2xl px-4 py-3 text-center">
            <p className="text-sm text-foreground">{transcript}</p>
          </div>
        </div>
      )}

      {/* Response text */}
      <div className="h-20 flex items-start justify-center text-center px-6">
        {lastResponse && (
          <p className="text-sm text-muted-foreground max-w-xs fade-in line-clamp-3 leading-relaxed">
            {lastResponse}
          </p>
        )}
      </div>

      {/* Bottom hints */}
      <div className="pb-6 space-y-1">
        <p className="text-xs text-muted-foreground/50 text-center">
          {sttSupported 
            ? 'Say "Hey Jarvis" or tap the face'
            : 'Tap the face to speak'}
        </p>
        {sttError && (
          <p className="text-xs text-destructive text-center">{sttError}</p>
        )}
        {!voicesLoaded && ttsSupported && (
          <p className="text-xs text-muted-foreground/30 text-center">Loading voices...</p>
        )}
        {messages.length > 0 && (
          <p className="text-xs text-muted-foreground/30 text-center">
            {messages.length} messages stored locally
          </p>
        )}
      </div>
    </div>
  );
};

export default VoiceMode;
