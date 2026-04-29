import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

interface RoleAssignmentDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  user: {
    id: string;
    full_name: string;
    email: string;
    role: string | null;
  } | null;
}

const roleOptions: { value: AppRole; label: string }[] = [
  { value: "GeneralManager", label: "المدير العام" },
  { value: "CustomerService", label: "خدمة المستفيدين" },
  { value: "ExecutiveManager", label: "المدير التنفيذي" },
  { value: "Supervisor", label: "المشرف" },
  { value: "DepartmentHead", label: "رئيس القسم" },
  { value: "Employee", label: "موظف" },
];

export function RoleAssignmentDialog({
  open,
  onClose,
  onSuccess,
  user,
}: RoleAssignmentDialogProps) {
  const [selectedRole, setSelectedRole] = useState<AppRole | "">("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!user || !selectedRole) return;

    setLoading(true);
    try {
      // Check if user already has a role
      const { data: existingRole } = await supabase
        .from("user_roles")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (existingRole) {
        // Update existing role
        const { error } = await supabase
          .from("user_roles")
          .update({ role: selectedRole })
          .eq("user_id", user.id);

        if (error) throw error;
      } else {
        // Insert new role
        const { error } = await supabase.from("user_roles").insert({
          user_id: user.id,
          role: selectedRole,
        });

        if (error) throw error;
      }

      toast({
        title: "تم تعيين الصلاحية",
        description: `تم تعيين صلاحية "${roleOptions.find((r) => r.value === selectedRole)?.label}" للمستخدم ${user.full_name}`,
      });

      onSuccess();
      onClose();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "خطأ في تعيين الصلاحية",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      onClose();
      setSelectedRole("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>تعيين صلاحية للمستخدم</DialogTitle>
        </DialogHeader>

        {user && (
          <div className="space-y-4 py-4">
            <div className="bg-muted p-3 rounded-lg">
              <p className="font-medium">{user.full_name}</p>
              <p className="text-sm text-muted-foreground">{user.email}</p>
              {user.role && (
                <p className="text-sm text-muted-foreground mt-1">
                  الصلاحية الحالية:{" "}
                  <span className="font-medium">
                    {roleOptions.find((r) => r.value === user.role)?.label || user.role}
                  </span>
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>اختر الصلاحية الجديدة</Label>
              <Select
                value={selectedRole}
                onValueChange={(value) => setSelectedRole(value as AppRole)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر الصلاحية" />
                </SelectTrigger>
                <SelectContent>
                  {roleOptions.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            إلغاء
          </Button>
          <Button onClick={handleSubmit} disabled={loading || !selectedRole}>
            {loading && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
            حفظ الصلاحية
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
