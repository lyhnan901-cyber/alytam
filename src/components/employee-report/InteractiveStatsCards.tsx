import { Card } from "@/components/ui/card";
import { 
  ListTodo, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Percent,
  Timer 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { StatType } from "./TaskDetailsDrawer";

interface InteractiveStatsCardsProps {
  total: number;
  completed: number;
  inProgress: number;
  overdue: number;
  completionRate: number;
  totalMinutes: number;
  onStatClick: (statType: StatType) => void;
}

function formatTime(minutes: number): string {
  if (minutes === 0) return "0 دقيقة";
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins} دقيقة`;
  if (mins === 0) return `${hours} ساعة`;
  return `${hours}س ${mins}د`;
}

export function InteractiveStatsCards({
  total,
  completed,
  inProgress,
  overdue,
  completionRate,
  totalMinutes,
  onStatClick,
}: InteractiveStatsCardsProps) {
  const stats: Array<{
    key: StatType | "time";
    label: string;
    value: number | string;
    icon: React.ElementType;
    color: string;
    bgColor: string;
    clickable: boolean;
  }> = [
    {
      key: "total",
      label: "إجمالي المهام",
      value: total,
      icon: ListTodo,
      color: "text-primary",
      bgColor: "bg-primary/10",
      clickable: true,
    },
    {
      key: "completed",
      label: "المكتملة",
      value: completed,
      icon: CheckCircle2,
      color: "text-success",
      bgColor: "bg-success/10",
      clickable: true,
    },
    {
      key: "inProgress",
      label: "قيد التنفيذ",
      value: inProgress,
      icon: Clock,
      color: "text-warning",
      bgColor: "bg-warning/10",
      clickable: true,
    },
    {
      key: "overdue",
      label: "المتأخرة",
      value: overdue,
      icon: AlertTriangle,
      color: "text-destructive",
      bgColor: "bg-destructive/10",
      clickable: true,
    },
    {
      key: "completionRate",
      label: "نسبة الإنجاز",
      value: `${completionRate}%`,
      icon: Percent,
      color: "text-info",
      bgColor: "bg-info/10",
      clickable: true,
    },
    {
      key: "time",
      label: "الوقت المسجل",
      value: formatTime(totalMinutes),
      icon: Timer,
      color: "text-accent-foreground",
      bgColor: "bg-accent",
      clickable: false,
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {stats.map((stat) => (
        <Card
          key={stat.key}
          className={cn(
            "p-4 transition-all",
            stat.clickable && "cursor-pointer hover:shadow-md hover:border-primary/50 active:scale-[0.98]"
          )}
          onClick={() => {
            if (stat.clickable && stat.key !== "time") {
              onStatClick(stat.key as StatType);
            }
          }}
        >
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${stat.bgColor}`}>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </div>
            <div>
              <p className="text-xl font-bold">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
