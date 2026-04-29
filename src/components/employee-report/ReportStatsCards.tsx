import { Card } from "@/components/ui/card";
import { 
  ListTodo, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Percent,
  Timer 
} from "lucide-react";

interface ReportStatsCardsProps {
  total: number;
  completed: number;
  inProgress: number;
  overdue: number;
  completionRate: number;
  totalMinutes: number;
}

function formatTime(minutes: number): string {
  if (minutes === 0) return "0 دقيقة";
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins} دقيقة`;
  if (mins === 0) return `${hours} ساعة`;
  return `${hours}س ${mins}د`;
}

export function ReportStatsCards({
  total,
  completed,
  inProgress,
  overdue,
  completionRate,
  totalMinutes,
}: ReportStatsCardsProps) {
  const stats = [
    {
      label: "إجمالي المهام",
      value: total,
      icon: ListTodo,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      label: "المكتملة",
      value: completed,
      icon: CheckCircle2,
      color: "text-success",
      bgColor: "bg-success/10",
    },
    {
      label: "قيد التنفيذ",
      value: inProgress,
      icon: Clock,
      color: "text-warning",
      bgColor: "bg-warning/10",
    },
    {
      label: "المتأخرة",
      value: overdue,
      icon: AlertTriangle,
      color: "text-destructive",
      bgColor: "bg-destructive/10",
    },
    {
      label: "نسبة الإنجاز",
      value: `${completionRate}%`,
      icon: Percent,
      color: "text-info",
      bgColor: "bg-info/10",
    },
    {
      label: "الوقت المسجل",
      value: formatTime(totalMinutes),
      icon: Timer,
      color: "text-accent-foreground",
      bgColor: "bg-accent",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {stats.map((stat) => (
        <Card key={stat.label} className="p-4">
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
