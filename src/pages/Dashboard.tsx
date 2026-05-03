import { useState, useEffect, useRef } from "react";
import {
  Heart, Baby, HandHeart, Wallet, Package, CheckSquare,
  FileText, Clock, AlertTriangle, Users, TrendingUp,
  Loader2, ArrowUpRight, ArrowDownRight, Activity,
  Calendar, Star, Target,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { checkOverdueTasks } from "@/lib/automation";
import { RecentActivities } from "@/components/dashboard/RecentActivities";
import { TasksByStatus } from "@/components/dashboard/TasksByStatus";
import { TodayTasks } from "@/components/dashboard/TodayTasks";

/* ─── Types ────────────────────────────────────── */
interface Stats {
  openRequests:    number;
  activeCases:     number;
  inProgressTasks: number;
  completedTasks:  number;
  overdueTasks:    number;
  totalUsers:      number;
  completionRate:  number;
}

/* ─── KPI Card Component ──────────────────────── */
function KPI({
  icon: Icon, title, value, subtitle, color, bg, trend, trendVal,
}: {
  icon: any; title: string; value: number | string; subtitle?: string;
  color: string; bg: string; trend?: "up" | "down" | "neutral"; trendVal?: string;
}) {
  return (
    <div className="kpi-card group animate-fade-in">
      {/* Icon */}
      <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4 transition-transform duration-200 group-hover:scale-110"
        style={{ background: bg }}>
        <Icon className="w-5 h-5" style={{ color }} />
      </div>

      {/* Value */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-2xl font-bold tracking-tight" style={{ color }}>
            {typeof value === "number" ? value.toLocaleString("ar-SA") : value}
          </p>
          <p className="text-sm font-semibold text-foreground mt-0.5">{title}</p>
          {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>

        {trend && trendVal && (
          <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold ${
            trend === "up"   ? "bg-green-50 text-green-600" :
            trend === "down" ? "bg-red-50 text-red-600" :
                               "bg-slate-50 text-slate-500"
          }`}>
            {trend === "up"   && <ArrowUpRight className="w-3 h-3" />}
            {trend === "down" && <ArrowDownRight className="w-3 h-3" />}
            {trendVal}
          </div>
        )}
      </div>

      {/* Bottom accent line */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-b-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-200"
        style={{ background: color }} />
    </div>
  );
}

/* ─── Quick Action Button ─────────────────────── */
function QuickAction({ icon: Icon, label, path, color, bg }: {
  icon: any; label: string; path: string; color: string; bg: string;
}) {
  return (
    <a href={path} className="quick-action group">
      <div className="quick-action-icon group-hover:scale-110 transition-transform duration-200"
        style={{ background: bg }}>
        <Icon className="w-5 h-5" style={{ color }} />
      </div>
      <span className="text-xs font-semibold text-foreground/80">{label}</span>
    </a>
  );
}

/* ─── Progress Bar ────────────────────────────── */
function Progress({ label, value, max, color }: {
  label: string; value: number; max: number; color: string;
}) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-foreground/80">{label}</span>
        <span className="font-bold" style={{ color }}>{value.toLocaleString("ar-SA")}</span>
      </div>
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   Dashboard Page
   ═══════════════════════════════════════════════ */
export default function Dashboard() {
  const [stats, setStats] = useState<Stats>({
    openRequests: 0, activeCases: 0, inProgressTasks: 0,
    completedTasks: 0, overdueTasks: 0, totalUsers: 0, completionRate: 0,
  });
  const [loading, setLoading] = useState(true);
  const { profile, role, user } = useAuth();
  const overdueCheckDone = useRef(false);

  // Check overdue tasks once
  useEffect(() => {
    if (user && !overdueCheckDone.current) {
      overdueCheckDone.current = true;
      checkOverdueTasks(user.id).catch(console.error);
    }
  }, [user]);

  useEffect(() => {
    const fetchStats = async () => {
      if (!profile) return;
      try {
        const today = new Date().toISOString().split("T")[0];
        const userId = profile.id;
        const deptId = profile.department_id;
        const isEmployee = role === "Employee";
        const isDeptHead = role === "DepartmentHead";

        let taskFilter = (q: any) => isEmployee
          ? q.eq("assignee_id", userId)
          : isDeptHead && deptId
            ? q.eq("department_id", deptId)
            : q;

        const [
          { count: openRequests },
          { count: activeCases },
          { count: inProgressTasks },
          { count: completedTasks },
          { count: overdueTasks },
          { count: totalTasks },
          { count: totalUsers },
        ] = await Promise.all([
          supabase.from("requests").select("*", { count: "exact", head: true }).neq("status", "Closed"),
          supabase.from("requests").select("*", { count: "exact", head: true }).eq("status", "InProgress"),
          taskFilter(supabase.from("tasks").select("*", { count: "exact", head: true })).eq("status", "InProgress"),
          taskFilter(supabase.from("tasks").select("*", { count: "exact", head: true })).in("status", ["Completed", "Approved"]),
          taskFilter(supabase.from("tasks").select("*", { count: "exact", head: true })).lt("due_date", today).not("status", "in", '("Completed","Approved")'),
          taskFilter(supabase.from("tasks").select("*", { count: "exact", head: true })),
          supabase.from("profiles").select("*", { count: "exact", head: true }).eq("status", "active"),
        ]);

        setStats({
          openRequests:    openRequests    || 0,
          activeCases:     activeCases     || 0,
          inProgressTasks: inProgressTasks || 0,
          completedTasks:  completedTasks  || 0,
          overdueTasks:    overdueTasks    || 0,
          totalUsers:      totalUsers      || 0,
          completionRate:  totalTasks
            ? Math.round(((completedTasks || 0) / totalTasks) * 100)
            : 0,
        });
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [profile, role]);

  const now = new Date();
  const greet = now.getHours() < 12 ? "صباح الخير" : now.getHours() < 17 ? "مساء الخير" : "مساء النور";
  const dateStr = now.toLocaleDateString("ar-SA-u-ca-islamic", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] gap-4">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
          style={{ background: "linear-gradient(135deg, #052605, #166516)" }}>
          <Heart className="w-7 h-7 text-white animate-pulse" />
        </div>
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">جاري تحميل البيانات...</p>
      </div>
    );
  }

  return (
    <div className="page-container">

      {/* ── Welcome Header ─────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4
                      p-6 rounded-2xl border overflow-hidden relative"
        style={{ background: "linear-gradient(135deg, #052605 0%, #0d4d0d 50%, #166516 100%)" }}>

        {/* Decorative */}
        <div className="absolute top-0 left-0 w-64 h-64 rounded-full opacity-10 pointer-events-none"
          style={{ background: "radial-gradient(circle, #D4A017, transparent)", transform: "translate(-40%, -40%)" }} />
        <div className="absolute bottom-0 right-0 w-48 h-48 rounded-full opacity-8 pointer-events-none"
          style={{ background: "radial-gradient(circle, #4db84d, transparent)", transform: "translate(40%, 40%)" }} />

        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#D4A017" }} />
            <span className="text-xs text-white/50">{dateStr}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">
            {greet}، {profile?.full_name?.split(" ")[0] || "مرحباً"} 👋
          </h1>
          <p className="text-sm text-white/60 mt-0.5">
            إليك ملخص عمليات مؤسسة اليتامى اليوم
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-3">
          <div className="px-4 py-2 rounded-xl text-center"
            style={{ background: "rgba(212,160,23,0.15)", border: "1px solid rgba(212,160,23,0.3)" }}>
            <p className="text-2xl font-bold" style={{ color: "#D4A017" }}>
              {stats.completionRate}%
            </p>
            <p className="text-xs text-white/60">نسبة الإنجاز</p>
          </div>
          <div className="px-4 py-2 rounded-xl text-center"
            style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}>
            <p className="text-2xl font-bold text-white">
              {stats.totalUsers}
            </p>
            <p className="text-xs text-white/60">مستخدم نشط</p>
          </div>
        </div>
      </div>

      {/* ── 7 KPI Cards ─────────────────────────── */}
      {/* ملاحظة: نسب التغير (trend/trendVal) كانت قيماً ثابتة في الكود ولا تُمثّل
         مقارنة زمنية حقيقية، فأُزيلت حتى لا تظهر بيانات مضلّلة. عند ربط مؤشرات
         تاريخية فعلية لاحقاً، يمكن إعادة إضافتها بقيم محسوبة من قاعدة البيانات. */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4">
        <KPI icon={Baby}         title="حالات اليتامى"   value={stats.activeCases}     color="#166516" bg="rgba(22,101,22,0.1)"  />
        <KPI icon={Wallet}       title="الطلبات الفعالة" value={stats.openRequests}    color="#D4A017" bg="rgba(212,160,23,0.1)" />
        <KPI icon={CheckSquare}  title="قيد التنفيذ"     value={stats.inProgressTasks} color="#1E90FF" bg="rgba(30,144,255,0.1)" />
        <KPI icon={Heart}        title="مكتملة"          value={stats.completedTasks}  color="#1a7d1a" bg="rgba(26,125,26,0.1)" />
        <KPI icon={AlertTriangle}title="متأخرة"          value={stats.overdueTasks}    color="#ef4444" bg="rgba(239,68,68,0.1)" />
        <KPI icon={HandHeart}    title="المتطوعون"       value={0}                     color="#a855f7" bg="rgba(168,85,247,0.1)" />
        <KPI icon={Target}       title="الإنجاز"         value={`${stats.completionRate}%`} color="#D4A017" bg="rgba(212,160,23,0.1)" />
      </div>

      {/* ── Quick Actions ────────────────────────── */}
      <div className="data-card">
        <div className="data-card-header">
          <h2 className="data-card-title">⚡ إجراءات سريعة</h2>
        </div>
        <div className="data-card-body">
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            <QuickAction icon={Baby}        label="حالة جديدة"     path="/leads"      color="#166516" bg="rgba(22,101,22,0.08)" />
            <QuickAction icon={CheckSquare} label="مهمة جديدة"     path="/tasks"      color="#1E90FF" bg="rgba(30,144,255,0.08)" />
            <QuickAction icon={Wallet}      label="تبرع جديد"      path="/donations"  color="#D4A017" bg="rgba(212,160,23,0.08)" />
            <QuickAction icon={HandHeart}   label="تسجيل متطوع"    path="/marketing"  color="#a855f7" bg="rgba(168,85,247,0.08)" />
            <QuickAction icon={Package}     label="إضافة مخزون"    path="/inventory"  color="#f97316" bg="rgba(249,115,22,0.08)" />
            <QuickAction icon={FileText}    label="طلب جديد"       path="/requests"   color="#0ea5e9" bg="rgba(14,165,233,0.08)" />
            <QuickAction icon={Activity}    label="سجل الأنشطة"    path="/activity-log" color="#6366f1" bg="rgba(99,102,241,0.08)" />
          </div>
        </div>
      </div>

      {/* ── Charts Row ──────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <TasksByStatus />
        <TodayTasks />
        <div className="data-card">
          <div className="data-card-header">
            <h2 className="data-card-title">📊 توزيع المهام حسب الحالة</h2>
          </div>
          <div className="data-card-body space-y-4">
            {/* محسوب من جدول tasks. الفئات الديكورية القديمة (توزيع المساعدات /
               الرعاية التعليمية / الفعاليات الميدانية ...) لم تكن موجودة في
               قاعدة البيانات وكانت أرقاماً ثابتة في الكود، فاستُبدلت بحالات
               المهام الفعلية. */}
            <Progress label="قيد التنفيذ" value={stats.inProgressTasks} max={Math.max(stats.inProgressTasks + stats.completedTasks + stats.overdueTasks, 1)} color="#1E90FF" />
            <Progress label="مكتملة"      value={stats.completedTasks}  max={Math.max(stats.inProgressTasks + stats.completedTasks + stats.overdueTasks, 1)} color="#1a7d1a" />
            <Progress label="متأخرة"      value={stats.overdueTasks}    max={Math.max(stats.inProgressTasks + stats.completedTasks + stats.overdueTasks, 1)} color="#ef4444" />
            <Progress label="طلبات فعالة" value={stats.activeCases}     max={Math.max(stats.activeCases + stats.openRequests, 1)} color="#D4A017" />
            <Progress label="طلبات مفتوحة" value={stats.openRequests}   max={Math.max(stats.activeCases + stats.openRequests, 1)} color="#166516" />
          </div>
        </div>
        <div className="data-card">
          <div className="data-card-header">
            <h2 className="data-card-title">🎯 مؤشرات الأداء</h2>
          </div>
          <div className="data-card-body space-y-4">
            {/* المؤشرات الثلاثة الأخيرة (رضا المتبرعين / تحسن الحالات / المتطوعون
               النشطون) كانت قيماً ثابتة في الكود ولا يوجد لها مصدر بيانات في
               القاعدة، فأُزيلت. يبقى مؤشر إنجاز المهام لأنه محسوب فعلياً. عند
               توفر استبيانات أو مؤشرات حقيقية لاحقاً، أضِفها هنا بقيمها
               الفعلية. */}
            {[
              { label: "نسبة إنجاز المهام", value: stats.completionRate, target: 100, color: "#1a7d1a" },
            ].map(({ label, value, target, color }) => (
              <div key={label}>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-medium text-foreground/80">{label}</span>
                  <span className="font-bold" style={{ color }}>
                    {value}% / {target}%
                  </span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${(value / target) * 100}%`, background: color }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Activity + Calendar ─────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <RecentActivities />
        </div>
        <div className="data-card">
          <div className="data-card-header">
            <h2 className="data-card-title">📅 مواعيد اليوم</h2>
            <Calendar className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="data-card-body space-y-3">
            {/* قائمة المواعيد فاضية: لا يوجد جدول مواعيد/تقويم في قاعدة البيانات
               حالياً، والمواعيد القديمة كانت ثابتة في الكود. يُعرض الـ empty
               state أدناه. عند إضافة جدول calendar/appointments لاحقاً، عبّئ
               هذا المصفوف من استعلام Supabase. */}
            {([] as Array<{ time: string; title: string; type: string; icon: any }>).map(({ time, title, type, icon: I }) => (
              <div key={time} className="flex items-start gap-3">
                <div className="mt-0.5 w-14 text-center px-2 py-1 rounded-lg shrink-0"
                  style={{ background: "rgba(22,101,22,0.06)" }}>
                  <span className="text-xs font-bold" style={{ color: "#166516" }}>{time}</span>
                </div>
                <div className={`flex-1 flex items-center gap-2 p-2.5 rounded-xl border text-sm
                  ${type === "urgent" ? "bg-red-50 border-red-100" :
                    type === "case"   ? "bg-green-50 border-green-100" :
                    type === "volunteer" ? "bg-purple-50 border-purple-100" :
                    type === "donation"  ? "bg-amber-50 border-amber-100" :
                                          "bg-slate-50 border-slate-100"}`}>
                  <I className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                  <span className="font-medium text-foreground/80 leading-tight">{title}</span>
                </div>
              </div>
            ))}
            <div className="text-center py-6 text-sm text-muted-foreground">
              لا توجد مواعيد لعرضها
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
