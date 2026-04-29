import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus, Search, MoreVertical, Eye, Edit, Trash2,
  Clock, Loader2, Users, Building2, FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { RequestForm } from "@/components/forms/RequestForm";
import { RequestEditForm } from "@/components/forms/RequestEditForm";
import { InternalRequestForm } from "@/components/forms/InternalRequestForm";
import { DeleteRequestDialog } from "@/components/requests/DeleteRequestDialog";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type RequestPriority = Database["public"]["Enums"]["request_priority"];
type RequestStatus = Database["public"]["Enums"]["request_status"];

interface Request {
  id: string;
  request_number: number;
  client_name: string | null;
  request_type: string;
  channel: string;
  status: RequestStatus;
  priority: RequestPriority;
  notes: string | null;
  created_at: string;
  request_source: string;
  requested_by_name: string | null;
  target_department_id: string | null;
  tasks: { id: string }[];
  departments?: { name: string } | null;
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

const channelLabels: Record<string, string> = {
  direct:       "مراجعة مباشرة",
  whatsapp:     "واتساب",
  phone:        "اتصال هاتفي",
  email:        "بريد إلكتروني",
  referral:     "إحالة من جهة",
  social:       "وسائل التواصل",
  field:        "زيارة ميدانية",
  website_form: "نموذج الموقع",
  internal:     "طلب داخلي",
  // legacy
  website:      "موقع إلكتروني",
  in_person:    "حضوري",
};

export default function Requests() {
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [showForm, setShowForm] = useState(false);
  const [showInternalForm, setShowInternalForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  const [executiveManagerId, setExecutiveManagerId] = useState<string>();
  const { role, isGeneralManager } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const canCreate = isGeneralManager || role === "CustomerService" || role === "ExecutiveManager" || role === "Supervisor" || role === "DepartmentHead";
  const canEdit = isGeneralManager || role === "ExecutiveManager" || role === "DepartmentHead";
  const canDelete = isGeneralManager || role === "ExecutiveManager";
  const fetchRequests = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("requests")
        .select(`
          *,
          tasks(id),
          departments:target_department_id(name)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "خطأ في جلب الطلبات",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchExecutiveManager = async () => {
    const { data } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "ExecutiveManager")
      .limit(1)
      .maybeSingle();
    
    if (data) {
      setExecutiveManagerId(data.user_id);
    }
  };

  useEffect(() => {
    fetchRequests();
    fetchExecutiveManager();
  }, []);

  const filteredRequests = requests.filter((req) => {
    const clientOrRequester = req.request_source === 'internal' 
      ? (req.requested_by_name || '') 
      : (req.client_name || '');
    const matchesSearch =
      clientOrRequester.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.request_number.toString().includes(searchQuery);
    const matchesStatus = statusFilter === "all" || req.status === statusFilter;
    const matchesSource = sourceFilter === "all" || req.request_source === sourceFilter;
    return matchesSearch && matchesStatus && matchesSource;
  });

  const formatDate = (date: string) => {
    return new Intl.DateTimeFormat("ar-SA", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(new Date(date));
  };

  return (
    <div className="page-container">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" /> الطلبات
          </h1>
          <p className="page-subtitle">إدارة ومتابعة طلبات المستفيدين والطلبات الداخلية</p>
        </div>
        {canCreate && (
          <div className="flex gap-2">
            <Button className="gap-2" onClick={() => setShowForm(true)}
              style={{ background: "linear-gradient(135deg,#0d4d0d,#1a7d1a)" }}>
              <Users className="w-4 h-4" /> طلب مستفيد
            </Button>
            <Button variant="secondary" className="gap-2" onClick={() => setShowInternalForm(true)}>
              <Building2 className="w-4 h-4" /> طلب داخلي
            </Button>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="data-card">
        <div className="data-card-body">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input type="search" placeholder="بحث بالاسم أو رقم الطلب..."
                value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                className="pr-10 rounded-xl" />
            </div>
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="w-40 rounded-xl"><SelectValue placeholder="نوع الطلب" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                <SelectItem value="client">طلبات المستفيدين</SelectItem>
                <SelectItem value="internal">طلبات داخلية</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40 rounded-xl"><SelectValue placeholder="الحالة" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الحالات</SelectItem>
                <SelectItem value="New">جديد</SelectItem>
                <SelectItem value="InProgress">قيد التنفيذ</SelectItem>
                <SelectItem value="Completed">مكتمل</SelectItem>
                <SelectItem value="Closed">مغلق</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Requests Table */}
      <div className="data-card overflow-x-auto mobile-card-table">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            لا توجد طلبات
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">رقم الطلب</TableHead>
                <TableHead className="text-right">المصدر</TableHead>
                <TableHead className="text-right">المستفيد/مقدم الطلب</TableHead>
                <TableHead className="text-right">النوع</TableHead>
                <TableHead className="text-right">الحالة</TableHead>
                <TableHead className="text-right">الأولوية</TableHead>
                <TableHead className="text-right">المهام</TableHead>
                <TableHead className="text-right">التاريخ</TableHead>
                <TableHead className="text-right w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRequests.map((request) => (
                <TableRow key={request.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/requests/${request.id}`)}>
                  <TableCell className="font-medium">
                    REQ-{String(request.request_number).padStart(3, "0")}
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant="outline" 
                      className={cn(
                        "text-xs",
                        request.request_source === "internal" 
                          ? "bg-secondary text-secondary-foreground" 
                          : "bg-primary/10 text-primary"
                      )}
                    >
                      {request.request_source === "internal" ? "داخلي" : "مستفيد"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {request.request_source === "internal" 
                      ? request.requested_by_name || "طلب داخلي"
                      : request.client_name}
                  </TableCell>
                  <TableCell>{request.request_type}</TableCell>
                  <TableCell>
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
                  </TableCell>
                  <TableCell>
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
                  </TableCell>
                  <TableCell>
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
                  </TableCell>
                  <TableCell>
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      {request.tasks?.length || 0}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(request.created_at)}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="min-w-[44px] min-h-[44px] w-11 h-11 touch-manipulation"
                        >
                          <MoreVertical className="w-5 h-5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem className="gap-2" onClick={(e) => { e.stopPropagation(); navigate(`/requests/${request.id}`); }}>
                          <Eye className="w-4 h-4" />
                          عرض التفاصيل
                        </DropdownMenuItem>
                        {canEdit && (
                          <DropdownMenuItem 
                            className="gap-2" 
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              setSelectedRequest(request);
                              setShowEditForm(true);
                            }}
                          >
                            <Edit className="w-4 h-4" />
                            تعديل
                          </DropdownMenuItem>
                        )}
                        {canDelete && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className="gap-2 text-destructive focus:text-destructive" 
                              onClick={(e) => { 
                                e.stopPropagation(); 
                                setSelectedRequest(request);
                                setShowDeleteDialog(true);
                              }}
                            >
                              <Trash2 className="w-4 h-4" />
                              حذف
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Request Form Dialog */}
      <RequestForm
        open={showForm}
        onClose={() => setShowForm(false)}
        onSuccess={fetchRequests}
        executiveManagerId={executiveManagerId}
      />

      {/* Internal Request Form Dialog */}
      <InternalRequestForm
        open={showInternalForm}
        onClose={() => setShowInternalForm(false)}
        onSuccess={fetchRequests}
        executiveManagerId={executiveManagerId}
      />

      {/* Request Edit Form Dialog */}
      <RequestEditForm
        open={showEditForm}
        onClose={() => {
          setShowEditForm(false);
          setSelectedRequest(null);
        }}
        onSuccess={fetchRequests}
        request={selectedRequest}
      />

      {/* Delete Request Dialog */}
      <DeleteRequestDialog
        open={showDeleteDialog}
        onClose={() => {
          setShowDeleteDialog(false);
          setSelectedRequest(null);
        }}
        onSuccess={fetchRequests}
        request={selectedRequest}
      />
    </div>
  );
}
