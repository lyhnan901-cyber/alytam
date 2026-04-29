import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { ConditionJson } from "@/lib/automation";

interface ConditionBuilderProps {
  conditions: ConditionJson;
  onChange: (conditions: ConditionJson) => void;
}

interface Department {
  id: string;
  name: string;
}

const statusOptions = [
  { value: "New", label: "جديد" },
  { value: "NotStarted", label: "لم يبدأ" },
  { value: "InProgress", label: "قيد التنفيذ" },
  { value: "Completed", label: "مكتمل" },
  { value: "PendingDeptHeadReview", label: "بانتظار مراجعة رئيس القسم" },
  { value: "PendingSupervisorReview", label: "بانتظار مراجعة المشرف" },
  { value: "PendingExecutiveReview", label: "بانتظار مراجعة المدير التنفيذي" },
  { value: "PendingGMApproval", label: "بانتظار موافقة المدير العام" },
  { value: "Approved", label: "معتمد" },
  { value: "NeedRevision", label: "يحتاج تعديل" },
  { value: "Rejected", label: "مرفوض" },
];

const priorityOptions = [
  { value: "High", label: "عالي" },
  { value: "Medium", label: "متوسط" },
  { value: "Low", label: "منخفض" },
];

const levelOptions = [
  { value: "Executive", label: "المدير التنفيذي" },
  { value: "Supervisor", label: "المشرف" },
  { value: "DeptHead", label: "رئيس القسم" },
  { value: "Employee", label: "الموظف" },
];

export function ConditionBuilder({ conditions, onChange }: ConditionBuilderProps) {
  const [departments, setDepartments] = useState<Department[]>([]);

  useEffect(() => {
    const fetchDepartments = async () => {
      const { data } = await supabase.from("departments").select("id, name").order("name");
      if (data) setDepartments(data);
    };
    fetchDepartments();
  }, []);

  const addStatus = (status: string) => {
    const currentStatuses = conditions.status || [];
    if (!currentStatuses.includes(status)) {
      onChange({ ...conditions, status: [...currentStatuses, status] });
    }
  };

  const removeStatus = (status: string) => {
    const newStatuses = (conditions.status || []).filter((s) => s !== status);
    onChange({ ...conditions, status: newStatuses.length ? newStatuses : undefined });
  };

  const addPriority = (priority: string) => {
    const currentPriorities = conditions.priority || [];
    if (!currentPriorities.includes(priority)) {
      onChange({ ...conditions, priority: [...currentPriorities, priority] });
    }
  };

  const removePriority = (priority: string) => {
    const newPriorities = (conditions.priority || []).filter((p) => p !== priority);
    onChange({ ...conditions, priority: newPriorities.length ? newPriorities : undefined });
  };

  const addLevel = (level: string) => {
    const currentLevels = conditions.level || [];
    if (!currentLevels.includes(level)) {
      onChange({ ...conditions, level: [...currentLevels, level] });
    }
  };

  const removeLevel = (level: string) => {
    const newLevels = (conditions.level || []).filter((l) => l !== level);
    onChange({ ...conditions, level: newLevels.length ? newLevels : undefined });
  };

  const setDepartment = (departmentId: string) => {
    onChange({ ...conditions, department_id: departmentId === "any" ? undefined : departmentId });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">الحالة</label>
        <div className="flex flex-wrap gap-2 mb-2">
          {(conditions.status || []).map((status) => (
            <Badge key={status} variant="secondary" className="gap-1">
              {statusOptions.find((o) => o.value === status)?.label || status}
              <Button variant="ghost" size="icon" className="h-4 w-4 p-0" onClick={() => removeStatus(status)}>
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          ))}
        </div>
        <Select onValueChange={addStatus} value="">
          <SelectTrigger><SelectValue placeholder="إضافة حالة..." /></SelectTrigger>
          <SelectContent>
            {statusOptions.filter((o) => !(conditions.status || []).includes(o.value)).map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">الأولوية</label>
        <div className="flex flex-wrap gap-2 mb-2">
          {(conditions.priority || []).map((priority) => (
            <Badge key={priority} variant="secondary" className="gap-1">
              {priorityOptions.find((o) => o.value === priority)?.label || priority}
              <Button variant="ghost" size="icon" className="h-4 w-4 p-0" onClick={() => removePriority(priority)}>
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          ))}
        </div>
        <Select onValueChange={addPriority} value="">
          <SelectTrigger><SelectValue placeholder="إضافة أولوية..." /></SelectTrigger>
          <SelectContent>
            {priorityOptions.filter((o) => !(conditions.priority || []).includes(o.value)).map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">القسم</label>
        <Select onValueChange={setDepartment} value={conditions.department_id || "any"}>
          <SelectTrigger><SelectValue placeholder="اختر القسم..." /></SelectTrigger>
          <SelectContent>
            <SelectItem value="any">أي قسم</SelectItem>
            {departments.map((dept) => <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">مستوى المهمة</label>
        <div className="flex flex-wrap gap-2 mb-2">
          {(conditions.level || []).map((level) => (
            <Badge key={level} variant="secondary" className="gap-1">
              {levelOptions.find((o) => o.value === level)?.label || level}
              <Button variant="ghost" size="icon" className="h-4 w-4 p-0" onClick={() => removeLevel(level)}>
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          ))}
        </div>
        <Select onValueChange={addLevel} value="">
          <SelectTrigger><SelectValue placeholder="إضافة مستوى..." /></SelectTrigger>
          <SelectContent>
            {levelOptions.filter((o) => !(conditions.level || []).includes(o.value)).map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
