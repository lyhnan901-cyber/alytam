import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Lock, Save, Building2, Users as UsersIcon, AlertCircle, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface UserRow {
  id: string;
  full_name: string;
  email: string;
  role: string;
  department_id: string | null;
}

interface Department {
  id: string;
  name: string;
}

const RESTRICTABLE_ROLES = [
  "Supervisor",
  "DepartmentHead",
  "Employee",
  "ExecutiveManager",
  "CustomerService",
] as const;

const ROLE_LABELS: Record<string, string> = {
  Supervisor: "المشرف",
  DepartmentHead: "رئيس قسم",
  Employee: "موظف",
  ExecutiveManager: "المدير التنفيذي",
  CustomerService: "خدمة المستفيدين",
};

export default function DepartmentAccess() {
  const navigate = useNavigate();
  const { user, isGeneralManager, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [users, setUsers] = useState<UserRow[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  // Map: userId → Set<departmentId> of currently-allowed depts (whitelist).
  // If a user has no key in this map, treat as "no restrictions" (sees all).
  const [accessByUser, setAccessByUser] = useState<Record<string, Set<string>>>({});
  // Local pending edits, applied on Save.
  const [pendingByUser, setPendingByUser] = useState<Record<string, Set<string>>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("Supervisor");

  const fetchData = async () => {
    setLoading(true);
    try {
      const [profilesRes, rolesRes, deptsRes, accessRes] = await Promise.all([
        supabase.from("profiles").select("id, full_name, email, department_id").order("full_name"),
        supabase.from("user_roles").select("user_id, role"),
        supabase.from("departments").select("id, name").order("name"),
        supabase.from("user_department_access").select("user_id, department_id"),
      ]);

      if (profilesRes.error) throw profilesRes.error;
      if (rolesRes.error) throw rolesRes.error;
      if (deptsRes.error) throw deptsRes.error;
      if (accessRes.error) throw accessRes.error;

      const roleByUser = new Map<string, string>();
      (rolesRes.data ?? []).forEach((r) => roleByUser.set(r.user_id, r.role));

      const merged: UserRow[] = (profilesRes.data ?? [])
        .map((p) => ({
          id: p.id,
          full_name: p.full_name,
          email: p.email,
          department_id: p.department_id,
          role: roleByUser.get(p.id) || "",
        }))
        .filter((u) => RESTRICTABLE_ROLES.includes(u.role as typeof RESTRICTABLE_ROLES[number]));

      const accessMap: Record<string, Set<string>> = {};
      (accessRes.data ?? []).forEach((row) => {
        if (!accessMap[row.user_id]) accessMap[row.user_id] = new Set();
        accessMap[row.user_id].add(row.department_id);
      });

      setUsers(merged);
      setDepartments(deptsRes.data ?? []);
      setAccessByUser(accessMap);
      setPendingByUser({}); // Clear pending after a refresh
    } catch (error) {
      const e = error as Error;
      toast({
        variant: "destructive",
        title: "خطأ في جلب البيانات",
        description: e.message,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isGeneralManager) {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isGeneralManager]);

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      if (roleFilter !== "all" && u.role !== roleFilter) return false;
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        u.full_name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q)
      );
    });
  }, [users, search, roleFilter]);

  const getCurrent = (userId: string): Set<string> => {
    if (pendingByUser[userId]) return pendingByUser[userId];
    return accessByUser[userId] ?? new Set();
  };

  const isRestricted = (userId: string): boolean => {
    const current = getCurrent(userId);
    return current.size > 0;
  };

  const isDirty = (userId: string): boolean => {
    if (!pendingByUser[userId]) return false;
    const pending = pendingByUser[userId];
    const original = accessByUser[userId] ?? new Set<string>();
    if (pending.size !== original.size) return true;
    for (const id of pending) {
      if (!original.has(id)) return true;
    }
    return false;
  };

  const toggleDept = (userId: string, deptId: string) => {
    setPendingByUser((prev) => {
      const next = { ...prev };
      const current = next[userId]
        ? new Set(next[userId])
        : new Set(accessByUser[userId] ?? []);
      if (current.has(deptId)) {
        current.delete(deptId);
      } else {
        current.add(deptId);
      }
      next[userId] = current;
      return next;
    });
  };

  const selectAll = (userId: string) => {
    setPendingByUser((prev) => ({
      ...prev,
      [userId]: new Set(departments.map((d) => d.id)),
    }));
  };

  const clearAll = (userId: string) => {
    // Clearing all = unrestricted (no rows in DB).
    setPendingByUser((prev) => ({ ...prev, [userId]: new Set() }));
  };

  const saveUser = async (userId: string) => {
    if (!user) return;
    if (!isDirty(userId)) return;

    setSaving(userId);
    try {
      const pending = pendingByUser[userId] ?? new Set<string>();

      // Strategy: delete all existing rows for this user, then insert pending.
      const { error: deleteErr } = await supabase
        .from("user_department_access")
        .delete()
        .eq("user_id", userId);
      if (deleteErr) throw deleteErr;

      if (pending.size > 0) {
        const rows = Array.from(pending).map((deptId) => ({
          user_id: userId,
          department_id: deptId,
          granted_by: user.id,
        }));
        const { error: insertErr } = await supabase
          .from("user_department_access")
          .insert(rows);
        if (insertErr) throw insertErr;
      }

      setAccessByUser((prev) => ({ ...prev, [userId]: new Set(pending) }));
      setPendingByUser((prev) => {
        const next = { ...prev };
        delete next[userId];
        return next;
      });

      toast({
        title: pending.size === 0
          ? "تم رفع كل القيود — يرى جميع الأقسام"
          : `تم حفظ الوصول لـ ${pending.size} قسم`,
      });
    } catch (error) {
      const e = error as Error;
      toast({
        variant: "destructive",
        title: "خطأ في الحفظ",
        description: e.message,
      });
    } finally {
      setSaving(null);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isGeneralManager) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <Lock className="w-16 h-16 text-muted-foreground" />
        <h1 className="text-2xl font-bold">غير مسموح</h1>
        <p className="text-muted-foreground">ليس لديك صلاحية للوصول إلى هذه الصفحة</p>
        <Button onClick={() => navigate("/")}>العودة للرئيسية</Button>
      </div>
    );
  }

  return (
    <div className="page-container space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Building2 className="w-7 h-7 text-primary" />
            التحكم بالوصول إلى الأقسام
          </h1>
          <p className="page-subtitle">
            حدد الأقسام التي يستطيع كل مستخدم رؤيتها والعمل عليها. الإعداد الافتراضي
            (لا قيود) يعني أن المستخدم يرى كل الأقسام ضمن صلاحيات دوره.
          </p>
        </div>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="text-sm leading-7">
          <strong>كيف يعمل:</strong> اختر مستخدماً وعلِّم الأقسام المسموح له بالوصول
          إليها. عدم وضع أي علامة = لا قيود (يرى الكل). وضع علامة على قسم واحد أو
          أكثر = يقتصر المستخدم على هذه الأقسام فقط في المهام والطلبات والتقارير.
          المدير العام يتجاوز كل القيود ويرى كل الأقسام دائماً.
        </AlertDescription>
      </Alert>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث بالاسم أو البريد الإلكتروني"
            className="pr-9"
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="sm:w-64">
            <SelectValue placeholder="فلترة بالدور" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل الأدوار</SelectItem>
            {RESTRICTABLE_ROLES.map((r) => (
              <SelectItem key={r} value={r}>
                {ROLE_LABELS[r]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filteredUsers.length === 0 ? (
        <Card>
          <CardContent className="py-10 flex flex-col items-center gap-3 text-muted-foreground">
            <UsersIcon className="w-10 h-10" />
            <p>لا يوجد مستخدمون يطابقون البحث.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredUsers.map((u) => {
            const current = getCurrent(u.id);
            const dirty = isDirty(u.id);
            const restricted = isRestricted(u.id);
            return (
              <Card key={u.id}>
                <CardHeader className="pb-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        {u.full_name}
                        <Badge variant="secondary">
                          {ROLE_LABELS[u.role] || u.role}
                        </Badge>
                        {restricted ? (
                          <Badge variant="default">
                            مقيَّد بـ {current.size} قسم
                          </Badge>
                        ) : (
                          <Badge variant="outline">يرى كل الأقسام</Badge>
                        )}
                      </CardTitle>
                      <CardDescription>{u.email}</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => clearAll(u.id)}
                        disabled={saving === u.id}
                      >
                        رفع كل القيود
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => selectAll(u.id)}
                        disabled={saving === u.id}
                      >
                        تحديد الكل
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => saveUser(u.id)}
                        disabled={!dirty || saving === u.id}
                      >
                        {saving === u.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Save className="w-4 h-4" />
                        )}
                        <span className="mr-1">حفظ</span>
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {departments.map((d) => {
                      const checked = current.has(d.id);
                      return (
                        <label
                          key={d.id}
                          className="flex items-center gap-2 rounded-md border p-2 cursor-pointer hover:bg-muted/40"
                        >
                          <Checkbox
                            checked={checked}
                            onCheckedChange={() => toggleDept(u.id, d.id)}
                            disabled={saving === u.id}
                          />
                          <span className="text-sm">{d.name}</span>
                        </label>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
