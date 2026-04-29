import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import {
  Activity,
  Search,
  Filter,
  Loader2,
  Calendar,
  User,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getActivityLabel, getActivityIcon, ActivityTypes } from "@/lib/activity-logger";

interface ActivityLog {
  id: string;
  user_id: string;
  action_type: string;
  entity_type: string;
  entity_id: string | null;
  entity_title: string | null;
  metadata: unknown;
  created_at: string;
  user?: {
    full_name: string;
  };
}

interface Profile {
  id: string;
  full_name: string;
}

const actionTypeOptions = [
  { value: "all", label: "جميع الأنشطة" },
  { value: ActivityTypes.REQUEST_CREATED, label: "إنشاء طلب" },
  { value: ActivityTypes.TASK_CREATED, label: "إنشاء مهمة" },
  { value: ActivityTypes.TASK_STATUS_CHANGED, label: "تغيير حالة" },
  { value: ActivityTypes.TASK_ASSIGNED, label: "تعيين مهمة" },
  { value: ActivityTypes.TASK_APPROVED, label: "موافقة" },
  { value: ActivityTypes.TASK_COMPLETED, label: "إكمال مهمة" },
  { value: ActivityTypes.COMMENT_ADDED, label: "تعليق" },
  { value: ActivityTypes.TIME_LOGGED, label: "تسجيل وقت" },
  { value: ActivityTypes.DOCUMENT_CREATED, label: "إنشاء مستند" },
];

export default function ActivityLog() {
  const { isGeneralManager, role } = useAuth();
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [userFilter, setUserFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const canViewAllActivities = isGeneralManager || role === "ExecutiveManager" || role === "Supervisor";

  useEffect(() => {
    fetchActivities();
    if (canViewAllActivities) {
      fetchProfiles();
    }
  }, [userFilter, actionFilter, dateFrom, dateTo]);

  const fetchProfiles = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name")
      .eq("status", "active")
      .order("full_name");
    setProfiles(data || []);
  };

  const fetchActivities = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("activity_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (userFilter !== "all") {
        query = query.eq("user_id", userFilter);
      }

      if (actionFilter !== "all") {
        query = query.eq("action_type", actionFilter);
      }

      if (dateFrom) {
        query = query.gte("created_at", `${dateFrom}T00:00:00`);
      }

      if (dateTo) {
        query = query.lte("created_at", `${dateTo}T23:59:59`);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Fetch user profiles for the activities
      if (data && data.length > 0) {
        const userIds = [...new Set(data.map((a) => a.user_id))];
        const { data: users } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", userIds);

        const usersMap = new Map(users?.map((u) => [u.id, u]) || []);
        
        const activitiesWithUsers = data.map((activity) => ({
          ...activity,
          user: usersMap.get(activity.user_id),
        }));

        setActivities(activitiesWithUsers);
      } else {
        setActivities([]);
      }
    } catch (error) {
      console.error("Error fetching activities:", error);
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    setUserFilter("all");
    setActionFilter("all");
    setDateFrom("");
    setDateTo("");
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .substring(0, 2);
  };

  const formatDate = (date: string) => {
    const now = new Date();
    const activityDate = new Date(date);
    const diffMs = now.getTime() - activityDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "الآن";
    if (diffMins < 60) return `منذ ${diffMins} دقيقة`;
    if (diffHours < 24) return `منذ ${diffHours} ساعة`;
    if (diffDays < 7) return `منذ ${diffDays} يوم`;

    return format(activityDate, "d MMM yyyy - HH:mm", { locale: ar });
  };

  const getEntityBadgeColor = (entityType: string) => {
    switch (entityType) {
      case "request":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "task":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "comment":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
      case "time_entry":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
      case "document":
        return "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200";
      case "lead":
        return "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200";
      case "announcement":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" /> سجل الأنشطة
          </h1>
          <p className="page-subtitle">تتبع جميع العمليات والتغييرات داخل النظام</p>
        </div>
        <span className="text-xs font-medium px-2.5 py-1 rounded-full" style={{ background: "rgba(22,101,22,0.1)", color: "#166516" }}>{activities.length} نشاط</span>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="h-4 w-4" />
            الفلاتر
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {canViewAllActivities && (
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <User className="h-4 w-4" />
                  المستخدم
                </label>
                <Select value={userFilter} onValueChange={setUserFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="جميع المستخدمين" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع المستخدمين</SelectItem>
                    {profiles.map((profile) => (
                      <SelectItem key={profile.id} value={profile.id}>
                        {profile.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Activity className="h-4 w-4" />
                نوع النشاط
              </label>
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="جميع الأنشطة" />
                </SelectTrigger>
                <SelectContent>
                  {actionTypeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                من تاريخ
              </label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                dir="ltr"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                إلى تاريخ
              </label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                dir="ltr"
              />
            </div>

            <div className="flex items-end">
              <Button variant="outline" onClick={clearFilters} className="w-full">
                مسح الفلاتر
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Activities List */}
      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : activities.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>لا توجد أنشطة مسجلة</p>
            </div>
          ) : (
            <div className="space-y-4">
              {activities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start gap-4 p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                >
                  <Avatar className="h-10 w-10 shrink-0">
                    <AvatarFallback className="bg-primary/10 text-primary text-sm">
                      {activity.user
                        ? getInitials(activity.user.full_name)
                        : "؟"}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">
                        {activity.user?.full_name || "مستخدم"}
                      </span>
                      <span className="text-muted-foreground">
                        {getActivityLabel(activity.action_type)}
                      </span>
                      {activity.entity_title && (
                        <span className="font-medium text-primary truncate max-w-[200px]">
                          "{activity.entity_title}"
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge
                        variant="secondary"
                        className={getEntityBadgeColor(activity.entity_type)}
                      >
                        {activity.entity_type === "request" && "طلب"}
                        {activity.entity_type === "task" && "مهمة"}
                        {activity.entity_type === "comment" && "تعليق"}
                        {activity.entity_type === "time_entry" && "وقت"}
                        {activity.entity_type === "document" && "مستند"}
                        {activity.entity_type === "lead" && "حالة يتيم"}
                        {activity.entity_type === "announcement" && "تعميم"}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(activity.created_at)}
                      </span>
                    </div>
                  </div>

                  <div className="text-2xl shrink-0">
                    {getActivityIcon(activity.action_type)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
