import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ActionJson } from "@/lib/automation";

interface ActionBuilderProps {
  action: ActionJson;
  onChange: (action: ActionJson) => void;
}

const actionTypes = [
  { value: "send_notification", label: "إرسال إشعار" },
  { value: "change_priority", label: "تغيير الأولوية" },
  { value: "change_assignee", label: "تغيير المكلّف" },
];

const notificationTargets = [
  { value: "assignee", label: "المكلّف بالمهمة" },
  { value: "department_head", label: "رئيس القسم" },
  { value: "supervisor", label: "المشرف" },
  { value: "executive", label: "المدير التنفيذي" },
  { value: "assignee_and_department_head", label: "المكلّف ورئيس القسم" },
];

const priorities = [
  { value: "High", label: "عالي" },
  { value: "Medium", label: "متوسط" },
  { value: "Low", label: "منخفض" },
];

export function ActionBuilder({ action, onChange }: ActionBuilderProps) {
  const updateAction = (updates: Partial<ActionJson>) => {
    onChange({ ...action, ...updates });
  };

  return (
    <div className="space-y-4">
      {/* Action Type */}
      <div className="space-y-2">
        <Label>نوع الإجراء</Label>
      <Select
          value={action.type}
          onValueChange={(value: ActionJson["type"]) =>
            updateAction({ type: value })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="اختر نوع الإجراء" />
          </SelectTrigger>
          <SelectContent>
            {actionTypes.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Send Notification Options */}
      {action.type === "send_notification" && (
        <>
          <div className="space-y-2">
            <Label>إرسال الإشعار إلى</Label>
            <Select
              value={action.target || "assignee"}
              onValueChange={(value: ActionJson["target"]) =>
                updateAction({ target: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="اختر المستهدف" />
              </SelectTrigger>
              <SelectContent>
                {notificationTargets.map((target) => (
                  <SelectItem key={target.value} value={target.value}>
                    {target.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>عنوان الإشعار</Label>
            <Input
              value={action.title || ""}
              onChange={(e) => updateAction({ title: e.target.value })}
              placeholder="مثال: مهمة عاجلة مكتملة"
            />
            <p className="text-xs text-muted-foreground">
              يمكنك استخدام: {"{{task_title}}"} لاسم المهمة
            </p>
          </div>

          <div className="space-y-2">
            <Label>نص الإشعار</Label>
            <Textarea
              value={action.message || ""}
              onChange={(e) => updateAction({ message: e.target.value })}
              placeholder="مثال: تم إكمال المهمة {{task_title}} بنجاح"
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              المتغيرات المتاحة: {"{{task_title}}"}, {"{{task_status}}"}, {"{{task_priority}}"}
            </p>
          </div>
        </>
      )}

      {/* Change Priority Options */}
      {action.type === "change_priority" && (
        <div className="space-y-2">
          <Label>الأولوية الجديدة</Label>
          <Select
            value={action.new_priority || "High"}
            onValueChange={(value: ActionJson["new_priority"]) =>
              updateAction({ new_priority: value })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="اختر الأولوية" />
            </SelectTrigger>
            <SelectContent>
              {priorities.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Change Assignee Options */}
      {action.type === "change_assignee" && (
        <div className="space-y-2">
          <Label>تعيين المهمة إلى</Label>
          <Select
            value={action.target || "department_head"}
            onValueChange={(value: ActionJson["target"]) =>
              updateAction({ target: value })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="اختر الشخص" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="department_head">رئيس القسم</SelectItem>
              <SelectItem value="supervisor">المشرف</SelectItem>
              <SelectItem value="executive">المدير التنفيذي</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}
