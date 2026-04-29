import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  FileText,
  ArrowRight,
  Edit,
  Trash2,
  Globe,
  Lock,
  Building2,
  User,
  Calendar,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { MarkdownPreview } from "@/components/docs/MarkdownPreview";

interface Doc {
  id: string;
  title: string;
  content: string | null;
  created_by: string;
  department_id: string | null;
  is_public: boolean;
  created_at: string;
  updated_at: string;
  profiles?: {
    full_name: string;
  };
  departments?: {
    name: string;
  };
}

export default function DocDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isGeneralManager } = useAuth();
  const [doc, setDoc] = useState<Doc | null>(null);
  const [loading, setLoading] = useState(true);

  const canEdit = doc && (doc.created_by === user?.id || isGeneralManager);
  const canDelete = isGeneralManager;

  useEffect(() => {
    if (id) {
      fetchDoc();
    }
  }, [id]);

  const fetchDoc = async () => {
    try {
      const { data, error } = await supabase
        .from("docs")
        .select(
          `
          *,
          profiles:created_by (full_name),
          departments:department_id (name)
        `
        )
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;
      
      if (!data) {
        toast.error("المستند غير موجود");
        navigate("/docs");
        return;
      }
      
      setDoc(data);
    } catch (error) {
      console.error("Error fetching doc:", error);
      toast.error("حدث خطأ أثناء تحميل المستند");
      navigate("/docs");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!doc) return;

    try {
      const { error } = await supabase.from("docs").delete().eq("id", doc.id);

      if (error) throw error;

      toast.success("تم حذف المستند بنجاح");
      navigate("/docs");
    } catch (error) {
      console.error("Error deleting doc:", error);
      toast.error("فشل في حذف المستند");
    }
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="text-center py-12">
        <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium mb-2">المستند غير موجود</h3>
        <Button onClick={() => navigate("/docs")} variant="outline">
          <ArrowRight className="h-4 w-4 ml-2" />
          العودة للمستندات
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/docs")}
          >
            <ArrowRight className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{doc.title}</h1>
            <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
              {doc.is_public ? (
                <Badge variant="secondary">
                  <Globe className="h-3 w-3 ml-1" />
                  عام
                </Badge>
              ) : (
                <Badge variant="outline">
                  <Lock className="h-3 w-3 ml-1" />
                  خاص
                </Badge>
              )}
              {doc.departments?.name && (
                <span className="flex items-center gap-1">
                  <Building2 className="h-4 w-4" />
                  {doc.departments.name}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canEdit && (
            <Button
              variant="outline"
              onClick={() => navigate(`/docs/${doc.id}/edit`)}
            >
              <Edit className="h-4 w-4 ml-2" />
              تعديل
            </Button>
          )}
          {canDelete && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">
                  <Trash2 className="h-4 w-4 ml-2" />
                  حذف
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>حذف المستند</AlertDialogTitle>
                  <AlertDialogDescription>
                    هل أنت متأكد من حذف هذا المستند؟ لا يمكن التراجع عن هذا
                    الإجراء.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>إلغاء</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete}>
                    حذف
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      {/* Content */}
      <Card>
        <CardContent className="pt-6">
          <MarkdownPreview content={doc.content || ""} />
        </CardContent>
      </Card>

      {/* Metadata */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">معلومات المستند</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">الكاتب:</span>
              <span>{doc.profiles?.full_name || "مجهول"}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">تاريخ الإنشاء:</span>
              <span>
                {format(new Date(doc.created_at), "d MMMM yyyy", {
                  locale: ar,
                })}
              </span>
            </div>
            {doc.updated_at !== doc.created_at && (
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">آخر تحديث:</span>
                <span>
                  {format(new Date(doc.updated_at), "d MMMM yyyy", {
                    locale: ar,
                  })}
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
