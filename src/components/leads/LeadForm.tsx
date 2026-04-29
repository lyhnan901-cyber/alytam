import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

interface Lead {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  source: string;
  status: string;
  assigned_to: string | null;
  notes: string | null;
  estimated_value: number | null;
  interest: string[] | null;
  next_followup_at: string | null;
}

interface LeadFormProps {
  lead?: Lead | null;
  onSuccess: () => void;
}

interface Profile {
  id: string;
  full_name: string;
}

const sources = [
  { value: "website", label: "موقع المؤسسة" },
  { value: "referral", label: "إحالة اجتماعية" },
  { value: "social", label: "وسائل التواصل" },
  { value: "ads", label: "حملة ميدانية" },
  { value: "cold_call", label: "زيارة ميدانية" },
  { value: "event", label: "فعالية خيرية" },
  { value: "other", label: "أخرى" },
];

const interestOptions = [
  "رعاية تعليمية",
  "رعاية صحية",
  "رعاية سكنية",
  "كفالة شهرية",
  "دعم طارئ",
  "تأهيل مهني",
  "رعاية أيتام",
];

export function LeadForm({ lead, onSuccess }: LeadFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<Profile[]>([]);

  const [formData, setFormData] = useState({
    name: lead?.name || "",
    email: lead?.email || "",
    phone: lead?.phone || "",
    company: lead?.company || "",
    source: lead?.source || "website",
    status: lead?.status || "new",
    assigned_to: lead?.assigned_to || "",
    notes: lead?.notes || "",
    estimated_value: lead?.estimated_value?.toString() || "",
    interest: lead?.interest || [],
    next_followup_at: lead?.next_followup_at?.split("T")[0] || "",
  });

  useEffect(() => {
    const fetchUsers = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name")
        .order("full_name");
      setUsers(data || []);
    };
    fetchUsers();
  }, []);

  const handleInterestChange = (interest: string, checked: boolean) => {
    if (checked) {
      setFormData({ ...formData, interest: [...formData.interest, interest] });
    } else {
      setFormData({
        ...formData,
        interest: formData.interest.filter((i) => i !== interest),
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      const payload = {
        name: formData.name,
        email: formData.email || null,
        phone: formData.phone || null,
        company: formData.company || null,
        source: formData.source,
        status: formData.status,
        assigned_to: formData.assigned_to || null,
        notes: formData.notes || null,
        estimated_value: formData.estimated_value
          ? parseFloat(formData.estimated_value)
          : null,
        interest: formData.interest.length > 0 ? formData.interest : null,
        next_followup_at: formData.next_followup_at || null,
      };

      if (lead) {
        const { error } = await supabase
          .from("leads")
          .update(payload)
          .eq("id", lead.id);
        if (error) throw error;
        toast({ title: "تم تحديث بيانات الحالة بنجاح" });
      } else {
        const { error } = await supabase.from("leads").insert({
          ...payload,
          created_by: user.id,
        });
        if (error) throw error;
        toast({ title: "تم إضافة الحالة بنجاح" });
      }

      onSuccess();
    } catch (error: any) {
      toast({
        title: "خطأ في حفظ البيانات",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">الاسم *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="company">جهة محولة / الأسرة</Label>
          <Input
            id="company"
            value={formData.company}
            onChange={(e) => setFormData({ ...formData, company: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">البريد الإلكتروني</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">رقم الهاتف</Label>
          <Input
            id="phone"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="source">المصدر</Label>
          <Select
            value={formData.source}
            onValueChange={(value) => setFormData({ ...formData, source: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {sources.map((source) => (
                <SelectItem key={source.value} value={source.value}>
                  {source.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="status">الحالة</Label>
          <Select
            value={formData.status}
            onValueChange={(value) => setFormData({ ...formData, status: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="new">حالة جديدة</SelectItem>
              <SelectItem value="contacted">تم التواصل</SelectItem>
              <SelectItem value="qualified">قيد الدراسة</SelectItem>
              <SelectItem value="proposal">بانتظار الموافقة</SelectItem>
              <SelectItem value="negotiation">جاري الدعم</SelectItem>
              <SelectItem value="won">مدعومة</SelectItem>
              <SelectItem value="lost">مغلقة</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="assigned_to">المسؤول</Label>
          <Select
            value={formData.assigned_to}
            onValueChange={(value) => setFormData({ ...formData, assigned_to: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="اختر المسؤول" />
            </SelectTrigger>
            <SelectContent>
              {users.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="estimated_value">مبلغ الدعم المستهدف (ر.س)</Label>
          <Input
            id="estimated_value"
            type="number"
            value={formData.estimated_value}
            onChange={(e) =>
              setFormData({ ...formData, estimated_value: e.target.value })
            }
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="next_followup_at">تاريخ المتابعة القادمة</Label>
          <Input
            id="next_followup_at"
            type="date"
            value={formData.next_followup_at}
            onChange={(e) =>
              setFormData({ ...formData, next_followup_at: e.target.value })
            }
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>الاهتمامات</Label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {interestOptions.map((interest) => (
            <div key={interest} className="flex items-center space-x-2 space-x-reverse">
              <Checkbox
                id={interest}
                checked={formData.interest.includes(interest)}
                onCheckedChange={(checked) =>
                  handleInterestChange(interest, checked as boolean)
                }
              />
              <Label htmlFor={interest} className="text-sm cursor-pointer">
                {interest}
              </Label>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">ملاحظات</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          rows={3}
        />
      </div>

      <div className="flex gap-2 justify-end mt-4">
        <Button 
          type="submit" 
          disabled={loading}
          style={{ background: "linear-gradient(135deg,#0d4d0d,#1a7d1a)" }}
        >
          {loading ? "جاري الحفظ..." : lead ? "تحديث بيانات الحالة" : "إضافة الحالة"}
        </Button>
      </div>
    </form>
  );
}
