import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowRight, Loader2, Globe, Lock } from "lucide-react";
import { MarkdownEditor } from "@/components/docs/MarkdownEditor";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface Department {
  id: string;
  name: string;
}

export default function DocEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isGeneralManager } = useAuth();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [departmentId, setDepartmentId] = useState<string>("");
  const [isPublic, setIsPublic] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchDepartments();
    if (id) {
      fetchDoc();
    }
  }, [id]);

  const fetchDepartments = async () => {
    const { data } = await supabase
      .from("departments")
      .select("id, name")
      .order("name");
    setDepartments(data || []);
  };

  const fetchDoc = async () => {
    try {
      const { data, error } = await supabase
        .from("docs")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        toast.error("المستند غير موجود");
        navigate("/docs");
        return;
      }

      // Check permissions
      if (data.created_by !== user?.id && !isGeneralManager) {
        toast.error("لا يمكنك تعديل هذا المستند");
        navigate(`/docs/${id}`);
        return;
      }

      setTitle(data.title);
      setContent(data.content || "");
      setDepartmentId(data.department_id || "");
      setIsPublic(data.is_public);
    } catch (error) {
      console.error("Error fetching doc:", error);
      toast.error("حدث خطأ أثناء تحميل المستند");
      navigate("/docs");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !id) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("docs")
        .update({
          title,
          content,
          department_id: departmentId || null,
          is_public: isPublic,
        })
        .eq("id", id);

      if (error) throw error;

      toast.success("تم تحديث المستند بنجاح");
      navigate(`/docs/${id}`);
    } catch (error) {
      console.error("Error updating doc:", error);
      toast.error("فشل في تحديث المستند");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(`/docs/${id}`)}
        >
          <ArrowRight className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold">تعديل المستند</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">العنوان *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="w-full p-3 border rounded-lg bg-background"
                placeholder="عنوان المستند"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">المحتوى</label>
              <MarkdownEditor
                value={content}
                onChange={setContent}
                placeholder="محتوى المستند (يدعم Markdown)..."
                minHeight="350px"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">القسم (اختياري)</label>
                <select
                  value={departmentId}
                  onChange={(e) => setDepartmentId(e.target.value)}
                  className="w-full p-3 border rounded-lg bg-background"
                >
                  <option value="">بدون قسم</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">نوع الوصول</label>
                <div className="flex items-center gap-4 p-3 border rounded-lg">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={!isPublic}
                      onChange={() => setIsPublic(false)}
                      className="w-4 h-4"
                    />
                    <Lock className="h-4 w-4" />
                    <span>خاص</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={isPublic}
                      onChange={() => setIsPublic(true)}
                      className="w-4 h-4"
                    />
                    <Globe className="h-4 w-4" />
                    <span>عام</span>
                  </label>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(`/docs/${id}`)}
          >
            إلغاء
          </Button>
          <Button type="submit" disabled={saving || !title}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                جاري الحفظ...
              </>
            ) : (
              "حفظ التغييرات"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
