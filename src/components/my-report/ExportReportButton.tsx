import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, FileText, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { exportPersonalReportPDF } from "@/lib/personal-report-pdf";
import { TaskStatusCategory, statusCategories } from "./TaskStatusFilter";

interface Task {
  id: string;
  task_number: number;
  title: string;
  status: string;
  priority: string;
  due_date: string | null;
}

interface Stats {
  total: number;
  completed: number;
  inProgress: number;
  pending: number;
  notStarted: number;
  remaining: number;
  completionRate: number;
  totalMinutes: number;
}

interface ExportReportButtonProps {
  tasks: Task[];
  stats: Stats;
  dateRange: { from: Date; to: Date };
  userName: string;
}

export function ExportReportButton({
  tasks,
  stats,
  dateRange,
  userName,
}: ExportReportButtonProps) {
  const handleExportPDF = async () => {
    try {
      const dateRangeLabel = `${format(dateRange.from, "d MMMM yyyy", { locale: ar })} - ${format(dateRange.to, "d MMMM yyyy", { locale: ar })}`;
      
      await exportPersonalReportPDF({
        userName,
        dateRange: dateRangeLabel,
        stats: {
          total: stats.total,
          completed: stats.completed,
          inProgress: stats.inProgress,
          pending: stats.pending,
          notStarted: stats.notStarted,
          completionRate: stats.completionRate,
          totalMinutes: stats.totalMinutes,
        },
        tasks: tasks.map(t => ({
          taskNumber: t.task_number,
          title: t.title,
          status: getStatusLabel(t.status),
          priority: getPriorityLabel(t.priority),
          dueDate: t.due_date ? format(new Date(t.due_date), "d MMM yyyy", { locale: ar }) : "-",
        })),
      });
      
      toast.success("تم تصدير التقرير بنجاح");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("فشل في تصدير التقرير");
    }
  };

  const handleExportCSV = () => {
    try {
      const headers = ["رقم المهمة", "العنوان", "الحالة", "الأولوية", "تاريخ الاستحقاق"];
      const rows = tasks.map(t => [
        t.task_number.toString(),
        t.title,
        getStatusLabel(t.status),
        getPriorityLabel(t.priority),
        t.due_date ? format(new Date(t.due_date), "yyyy-MM-dd") : "-",
      ]);

      // Add BOM for Arabic support in Excel
      const BOM = "\uFEFF";
      const csvContent = BOM + [
        headers.join(","),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(",")),
      ].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `تقريري-${format(new Date(), "yyyy-MM-dd")}.csv`;
      link.click();
      URL.revokeObjectURL(url);

      toast.success("تم تصدير التقرير بنجاح");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("فشل في تصدير التقرير");
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          تصدير التقرير
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleExportPDF} className="gap-2 cursor-pointer">
          <FileText className="h-4 w-4" />
          تصدير PDF
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExportCSV} className="gap-2 cursor-pointer">
          <FileSpreadsheet className="h-4 w-4" />
          تصدير CSV
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    New: "جديدة",
    NotStarted: "لم تبدأ",
    InProgress: "قيد التنفيذ",
    Completed: "مكتملة",
    PendingDeptHeadReview: "بانتظار رئيس القسم",
    PendingSupervisorReview: "بانتظار المشرف",
    PendingExecutiveReview: "بانتظار المدير التنفيذي",
    PendingGMApproval: "بانتظار المدير العام",
    Approved: "معتمدة",
    NeedRevision: "تحتاج مراجعة",
    Rejected: "مرفوضة",
  };
  return labels[status] || status;
}

function getPriorityLabel(priority: string): string {
  const labels: Record<string, string> = {
    High: "عالية",
    Medium: "متوسطة",
    Low: "منخفضة",
  };
  return labels[priority] || priority;
}
