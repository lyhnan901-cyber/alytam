import { useState, useEffect } from "react";
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

interface Department {
  id: string;
  name: string;
}

interface DepartmentAssignmentDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  user: {
    id: string;
    full_name: string;
    email: string;
    department_id?: string | null;
  } | null;
}

export function DepartmentAssignmentDialog({
  open,
  onClose,
  onSuccess,
  user,
}: DepartmentAssignmentDialogProps) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [fetchingDepts, setFetchingDepts] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchDepartments = async () => {
      setFetchingDepts(true);
      try {
        const { data, error } = await supabase
          .from("departments")
          .select("id, name")
          .order("name");

        if (error) throw error;
        setDepartments(data || []);
      } catch (error) {
        console.error("Error fetching departments:", error);
      } finally {
        setFetchingDepts(false);
      }
    };

    if (open) {
      fetchDepartments();
      if (user?.department_id) {
        setSelectedDepartment(user.department_id);
      }
    }
  }, [open, user?.department_id]);

  const handleSubmit = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const deptId = selectedDepartment === "none" ? null : selectedDepartment;
      const { error } = await supabase
        .from("profiles")
        .update({ department_id: deptId })
        .eq("id", user.id);

      if (error) throw error;

      toast({
        title: "تم تعيين القسم",
        description: `تم تعيين القسم للمستخدم ${user.full_name}`,
      });

      onSuccess();
      onClose();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "خطأ في تعيين القسم",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      onClose();
      setSelectedDepartment("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>تعيين القسم للمستخدم</DialogTitle>
        </DialogHeader>

        {user && (
          <div className="space-y-4 py-4">
            <div className="bg-muted p-3 rounded-lg">
              <p className="font-medium">{user.full_name}</p>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>

            <div className="space-y-2">
              <Label>اختر القسم</Label>
              {fetchingDepts ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <Select
                  value={selectedDepartment}
                  onValueChange={setSelectedDepartment}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر القسم" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">بدون قسم</SelectItem>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            إلغاء
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
            حفظ
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
