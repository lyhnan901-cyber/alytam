import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { FileText, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

interface Doc {
  id: string;
  title: string;
  is_public: boolean;
}

interface RelatedDocsProps {
  departmentId: string | null;
}

export function RelatedDocs({ departmentId }: RelatedDocsProps) {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDocs();
  }, [departmentId]);

  const fetchDocs = async () => {
    try {
      let query = supabase
        .from("docs")
        .select("id, title, is_public")
        .order("updated_at", { ascending: false })
        .limit(5);

      // If task has a department, show department docs + public docs
      if (departmentId) {
        query = query.or(`department_id.eq.${departmentId},is_public.eq.true`);
      } else {
        // Otherwise just show public docs
        query = query.eq("is_public", true);
      }

      const { data, error } = await query;

      if (error) throw error;
      setDocs(data || []);
    } catch (error) {
      console.error("Error fetching docs:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4" />
            مستندات مرتبطة
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            <div className="h-8 bg-muted rounded" />
            <div className="h-8 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (docs.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <FileText className="h-4 w-4" />
          مستندات مرتبطة
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {docs.map((doc) => (
            <Link
              key={doc.id}
              to={`/docs/${doc.id}`}
              className="flex items-center justify-between p-2 rounded-lg hover:bg-muted transition-colors group"
            >
              <span className="text-sm truncate">{doc.title}</span>
              <div className="flex items-center gap-2">
                {doc.is_public && (
                  <Badge variant="secondary" className="text-xs">
                    عام
                  </Badge>
                )}
                <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </Link>
          ))}
        </div>
        <Link
          to="/docs"
          className="block text-center text-sm text-primary hover:underline mt-3 pt-3 border-t"
        >
          عرض جميع المستندات
        </Link>
      </CardContent>
    </Card>
  );
}
