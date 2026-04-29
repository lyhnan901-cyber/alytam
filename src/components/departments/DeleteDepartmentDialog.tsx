import { useState, useEffect } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, AlertTriangle } from "lucide-react";

interface Department {
  id: string;
  name: string;
  employeesCount: number;
}

interface DeleteDepartmentDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  department: Department | null;
}

export function DeleteDepartmentDialog({
  open,
  onClose,
  onSuccess,
  department,
}: DeleteDepartmentDialogProps) {
  const [loading, setLoading] = useState(false);
  const [employeesCount, setEmployeesCount] = useState(0);
  const [checking, setChecking] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (department && open) {
      checkEmployees();
    }
  }, [department, open]);

  const checkEmployees = async () => {
    if (!department) return;
    
    setChecking(true);
    try {
      const { count } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("department_id", department.id);
      
      setEmployeesCount(count || 0);
    } catch (error) {
      console.error("Error checking employees:", error);
    } finally {
      setChecking(false);
    }
  };

  const handleDelete = async () => {
    if (!department) return;

    if (employeesCount > 0) {
      toast({
        variant: "destructive",
        title: "لا يمكن حذف القسم",
        description: "يجب نقل جميع الموظفين من هذا القسم قبل حذفه",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("departments")
        .delete()
        .eq("id", department.id);

      if (error) throw error;

      toast({
        title: "تم بنجاح",
        description: "تم حذف القسم بنجاح",
      });

      onSuccess();
      onClose();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "خطأ في حذف القسم",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  if (!department) return null;

  const hasEmployees = employeesCount > 0;

  return (
    <AlertDialog open={open} onOpenChange={onClose}>
      <AlertDialogContent dir="rtl">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            حذف القسم
          </AlertDialogTitle>
          <AlertDialogDescription>
            {checking ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                جاري التحقق...
              </span>
            ) : hasEmployees ? (
              <span className="text-destructive">
                لا يمكن حذف القسم <strong>{department.name}</strong> لأنه يحتوي على{" "}
                <strong>{employeesCount}</strong> موظف.
                <br />
                يجب نقل جميع الموظفين إلى قسم آخر قبل الحذف.
              </span>
            ) : (
              <>
                هل أنت متأكد من حذف قسم <strong>{department.name}</strong>؟
                <br />
                هذا الإجراء لا يمكن التراجع عنه.
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2 sm:gap-0">
          <AlertDialogCancel disabled={loading}>إلغاء</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={loading || checking || hasEmployees}
            className="bg-destructive hover:bg-destructive/90"
          >
            {loading && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
            حذف القسم
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
