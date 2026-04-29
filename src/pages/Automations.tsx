import { useState, useEffect } from "react";
import { Plus, Zap, Edit, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AutomationRuleForm } from "@/components/forms/AutomationRuleForm";

interface AutomationRule {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  trigger_event: string;
  condition_json: unknown;
  action_json: unknown;
  created_by: string;
  created_at: string;
}

const triggerLabels: Record<string, string> = {
  task_created: "عند إنشاء مهمة",
  task_status_changed: "عند تغيير حالة مهمة",
  task_overdue: "عند تأخر مهمة",
};

const actionLabels: Record<string, string> = {
  send_notification: "إرسال إشعار",
  change_priority: "تغيير الأولوية",
  change_assignee: "تغيير المكلّف",
};

export default function Automations() {
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<AutomationRule | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [ruleToDelete, setRuleToDelete] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchRules = async () => {
    try {
      const { data, error } = await supabase
        .from("automation_rules")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setRules((data || []) as AutomationRule[]);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "خطأ في جلب القواعد",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
  }, []);

  const toggleRule = async (ruleId: string, currentState: boolean) => {
    try {
      const { error } = await supabase
        .from("automation_rules")
        .update({ is_active: !currentState })
        .eq("id", ruleId);

      if (error) throw error;

      setRules((prev) =>
        prev.map((r) =>
          r.id === ruleId ? { ...r, is_active: !currentState } : r
        )
      );

      toast({
        title: !currentState ? "تم تفعيل القاعدة" : "تم إيقاف القاعدة",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "خطأ في تحديث القاعدة",
        description: error.message,
      });
    }
  };

  const deleteRule = async () => {
    if (!ruleToDelete) return;

    try {
      const { error } = await supabase
        .from("automation_rules")
        .delete()
        .eq("id", ruleToDelete);

      if (error) throw error;

      setRules((prev) => prev.filter((r) => r.id !== ruleToDelete));
      toast({ title: "تم حذف القاعدة بنجاح" });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "خطأ في حذف القاعدة",
        description: error.message,
      });
    } finally {
      setDeleteDialogOpen(false);
      setRuleToDelete(null);
    }
  };

  const handleEdit = (rule: AutomationRule) => {
    setEditingRule(rule);
    setFormOpen(true);
  };

  const handleFormSuccess = () => {
    fetchRules();
    setEditingRule(null);
  };

  const handleFormClose = () => {
    setFormOpen(false);
    setEditingRule(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">قواعد الأتمتة</h1>
          <p className="text-muted-foreground">
            إدارة القواعد التي تُنفّذ تلقائياً عند أحداث معينة
          </p>
        </div>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="w-4 h-4 ml-2" />
          إضافة قاعدة
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5" />
            القواعد المُعرّفة
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              جاري التحميل...
            </div>
          ) : rules.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Zap className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>لا توجد قواعد أتمتة بعد</p>
              <p className="text-sm">أضف قاعدة جديدة لتشغيل إجراءات تلقائية</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الاسم</TableHead>
                  <TableHead>الحدث</TableHead>
                  <TableHead>الإجراء</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead className="text-left">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules.map((rule) => (
                  <TableRow key={rule.id}>
                    <TableCell>
                      <div>
                        <span className="font-medium">{rule.name}</span>
                        {rule.description && (
                          <p className="text-xs text-muted-foreground">
                            {rule.description}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {triggerLabels[rule.trigger_event] || rule.trigger_event}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {actionLabels[(rule.action_json as any)?.type] || "غير محدد"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={rule.is_active ? "default" : "secondary"}
                        className={rule.is_active ? "bg-green-500" : ""}
                      >
                        {rule.is_active ? "مفعّل" : "معطّل"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => toggleRule(rule.id, rule.is_active)}
                          title={rule.is_active ? "إيقاف" : "تفعيل"}
                        >
                          {rule.is_active ? (
                            <ToggleRight className="w-4 h-4 text-green-500" />
                          ) : (
                            <ToggleLeft className="w-4 h-4 text-muted-foreground" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(rule)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setRuleToDelete(rule.id);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AutomationRuleForm
        open={formOpen}
        onClose={handleFormClose}
        onSuccess={handleFormSuccess}
        rule={editingRule}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف القاعدة</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف هذه القاعدة؟ لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={deleteRule} className="bg-destructive">
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
