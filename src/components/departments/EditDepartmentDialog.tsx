import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface Department {
  id: string;
  name: string;
  description: string | null;
}

interface EditDepartmentDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  department: Department | null;
}

export function EditDepartmentDialog({
  open,
  onClose,
  onSuccess,
  department,
}: EditDepartmentDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (department && open) {
      setName(department.name);
      setDescription(department.description || "");
    }
  }, [department, open]);

  const handleSubmit = async () => {
    if (!department) return;

    if (!name.trim()) {
      toast({
        variant: "destructive",
        title: "خطأ",
        description: "اسم القسم مطلوب",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("departments")
        .update({
          name: name.trim(),
          description: description.trim() || null,
        })
        .eq("id", department.id);

      if (error) throw error;

      toast({
        title: "تم بنجاح",
        description: "تم تحديث القسم بنجاح",
      });

      onSuccess();
      onClose();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "خطأ في تحديث القسم",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  if (!department) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle>تعديل القسم</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">اسم القسم *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="أدخل اسم القسم"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">وصف القسم</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="أدخل وصف القسم (اختياري)"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            إلغاء
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
            حفظ التغييرات
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
