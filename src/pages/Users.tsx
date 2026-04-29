import { useState, useEffect } from "react";
import {
  Plus,
  Search,
  MoreVertical,
  Edit,
  Mail,
  Building2,
  Shield,
  Loader2,
  UserX,
  UserCheck,
  Users as UsersIcon,
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn, getJobTitle } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { RoleAssignmentDialog } from "@/components/users/RoleAssignmentDialog";
import { DepartmentAssignmentDialog } from "@/components/users/DepartmentAssignmentDialog";
import { AddUserDialog } from "@/components/users/AddUserDialog";
import { EditUserDialog } from "@/components/users/EditUserDialog";
import { DeactivateUserDialog } from "@/components/users/DeactivateUserDialog";

interface User {
  id: string;
  full_name: string;
  email: string;
  status: string;
  department_id: string | null;
  department: { name: string } | null;
  role: string | null;
  tasksCount: number;
}

const ROLE_LABELS: Record<string, string> = {
  GeneralManager:   "المدير العام",
  ExecutiveManager: "نائب المدير التنفيذي",
  Supervisor:       "مشرف الأقسام",
  CustomerService:  "أخصائي خدمة المستفيدين",
  DepartmentHead:   "رئيس القسم",
  Employee:         "موظف / متطوع",
};

const ROLE_COLORS: Record<string, string> = {
  GeneralManager:   "bg-amber-50 text-amber-700 border-amber-200",
  ExecutiveManager: "bg-purple-50 text-purple-700 border-purple-200",
  Supervisor:       "bg-blue-50 text-blue-700 border-blue-200",
  CustomerService:  "bg-cyan-50 text-cyan-700 border-cyan-200",
  DepartmentHead:   "bg-green-50 text-green-700 border-green-200",
  Employee:         "bg-slate-50 text-slate-600 border-slate-200",
};

export default function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [showDeptDialog, setShowDeptDialog] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeactivateDialog, setShowDeactivateDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const { toast } = useToast();
  const { isGeneralManager } = useAuth();

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select(`
          id,
          full_name,
          email,
          status,
          department_id,
          departments:department_id(name)
        `)
        .order("full_name");

      if (error) throw error;

      // Fetch roles and task counts for each user
      const usersWithDetails = await Promise.all(
        (profiles || []).map(async (profile: any) => {
          const { data: roleData } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", profile.id)
            .maybeSingle();

          const { count: tasksCount } = await supabase
            .from("tasks")
            .select("*", { count: "exact", head: true })
            .eq("assignee_id", profile.id);

          return {
            id: profile.id,
            full_name: profile.full_name,
            email: profile.email,
            status: profile.status,
            department_id: profile.department_id,
            department: profile.departments,
            role: roleData?.role || null,
            tasksCount: tasksCount || 0,
          };
        })
      );

      setUsers(usersWithDetails);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "خطأ في جلب المستخدمين",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="page-container">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <UsersIcon className="w-5 h-5 text-primary" /> الموظفون والمتطوعون
          </h1>
          <p className="page-subtitle">إدارة حسابات الموظفين والمتطوعين وصلاحياتهم في المؤسسة</p>
        </div>
        {isGeneralManager && (
          <Button className="gap-2" onClick={() => setShowAddDialog(true)}
            style={{ background: "linear-gradient(135deg,#0d4d0d,#1a7d1a)" }}>
            <Plus className="w-4 h-4" /> إضافة مستخدم
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="data-card">
        <div className="data-card-body">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input type="search" placeholder="بحث بالاسم أو البريد الإلكتروني..."
                value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                className="pr-10 rounded-xl" />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-52 rounded-xl"><SelectValue placeholder="المستوى الوظيفي" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع المستويات</SelectItem>
                {Object.entries(ROLE_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Users Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          لا يوجد مستخدمين
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredUsers.map(user => (
            <div key={user.id} className="data-card hover:-translate-y-0.5 transition-transform duration-200">
              <div className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="avatar-gold w-11 h-11 rounded-xl text-base">
                      {user.full_name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-bold text-sm">{user.full_name}</h3>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Mail className="w-3 h-3" />{user.email}
                      </p>
                    </div>
                  </div>
                  {isGeneralManager && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="w-8 h-8">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem className="gap-2" onClick={() => { setSelectedUser(user); setShowEditDialog(true); }}>
                          <Edit className="w-4 h-4" /> تعديل البيانات
                        </DropdownMenuItem>
                        <DropdownMenuItem className="gap-2" onClick={() => { setSelectedUser(user); setShowRoleDialog(true); }}>
                          <Shield className="w-4 h-4" /> تعيين الصلاحية
                        </DropdownMenuItem>
                        <DropdownMenuItem className="gap-2" onClick={() => { setSelectedUser(user); setShowDeptDialog(true); }}>
                          <Building2 className="w-4 h-4" /> تعيين القسم
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className={cn("gap-2", user.status === "active" ? "text-destructive" : "text-green-600")}
                          onClick={() => { setSelectedUser(user); setShowDeactivateDialog(true); }}>
                          {user.status === "active"
                            ? <><UserX className="w-4 h-4" /> تعطيل</>
                            : <><UserCheck className="w-4 h-4" /> تفعيل</>}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${ROLE_COLORS[user.role || ""] || "bg-slate-50 text-slate-600 border-slate-200"}`}>
                      {ROLE_LABELS[user.role || ""] || "مستخدم"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Building2 className="w-3.5 h-3.5" />
                    <span>{user.department?.name || "غير محدد"}</span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t flex items-center justify-between">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${user.status === "active" ? "badge-approved" : "badge-pending"}`}>
                    {user.status === "active" ? "نشط" : "غير نشط"}
                  </span>
                  <span className="text-xs text-muted-foreground">{user.tasksCount} مهمة</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add User Dialog */}
      <AddUserDialog
        open={showAddDialog}
        onClose={() => setShowAddDialog(false)}
        onSuccess={fetchUsers}
      />

      {/* Edit User Dialog */}
      <EditUserDialog
        open={showEditDialog}
        onClose={() => {
          setShowEditDialog(false);
          setSelectedUser(null);
        }}
        onSuccess={fetchUsers}
        user={selectedUser}
      />

      {/* Deactivate User Dialog */}
      <DeactivateUserDialog
        open={showDeactivateDialog}
        onClose={() => {
          setShowDeactivateDialog(false);
          setSelectedUser(null);
        }}
        onSuccess={fetchUsers}
        user={selectedUser}
      />

      {/* Role Assignment Dialog */}
      <RoleAssignmentDialog
        open={showRoleDialog}
        onClose={() => {
          setShowRoleDialog(false);
          setSelectedUser(null);
        }}
        onSuccess={fetchUsers}
        user={selectedUser}
      />

      {/* Department Assignment Dialog */}
      <DepartmentAssignmentDialog
        open={showDeptDialog}
        onClose={() => {
          setShowDeptDialog(false);
          setSelectedUser(null);
        }}
        onSuccess={fetchUsers}
        user={selectedUser}
      />
    </div>
  );
}
