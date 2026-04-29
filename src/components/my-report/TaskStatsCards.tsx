import { Card } from "@/components/ui/card";
import { CheckCircle2, Clock, ListTodo, Percent, Timer } from "lucide-react";

interface TaskStatsCardsProps {
  total: number;
  completed: number;
  remaining: number;
  completionRate: number;
  totalMinutes: number;
}

export function TaskStatsCards({
  total,
  completed,
  remaining,
  completionRate,
  totalMinutes,
}: TaskStatsCardsProps) {
  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins} دقيقة`;
    if (mins === 0) return `${hours} ساعة`;
    return `${hours}س ${mins}د`;
  };

  const stats = [
    {
      label: "إجمالي المهام",
      value: total,
      icon: ListTodo,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      label: "المهام المكتملة",
      value: completed,
      icon: CheckCircle2,
      color: "text-success",
      bgColor: "bg-success/10",
    },
    {
      label: "المهام المتبقية",
      value: remaining,
      icon: Clock,
      color: "text-warning",
      bgColor: "bg-warning/10",
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
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      {stats.map((stat) => (
        <Card key={stat.label} className="p-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${stat.bgColor}`}>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </div>
            <div>
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
