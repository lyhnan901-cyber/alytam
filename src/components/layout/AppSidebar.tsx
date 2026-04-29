import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, FileText, CheckSquare, Users, Building2,
  Settings, ChevronLeft, ChevronRight, Shield, LogOut, User,
  LayoutGrid, CalendarDays, BookOpen, BarChart3, Heart,
  Package, Megaphone, Activity, UsersRound, KeyRound,
  HandHeart, Baby, Wallet, Bell, Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";

interface AppSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

const MENU_GROUPS = [
  {
    label: "الرئيسية",
    items: [
      { icon: LayoutDashboard, label: "لوحة التحكم",     path: "/",              roles: null },
    ],
  },
  {
    label: "إدارة العمليات",
    items: [
      { icon: Baby,            label: "حالات اليتامى",    path: "/leads",         roles: null },
      { icon: FileText,        label: "الطلبات",           path: "/requests",      roles: null },
      { icon: CheckSquare,     label: "المهام",            path: "/tasks",         roles: null },
      { icon: Wallet,          label: "التبرعات",          path: "/donations",     roles: null },
      { icon: HandHeart,       label: "المتطوعون",         path: "/marketing",     roles: null },
      { icon: Package,         label: "المخازن",           path: "/inventory",     roles: null },
    ],
  },
  {
    label: "عروض المهام",
    items: [
      { icon: LayoutGrid,      label: "كانبان",            path: "/tasks/board",   roles: null },
      { icon: CalendarDays,    label: "تقويم",             path: "/tasks/calendar",roles: null },
    ],
  },
  {
    label: "التقارير",
    items: [
      { icon: BarChart3,       label: "تقريري",            path: "/my-report",     roles: null },
      { icon: UsersRound,      label: "تقرير الموظفين",    path: "/reports/employees", roles: ["GeneralManager","ExecutiveManager","Supervisor","DepartmentHead"] },
      { icon: Building2,       label: "تقارير الأقسام",   path: "/reports/departments", roles: ["GeneralManager","ExecutiveManager","Supervisor"] },
      { icon: Heart,           label: "تقرير المستفيدين", path: "/reports/beneficiaries", roles: ["GeneralManager","ExecutiveManager","Supervisor"] },
      { icon: BarChart3,       label: "التقرير الشامل",   path: "/reports/comprehensive", roles: ["GeneralManager","ExecutiveManager"] },
      { icon: FileText,        label: "تقرير المدير العام",path: "/reports/gm",   roles: ["GeneralManager"] },
    ],
  },
  {
    label: "الإدارة",
    items: [
      { icon: BookOpen,        label: "المستندات",         path: "/docs",          roles: null },
      { icon: Users,           label: "الموظفون والمتطوعون", path: "/users",       roles: ["GeneralManager","ExecutiveManager","Supervisor"] },
      { icon: Activity,        label: "سجل الأنشطة",      path: "/activity-log",  roles: ["GeneralManager","ExecutiveManager","Supervisor"] },
      { icon: Building2,       label: "الأقسام",           path: "/departments",   roles: ["GeneralManager"] },
      { icon: Megaphone,       label: "التعميمات",         path: "/announcements", roles: ["GeneralManager"] },
      { icon: Shield,          label: "الصلاحيات",         path: "/roles",         roles: ["GeneralManager"] },
      { icon: KeyRound,        label: "إدارة الأذونات",   path: "/permissions",   roles: ["GeneralManager"] },
      { icon: Settings,        label: "الإعدادات",         path: "/settings",      roles: null },
    ],
  },
];

function getJobTitle(role: string | null): string {
  const titles: Record<string, string> = {
    GeneralManager:    "المدير العام",
    ExecutiveManager:  "نائب المدير التنفيذي",
    Supervisor:        "مشرف الأقسام",
    DepartmentHead:    "رئيس القسم",
    CustomerService:   "خدمة المستفيدين",
    Employee:          "موظف",
  };
  return titles[role || ""] || "مستخدم";
}

export function AppSidebar({ collapsed, onToggle }: AppSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, role, signOut, isGeneralManager } = useAuth();

  const hasAccess = (roles: string[] | null) => {
    if (!roles) return true;
    return roles.includes(role || "");
  };

  const isActive = (path: string) =>
    path === "/" ? location.pathname === "/" : location.pathname.startsWith(path);

  return (
    <aside
      className={cn(
        "bg-sidebar text-sidebar-foreground flex flex-col transition-all duration-300 ease-in-out relative h-full select-none",
        collapsed ? "w-[72px]" : "w-[268px]"
      )}
    >
      {/* ── Logo ─────────────────────────────── */}
      <div className={cn(
        "flex items-center border-b border-sidebar-border shrink-0",
        collapsed ? "h-16 justify-center px-4" : "h-20 gap-3 px-5"
      )}>
        {/* Icon */}
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 animate-pulse-gold"
          style={{ background: "rgba(212,160,23,0.15)", border: "1.5px solid rgba(212,160,23,0.35)" }}>
          <Heart className="w-5 h-5" style={{ color: "#D4A017" }} />
        </div>

        {!collapsed && (
          <div className="overflow-hidden">
            <h1 className="font-bold text-sm leading-snug text-sidebar-foreground truncate">
              مؤسسة اليتامى
            </h1>
            <p className="text-xs font-medium truncate" style={{ color: "#D4A017" }}>
              الخيرية التنموية
            </p>
            <p className="text-[10px] text-sidebar-foreground/40 truncate">
              رعاية اليوم لبناء الغد
            </p>
          </div>
        )}
      </div>

      {/* ── Toggle ───────────────────────────── */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onToggle}
        className="absolute top-5 -left-3.5 z-20 w-7 h-7 rounded-full border
                   text-white hover:text-white hidden lg:flex
                   transition-all duration-200 hover:scale-110"
        style={{ background: "rgba(212,160,23,0.9)", borderColor: "rgba(212,160,23,0.4)" }}
      >
        {collapsed
          ? <ChevronRight className="w-3.5 h-3.5" />
          : <ChevronLeft  className="w-3.5 h-3.5" />}
      </Button>

      {/* ── Search (Expanded only) ───────────── */}
      {!collapsed && (
        <div className="px-3 pt-3 pb-1">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer
                          transition-colors hover:bg-sidebar-accent/60"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <Search className="w-3.5 h-3.5 text-sidebar-foreground/40 shrink-0" />
            <span className="text-xs text-sidebar-foreground/40">بحث سريع...</span>
            <kbd className="mr-auto text-[10px] px-1.5 py-0.5 rounded text-sidebar-foreground/30"
              style={{ background: "rgba(255,255,255,0.06)" }}>
              /
            </kbd>
          </div>
        </div>
      )}

      {/* ── Navigation ───────────────────────── */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-2 px-2">
        {MENU_GROUPS.map((group) => {
          const visibleItems = group.items.filter(item => hasAccess(item.roles));
          if (visibleItems.length === 0) return null;

          return (
            <div key={group.label} className="mb-1">
              {/* Group label */}
              {!collapsed && (
                <p className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-sidebar-foreground/35">
                  {group.label}
                </p>
              )}

              <ul className="space-y-0.5">
                {visibleItems.map((item) => {
                  const active = isActive(item.path);
                  const Icon = item.icon;

                  const link = (
                    <NavLink
                      to={item.path}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 group relative",
                        collapsed && "justify-center",
                        active
                          ? "bg-sidebar-accent font-semibold text-sidebar-foreground"
                          : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                      )}
                    >
                      {/* Active indicator */}
                      {active && !collapsed && (
                        <span className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full"
                          style={{ background: "#D4A017" }} />
                      )}

                      {/* Icon */}
                      <Icon className={cn(
                        "w-4 h-4 shrink-0 transition-transform duration-150",
                        active ? "text-sidebar-foreground" : "text-sidebar-foreground/60",
                        "group-hover:scale-110"
                      )} />

                      {/* Label */}
                      {!collapsed && (
                        <span className="text-sm truncate">{item.label}</span>
                      )}

                      {/* Active dot (collapsed) */}
                      {active && collapsed && (
                        <span className="absolute -left-1 top-1/2 -translate-y-1/2 w-1 h-4 rounded-r-full"
                          style={{ background: "#D4A017" }} />
                      )}
                    </NavLink>
                  );

                  return (
                    <li key={item.path}>
                      {collapsed ? (
                        <Tooltip>
                          <TooltipTrigger asChild>{link}</TooltipTrigger>
                          <TooltipContent side="left" className="font-tajawal">
                            {item.label}
                          </TooltipContent>
                        </Tooltip>
                      ) : link}
                    </li>
                  );
                })}
              </ul>

              {/* Group Divider */}
              {!collapsed && (
                <div className="mx-3 mt-2 mb-1 h-px"
                  style={{ background: "rgba(255,255,255,0.05)" }} />
              )}
            </div>
          );
        })}
      </nav>

      {/* ── User Section ────────────────────── */}
      <div className="p-3 border-t border-sidebar-border shrink-0">
        <div
          className={cn(
            "flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-200",
            "hover:bg-sidebar-accent/60",
            collapsed && "justify-center",
          )}
          style={{ background: "rgba(255,255,255,0.05)" }}
          onClick={() => navigate("/profile")}
        >
          {/* Avatar */}
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 font-bold text-sm"
            style={{ background: "linear-gradient(135deg, #D4A017, #e0b53a)", color: "#052605" }}>
            {profile?.full_name?.charAt(0) || "م"}
          </div>

          {!collapsed && (
            <>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-sidebar-foreground truncate">
                  {profile?.full_name || "مستخدم"}
                </p>
                <p className="text-xs text-sidebar-foreground/50 truncate">
                  {getJobTitle(role)}
                </p>
              </div>

              <div className="flex gap-0.5">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon"
                      onClick={e => { e.stopPropagation(); navigate("/profile"); }}
                      className="w-7 h-7 text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent rounded-lg">
                      <User className="w-3.5 h-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>الملف الشخصي</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon"
                      onClick={e => { e.stopPropagation(); signOut(); }}
                      className="w-7 h-7 text-sidebar-foreground/50 hover:text-red-400 hover:bg-red-500/10 rounded-lg">
                      <LogOut className="w-3.5 h-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>تسجيل الخروج</TooltipContent>
                </Tooltip>
              </div>
            </>
          )}
        </div>
      </div>
    </aside>
  );
}
