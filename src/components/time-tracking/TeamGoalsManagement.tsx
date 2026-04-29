import { useState, useEffect } from "react";
import { Users, Target, Save, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { startOfWeek, endOfWeek } from "date-fns";

interface TeamMember {
  id: string;
  full_name: string;
  email: string;
  department_id: string | null;
  goalMinutes: number;
  actualMinutes: number;
}

interface TeamGoalsManagementProps {
  departmentId?: string | null;
}

export function TeamGoalsManagement({ departmentId }: TeamGoalsManagementProps) {
  const { user, role } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [editedGoals, setEditedGoals] = useState<Record<string, string>>({});

  const isManager = ["GeneralManager", "ExecutiveManager", "Supervisor", "DepartmentHead"].includes(role || "");

  useEffect(() => {
    if (user && isManager) {
      fetchTeamData();
    }
  }, [user, isManager, departmentId]);

  const fetchTeamData = async () => {
    try {
      const now = new Date();
      const weekStart = startOfWeek(now, { weekStartsOn: 0 });
      const weekEnd = endOfWeek(now, { weekStartsOn: 0 });

      // Build query based on role
      let profilesQuery = supabase.from("profiles").select("id, full_name, email, department_id");
      
      if (role === "DepartmentHead" && departmentId) {
        profilesQuery = profilesQuery.eq("department_id", departmentId);
      }

      const { data: profiles, error: profilesError } = await profilesQuery;
      if (profilesError) throw profilesError;

      // Fetch all goals
      const { data: goals } = await supabase
        .from("weekly_time_goals")
        .select("user_id, target_minutes");

      // Fetch time entries for this week
      const { data: timeEntries } = await supabase
        .from("time_entries")
        .select("user_id, duration_minutes")
        .not("duration_minutes", "is", null)
        .gte("start_time", weekStart.toISOString())
        .lte("start_time", weekEnd.toISOString());

      // Build goals map
      const goalsMap = new Map<string, number>();
      (goals || []).forEach((g) => goalsMap.set(g.user_id, g.target_minutes));

      // Build time map
      const timeMap = new Map<string, number>();
      (timeEntries || []).forEach((t) => {
        const current = timeMap.get(t.user_id) || 0;
        timeMap.set(t.user_id, current + (t.duration_minutes || 0));
      });

      // Combine data
      const members: TeamMember[] = (profiles || []).map((p) => ({
        id: p.id,
        full_name: p.full_name,
        email: p.email,
        department_id: p.department_id,
        goalMinutes: goalsMap.get(p.id) || 2400,
        actualMinutes: timeMap.get(p.id) || 0,
      }));

      setTeamMembers(members);
      
      // Initialize edited goals
      const initialGoals: Record<string, string> = {};
      members.forEach((m) => {
        initialGoals[m.id] = String(Math.round(m.goalMinutes / 60));
      });
      setEditedGoals(initialGoals);
    } catch (error) {
      console.error("Error fetching team data:", error);
      toast.error("فشل في تحميل بيانات الفريق");
    } finally {
      setLoading(false);
    }
  };

  const saveGoal = async (memberId: string) => {
    const hours = parseFloat(editedGoals[memberId] || "40");
    if (isNaN(hours) || hours <= 0 || hours > 168) {
      toast.error("يرجى إدخال عدد ساعات صالح (1-168)");
      return;
    }

    setSaving(memberId);
    try {
      const targetMinutes = Math.round(hours * 60);

      const { error } = await supabase
        .from("weekly_time_goals")
        .upsert(
          { user_id: memberId, target_minutes: targetMinutes },
          { onConflict: "user_id" }
        );

      if (error) throw error;

      setTeamMembers((prev) =>
        prev.map((m) =>
          m.id === memberId ? { ...m, goalMinutes: targetMinutes } : m
        )
      );

      toast.success("تم حفظ الهدف بنجاح");
    } catch (error) {
      console.error("Error saving goal:", error);
      toast.error("فشل في حفظ الهدف");
    } finally {
      setSaving(null);
    }
  };

  const formatTime = (minutes: number) => {
    const hours = (minutes / 60).toFixed(1);
    return `${hours}س`;
  };

  if (!isManager) {
    return null;
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            إدارة أهداف الفريق
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-8">
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
          إدارة أهداف الفريق
          <span className="text-muted-foreground font-normal text-sm">
            ({teamMembers.length} عضو)
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {teamMembers.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            لا يوجد أعضاء في الفريق
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">العضو</TableHead>
                  <TableHead className="text-right">الهدف (ساعات)</TableHead>
                  <TableHead className="text-right">المسجل</TableHead>
                  <TableHead className="text-right">التقدم</TableHead>
                  <TableHead className="text-right w-24">إجراء</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teamMembers.map((member) => {
                  const progress = Math.min(
                    100,
                    Math.round((member.actualMinutes / member.goalMinutes) * 100)
                  );
                  const isEdited =
                    editedGoals[member.id] !==
                    String(Math.round(member.goalMinutes / 60));

                  return (
                    <TableRow key={member.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{member.full_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {member.email}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min="1"
                            max="168"
                            value={editedGoals[member.id] || "40"}
                            onChange={(e) =>
                              setEditedGoals((prev) => ({
                                ...prev,
                                [member.id]: e.target.value,
                              }))
                            }
                            className="w-20 h-8"
                          />
                          <span className="text-sm text-muted-foreground">س</span>
                        </div>
                      </TableCell>
                      <TableCell>{formatTime(member.actualMinutes)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 min-w-[120px]">
                          <Progress value={progress} className="h-2 flex-1" />
                          <span className="text-sm font-medium w-12">{progress}%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant={isEdited ? "default" : "ghost"}
                          onClick={() => saveGoal(member.id)}
                          disabled={saving === member.id || !isEdited}
                        >
                          {saving === member.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Save className="h-4 w-4" />
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
