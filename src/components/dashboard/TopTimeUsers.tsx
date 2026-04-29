import { useState, useEffect } from "react";
import { Users, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { formatMinutesToHours } from "@/lib/csv-export";
import { startOfWeek, endOfWeek } from "date-fns";

interface UserTimeEntry {
  user_id: string;
  full_name: string;
  department_name: string | null;
  total_minutes: number;
}

export function TopTimeUsers() {
  const [users, setUsers] = useState<UserTimeEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTopUsers();
  }, []);

  const fetchTopUsers = async () => {
    try {
      const now = new Date();
      const weekStart = startOfWeek(now, { weekStartsOn: 0 });
      const weekEnd = endOfWeek(now, { weekStartsOn: 0 });

      // Get time entries for this week with user and department info
      const { data, error } = await supabase
        .from("time_entries")
        .select(`
          user_id,
          duration_minutes,
          start_time,
          profiles!inner(id, full_name, department_id, departments(name))
        `)
        .not("duration_minutes", "is", null)
        .gte("start_time", weekStart.toISOString())
        .lte("start_time", weekEnd.toISOString());

      if (error) throw error;

      // Aggregate by user
      const userMap = new Map<string, { 
        fullName: string; 
        departmentName: string | null;
        totalMinutes: number 
      }>();

      (data || []).forEach((entry: any) => {
        const userId = entry.user_id;
        const existing = userMap.get(userId);
        if (existing) {
          existing.totalMinutes += entry.duration_minutes || 0;
        } else {
          userMap.set(userId, {
            fullName: entry.profiles?.full_name || "مستخدم غير معروف",
            departmentName: entry.profiles?.departments?.name || null,
            totalMinutes: entry.duration_minutes || 0,
          });
        }
      });

      // Convert to array and sort
      const sortedUsers = Array.from(userMap.entries())
        .map(([id, data]) => ({
          user_id: id,
          full_name: data.fullName,
          department_name: data.departmentName,
          total_minutes: data.totalMinutes,
        }))
        .sort((a, b) => b.total_minutes - a.total_minutes)
        .slice(0, 5);

      setUsers(sortedUsers);
    } catch (error) {
      console.error("Error fetching top users:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            أكثر المستخدمين نشاطًا (هذا الأسبوع)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="h-4 w-4" />
          أكثر المستخدمين نشاطًا (هذا الأسبوع)
        </CardTitle>
      </CardHeader>
      <CardContent>
        {users.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            لا توجد بيانات وقت مسجلة هذا الأسبوع
          </p>
        ) : (
          <div className="space-y-3">
            {users.map((user, index) => (
              <div
                key={user.user_id}
                className="flex items-center justify-between gap-2"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span className="text-xs font-medium text-muted-foreground w-5">
                    {index + 1}.
                  </span>
                  <Avatar className="h-7 w-7">
                    <AvatarFallback className="text-xs">
                      {user.full_name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-sm truncate">{user.full_name}</p>
                    {user.department_name && (
                      <p className="text-xs text-muted-foreground truncate">
                        {user.department_name}
                      </p>
                    )}
                  </div>
                </div>
                <span className="text-sm font-medium text-primary whitespace-nowrap">
                  {formatMinutesToHours(user.total_minutes)}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
