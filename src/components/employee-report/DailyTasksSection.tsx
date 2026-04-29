import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmployeeTaskCard } from "./EmployeeTaskCard";
import { CalendarDays, CalendarMinus } from "lucide-react";
import { useNavigate } from "react-router-dom";

export interface TaskDetails {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate: string | null;
  createdAt: string;
  completedAt: string | null;
  timeSpentMinutes: number;
}

interface DailyTasksSectionProps {
  employeeName: string;
  todayTasks: TaskDetails[];
  yesterdayTasks: TaskDetails[];
  isLoading?: boolean;
}

export function DailyTasksSection({ 
  employeeName, 
  todayTasks, 
  yesterdayTasks,
  isLoading 
}: DailyTasksSectionProps) {
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">جاري التحميل...</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">جاري التحميل...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">مهام: {employeeName}</h3>
      
      <div className="grid md:grid-cols-2 gap-4">
        {/* Today's Tasks */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-primary" />
              مهام اليوم
              <span className="text-sm font-normal text-muted-foreground">
                ({todayTasks.length})
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[400px] overflow-y-auto">
            {todayTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                لا توجد مهام لليوم
              </p>
            ) : (
              todayTasks.map((task) => (
                <EmployeeTaskCard 
                  key={task.id} 
                  task={task} 
                  onClick={() => navigate(`/tasks/${task.id}`)}
                />
              ))
            )}
          </CardContent>
        </Card>

        {/* Yesterday's Tasks */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarMinus className="w-5 h-5 text-muted-foreground" />
              مهام الأمس
              <span className="text-sm font-normal text-muted-foreground">
                ({yesterdayTasks.length})
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[400px] overflow-y-auto">
            {yesterdayTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                لا توجد مهام للأمس
              </p>
            ) : (
              yesterdayTasks.map((task) => (
                <EmployeeTaskCard 
                  key={task.id} 
                  task={task}
                  onClick={() => navigate(`/tasks/${task.id}`)}
                />
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
