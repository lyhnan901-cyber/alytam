import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Baby, Plus, Search, Phone, Mail, Eye, Edit, Trash2,
  Heart, GraduationCap, Stethoscope, Home, AlertTriangle,
  CheckCircle, Clock, Users, Download, Filter,
} from "lucide-react";
import { LeadForm } from "@/components/leads/LeadForm";
import { LeadKanban } from "@/components/leads/LeadKanban";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

interface Lead {
  id: string; name: string; email: string | null; phone: string | null;
  company: string | null; source: string; status: string;
  assigned_to: string | null; notes: string | null;
  estimated_value: number | null; interest: string[] | null;
  last_contact_at: string | null; next_followup_at: string | null;
  created_at: string; assignee?: { full_name: string } | null;
}

// مرحلة الحالة → تصنيف خيري
const STATUS_LABELS: Record<string, string> = {
  new: "حالة جديدة", contacted: "تم التواصل", qualified: "قيد الدراسة",
  proposal: "بانتظار الموافقة", negotiation: "جاري الدعم", won: "مدعومة", lost: "مغلقة",
};
const STATUS_BADGE: Record<string, string> = {
  new: "badge-new", contacted: "badge-progress", qualified: "badge-volunteer",
  proposal: "badge-progress", negotiation: "badge-approved", won: "badge-done", lost: "badge-rejected",
};
const STATUS_ICON: Record<string, any> = {
  new: AlertTriangle, contacted: Phone, qualified: GraduationCap,
  proposal: Clock, negotiation: Heart, won: CheckCircle, lost: AlertTriangle,
};

// مصدر الحالة → خيري
const SOURCE_LABELS: Record<string, string> = {
  website: "موقع المؤسسة", referral: "إحالة اجتماعية", social: "وسائل التواصل",
  ads: "حملة ميدانية", cold_call: "زيارة ميدانية", event: "فعالية خيرية", other: "أخرى",
};

// فئة الدعم (interest)
const INTEREST_ICONS: Record<string, any> = {
  "رعاية تعليمية": GraduationCap, "رعاية صحية": Stethoscope,
  "رعاية سكنية": Home, "كفالة شهرية": Heart,
};

function CaseTypeBadge({ type }: { type: string }) {
  const Icon = INTEREST_ICONS[type] || Baby;
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-green-50 text-green-700">
      <Icon className="w-3 h-3" />{type}
    </span>
  );
}

export default function Leads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("leads")
        .select(`*, assignee:profiles!leads_assigned_to_fkey(full_name)`)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setLeads(data || []);
    } catch (error: any) {
      toast({ title: "خطأ في جلب الحالات", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLeads(); }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذه الحالة؟")) return;
    try {
      const { error } = await supabase.from("leads").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "✅ تم حذف الحالة بنجاح" });
      fetchLeads();
    } catch (error: any) {
      toast({ title: "خطأ في الحذف", description: error.message, variant: "destructive" });
    }
  };

  const filtered = leads.filter(l => {
    const ms = l.name.includes(search) || l.phone?.includes(search) || l.company?.includes(search);
    const mst = statusFilter === "all" || l.status === statusFilter;
    return ms && mst;
  });

  const stats = {
    total: leads.length,
    new: leads.filter(l => l.status === "new").length,
    active: leads.filter(l => ["contacted","qualified","proposal","negotiation"].includes(l.status)).length,
    supported: leads.filter(l => l.status === "won").length,
    closed: leads.filter(l => l.status === "lost").length,
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Baby className="w-6 h-6 text-primary" /> حالات اليتامى والمستفيدين
          </h1>
          <p className="page-subtitle">متابعة وإدارة جميع حالات اليتامى والأسر المستفيدة</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2"><Download className="w-4 h-4" /> تصدير</Button>
          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2" style={{ background: "linear-gradient(135deg,#0d4d0d,#1a7d1a)" }}
                onClick={() => setEditingLead(null)}>
                <Plus className="w-4 h-4" /> حالة جديدة
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingLead ? "تعديل الحالة" : "إضافة حالة جديدة"}</DialogTitle>
              </DialogHeader>
              <LeadForm lead={editingLead} onSuccess={() => { setIsFormOpen(false); setEditingLead(null); fetchLeads(); }} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        {[
          { label: "إجمالي الحالات",     value: stats.total,     color: "#166516", bg: "rgba(22,101,22,0.1)",   icon: Baby },
          { label: "حالات جديدة",        value: stats.new,       color: "#1E90FF", bg: "rgba(30,144,255,0.1)",  icon: AlertTriangle },
          { label: "قيد المتابعة",       value: stats.active,    color: "#D4A017", bg: "rgba(212,160,23,0.1)", icon: Clock },
          { label: "تلقت الدعم",         value: stats.supported, color: "#22c55e", bg: "rgba(34,197,94,0.1)",  icon: CheckCircle },
          { label: "حالات مغلقة",        value: stats.closed,    color: "#94a3b8", bg: "rgba(148,163,184,0.1)", icon: Users },
        ].map(k => (
          <div key={k.label} className="kpi-card">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-2" style={{ background: k.bg }}>
              <k.icon className="w-4 h-4" style={{ color: k.color }} />
            </div>
            <p className="text-xl font-bold" style={{ color: k.color }}>{k.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{k.label}</p>
          </div>
        ))}
      </div>

      <Tabs defaultValue="table" className="w-full">
        <TabsList className="rounded-xl">
          <TabsTrigger value="table">جدول الحالات</TabsTrigger>
          <TabsTrigger value="kanban">عرض كانبان</TabsTrigger>
        </TabsList>

        <TabsContent value="table" className="space-y-4 mt-4">
          {/* Filters */}
          <div className="data-card">
            <div className="data-card-body">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="بحث بالاسم أو رقم الهاتف..." value={search} onChange={e => setSearch(e.target.value)} className="pr-10 rounded-xl" />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-48 rounded-xl"><SelectValue placeholder="الحالة" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع الحالات</SelectItem>
                    {Object.entries(STATUS_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
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
                  <th>اسم اليتيم / ولي الأمر</th>
                  <th>التواصل</th>
                  <th>المنطقة</th>
                  <th>نوع الدعم</th>
                  <th>المصدر</th>
                  <th>الحالة</th>
                  <th>المسؤول</th>
                  <th>قيمة الدعم</th>
                  <th>تاريخ التسجيل</th>
                  <th>إجراء</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={10} className="text-center py-12 text-muted-foreground">جاري التحميل...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={10} className="text-center py-12">
                    <Baby className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="text-muted-foreground">لا توجد حالات مطابقة</p>
                  </td></tr>
                ) : filtered.map(lead => {
                  const St = STATUS_ICON[lead.status] || Baby;
                  return (
                    <tr key={lead.id} className="cursor-pointer" onClick={() => navigate(`/leads/${lead.id}`)}>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="avatar-green w-8 h-8 text-sm rounded-lg">{lead.name.charAt(0)}</div>
                          <span className="font-semibold text-sm">{lead.name}</span>
                        </div>
                      </td>
                      <td>
                        <div className="space-y-0.5">
                          {lead.phone && <div className="flex items-center gap-1 text-xs"><Phone className="w-3 h-3" />{lead.phone}</div>}
                          {lead.email && <div className="flex items-center gap-1 text-xs text-muted-foreground"><Mail className="w-3 h-3" />{lead.email}</div>}
                        </div>
                      </td>
                      <td><span className="text-sm">{lead.company || "—"}</span></td>
                      <td>
                        {lead.interest?.length ? (
                          <div className="flex flex-wrap gap-1">
                            {lead.interest.slice(0,2).map(i => <CaseTypeBadge key={i} type={i} />)}
                          </div>
                        ) : "—"}
                      </td>
                      <td><span className="text-xs text-muted-foreground">{SOURCE_LABELS[lead.source] || lead.source}</span></td>
                      <td>
                        <span className={`flex items-center gap-1 w-fit text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_BADGE[lead.status]}`}>
                          <St className="w-3 h-3" />{STATUS_LABELS[lead.status]}
                        </span>
                      </td>
                      <td><span className="text-sm">{lead.assignee?.full_name || "—"}</span></td>
                      <td>
                        {lead.estimated_value
                          ? <span className="font-bold text-sm" style={{ color: "#D4A017" }}>{lead.estimated_value.toLocaleString("ar-SA")} ر.س</span>
                          : "—"}
                      </td>
                      <td><span className="text-xs text-muted-foreground">{format(new Date(lead.created_at), "dd MMM yyyy", { locale: ar })}</span></td>
                      <td onClick={e => e.stopPropagation()}>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => navigate(`/leads/${lead.id}`)}><Eye className="w-3.5 h-3.5" /></Button>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => { setEditingLead(lead); setIsFormOpen(true); }}><Edit className="w-3.5 h-3.5" /></Button>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleDelete(lead.id)}><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="kanban" className="mt-4">
          <LeadKanban leads={leads} onUpdate={fetchLeads} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
