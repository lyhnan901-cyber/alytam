import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import {
  Megaphone,
  Plus,
  Pencil,
  Trash2,
  Power,
  PowerOff,
  AlertTriangle,
  CheckCircle,
  Info,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

const announcementSchema = z.object({
  title: z.string().min(1, "العنوان مطلوب").max(100, "العنوان طويل جداً"),
  content: z.string().min(1, "المحتوى مطلوب").max(500, "المحتوى طويل جداً"),
  type: z.enum(["info", "warning", "success"]),
  expires_at: z.string().optional(),
});

type AnnouncementFormData = z.infer<typeof announcementSchema>;

interface Announcement {
  id: string;
  title: string;
  content: string;
  type: "info" | "warning" | "success";
  is_active: boolean;
  created_by: string;
  expires_at: string | null;
  created_at: string;
}

export default function Announcements() {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const form = useForm<AnnouncementFormData>({
    resolver: zodResolver(announcementSchema),
    defaultValues: {
      title: "",
      content: "",
      type: "info",
      expires_at: "",
    },
  });

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("announcements")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء تحميل التعميمات",
        variant: "destructive",
      });
    } else {
      setAnnouncements(data as Announcement[]);
    }
    setLoading(false);
  };

  const openCreateDialog = () => {
    setEditingAnnouncement(null);
    form.reset({
      title: "",
      content: "",
      type: "info",
      expires_at: "",
    });
    setIsDialogOpen(true);
  };

  const openEditDialog = (announcement: Announcement) => {
    setEditingAnnouncement(announcement);
    form.reset({
      title: announcement.title,
      content: announcement.content,
      type: announcement.type,
      expires_at: announcement.expires_at
        ? format(new Date(announcement.expires_at), "yyyy-MM-dd'T'HH:mm")
        : "",
    });
    setIsDialogOpen(true);
  };

  const onSubmit = async (data: AnnouncementFormData) => {
    const payload = {
      title: data.title,
      content: data.content,
      type: data.type,
      expires_at: data.expires_at || null,
      created_by: user?.id,
    };

    if (editingAnnouncement) {
      const { error } = await supabase
        .from("announcements")
        .update(payload)
        .eq("id", editingAnnouncement.id);

      if (error) {
        toast({
          title: "خطأ",
          description: "حدث خطأ أثناء تحديث التعميم",
          variant: "destructive",
        });
      } else {
        toast({ title: "تم التحديث", description: "تم تحديث التعميم بنجاح" });
        setIsDialogOpen(false);
        fetchAnnouncements();
      }
    } else {
      const { error } = await supabase.from("announcements").insert(payload);

      if (error) {
        toast({
          title: "خطأ",
          description: "حدث خطأ أثناء إنشاء التعميم",
          variant: "destructive",
        });
      } else {
        toast({ title: "تم الإنشاء", description: "تم إنشاء التعميم بنجاح" });
        setIsDialogOpen(false);
        fetchAnnouncements();
      }
    }
  };

  const toggleActive = async (announcement: Announcement) => {
    const { error } = await supabase
      .from("announcements")
      .update({ is_active: !announcement.is_active })
      .eq("id", announcement.id);

    if (error) {
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء تحديث حالة التعميم",
        variant: "destructive",
      });
    } else {
      toast({
        title: announcement.is_active ? "تم الإلغاء" : "تم التفعيل",
        description: announcement.is_active
          ? "تم إلغاء تفعيل التعميم"
          : "تم تفعيل التعميم",
      });
      fetchAnnouncements();
    }
  };

  const deleteAnnouncement = async (id: string) => {
    const { error } = await supabase.from("announcements").delete().eq("id", id);

    if (error) {
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء حذف التعميم",
        variant: "destructive",
      });
    } else {
      toast({ title: "تم الحذف", description: "تم حذف التعميم بنجاح" });
      fetchAnnouncements();
    }
    setDeletingId(null);
  };

  const getTypeConfig = (type: Announcement["type"]) => {
    switch (type) {
      case "warning":
        return {
          label: "تحذير",
          icon: AlertTriangle,
          className: "bg-amber-500/10 text-amber-700 border-amber-500/30",
        };
      case "success":
        return {
          label: "إيجابي",
          icon: CheckCircle,
          className: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30",
        };
      default:
        return {
          label: "معلومات",
          icon: Info,
          className: "bg-blue-500/10 text-blue-700 border-blue-500/30",
        };
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-primary" /> إدارة التعميمات
          </h1>
          <p className="page-subtitle">إنشاء وإدارة التعميمات والقرارات الخيرية العامة</p>
        </div>
        <Button onClick={openCreateDialog}
          style={{ background: "linear-gradient(135deg,#0d4d0d,#1a7d1a)" }}>
          <Plus className="w-4 h-4 ml-2" /> تعميم جديد
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">
          جاري التحميل...
        </div>
      ) : announcements.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Megaphone className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p>لا توجد تعميمات حالياً</p>
            <Button onClick={openCreateDialog} variant="outline" className="mt-4">
              <Plus className="w-4 h-4 ml-2" />
              إنشاء أول تعميم
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {announcements.map((announcement) => {
            const typeConfig = getTypeConfig(announcement.type);
            const TypeIcon = typeConfig.icon;

            return (
              <Card
                key={announcement.id}
                className={cn(!announcement.is_active && "opacity-60")}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className={typeConfig.className}>
                        <TypeIcon className="w-3 h-3 ml-1" />
                        {typeConfig.label}
                      </Badge>
                      <CardTitle className="text-lg">
                        {announcement.title}
                      </CardTitle>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleActive(announcement)}
                        title={announcement.is_active ? "إلغاء التفعيل" : "تفعيل"}
                      >
                        {announcement.is_active ? (
                          <PowerOff className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <Power className="w-4 h-4 text-green-600" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(announcement)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeletingId(announcement.id)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-3">{announcement.content}</p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>
                      تاريخ الإنشاء:{" "}
                      {format(new Date(announcement.created_at), "dd MMMM yyyy", {
                        locale: ar,
                      })}
                    </span>
                    {announcement.expires_at && (
                      <span>
                        ينتهي في:{" "}
                        {format(new Date(announcement.expires_at), "dd MMMM yyyy", {
                          locale: ar,
                        })}
                      </span>
                    )}
                    {!announcement.is_active && (
                      <Badge variant="secondary">غير نشط</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingAnnouncement ? "تعديل التعميم" : "تعميم جديد"}
            </DialogTitle>
            <DialogDescription>
              {editingAnnouncement
                ? "قم بتعديل بيانات التعميم"
                : "أنشئ تعميماً جديداً يظهر لجميع المستخدمين"}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">العنوان</Label>
              <Input
                id="title"
                {...form.register("title")}
                placeholder="عنوان التعميم"
              />
              {form.formState.errors.title && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.title.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">المحتوى</Label>
              <Textarea
                id="content"
                {...form.register("content")}
                placeholder="محتوى التعميم"
                rows={3}
              />
              {form.formState.errors.content && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.content.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">نوع التعميم</Label>
              <Select
                value={form.watch("type")}
                onValueChange={(value: "info" | "warning" | "success") =>
                  form.setValue("type", value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر النوع" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="info">
                    <div className="flex items-center gap-2">
                      <Info className="w-4 h-4 text-blue-600" />
                      معلومات
                    </div>
                  </SelectItem>
                  <SelectItem value="warning">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      تحذير
                    </div>
                  </SelectItem>
                  <SelectItem value="success">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-600" />
                      إيجابي
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="expires_at">تاريخ الانتهاء (اختياري)</Label>
              <Input
                id="expires_at"
                type="datetime-local"
                {...form.register("expires_at")}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
              >
                إلغاء
              </Button>
              <Button type="submit">
                {editingAnnouncement ? "حفظ التعديلات" : "إنشاء"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>هل أنت متأكد؟</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم حذف هذا التعميم نهائياً ولن يمكن استرجاعه.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingId && deleteAnnouncement(deletingId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
