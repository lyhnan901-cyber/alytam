import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface KPICardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon: LucideIcon;
  iconBgColor?: string;
  featured?: boolean;
}

export function KPICard({
  title,
  value,
  change,
  changeType = "neutral",
  icon: Icon,
  iconBgColor = "bg-primary/10",
  featured = false,
}: KPICardProps) {
  return (
    <div className={cn(featured ? "featured-card" : "kpi-card")}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="kpi-card-value mt-1">{value}</p>
          {change && (
            <p
              className={cn(
                "text-xs mt-2",
                changeType === "positive" && "text-success",
                changeType === "negative" && "text-destructive",
                changeType === "neutral" && "text-muted-foreground"
              )}
            >
              {change}
            </p>
          )}
        </div>
        <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", iconBgColor)}>
          <Icon className={cn("w-6 h-6", featured ? "text-primary" : "text-primary")} />
        </div>
      </div>
    </div>
  );
}
