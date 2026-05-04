import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import type { Database } from "@/integrations/supabase/types";
import {
  Shield,
  Users,
  Eye,
  FileText,
  CheckSquare,
  Building2,
  Settings,
  Loader2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getBranchFlags } from "@/lib/branch-flags";

interface Permission {
  key: string;
  label: string;
  icon: any;
}

type AppRole = Database["public"]["Enums"]["app_role"];

interface RoleData {
  name: AppRole;
  nameAr: string;
  description: string;
  usersCount: number;
  permissions: string[];
  color: string;
}

interface UserWithRole {
  id: string;
  full_name: string;
  email: string;
  department?: { name: string } | null;
}

const allPermissions: Permission[] = [
  { key: "requests_view", label: "عرض الطلبات", icon: FileText },
  { key: "requests_create", label: "إنشاء طلبات", icon: FileText },
  { key: "requests_edit", label: "تعديل الطلبات", icon: FileText },
  { key: "tasks_view", label: "عرض المهام", icon: CheckSquare },
  { key: "tasks_create", label: "إنشاء مهام", icon: CheckSquare },
  { key: "tasks_assign", label: "تعيين مهام", icon: CheckSquare },
  { key: "users_view", label: "عرض المستخدمين", icon: Users },
  { key: "users_manage", label: "إدارة المستخدمين", icon: Users },
  { key: "departments_view", label: "عرض الأقسام", icon: Building2 },
  { key: "departments_manage", label: "إدارة الأقسام", icon: Building2 },
  { key: "reports_view", label: "عرض التقارير", icon: Eye },
  { key: "settings_manage", label: "إدارة الإعدادات", icon: Settings },
];

// Role definitions with their permissions (these are fixed in code)
const roleDefinitions: Record<string, Omit<RoleData, "usersCount">> = {
  GeneralManager: {
    name: "GeneralManager",
    nameAr: "المدير العام",
    description: "صلاحيات كاملة على جميع أجزاء النظام وإدارة المؤسسة",
    permissions: allPermissions.map((p) => p.key),
    color: "bg-primary",
  },
  CustomerService: {
    name: "CustomerService",
    nameAr: "خدمة المستفيدين",
    description: "إنشاء ومتابعة طلبات المستفيدين والتواصل معهم",
    permissions: ["requests_view", "requests_create", "requests_edit", "tasks_view"],
    color: "bg-info",
  },
  ExecutiveManager: {
    name: "ExecutiveManager",
    nameAr: "المدير التنفيذي",
    description: "إدارة العمليات اليومية وتوزيع المهام على الفرق",
    permissions: [
      "requests_view",
      "requests_edit",
      "tasks_view",
      "tasks_create",
      "tasks_assign",
      "reports_view",
    ],
    color: "bg-warning",
  },
  Supervisor: {
    name: "Supervisor",
    nameAr: "المشرف التشغيلي",
    description: "الإشراف على تنفيذ البرامج وتوزيع المهام على الأقسام",
    permissions: ["requests_view", "tasks_view", "tasks_assign", "departments_view"],
    color: "bg-success",
  },
  DepartmentHead: {
    name: "DepartmentHead",
    nameAr: "رئيس القسم",
    description: "إدارة فريق القسم وتنظيم عمل الموظفين",
    permissions: ["requests_view", "tasks_view", "tasks_assign"],
    color: "bg-accent",
  },
  Employee: {
    name: "Employee",
    nameAr: "كادر / موظف",
    description: "تنفيذ المهام المُعيَّنة داخل المؤسسة",
    permissions: ["tasks_view"],
    color: "bg-muted",
  },
};

export default function Roles() {
  const [roles, setRoles] = useState<RoleData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState<AppRole | null>(null);
  const [roleUsers, setRoleUsers] = useState<UserWithRole[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const fetchRoleCounts = async () => {
    setLoading(true);
    try {
      const { data: userRoles, error } = await supabase
        .from("user_roles")
        .select("role");

      if (error) throw error;

      // Count users per role
      const roleCounts: Record<string, number> = {};
      (userRoles || []).forEach((ur) => {
        roleCounts[ur.role] = (roleCounts[ur.role] || 0) + 1;
      });

      // حدد أي أدوار تُعرض في واجهة الصلاحيات. في فروع سلسلة الأربع طبقات يُخفى
      // دور Supervisor بالكامل لأنه غير مستخدم في سلسلة المهام.
      const { fourTierWorkflow } = getBranchFlags();
      const roleEntries = Object.entries(roleDefinitions).filter(
        ([key]) => !(fourTierWorkflow && key === "Supervisor")
      );

      // Build roles array with counts
      const rolesWithCounts: RoleData[] = roleEntries.map(
        ([key, def]) => ({
          ...def,
          usersCount: roleCounts[key] || 0,
        })
      );

      setRoles(rolesWithCounts);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "خطأ في جلب البيانات",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchUsersForRole = async (roleName: AppRole) => {
    setLoadingUsers(true);
    try {
      const { data: userRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", roleName);

      if (rolesError) throw rolesError;

      if (!userRoles || userRoles.length === 0) {
        setRoleUsers([]);
        return;
      }

      const userIds = userRoles.map((ur) => ur.user_id);

      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select(`
          id,
          full_name,
          email,
          departments:department_id(name)
        `)
        .in("id", userIds);

      if (profilesError) throw profilesError;

      setRoleUsers(
        (profiles || []).map((p: any) => ({
          id: p.id,
          full_name: p.full_name,
          email: p.email,
          department: p.departments,
        }))
      );
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "خطأ في جلب المستخدمين",
        description: error.message,
      });
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    fetchRoleCounts();
  }, []);

  const handleViewDetails = (roleName: AppRole) => {
    setSelectedRole(roleName);
    fetchUsersForRole(roleName);
  };

  const selectedRoleData = selectedRole ? roleDefinitions[selectedRole] : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" /> صلاحيات النظام
          </h1>
          <p className="page-subtitle">عرض أدوار المستخدمين وصلاحياتهم داخل مؤسسة اليتامى</p>
        </div>
      </div>

      {/* Roles Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {roles.map((role) => (
          <div key={role.name} className="data-card hover:-translate-y-0.5 transition-transform duration-200">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center",
                    role.color,
                    role.color === "bg-muted" ? "text-muted-foreground" : "text-white"
                  )}
                >
                  <Shield className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{role.nameAr}</h3>
                  <p className="text-xs text-muted-foreground">{role.name}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="gap-2"
                onClick={() => handleViewDetails(role.name)}
              >
                <Eye className="w-4 h-4" />
                عرض المستخدمين
              </Button>
            </div>

            <p className="text-sm text-muted-foreground mb-4">{role.description}</p>

            <div className="flex items-center gap-2 mb-4">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {role.usersCount} مستخدم
              </span>
            </div>

            <div className="border-t pt-4">
              <p className="text-sm font-medium mb-2">الصلاحيات:</p>
              <div className="flex flex-wrap gap-2">
                {role.permissions.slice(0, 4).map((permKey) => {
                  const perm = allPermissions.find((p) => p.key === permKey);
                  return perm ? (
                    <Badge key={permKey} variant="secondary" className="text-xs">
                      {perm.label}
                    </Badge>
                  ) : null;
                })}
                {role.permissions.length > 4 && (
                  <Badge variant="outline" className="text-xs">
                    +{role.permissions.length - 4} أخرى
                  </Badge>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Users Dialog */}
      <Dialog open={!!selectedRole} onOpenChange={(open) => !open && setSelectedRole(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              مستخدمو {selectedRoleData?.nameAr}
            </DialogTitle>
          </DialogHeader>

          {loadingUsers ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : roleUsers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              لا يوجد مستخدمين بهذه الصلاحية
            </div>
          ) : (
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {roleUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30"
                >
                  <Avatar className="w-10 h-10">
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                      {user.full_name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{user.full_name}</p>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    {user.department && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {user.department.name}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="pt-4 border-t">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setSelectedRole(null);
                navigate(`/users?role=${selectedRole}`);
              }}
            >
              عرض الكل في صفحة المستخدمين
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
