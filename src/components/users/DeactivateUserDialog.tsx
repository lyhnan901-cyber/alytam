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
import { useState } from "react";
import { Loader2 } from "lucide-react";

interface User {
  id: string;
  full_name: string;
  email: string;
  status: string;
}

interface DeactivateUserDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  user: User | null;
}

export function DeactivateUserDialog({
  open,
  onClose,
  onSuccess,
  user,
}: DeactivateUserDialogProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleDeactivate = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const newStatus = user.status === "active" ? "inactive" : "active";
      
      const { error } = await supabase
        .from("profiles")
        .update({ status: newStatus })
        .eq("id", user.id);

      if (error) throw error;

      toast({
        title: "تم بنجاح",
        description: newStatus === "active" 
          ? "تم تفعيل الحساب بنجاح" 
          : "تم تعطيل الحساب بنجاح",
      });

      onSuccess();
      onClose();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "خطأ",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  const isActive = user.status === "active";

  return (
    <AlertDialog open={open} onOpenChange={onClose}>
      <AlertDialogContent dir="rtl">
        <AlertDialogHeader>
          <AlertDialogTitle>
            {isActive ? "تعطيل الحساب" : "تفعيل الحساب"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isActive ? (
              <>
                هل أنت متأكد من تعطيل حساب <strong>{user.full_name}</strong>؟
                <br />
                لن يتمكن المستخدم من تسجيل الدخول حتى يتم تفعيل حسابه مرة أخرى.
              </>
            ) : (
              <>
                هل تريد تفعيل حساب <strong>{user.full_name}</strong>؟
                <br />
                سيتمكن المستخدم من تسجيل الدخول واستخدام النظام.
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2 sm:gap-0">
          <AlertDialogCancel disabled={loading}>إلغاء</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDeactivate}
            disabled={loading}
            className={isActive ? "bg-destructive hover:bg-destructive/90" : ""}
          >
            {loading && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
            {isActive ? "تعطيل الحساب" : "تفعيل الحساب"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
