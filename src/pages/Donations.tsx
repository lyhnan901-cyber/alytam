import { useState, useEffect } from "react";
import { Wallet, Plus, Search, Filter, TrendingUp, Users, DollarSign, Calendar, Eye, CheckCircle, Clock, XCircle, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

const MOCK_DONATIONS = [
  { id: "D-001", donor: "أحمد بن عبدالله المنصور", type: "فرد", amount: 5000, currency: "ر.س", date: "2026-04-28", method: "تحويل بنكي", status: "confirmed", cases: 3, note: "تبرع شهري" },
  { id: "D-002", donor: "شركة العطاء للتجارة", type: "شركة", amount: 50000, currency: "ر.س", date: "2026-04-27", method: "شيك", status: "confirmed", cases: 20, note: "كفالة جماعية" },
  { id: "D-003", donor: "محمد علي السعدي", type: "فرد", amount: 1200, currency: "ر.س", date: "2026-04-26", method: "نقد", status: "pending", cases: 1, note: "" },
  { id: "D-004", donor: "مؤسسة الوفاء الخيرية", type: "مؤسسة", amount: 120000, currency: "ر.س", date: "2026-04-25", method: "تحويل بنكي", status: "confirmed", cases: 48, note: "مشروع تعليمي" },
  { id: "D-005", donor: "فاطمة حسن العمري", type: "فرد", amount: 800, currency: "ر.س", date: "2026-04-24", method: "نقد", status: "confirmed", cases: 1, note: "" },
  { id: "D-006", donor: "صندوق الزكاة والصدقات", type: "صندوق", amount: 250000, currency: "ر.س", date: "2026-04-23", method: "تحويل بنكي", status: "confirmed", cases: 100, note: "توزيع موسمي" },
  { id: "D-007", donor: "عبدالرحمن الغامدي", type: "فرد", amount: 2500, currency: "ر.س", date: "2026-04-22", method: "تطبيق ذكي", status: "pending", cases: 2, note: "كفالة يتيم" },
  { id: "D-008", donor: "شركة النور للخدمات", type: "شركة", amount: 35000, currency: "ر.س", date: "2026-04-20", method: "شيك", status: "cancelled", cases: 0, note: "تم الإلغاء" },
];

const STATUS_MAP: Record<string, { label: string; className: string; icon: any }> = {
  confirmed: { label: "مؤكد", className: "badge-approved", icon: CheckCircle },
  pending:   { label: "بانتظار التأكيد", className: "badge-progress", icon: Clock },
  cancelled: { label: "ملغي", className: "badge-rejected", icon: XCircle },
};

const TYPE_COLORS: Record<string, string> = {
  "فرد": "bg-blue-50 text-blue-700", "شركة": "bg-purple-50 text-purple-700",
  "مؤسسة": "bg-amber-50 text-amber-700", "صندوق": "bg-green-50 text-green-700",
};

export default function Donations() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const { toast } = useToast();

  const total = MOCK_DONATIONS.filter(d => d.status === "confirmed").reduce((s, d) => s + d.amount, 0);
  const pending = MOCK_DONATIONS.filter(d => d.status === "pending").reduce((s, d) => s + d.amount, 0);
  const totalCases = MOCK_DONATIONS.filter(d => d.status === "confirmed").reduce((s, d) => s + d.cases, 0);

  const filtered = MOCK_DONATIONS.filter(d => {
    const matchSearch = d.donor.includes(search) || d.id.includes(search);
    const matchStatus = statusFilter === "all" || d.status === statusFilter;
    const matchType = typeFilter === "all" || d.type === typeFilter;
    return matchSearch && matchStatus && matchType;
  });

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Wallet className="w-6 h-6" style={{ color: "#D4A017" }} />
            إدارة التبرعات
          </h1>
          <p className="page-subtitle">متابعة وتوثيق جميع التبرعات الواردة للمؤسسة</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <Download className="w-4 h-4" /> تصدير Excel
          </Button>
          <Button size="sm" className="gap-2" style={{ background: "linear-gradient(135deg,#0d4d0d,#1a7d1a)" }}
            onClick={() => toast({ title: "قريباً", description: "سيتم إضافة نموذج تبرع جديد" })}>
            <Plus className="w-4 h-4" /> تبرع جديد
          </Button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "إجمالي التبرعات المؤكدة", value: `${(total / 1000).toFixed(0)}K ر.س`, icon: TrendingUp, color: "#D4A017", bg: "rgba(212,160,23,0.1)" },
          { label: "بانتظار التأكيد", value: `${(pending / 1000).toFixed(0)}K ر.س`, icon: Clock, color: "#1E90FF", bg: "rgba(30,144,255,0.1)" },
          { label: "حالات اليتامى المستفيدة", value: totalCases, icon: Users, color: "#166516", bg: "rgba(22,101,22,0.1)" },
          { label: "عدد المتبرعين", value: MOCK_DONATIONS.length, icon: DollarSign, color: "#a855f7", bg: "rgba(168,85,247,0.1)" },
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
              <Input placeholder="بحث باسم المتبرع أو رقم التبرع..." value={search} onChange={e => setSearch(e.target.value)} className="pr-10 rounded-xl" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-44 rounded-xl"><SelectValue placeholder="الحالة" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الحالات</SelectItem>
                <SelectItem value="confirmed">مؤكد</SelectItem>
                <SelectItem value="pending">بانتظار التأكيد</SelectItem>
                <SelectItem value="cancelled">ملغي</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-36 rounded-xl"><SelectValue placeholder="نوع المتبرع" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الجميع</SelectItem>
                <SelectItem value="فرد">فرد</SelectItem>
                <SelectItem value="شركة">شركة</SelectItem>
                <SelectItem value="مؤسسة">مؤسسة</SelectItem>
                <SelectItem value="صندوق">صندوق</SelectItem>
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
              <th>رقم التبرع</th>
              <th>المتبرع</th>
              <th>النوع</th>
              <th>المبلغ</th>
              <th>طريقة الدفع</th>
              <th>التاريخ</th>
              <th>الحالات المستفيدة</th>
              <th>الحالة</th>
              <th>إجراء</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(d => {
              const st = STATUS_MAP[d.status];
              const Icon = st.icon;
              return (
                <tr key={d.id} className="hover:bg-muted/30 transition-colors">
                  <td><span className="font-mono text-xs font-bold text-primary">{d.id}</span></td>
                  <td>
                    <div>
                      <p className="font-semibold text-sm">{d.donor}</p>
                      {d.note && <p className="text-xs text-muted-foreground">{d.note}</p>}
                    </div>
                  </td>
                  <td><span className={`tag ${TYPE_COLORS[d.type] || "bg-gray-50 text-gray-600"}`}>{d.type}</span></td>
                  <td><span className="font-bold text-sm" style={{ color: "#D4A017" }}>{d.amount.toLocaleString("ar-SA")} {d.currency}</span></td>
                  <td><span className="text-sm text-muted-foreground">{d.method}</span></td>
                  <td><span className="text-sm">{d.date}</span></td>
                  <td>
                    <div className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-sm font-medium">{d.cases}</span>
                    </div>
                  </td>
                  <td>
                    <span className={`flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full w-fit ${st.className}`}>
                      <Icon className="w-3 h-3" />{st.label}
                    </span>
                  </td>
                  <td>
                    <Button variant="ghost" size="sm" className="gap-1 text-xs h-8">
                      <Eye className="w-3.5 h-3.5" /> عرض
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">لا توجد نتائج</div>
        )}
      </div>
    </div>
  );
}
