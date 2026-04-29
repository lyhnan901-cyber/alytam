import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Activity, ArrowLeft, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { getActivityLabel, getActivityIcon } from "@/lib/activity-logger";

interface ActivityLog {
  id: string;
  user_id: string;
  action_type: string;
  entity_type: string;
  entity_id: string | null;
  entity_title: string | null;
  created_at: string;
  user?: {
    full_name: string;
  };
}

export function RecentActivities() {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActivities();
  }, []);

  const fetchActivities = async () => {
    try {
      const { data, error } = await supabase
        .from("activity_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(8);

      if (error) throw error;

      if (data && data.length > 0) {
        const userIds = [...new Set(data.map((a) => a.user_id))];
        const { data: users } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", userIds);

        const usersMap = new Map(users?.map((u) => [u.id, u]) || []);
        
        setActivities(
          data.map((activity) => ({
            ...activity,
            user: usersMap.get(activity.user_id),
          }))
        );
      } else {
        setActivities([]);
      }
    } catch (error) {
      console.error("Error fetching activities:", error);
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .substring(0, 2);
  };

  const formatTime = (date: string) => {
    const now = new Date();
    const activityDate = new Date(date);
    const diffMs = now.getTime() - activityDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);

    if (diffMins < 1) return "الآن";
    if (diffMins < 60) return `منذ ${diffMins} د`;
    if (diffHours < 24) return `منذ ${diffHours} س`;

    return `منذ ${Math.floor(diffHours / 24)} ي`;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Activity className="h-4 w-4" />
          أحدث الأنشطة
        </CardTitle>
        <Button variant="ghost" size="sm" asChild>
          <Link to="/activity-log" className="flex items-center gap-1 text-xs">
            عرض الكل
            <ArrowLeft className="h-3 w-3" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : activities.length === 0 ? (
          <p className="text-center text-muted-foreground text-sm py-8">
            لا توجد أنشطة حتى الآن
          </p>
        ) : (
          <div className="space-y-3">
            {activities.map((activity) => (
              <div
                key={activity.id}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="text-lg shrink-0">
                  {getActivityIcon(activity.action_type)}
                </div>
                <Avatar className="h-7 w-7 shrink-0">
                  <AvatarFallback className="text-xs bg-primary/10 text-primary">
                    {activity.user
                      ? getInitials(activity.user.full_name)
                      : "؟"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">
                    <span className="font-medium">
                      {activity.user?.full_name || "مستخدم"}
                    </span>{" "}
                    <span className="text-muted-foreground">
                      {getActivityLabel(activity.action_type)}
                    </span>
                  </p>
                  {activity.entity_title && (
                    <p className="text-xs text-muted-foreground truncate">
                      {activity.entity_title}
                    </p>
                  )}
                </div>
                <span className="text-xs text-muted-foreground shrink-0">
                  {formatTime(activity.created_at)}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
