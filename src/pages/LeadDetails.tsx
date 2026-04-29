import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowRight,
  Phone,
  Mail,
  Building,
  Calendar,
  DollarSign,
  User,
  MessageSquare,
  PhoneCall,
  Video,
  FileText,
} from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

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
  last_contact_at: string | null;
  next_followup_at: string | null;
  created_at: string;
  assignee?: { full_name: string } | null;
}

interface Activity {
  id: string;
  lead_id: string;
  activity_type: string;
  description: string | null;
  created_by: string;
  created_at: string;
  creator?: { full_name: string } | null;
}

const statusLabels: Record<string, string> = {
  new: "جديد",
  contacted: "تم التواصل",
  qualified: "مؤهل",
  proposal: "عرض سعر",
  negotiation: "تفاوض",
  won: "مكتسب",
  lost: "خاسر",
};

const statusColors: Record<string, string> = {
  new: "bg-blue-100 text-blue-800",
  contacted: "bg-yellow-100 text-yellow-800",
  qualified: "bg-purple-100 text-purple-800",
  proposal: "bg-orange-100 text-orange-800",
  negotiation: "bg-indigo-100 text-indigo-800",
  won: "bg-green-100 text-green-800",
  lost: "bg-red-100 text-red-800",
};

const activityTypes = [
  { value: "call", label: "مكالمة", icon: PhoneCall },
  { value: "email", label: "بريد إلكتروني", icon: Mail },
  { value: "meeting", label: "اجتماع", icon: Video },
  { value: "note", label: "ملاحظة", icon: FileText },
];

export default function LeadDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [lead, setLead] = useState<Lead | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [newActivity, setNewActivity] = useState({ type: "note", description: "" });
  const [submitting, setSubmitting] = useState(false);

  const fetchLead = async () => {
    if (!id) return;

    try {
      const { data, error } = await supabase
        .from("leads")
        .select(`
          *,
          assignee:profiles!leads_assigned_to_fkey(full_name)
        `)
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        navigate("/leads");
        return;
      }
      setLead(data);
    } catch (error: any) {
      toast({
        title: "خطأ في جلب بيانات الحالة المستفيدة",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const fetchActivities = async () => {
    if (!id) return;

    try {
      const { data, error } = await supabase
        .from("lead_activities")
        .select("*")
        .eq("lead_id", id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // Fetch creator names separately
      const activitiesWithCreators = await Promise.all(
        (data || []).map(async (activity) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("id", activity.created_by)
            .maybeSingle();
          return { ...activity, creator: profile };
        })
      );
      
      setActivities(activitiesWithCreators);
    } catch (error: any) {
      console.error("Error fetching activities:", error);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchLead(), fetchActivities()]);
      setLoading(false);
    };
    loadData();
  }, [id]);

  const handleStatusChange = async (newStatus: string) => {
    if (!lead) return;

    try {
      const { error } = await supabase
        .from("leads")
        .update({ status: newStatus, last_contact_at: new Date().toISOString() })
        .eq("id", lead.id);

      if (error) throw error;

      setLead({ ...lead, status: newStatus });
      toast({ title: "تم تحديث حالة الملف" });
    } catch (error: any) {
      toast({
        title: "خطأ في تحديث الحالة",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleAddActivity = async () => {
    if (!lead || !user || !newActivity.description.trim()) return;

    setSubmitting(true);
    try {
      const { error } = await supabase.from("lead_activities").insert({
        lead_id: lead.id,
        activity_type: newActivity.type,
        description: newActivity.description,
        created_by: user.id,
      });

      if (error) throw error;

      // Update last contact
      await supabase
        .from("leads")
        .update({ last_contact_at: new Date().toISOString() })
        .eq("id", lead.id);

      toast({ title: "تم إضافة النشاط" });
      setNewActivity({ type: "note", description: "" });
      fetchActivities();
    } catch (error: any) {
      toast({
        title: "خطأ في إضافة النشاط",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-muted-foreground">جاري التحميل...</div>
      </div>
    );
  }

  if (!lead) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/leads")}>
          <ArrowRight className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{lead.name}</h1>
          {lead.company && (
            <p className="text-muted-foreground flex items-center gap-1">
              <Building className="h-4 w-4" />
              {lead.company}
            </p>
          )}
        </div>
        <Select value={lead.status} onValueChange={handleStatusChange}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(statusLabels).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Badge className={statusColors[lead.status]}>
          {statusLabels[lead.status]}
        </Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Main Info */}
        <div className="md:col-span-2 space-y-6">
          {/* Contact Info */}
          <Card>
            <CardHeader>
              <CardTitle>معلومات التواصل</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              {lead.email && (
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-muted">
                    <Mail className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">البريد الإلكتروني</p>
                    <p className="font-medium">{lead.email}</p>
                  </div>
                </div>
              )}
              {lead.phone && (
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-muted">
                    <Phone className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">رقم الهاتف</p>
                    <p className="font-medium">{lead.phone}</p>
                  </div>
                </div>
              )}
              {lead.estimated_value && (
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-muted">
                    <DollarSign className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">القيمة المتوقعة</p>
                    <p className="font-medium">{lead.estimated_value.toLocaleString()} ر.س</p>
                  </div>
                </div>
              )}
              {lead.assignee && (
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-muted">
                    <User className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">المسؤول</p>
                    <p className="font-medium">{lead.assignee.full_name}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Interests */}
          {lead.interest && lead.interest.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>الاهتمامات</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {lead.interest.map((item, idx) => (
                    <Badge key={idx} variant="secondary">
                      {item}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          {lead.notes && (
            <Card>
              <CardHeader>
                <CardTitle>ملاحظات</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap">{lead.notes}</p>
              </CardContent>
            </Card>
          )}

          {/* Add Activity */}
          <Card>
            <CardHeader>
              <CardTitle>إضافة نشاط</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                {activityTypes.map((type) => (
                  <Button
                    key={type.value}
                    variant={newActivity.type === type.value ? "default" : "outline"}
                    size="sm"
                    onClick={() => setNewActivity({ ...newActivity, type: type.value })}
                  >
                    <type.icon className="h-4 w-4 ml-1" />
                    {type.label}
                  </Button>
                ))}
              </div>
              <Textarea
                placeholder="أضف وصف النشاط..."
                value={newActivity.description}
                onChange={(e) =>
                  setNewActivity({ ...newActivity, description: e.target.value })
                }
                rows={3}
              />
              <Button onClick={handleAddActivity} disabled={submitting || !newActivity.description.trim()}>
                <MessageSquare className="h-4 w-4 ml-2" />
                إضافة النشاط
              </Button>
            </CardContent>
          </Card>

          {/* Activities Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>سجل الأنشطة</CardTitle>
            </CardHeader>
            <CardContent>
              {activities.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">لا توجد أنشطة مسجلة</p>
              ) : (
                <div className="space-y-4">
                  {activities.map((activity) => {
                    const typeInfo = activityTypes.find((t) => t.value === activity.activity_type);
                    const Icon = typeInfo?.icon || FileText;

                    return (
                      <div key={activity.id} className="flex gap-4">
                        <div className="p-2 rounded-full bg-muted h-fit">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 text-sm">
                            <span className="font-medium">
                              {typeInfo?.label || activity.activity_type}
                            </span>
                            <span className="text-muted-foreground">•</span>
                            <span className="text-muted-foreground">
                              {activity.creator?.full_name}
                            </span>
                            <span className="text-muted-foreground">•</span>
                            <span className="text-muted-foreground">
                              {format(new Date(activity.created_at), "dd MMM yyyy HH:mm", {
                                locale: ar,
                              })}
                            </span>
                          </div>
                          {activity.description && (
                            <p className="mt-1 text-muted-foreground">{activity.description}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>معلومات إضافية</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">تاريخ الإضافة</p>
                <p className="font-medium flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {format(new Date(lead.created_at), "dd MMM yyyy", { locale: ar })}
                </p>
              </div>
              {lead.last_contact_at && (
                <div>
                  <p className="text-sm text-muted-foreground">آخر تواصل</p>
                  <p className="font-medium">
                    {format(new Date(lead.last_contact_at), "dd MMM yyyy", { locale: ar })}
                  </p>
                </div>
              )}
              {lead.next_followup_at && (
                <div>
                  <p className="text-sm text-muted-foreground">المتابعة القادمة</p>
                  <p className="font-medium">
                    {format(new Date(lead.next_followup_at), "dd MMM yyyy", { locale: ar })}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
