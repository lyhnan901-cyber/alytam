import { useState, useEffect } from "react";
import { FileText, Clock, ArrowLeft, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface Request {
  id: string;
  request_number: number;
  client_name: string;
  request_type: string;
  status: string;
  priority: string;
  created_at: string;
}

const statusLabels: Record<string, string> = {
  New: "جديد",
  InProgress: "قيد التنفيذ",
  Completed: "مكتمل",
  Closed: "مغلق",
};

const priorityLabels: Record<string, string> = {
  High: "عالي",
  Medium: "متوسط",
  Low: "منخفض",
};

export function RecentRequests() {
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        const { data, error } = await supabase
          .from("requests")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(5);

        if (error) throw error;
        setRequests(data || []);
      } catch (error) {
        console.error("Error fetching requests:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
  }, []);

  const getTimeAgo = (date: string) => {
    const now = new Date();
    const created = new Date(date);
    const diffMs = now.getTime() - created.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `منذ ${diffDays} يوم`;
    if (diffHours > 0) return `منذ ${diffHours} ساعة`;
    if (diffMins > 0) return `منذ ${diffMins} دقيقة`;
    return "الآن";
  };

  return (
    <div className="bg-card rounded-xl border shadow-sm">
      <div className="p-4 border-b flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          آخر الطلبات
        </h3>
        <Button
          variant="ghost"
          size="sm"
          className="text-primary gap-1"
          onClick={() => navigate("/requests")}
        >
          عرض الكل
          <ArrowLeft className="w-4 h-4" />
        </Button>
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : requests.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          لا توجد طلبات بعد
        </div>
      ) : (
        <div className="divide-y">
          {requests.map((request) => (
            <div
              key={request.id}
              className="p-4 hover:bg-muted/30 transition-colors cursor-pointer"
              onClick={() => navigate("/requests")}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">{request.client_name}</span>
                    <span className="text-xs text-muted-foreground">
                      #REQ-{String(request.request_number).padStart(3, "0")}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{request.request_type}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="flex gap-2">
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs",
                        request.status === "New" && "status-new",
                        request.status === "InProgress" && "status-in-progress",
                        request.status === "Completed" && "status-completed",
                        request.status === "Closed" && "bg-muted text-muted-foreground"
                      )}
                    >
                      {statusLabels[request.status] || request.status}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs",
                        request.priority === "High" && "priority-high",
                        request.priority === "Medium" && "priority-medium",
                        request.priority === "Low" && "priority-low"
                      )}
                    >
                      {priorityLabels[request.priority] || request.priority}
                    </Badge>
                  </div>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {getTimeAgo(request.created_at)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
