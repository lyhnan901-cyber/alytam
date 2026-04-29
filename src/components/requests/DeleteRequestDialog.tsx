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

interface DeleteRequestDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  request: {
    id: string;
    request_number: number;
    client_name: string | null;
    requested_by_name: string | null;
    request_source: string;
  } | null;
}

export function DeleteRequestDialog({
  open,
  onClose,
  onSuccess,
  request,
}: DeleteRequestDialogProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleDelete = async () => {
    if (!request) return;

    setLoading(true);
    try {
      // First, delete all related tasks
      const { error: tasksError } = await supabase
        .from("tasks")
        .delete()
        .eq("request_id", request.id);

      if (tasksError) throw tasksError;

      // Delete related custom field values
      const { error: customFieldsError } = await supabase
        .from("request_custom_field_values")
        .delete()
        .eq("request_id", request.id);

      if (customFieldsError) throw customFieldsError;

      // Delete the request itself
      const { error: requestError } = await supabase
        .from("requests")
        .delete()
        .eq("id", request.id);

      if (requestError) throw requestError;

      toast({
        title: "تم الحذف",
        description: `تم حذف الطلب REQ-${String(request.request_number).padStart(3, "0")} بنجاح`,
      });
      onSuccess();
      onClose();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "فشل في الحذف",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const displayName = request?.request_source === "internal" 
    ? request?.requested_by_name || "طلب داخلي"
    : request?.client_name || "مستفيد";

  return (
    <AlertDialog open={open} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>هل أنت متأكد من حذف هذا الطلب؟</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>
              سيتم حذف الطلب{" "}
              <strong>REQ-{String(request?.request_number || 0).padStart(3, "0")}</strong>{" "}
              ({displayName}) بشكل نهائي.
            </p>
            <p className="text-destructive font-medium">
              تحذير: سيتم أيضاً حذف جميع المهام المرتبطة بهذا الطلب.
            </p>
            <p>لا يمكن التراجع عن هذا الإجراء.</p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2">
          <AlertDialogCancel disabled={loading}>إلغاء</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={loading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin ml-2" />}
            حذف الطلب
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
