import { useState, useEffect } from "react";
import {
  Plus,
  Search,
  MoreVertical,
  Edit,
  Trash2,
  Users as UsersIcon,
  CheckSquare,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { AddDepartmentDialog } from "@/components/departments/AddDepartmentDialog";
import { EditDepartmentDialog } from "@/components/departments/EditDepartmentDialog";
import { DeleteDepartmentDialog } from "@/components/departments/DeleteDepartmentDialog";

interface Department {
  id: string;
  name: string;
  description: string | null;
  employeesCount: number;
  tasksTotal: number;
  tasksCompleted: number;
  tasksInProgress: number;
}

export default function Departments() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);
  const { toast } = useToast();
  const { isGeneralManager } = useAuth();

  const fetchDepartments = async () => {
    setLoading(true);
    try {
      const { data: depts, error } = await supabase
        .from("departments")
        .select("*")
        .order("name");

      if (error) throw error;

      // Fetch stats for each department
      const deptsWithStats = await Promise.all(
        (depts || []).map(async (dept) => {
          const { count: employeesCount } = await supabase
            .from("profiles")
            .select("*", { count: "exact", head: true })
            .eq("department_id", dept.id);

          const { count: tasksTotal } = await supabase
            .from("tasks")
            .select("*", { count: "exact", head: true })
            .eq("department_id", dept.id);

          const { count: tasksCompleted } = await supabase
            .from("tasks")
            .select("*", { count: "exact", head: true })
            .eq("department_id", dept.id)
            .in("status", ["Completed", "Approved"]);

          const { count: tasksInProgress } = await supabase
            .from("tasks")
            .select("*", { count: "exact", head: true })
            .eq("department_id", dept.id)
            .eq("status", "InProgress");

          return {
            ...dept,
            employeesCount: employeesCount || 0,
            tasksTotal: tasksTotal || 0,
            tasksCompleted: tasksCompleted || 0,
            tasksInProgress: tasksInProgress || 0,
          };
        })
      );

      setDepartments(deptsWithStats);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "خطأ في جلب الأقسام",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  const filteredDepartments = departments.filter((dept) =>
    dept.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="page-container">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" /> أقسام المؤسسة
          </h1>
          <p className="page-subtitle">إدارة الأقسام التشغيلية وفرق العمل في مؤسسة اليتامى</p>
        </div>
        {isGeneralManager && (
          <Button className="gap-2" onClick={() => setShowAddDialog(true)}
            style={{ background: "linear-gradient(135deg,#0d4d0d,#1a7d1a)" }}>
            <Plus className="w-4 h-4" /> قسم جديد
          </Button>
        )}
      </div>

      {/* Search */}
      <div className="data-card">
        <div className="data-card-body">
          <div className="relative max-w-md">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input type="search" placeholder="بحث في الأقسام..."
              value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              className="pr-10 rounded-xl" />
          </div>
        </div>
      </div>

      {/* Departments Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : filteredDepartments.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          لا توجد أقسام
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDepartments.map(dept => {
            const pct = dept.tasksTotal > 0 ? Math.round((dept.tasksCompleted / dept.tasksTotal) * 100) : 0;
            return (
              <div key={dept.id} className="data-card hover:-translate-y-0.5 transition-transform duration-200">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-lg">{dept.name}</h3>
                    {dept.description && (
                      <p className="text-sm text-muted-foreground">
                        {dept.description}
                      </p>
                    )}
                  </div>
                  {isGeneralManager && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          className="gap-2"
                          onClick={() => {
                            setSelectedDepartment(dept);
                            setShowEditDialog(true);
                          }}
                        >
                          <Edit className="w-4 h-4" />
                          تعديل
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="gap-2 text-destructive"
                          onClick={() => {
                            setSelectedDepartment(dept);
                            setShowDeleteDialog(true);
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                          حذف
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="bg-muted/50 rounded-lg p-3 text-center">
                    <UsersIcon className="w-5 h-5 text-primary mx-auto mb-1" />
                    <p className="text-xl font-bold">{dept.employeesCount}</p>
                    <p className="text-xs text-muted-foreground">موظف</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3 text-center">
                    <CheckSquare className="w-5 h-5 text-success mx-auto mb-1" />
                    <p className="text-xl font-bold">{dept.tasksTotal}</p>
                    <p className="text-xs text-muted-foreground">مهمة</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">نسبة الإنجاز</span>
                    <span className="font-medium">{pct}%</span>
                  </div>
                  <Progress value={pct} className="h-2" />
                  <div className="flex gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-success" />
                      مكتملة: {dept.tasksCompleted}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-warning" />
                      قيد التنفيذ: {dept.tasksInProgress}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Department Dialog */}
      <AddDepartmentDialog
        open={showAddDialog}
        onClose={() => setShowAddDialog(false)}
        onSuccess={fetchDepartments}
      />

      {/* Edit Department Dialog */}
      <EditDepartmentDialog
        open={showEditDialog}
        onClose={() => {
          setShowEditDialog(false);
          setSelectedDepartment(null);
        }}
        onSuccess={fetchDepartments}
        department={selectedDepartment}
      />

      {/* Delete Department Dialog */}
      <DeleteDepartmentDialog
        open={showDeleteDialog}
        onClose={() => {
          setShowDeleteDialog(false);
          setSelectedDepartment(null);
        }}
        onSuccess={fetchDepartments}
        department={selectedDepartment}
      />
    </div>
  );
}
