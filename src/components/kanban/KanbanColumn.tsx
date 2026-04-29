import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { cn } from "@/lib/utils";
import { KanbanCard, KanbanTask } from "./KanbanCard";

interface KanbanColumnProps {
  id: string;
  title: string;
  tasks: KanbanTask[];
  color?: string;
}

export function KanbanColumn({ id, title, tasks, color }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex flex-col min-w-[280px] max-w-[320px] bg-muted/30 rounded-xl",
        isOver && "ring-2 ring-primary/50"
      )}
    >
      {/* Column Header */}
      <div className="sticky top-0 bg-muted/50 backdrop-blur-sm rounded-t-xl p-3 border-b">
        <div className="flex items-center gap-2">
          <div
            className={cn("w-3 h-3 rounded-full", color || "bg-muted-foreground")}
          />
          <h3 className="font-semibold text-sm">{title}</h3>
          <span className="text-xs text-muted-foreground bg-background rounded-full px-2 py-0.5">
            {tasks.length}
          </span>
        </div>
      </div>

      {/* Tasks Container */}
      <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[calc(100vh-250px)]">
        <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <KanbanCard key={task.id} task={task} />
          ))}
        </SortableContext>
        
        {tasks.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-sm">
            لا توجد مهام
          </div>
        )}
      </div>
    </div>
  );
}
