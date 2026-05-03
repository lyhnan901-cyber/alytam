import { useState } from "react";
import { Package, Plus, Search, AlertTriangle, TrendingDown, TrendingUp, RefreshCw, Download, Eye, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

// قائمة الأصناف: حالياً فارغة. هذي الصفحة لم تُربط بـ Supabase بعد، فتظهر بحالة
// فارغة لأي فرع. عند ربطها مستقبلاً، استبدل المصفوفة بنتيجة استعلام من قاعدة البيانات.
const ITEMS: any[] = [];

const STATUS = {
  ok:       { label: "متوفر",    className: "badge-approved", dot: "#22c55e" },
  low:      { label: "منخفض",   className: "badge-progress", dot: "#f59e0b" },
  critical: { label: "حرج",     className: "badge-urgent",   dot: "#ef4444" },
  out:      { label: "نفذ",     className: "badge-rejected", dot: "#dc2626" },
};

const CAT_COLORS: Record<string, string> = {
  "غذاء":  "bg-amber-50 text-amber-700",   "ملابس": "bg-purple-50 text-purple-700",
  "طبي":   "bg-red-50 text-red-700",       "تعليم": "bg-blue-50 text-blue-700",
  "أثاث":  "bg-orange-50 text-orange-700", "نظافة": "bg-cyan-50 text-cyan-700",
  "تقنية": "bg-indigo-50 text-indigo-700",
};

export default function Inventory() {
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const { toast } = useToast();

  const filtered = ITEMS.filter(i => {
    const ms = i.name.includes(search) || i.id.includes(search);
    const mc = catFilter === "all" || i.category === catFilter;
    const mst = statusFilter === "all" || i.status === statusFilter;
    return ms && mc && mst;
  });

  const alerts = ITEMS.filter(i => i.status === "low" || i.status === "critical" || i.status === "out");
  const totalItems = ITEMS.reduce((s, i) => s + i.qty, 0);

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Package className="w-6 h-6 text-primary" />
            إدارة المخازن والإمدادات
          </h1>
          <p className="page-subtitle">متابعة المخزون وضمان توفر مستلزمات التوزيع</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <Download className="w-4 h-4" /> تصدير
          </Button>
          <Button size="sm" className="gap-2" style={{ background: "linear-gradient(135deg,#0d4d0d,#1a7d1a)" }}
            onClick={() => toast({ title: "قريباً", description: "سيتم إضافة صنف جديد" })}>
            <Plus className="w-4 h-4" /> إضافة صنف
          </Button>
        </div>
      </div>

      {/* Alerts Banner */}
      {alerts.length > 0 && (
        <div className="p-4 rounded-2xl border flex items-start gap-3 animate-fade-in"
          style={{ background: "rgba(239,68,68,0.05)", borderColor: "rgba(239,68,68,0.2)" }}>
          <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
          <div>
            <p className="font-bold text-sm text-red-700">تنبيه المخزون ({alerts.length} أصناف)</p>
            <p className="text-xs text-red-600/80 mt-0.5">
              {alerts.map(a => a.name).join(" • ")}
            </p>
          </div>
          <Button variant="ghost" size="sm" className="mr-auto text-red-600 text-xs gap-1">
            <RefreshCw className="w-3.5 h-3.5" /> طلب تجديد
          </Button>
        </div>
      )}

      {/* KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "إجمالي الأصناف", value: ITEMS.length, icon: Package, color: "#166516", bg: "rgba(22,101,22,0.1)" },
          { label: "إجمالي الوحدات", value: totalItems.toLocaleString("ar-SA"), icon: TrendingUp, color: "#D4A017", bg: "rgba(212,160,23,0.1)" },
          { label: "أصناف منخفضة/حرجة", value: alerts.filter(a => a.status !== "out").length, icon: TrendingDown, color: "#f59e0b", bg: "rgba(245,158,11,0.1)" },
          { label: "أصناف نفذت", value: ITEMS.filter(i => i.status === "out").length, icon: AlertTriangle, color: "#ef4444", bg: "rgba(239,68,68,0.1)" },
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
              <Input placeholder="بحث باسم الصنف أو الرقم..." value={search} onChange={e => setSearch(e.target.value)} className="pr-10 rounded-xl" />
            </div>
            <Select value={catFilter} onValueChange={setCatFilter}>
              <SelectTrigger className="w-36 rounded-xl"><SelectValue placeholder="الفئة" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الفئات</SelectItem>
                {["غذاء","ملابس","طبي","تعليم","أثاث","نظافة","تقنية"].map(c => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36 rounded-xl"><SelectValue placeholder="الحالة" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الحالات</SelectItem>
                <SelectItem value="ok">متوفر</SelectItem>
                <SelectItem value="low">منخفض</SelectItem>
                <SelectItem value="critical">حرج</SelectItem>
                <SelectItem value="out">نفذ</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="data-card overflow-x-auto">
        <table className="data-table w-full">
          <thead>
            <tr>
              <th>الرقم</th>
              <th>اسم الصنف</th>
              <th>الفئة</th>
              <th>الكمية</th>
              <th>الحد الأدنى</th>
              <th>المستودع</th>
              <th>آخر تحديث</th>
              <th>الحالة</th>
              <th>إجراء</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(item => {
              const st = STATUS[item.status as keyof typeof STATUS];
              const pct = item.minQty > 0 ? Math.min((item.qty / item.minQty) * 100, 100) : 100;
              return (
                <tr key={item.id}>
                  <td><span className="font-mono text-xs font-bold text-primary">{item.id}</span></td>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ background: st.dot }} />
                      <span className="font-semibold text-sm">{item.name}</span>
                    </div>
                  </td>
                  <td><span className={`tag ${CAT_COLORS[item.category] || "bg-gray-50 text-gray-600"}`}>{item.category}</span></td>
                  <td>
                    <div className="space-y-1">
                      <span className="font-bold text-sm">{item.qty.toLocaleString("ar-SA")} {item.unit}</span>
                      <div className="w-24 progress-bar">
                        <div className="progress-fill" style={{ width: `${pct}%`, background: item.status === "ok" ? "#1a7d1a" : item.status === "low" ? "#f59e0b" : "#ef4444" }} />
                      </div>
                    </div>
                  </td>
                  <td><span className="text-sm text-muted-foreground">{item.minQty} {item.unit}</span></td>
                  <td><span className="text-sm">{item.location}</span></td>
                  <td><span className="text-xs text-muted-foreground">{item.lastUpdated}</span></td>
                  <td><span className={`text-xs font-medium px-2.5 py-1 rounded-full ${st.className}`}>{st.label}</span></td>
                  <td>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0"><Eye className="w-3.5 h-3.5" /></Button>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0"><Edit className="w-3.5 h-3.5" /></Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && <div className="text-center py-12 text-muted-foreground">لا توجد نتائج</div>}
      </div>
    </div>
  );
}
