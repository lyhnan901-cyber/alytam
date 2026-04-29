import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type TaskStatusCategory = "completed" | "inProgress" | "pending" | "notStarted";

export const statusCategories: Record<TaskStatusCategory, {
  label: string;
  color: string;
  bgColor: string;
  statuses: string[];
}> = {
  completed: {
    label: "مكتملة",
    color: "bg-success",
    bgColor: "bg-success/10 text-success border-success/30",
    statuses: ["Completed", "Approved"],
  },
  inProgress: {
    label: "قيد التنفيذ",
    color: "bg-warning",
    bgColor: "bg-warning/10 text-warning border-warning/30",
    statuses: ["InProgress"],
  },
  pending: {
    label: "قائمة الانتظار",
    color: "bg-info",
    bgColor: "bg-info/10 text-info border-info/30",
    statuses: ["PendingDeptHeadReview", "PendingSupervisorReview", "PendingExecutiveReview", "PendingGMApproval"],
  },
  notStarted: {
    label: "لم تُنفذ",
    color: "bg-muted-foreground",
    bgColor: "bg-muted text-muted-foreground border-muted-foreground/30",
    statuses: ["New", "NotStarted", "NeedRevision", "Rejected"],
  },
};

interface TaskStatusFilterProps {
  selectedCategories: TaskStatusCategory[];
  onToggleCategory: (category: TaskStatusCategory) => void;
  onSelectAll: () => void;
}

export function TaskStatusFilter({
  selectedCategories,
  onToggleCategory,
  onSelectAll,
}: TaskStatusFilterProps) {
  const allSelected = selectedCategories.length === 4;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm font-medium text-muted-foreground ml-2">فلتر الحالة:</span>
      
      {(Object.entries(statusCategories) as [TaskStatusCategory, typeof statusCategories.completed][]).map(
        ([key, category]) => {
          const isSelected = selectedCategories.includes(key);
          return (
            <Button
              key={key}
              variant="outline"
              size="sm"
              onClick={() => onToggleCategory(key)}
              className={cn(
                "gap-2 transition-all",
                isSelected && category.bgColor
              )}
            >
              <span className={cn("w-2 h-2 rounded-full", category.color)} />
              {category.label}
              {isSelected && <span className="text-xs">✓</span>}
            </Button>
          );
        }
      )}

      <Button
        variant="ghost"
        size="sm"
        onClick={onSelectAll}
        className="text-muted-foreground"
      >
        {allSelected ? "إلغاء الكل" : "الكل"}
      </Button>
    </div>
  );
}
