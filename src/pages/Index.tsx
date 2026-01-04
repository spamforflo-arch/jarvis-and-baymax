import { useState } from "react";
import ModeToggle from "@/components/ModeToggle";
import TextMode from "@/components/TextMode";
import VoiceMode from "@/components/VoiceMode";

const Index = () => {
  const [mode, setMode] = useState<"text" | "voice">("text");

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      {/* Header with app name and mode toggle */}
      <header className="flex-shrink-0 flex items-center justify-between py-4 px-5 bg-background/80 backdrop-blur-lg border-b border-border/50 z-10">
        <h1 className="text-lg font-semibold text-primary glow-text tracking-wide">Warm AI</h1>
        <ModeToggle mode={mode} onModeChange={setMode} />
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-hidden">
        {mode === "text" ? <TextMode /> : <VoiceMode />}
      </main>
    </div>
  );
};

export default Index;
