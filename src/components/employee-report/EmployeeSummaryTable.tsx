import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";

export interface EmployeeSummary {
  employeeId: string;
  employeeName: string;
  departmentName: string | null;
  todayCount: number;
  yesterdayCount: number;
  completedCount: number;
  inProgressCount: number;
  overdueCount: number;
  completionRate: number;
  totalTimeMinutes: number;
}

interface EmployeeSummaryTableProps {
  employees: EmployeeSummary[];
  onSelectEmployee: (employeeId: string) => void;
  selectedEmployeeId: string | null;
  isLoading?: boolean;
}

function formatTime(minutes: number): string {
  if (minutes === 0) return "-";
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}د`;
  if (mins === 0) return `${hours}س`;
  return `${hours}س ${mins}د`;
}

export function EmployeeSummaryTable({ 
  employees, 
  onSelectEmployee, 
  selectedEmployeeId,
  isLoading 
}: EmployeeSummaryTableProps) {
  if (isLoading) {
    return (
      <div className="bg-card rounded-xl border shadow-sm p-8 text-center">
        <p className="text-muted-foreground">جاري تحميل البيانات...</p>
      </div>
    );
  }

  if (employees.length === 0) {
    return (
      <div className="bg-card rounded-xl border shadow-sm p-8 text-center">
        <p className="text-muted-foreground">لا توجد بيانات للعرض</p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border shadow-sm overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-right">الموظف</TableHead>
            <TableHead className="text-right">القسم</TableHead>
            <TableHead className="text-center">اليوم</TableHead>
            <TableHead className="text-center">أمس</TableHead>
            <TableHead className="text-center">مكتملة</TableHead>
            <TableHead className="text-center">جارية</TableHead>
            <TableHead className="text-center">متأخرة</TableHead>
            <TableHead className="text-center">الوقت</TableHead>
            <TableHead className="text-center">الإنجاز</TableHead>
            <TableHead className="text-center w-[80px]">عرض</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {employees.map((employee) => (
            <TableRow 
              key={employee.employeeId}
              className={selectedEmployeeId === employee.employeeId ? 'bg-primary/5' : ''}
            >
              <TableCell className="font-medium">{employee.employeeName}</TableCell>
              <TableCell className="text-muted-foreground">
                {employee.departmentName || "-"}
              </TableCell>
              <TableCell className="text-center">
                <Badge variant="outline">{employee.todayCount}</Badge>
              </TableCell>
              <TableCell className="text-center">
                <Badge variant="secondary">{employee.yesterdayCount}</Badge>
              </TableCell>
              <TableCell className="text-center">
                <Badge className="bg-success text-success-foreground">
                  {employee.completedCount}
                </Badge>
              </TableCell>
              <TableCell className="text-center">
                <Badge className="bg-warning text-warning-foreground">
                  {employee.inProgressCount}
                </Badge>
              </TableCell>
              <TableCell className="text-center">
                {employee.overdueCount > 0 ? (
                  <Badge variant="destructive">{employee.overdueCount}</Badge>
                ) : (
                  <span className="text-muted-foreground">0</span>
                )}
              </TableCell>
              <TableCell className="text-center text-sm text-muted-foreground">
                {formatTime(employee.totalTimeMinutes)}
              </TableCell>
              <TableCell className="text-center">
                <div className="flex items-center gap-2">
                  <Progress 
                    value={employee.completionRate} 
                    className="h-2 w-16"
                  />
                  <span className="text-xs text-muted-foreground w-10">
                    {employee.completionRate}%
                  </span>
                </div>
              </TableCell>
              <TableCell className="text-center">
                <Button
                  variant={selectedEmployeeId === employee.employeeId ? "default" : "ghost"}
                  size="sm"
                  onClick={() => onSelectEmployee(employee.employeeId)}
                >
                  <Eye className="w-4 h-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
