import { useState, useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import ModeToggle from "@/components/ModeToggle";
import TextMode from "@/components/TextMode";
import VoiceMode from "@/components/VoiceMode";

const Index = () => {
  const [mode, setMode] = useState<"text" | "voice">("text");
  const [isNative, setIsNative] = useState(false);

  useEffect(() => {
    setIsNative(Capacitor.isNativePlatform());
  }, []);

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      {/* Native-style status bar spacer for Android */}
      {isNative && <div className="h-safe-top bg-background" />}
      
      {/* Header with app name and mode toggle */}
      <header className="flex-shrink-0 flex items-center justify-between py-3 px-4 bg-background/95 backdrop-blur-xl border-b border-border/30 z-10 safe-area-inset">
        <h1 className="text-lg font-semibold text-primary glow-text tracking-wide select-none">
          Warm AI
        </h1>
        <ModeToggle mode={mode} onModeChange={setMode} />
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-hidden">
        {mode === "text" ? <TextMode /> : <VoiceMode />}
      </main>
      
      {/* Native-style navigation bar spacer for Android */}
      {isNative && <div className="h-safe-bottom bg-background" />}
    </div>
  );
};

export default Index;
