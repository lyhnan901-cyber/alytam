import { useState } from "react";
import { HandHeart, Plus, Search, Star, Calendar, Clock, CheckCircle, XCircle, Phone, MapPin, Award, Download, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

// قائمة المتطوعين: حالياً فارغة. هذي الصفحة لم تُربط بـ Supabase بعد، فتظهر بحالة
// فارغة لأي فرع. عند ربطها مستقبلاً، استبدل المصفوفة بنتيجة استعلام من قاعدة البيانات.
const VOLUNTEERS: any[] = [];

const STATUS = {
  active:   { label: "نشط",   className: "badge-approved" },
  inactive: { label: "غير نشط", className: "badge-pending" },
};

const DEPT_COLORS: Record<string, string> = {
  "التوزيع الميداني": "bg-green-50 text-green-700",
  "إدارة الحالات":    "bg-blue-50 text-blue-700",
  "الإعلام والعلاقات العامة": "bg-purple-50 text-purple-700",
  "الرعاية الصحية":  "bg-red-50 text-red-700",
  "الشؤون الإدارية": "bg-slate-50 text-slate-700",
};

function Stars({ n }: { n: number }) {
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(i => (
        <Star key={i} className={`w-3 h-3 ${i <= n ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />
      ))}
    </div>
  );
}

export default function MarketingDashboard() {
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const { toast } = useToast();

  const filtered = VOLUNTEERS.filter(v => {
    const ms = v.name.includes(search) || v.id.includes(search) || v.area.includes(search);
    const md = deptFilter === "all" || v.dept === deptFilter;
    const mst = statusFilter === "all" || v.status === statusFilter;
    return ms && md && mst;
  });

  const totalHours = VOLUNTEERS.filter(v => v.status === "active").reduce((s, v) => s + v.hours, 0);
  const activeCount = VOLUNTEERS.filter(v => v.status === "active").length;
  const ratingSum = VOLUNTEERS.filter(v => v.status === "active").reduce((s, v) => s + (v.rating || 0), 0);
  const avgRating = activeCount > 0 ? (ratingSum / activeCount).toFixed(1) : "—";

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <HandHeart className="w-6 h-6" style={{ color: "#a855f7" }} />
            إدارة المتطوعين
          </h1>
          <p className="page-subtitle">تنسيق وتتبع أداء فرق المتطوعين في المؤسسة</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2"><Download className="w-4 h-4" /> تصدير</Button>
          <Button size="sm" className="gap-2" style={{ background: "linear-gradient(135deg,#7c3aed,#a855f7)" }}
            onClick={() => toast({ title: "قريباً", description: "سيتم إضافة نموذج تسجيل متطوع" })}>
            <Plus className="w-4 h-4" /> تسجيل متطوع
          </Button>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "متطوع نشط",       value: activeCount, icon: HandHeart, color: "#a855f7", bg: "rgba(168,85,247,0.1)" },
          { label: "ساعات التطوع",    value: `${totalHours}h`, icon: Clock, color: "#D4A017", bg: "rgba(212,160,23,0.1)" },
          { label: "متوسط التقييم",   value: avgRating === "—" ? "—" : `${avgRating} ⭐`, icon: Star, color: "#f59e0b", bg: "rgba(245,158,11,0.1)" },
          { label: "فعاليات هذا الشهر", value: 0, icon: Calendar, color: "#166516", bg: "rgba(22,101,22,0.1)" },
        ].map(k => (
          <div key={k.label} className="kpi-card">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: k.bg }}>
              <k.icon className="w-5 h-5" style={{ color: k.color }} />
            </div>
            <p className="text-xl font-bold" style={{ color: k.color }}>{k.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{k.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="data-card">
        <div className="data-card-body">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="بحث بالاسم أو المنطقة..." value={search} onChange={e => setSearch(e.target.value)} className="pr-10 rounded-xl" />
            </div>
            <Select value={deptFilter} onValueChange={setDeptFilter}>
              <SelectTrigger className="w-44 rounded-xl"><SelectValue placeholder="القسم" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الأقسام</SelectItem>
                {["التوزيع الميداني","إدارة الحالات","الإعلام والعلاقات العامة","الرعاية الصحية","الشؤون الإدارية"].map(d => (
                  <SelectItem key={d} value={d}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36 rounded-xl"><SelectValue placeholder="الحالة" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الجميع</SelectItem>
                <SelectItem value="active">نشط</SelectItem>
                <SelectItem value="inactive">غير نشط</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map(v => {
          const st = STATUS[v.status as keyof typeof STATUS];
          return (
            <div key={v.id} className="data-card hover:-translate-y-1 transition-transform duration-200 cursor-pointer group">
              <div className="p-5 space-y-4">
                {/* Top */}
                <div className="flex items-start justify-between">
                  <div className="avatar-gold w-12 h-12 text-base rounded-xl">
                    {v.name.charAt(0)}
                  </div>
                  <span className={`${st.className} text-xs font-medium px-2 py-0.5 rounded-full`}>
                    {st.label}
                  </span>
                </div>

                {/* Info */}
                <div>
                  <p className="font-bold text-sm">{v.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{v.role}</p>
                  <span className={`tag mt-1.5 ${DEPT_COLORS[v.dept] || "bg-gray-50 text-gray-600"}`}>
                    {v.dept}
                  </span>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center p-2 rounded-xl" style={{ background: "rgba(168,85,247,0.06)" }}>
                    <p className="text-lg font-bold" style={{ color: "#a855f7" }}>{v.hours}</p>
                    <p className="text-xs text-muted-foreground">ساعة</p>
                  </div>
                  <div className="text-center p-2 rounded-xl" style={{ background: "rgba(212,160,23,0.06)" }}>
                    <Stars n={v.rating} />
                    <p className="text-xs text-muted-foreground mt-1">التقييم</p>
                  </div>
                </div>

                {/* Details */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <MapPin className="w-3 h-3 shrink-0" />
                    <span>{v.area}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="w-3 h-3 shrink-0" />
                    <span>انضم {v.joined}</span>
                  </div>
                </div>

                {/* Skills */}
                <div className="flex flex-wrap gap-1">
                  {v.skills.slice(0,3).map(s => (
                    <span key={s} className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                      style={{ background: "rgba(22,101,22,0.08)", color: "#166516" }}>
                      {s}
                    </span>
                  ))}
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-1">
                  <Button variant="outline" size="sm" className="flex-1 h-8 text-xs gap-1">
                    <Eye className="w-3.5 h-3.5" /> عرض
                  </Button>
                  <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                    <Phone className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                    <Award className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <HandHeart className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>لا توجد نتائج مطابقة</p>
        </div>
      )}
    </div>
  );
}
