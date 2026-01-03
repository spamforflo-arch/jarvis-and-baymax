import { Globe, Database } from "lucide-react";
import { Switch } from "@/components/ui/switch";

interface WebToggleProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
}

const WebToggle = ({ enabled, onToggle }: WebToggleProps) => {
  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-surface-1 border border-border">
      <div className="flex items-center gap-2">
        {enabled ? (
          <Globe className="w-4 h-4 text-primary" />
        ) : (
          <Database className="w-4 h-4 text-muted-foreground" />
        )}
        <span className="text-sm font-medium text-foreground">
          {enabled ? "Web" : "Offline"}
        </span>
      </div>
      <Switch
        checked={enabled}
        onCheckedChange={onToggle}
        className="web-toggle-track data-[state=checked]:bg-primary/30"
      />
    </div>
  );
};

export default WebToggle;
