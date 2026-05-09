import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useAllowedDepartments } from "@/hooks/useAllowedDepartments";
import {
  assignTaskToDepartment,
  assignTaskToEmployee,
  directAssignTask,
  directAssignableRoles,
} from "@/lib/workflow";

const assignmentSchema = z.object({
  department_id: z.string().optional(),
  assignee_id: z.string().min(1, "يجب اختيار الشخص المُعيّن إليه"),
  notes: z.string().max(500).optional(),
});

type AssignmentFormValues = z.infer<typeof assignmentSchema>;

interface TaskAssignmentFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  taskId: string;
  assignmentType: "department" | "employee" | "direct";
  currentDepartmentId?: string;
}

interface Department {
  id: string;
  name: string;
}

interface UserOption {
  id: string;
  full_name: string;
  email: string;
}

export function TaskAssignmentForm({
  open,
  onClose,
  onSuccess,
  taskId,
  assignmentType,
  currentDepartmentId,
}: TaskAssignmentFormProps) {
  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState<string | undefined>(
    currentDepartmentId
  );
  const { user } = useAuth();
  const { toast } = useToast();
  const { allowedDepartmentIds, isRestricted } = useAllowedDepartments();

  const form = useForm<AssignmentFormValues>({
    resolver: zodResolver(assignmentSchema),
    defaultValues: {
      department_id: currentDepartmentId,
      assignee_id: "",
      notes: "",
    },
  });

  // Fetch departments. For users with a department whitelist (Supervisor),
  // we filter to only the allowed departments so they cannot pick a
  // restricted department in the dropdown.
  useEffect(() => {
    const fetchDepartments = async () => {
      let query = supabase.from("departments").select("id, name");
      if (isRestricted && allowedDepartmentIds && allowedDepartmentIds.length > 0) {
        query = query.in("id", allowedDepartmentIds);
      }
      const { data } = await query;
      if (data) setDepartments(data);
    };
    if (assignmentType === "department" || assignmentType === "direct") {
      fetchDepartments();
    }
  }, [assignmentType, isRestricted, allowedDepartmentIds]);

  // Fetch users based on assignment type
  useEffect(() => {
    const fetchUsers = async () => {
      if (assignmentType === "department") {
        // Fetch department heads
        const { data } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .eq("department_id", selectedDepartment);
        if (data) setUsers(data);
      } else if (assignmentType === "employee" && currentDepartmentId) {
        // Fetch employees in the department
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("user_id")
          .eq("role", "Employee");

        if (roleData) {
          const userIds = roleData.map((r) => r.user_id);
          const { data: profiles } = await supabase
            .from("profiles")
            .select("id, full_name, email")
            .eq("department_id", currentDepartmentId)
            .in("id", userIds);
          if (profiles) setUsers(profiles);
        }
      } else if (assignmentType === "direct" && selectedDepartment) {
        // Direct assign (GM only): fetch users in the picked department,
        // restricted to roles that map to a TaskLevel (Executive / Supervisor
        // / DeptHead / Employee). GeneralManager and CustomerService are
        // excluded because they have no matching task level.
        const { data: roleRows } = await supabase
          .from("user_roles")
          .select("user_id")
          .in("role", directAssignableRoles as unknown as string[]);
        const allowedIds = (roleRows ?? []).map((r) => r.user_id);
        if (allowedIds.length === 0) {
          setUsers([]);
          return;
        }
        const { data } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .eq("department_id", selectedDepartment)
          .in("id", allowedIds);
        if (data) setUsers(data);
      }
    };

    fetchUsers();
  }, [assignmentType, selectedDepartment, currentDepartmentId]);

  const onSubmit = async (values: AssignmentFormValues) => {
    if (!user) return;

    setLoading(true);
    try {
      if (assignmentType === "department" && values.department_id) {
        await assignTaskToDepartment(
          taskId,
          values.department_id,
          values.assignee_id,
          user.id
        );
        toast({
          title: "تم تعيين المهمة للقسم بنجاح",
        });
      } else if (assignmentType === "direct") {
        await directAssignTask(
          taskId,
          values.assignee_id,
          values.department_id || null,
          user.id,
          values.notes
        );
        toast({
          title: "تم تعيين المهمة مباشرة بنجاح",
        });
      } else {
        await assignTaskToEmployee(taskId, values.assignee_id, user.id);
        toast({
          title: "تم تعيين المهمة للموظف بنجاح",
        });
      }

      form.reset();
      onSuccess();
      onClose();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "خطأ في تعيين المهمة",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {assignmentType === "department"
              ? "تعيين للقسم"
              : assignmentType === "direct"
              ? "تعيين مباشر"
              : "تعيين لكادر"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {(assignmentType === "department" || assignmentType === "direct") && (
              <FormField
                control={form.control}
                name="department_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>القسم</FormLabel>
                    <Select
                      onValueChange={(value) => {
                        field.onChange(value);
                        setSelectedDepartment(value);
                        form.setValue("assignee_id", "");
                      }}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر القسم" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {departments.map((dept) => (
                          <SelectItem key={dept.id} value={dept.id}>
                            {dept.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="assignee_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {assignmentType === "department"
                      ? "رئيس القسم"
                      : assignmentType === "direct"
                      ? "الشخص المعيَّن إليه (أي دور)"
                      : "الكادر المعيَّن"}
                  </FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={
                            assignmentType === "department"
                              ? "اختر رئيس القسم"
                              : assignmentType === "direct"
                              ? "اختر الشخص"
                              : "اختر الموظف"
                          }
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {users.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ملاحظات (اختياري)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="أضف ملاحظات للمُعيّن إليه..."
                      className="resize-none"
                      rows={2}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-3 pt-4">
              <Button
                type="submit"
                disabled={loading}
                className="flex-1"
                style={{ background: "linear-gradient(135deg,#0d4d0d,#1a7d1a)" }}
              >
                {loading ? "جاري التعيين..." : "تعيين المهمة"}
              </Button>
              <Button type="button" variant="outline" onClick={onClose}>إلغاء</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
