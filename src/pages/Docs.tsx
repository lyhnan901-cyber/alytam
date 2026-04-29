import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  FileText,
  Plus,
  Search,
  Globe,
  Lock,
  Building2,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

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

interface Department {
  id: string;
  name: string;
}

export default function Docs() {
  const navigate = useNavigate();
  const { role, isGeneralManager } = useAuth();
  const [docs, setDocs] = useState<Doc[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");

  const canCreateDocs =
    isGeneralManager ||
    role === "ExecutiveManager" ||
    role === "DepartmentHead";

  useEffect(() => {
    fetchDocs();
    fetchDepartments();
  }, []);

  const fetchDocs = async () => {
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
        .order("updated_at", { ascending: false });

      if (error) throw error;
      setDocs(data || []);
    } catch (error) {
      console.error("Error fetching docs:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const { data, error } = await supabase
        .from("departments")
        .select("id, name")
        .order("name");

      if (error) throw error;
      setDepartments(data || []);
    } catch (error) {
      console.error("Error fetching departments:", error);
    }
  };

  const filteredDocs = docs.filter((doc) => {
    const matchesSearch =
      searchQuery === "" ||
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.content?.toLowerCase().includes(searchQuery.toLowerCase());

    if (departmentFilter === "all") return matchesSearch;
    if (departmentFilter === "public") return matchesSearch && doc.is_public;
    return matchesSearch && doc.department_id === departmentFilter;
  });

  const getContentPreview = (content: string | null) => {
    if (!content) return "لا يوجد محتوى";
    const stripped = content.replace(/[#*_`]/g, "").trim();
    return stripped.length > 150 ? stripped.substring(0, 150) + "..." : stripped;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-7 w-7" />
            المستندات
          </h1>
          <p className="text-muted-foreground mt-1">
            المستندات والوثائق الداخلية للمؤسسة
          </p>
        </div>
        {canCreateDocs && (
          <Button onClick={() => navigate("/docs/new")}>
            <Plus className="h-4 w-4 ml-2" />
            مستند جديد
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="بحث في المستندات..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-10"
          />
        </div>
        <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="جميع المستندات" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">جميع المستندات</SelectItem>
            <SelectItem value="public">المستندات العامة</SelectItem>
            {departments.map((dept) => (
              <SelectItem key={dept.id} value={dept.id}>
                {dept.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Docs List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filteredDocs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">لا توجد مستندات</h3>
            <p className="text-muted-foreground">
              {searchQuery || departmentFilter !== "all"
                ? "لا توجد نتائج للبحث"
                : "ابدأ بإنشاء مستند جديد"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredDocs.map((doc) => (
            <Card
              key={doc.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => navigate(`/docs/${doc.id}`)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-lg line-clamp-2">
                    {doc.title}
                  </CardTitle>
                  {doc.is_public ? (
                    <Badge variant="secondary" className="shrink-0">
                      <Globe className="h-3 w-3 ml-1" />
                      عام
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="shrink-0">
                      <Lock className="h-3 w-3 ml-1" />
                      خاص
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
                  {getContentPreview(doc.content)}
                </p>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{doc.profiles?.full_name || "مجهول"}</span>
                  <span>
                    {format(new Date(doc.updated_at), "d MMM yyyy", {
                      locale: ar,
                    })}
                  </span>
                </div>
                {doc.departments?.name && (
                  <div className="flex items-center gap-1 mt-2">
                    <Building2 className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      {doc.departments.name}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
