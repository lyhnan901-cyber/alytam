import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Loader2, Globe, Lock } from "lucide-react";
import { MarkdownEditor } from "@/components/docs/MarkdownEditor";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { logDocumentCreated } from "@/lib/activity-logger";

interface Department {
  id: string;
  name: string;
}

export default function DocNew() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [departmentId, setDepartmentId] = useState<string>("");
  const [isPublic, setIsPublic] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    const { data } = await supabase
      .from("departments")
      .select("id, name")
      .order("name");
    setDepartments(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    try {
      const { data: doc, error } = await supabase.from("docs").insert({
        title,
        content,
        created_by: user.id,
        department_id: departmentId || null,
        is_public: isPublic,
      }).select().single();

      if (error) throw error;

      // Log activity
      if (doc) {
        await logDocumentCreated(user.id, doc.id, title);
      }

      toast.success("تم إنشاء المستند بنجاح");
      navigate("/docs");
    } catch (error) {
      console.error("Error creating doc:", error);
      toast.error("فشل في إنشاء المستند");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/docs")}>
          <ArrowRight className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold">مستند جديد</h1>
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
            onClick={() => navigate("/docs")}
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
              "حفظ المستند"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
