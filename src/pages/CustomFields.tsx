import { useState, useEffect } from "react";
import { Plus, Edit2, ToggleLeft, ToggleRight, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { CustomFieldForm } from "@/components/forms/CustomFieldForm";

interface CustomField {
  id: string;
  name: string;
  key: string;
  field_type: string;
  applicable_to: string;
  options: unknown;
  is_active: boolean;
  created_at: string;
}

const fieldTypeLabels: Record<string, string> = {
  text: "نص",
  number: "رقم",
  date: "تاريخ",
  select: "قائمة اختيار",
  boolean: "نعم/لا",
};

const applicableToLabels: Record<string, string> = {
  task: "المهام",
  request: "الطلبات",
};

export default function CustomFields() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [fields, setFields] = useState<CustomField[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingField, setEditingField] = useState<CustomField | null>(null);
  const [deletingField, setDeletingField] = useState<CustomField | null>(null);
  const [filterType, setFilterType] = useState<string>("all");

  const fetchFields = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("custom_fields")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setFields(data || []);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "خطأ في جلب الحقول",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFields();
  }, []);

  const toggleFieldStatus = async (field: CustomField) => {
    try {
      const { error } = await supabase
        .from("custom_fields")
        .update({ is_active: !field.is_active })
        .eq("id", field.id);

      if (error) throw error;

      toast({
        title: field.is_active ? "تم تعطيل الحقل" : "تم تفعيل الحقل",
        description: field.name,
      });

      fetchFields();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "خطأ في تحديث الحقل",
        description: error.message,
      });
    }
  };

  const deleteField = async () => {
    if (!deletingField) return;

    try {
      const { error } = await supabase
        .from("custom_fields")
        .delete()
        .eq("id", deletingField.id);

      if (error) throw error;

      toast({
        title: "تم حذف الحقل",
        description: deletingField.name,
      });

      setDeletingField(null);
      fetchFields();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "خطأ في حذف الحقل",
        description: error.message,
      });
    }
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingField(null);
    fetchFields();
  };

  const filteredFields = fields.filter((field) => {
    if (filterType === "all") return true;
    return field.applicable_to === filterType;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">الحقول المخصصة</h1>
          <p className="text-muted-foreground mt-1">
            إدارة الحقول الإضافية للمهام والطلبات
          </p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4 ml-2" />
          إضافة حقل جديد
        </Button>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        <Badge
          variant={filterType === "all" ? "default" : "outline"}
          className="cursor-pointer"
          onClick={() => setFilterType("all")}
        >
          الكل ({fields.length})
        </Badge>
        <Badge
          variant={filterType === "task" ? "default" : "outline"}
          className="cursor-pointer"
          onClick={() => setFilterType("task")}
        >
          المهام ({fields.filter(f => f.applicable_to === "task").length})
        </Badge>
        <Badge
          variant={filterType === "request" ? "default" : "outline"}
          className="cursor-pointer"
          onClick={() => setFilterType("request")}
        >
          الطلبات ({fields.filter(f => f.applicable_to === "request").length})
        </Badge>
      </div>

      {/* Fields Table */}
      <Card>
        <CardHeader>
          <CardTitle>قائمة الحقول ({fields.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : filteredFields.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              لا توجد حقول مخصصة. أضف حقلاً جديداً للبدء.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الاسم</TableHead>
                  <TableHead>المعرف</TableHead>
                  <TableHead>النوع</TableHead>
                  <TableHead>ينطبق على</TableHead>
                  <TableHead>الخيارات</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead className="text-left">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFields.map((field) => (
                  <TableRow key={field.id}>
                    <TableCell className="font-medium">{field.name}</TableCell>
                    <TableCell className="font-mono text-sm">{field.key}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {fieldTypeLabels[field.field_type] || field.field_type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {applicableToLabels[field.applicable_to] || field.applicable_to}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {field.field_type === "select" && Array.isArray(field.options) ? (
                        <span className="text-sm text-muted-foreground">
                          {(field.options as string[]).slice(0, 3).join("، ")}
                          {(field.options as string[]).length > 3 && "..."}
                        </span>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={field.is_active ? "default" : "outline"}>
                        {field.is_active ? "مفعّل" : "معطّل"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditingField(field);
                            setShowForm(true);
                          }}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => toggleFieldStatus(field)}
                        >
                          {field.is_active ? (
                            <ToggleRight className="w-4 h-4 text-success" />
                          ) : (
                            <ToggleLeft className="w-4 h-4 text-muted-foreground" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeletingField(field)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Form Dialog */}
      <Dialog open={showForm} onOpenChange={(open) => {
        if (!open) {
          setShowForm(false);
          setEditingField(null);
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingField ? "تعديل الحقل" : "إضافة حقل جديد"}
            </DialogTitle>
          </DialogHeader>
          <CustomFieldForm
            field={editingField}
            onSuccess={handleFormSuccess}
            onCancel={() => {
              setShowForm(false);
              setEditingField(null);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingField} onOpenChange={() => setDeletingField(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف الحقل؟</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم حذف الحقل "{deletingField?.name}" وجميع القيم المرتبطة به نهائياً.
              هذا الإجراء لا يمكن التراجع عنه.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={deleteField} className="bg-destructive">
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
