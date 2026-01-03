import { Globe, Database } from "lucide-react";
import { Switch } from "@/components/ui/switch";

interface WebToggleProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
}

const WebToggle = ({ enabled, onToggle }: WebToggleProps) => {
  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-surface-1/70 pastel-border">
      <div className="flex items-center gap-2">
        {enabled ? (
          <Globe className="w-4 h-4 text-primary" />
        ) : (
          <Database className="w-4 h-4 text-muted-foreground" />
        )}
        <div className="flex flex-col">
          <span className="text-sm font-medium text-foreground">
            {enabled ? "Web" : "Basic"}
          </span>
          <span className="text-[10px] text-muted-foreground leading-tight">
            {enabled ? "Detailed" : "General"}
          </span>
        </div>
      </div>
      <Switch
        checked={enabled}
        onCheckedChange={onToggle}
        className="web-toggle-track data-[state=checked]:bg-primary/25"
      />
    </div>
  );
};

export default WebToggle;
