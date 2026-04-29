import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Globe, Palette, Bell, Shield, Settings2, ChevronLeft, Zap, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface UserSettings {
  language: string;
  timezone: string;
  dark_mode: boolean;
  animations_enabled: boolean;
  new_task_notifications: boolean;
  status_update_notifications: boolean;
  overdue_task_notifications: boolean;
  email_notifications: boolean;
  two_factor_enabled: boolean;
  auto_logout_minutes: number;
}

const defaultSettings: UserSettings = {
  language: "ar",
  timezone: "asia_riyadh",
  dark_mode: false,
  animations_enabled: true,
  new_task_notifications: true,
  status_update_notifications: true,
  overdue_task_notifications: true,
  email_notifications: false,
  two_factor_enabled: false,
  auto_logout_minutes: 30,
};

export default function Settings() {
  const { isGeneralManager, user } = useAuth();
  const { toast } = useToast();
  const [settings, setSettings] = useState<UserSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Fetch user settings on mount
  useEffect(() => {
    const fetchSettings = async () => {
      if (!user?.id) return;

      try {
        const { data, error } = await supabase
          .from("user_settings")
          .select("*")
          .eq("user_id", user.id)
          .single();

        if (error && error.code !== "PGRST116") {
          // PGRST116 = no rows found
          throw error;
        }

        if (data) {
          setSettings({
            language: data.language,
            timezone: data.timezone,
            dark_mode: data.dark_mode,
            animations_enabled: data.animations_enabled,
            new_task_notifications: data.new_task_notifications,
            status_update_notifications: data.status_update_notifications,
            overdue_task_notifications: data.overdue_task_notifications,
            email_notifications: data.email_notifications,
            two_factor_enabled: data.two_factor_enabled,
            auto_logout_minutes: data.auto_logout_minutes,
          });
        }
      } catch (error: any) {
        console.error("Error fetching settings:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, [user?.id]);

  // Apply dark mode
  useEffect(() => {
    if (settings.dark_mode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [settings.dark_mode]);

  const handleSave = async () => {
    if (!user?.id) return;

    setSaving(true);
    try {
      // Check if settings exist
      const { data: existing } = await supabase
        .from("user_settings")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (existing) {
        // Update existing
        const { error } = await supabase
          .from("user_settings")
          .update({
            language: settings.language,
            timezone: settings.timezone,
            dark_mode: settings.dark_mode,
            animations_enabled: settings.animations_enabled,
            new_task_notifications: settings.new_task_notifications,
            status_update_notifications: settings.status_update_notifications,
            overdue_task_notifications: settings.overdue_task_notifications,
            email_notifications: settings.email_notifications,
            two_factor_enabled: settings.two_factor_enabled,
            auto_logout_minutes: settings.auto_logout_minutes,
          })
          .eq("user_id", user.id);

        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase.from("user_settings").insert({
          user_id: user.id,
          language: settings.language,
          timezone: settings.timezone,
          dark_mode: settings.dark_mode,
          animations_enabled: settings.animations_enabled,
          new_task_notifications: settings.new_task_notifications,
          status_update_notifications: settings.status_update_notifications,
          overdue_task_notifications: settings.overdue_task_notifications,
          email_notifications: settings.email_notifications,
          two_factor_enabled: settings.two_factor_enabled,
          auto_logout_minutes: settings.auto_logout_minutes,
        });

        if (error) throw error;
      }

      toast({
        title: "تم الحفظ",
        description: "تم حفظ الإعدادات بنجاح",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "خطأ في الحفظ",
        description: error.message,
      });
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = <K extends keyof UserSettings>(
    key: K,
    value: UserSettings[K]
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="page-container max-w-3xl">
      {/* Page Header */}
      <div>
        <h1 className="page-title flex items-center gap-2">
          <Settings2 className="w-5 h-5 text-primary" /> الإعدادات
        </h1>
        <p className="page-subtitle">تخصيص النظام وتفضيلات المستخدم</p>
      </div>

      {/* Custom Fields - GM Only */}
      {isGeneralManager && (
        <div className="bg-card rounded-xl border p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Settings2 className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">الحقول المخصصة</h3>
                <p className="text-sm text-muted-foreground">
                  إدارة الحقول الإضافية للمهام
                </p>
              </div>
            </div>
            <Button asChild variant="outline">
              <Link to="/settings/custom-fields">
                إدارة الحقول
                <ChevronLeft className="w-4 h-4 mr-2" />
              </Link>
            </Button>
          </div>
        </div>
      )}

      {/* Automations - GM Only */}
      {isGeneralManager && (
        <div className="bg-card rounded-xl border p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <Zap className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <h3 className="font-semibold">الأتمتة</h3>
                <p className="text-sm text-muted-foreground">
                  إدارة قواعد الأتمتة والإشعارات التلقائية
                </p>
              </div>
            </div>
            <Button asChild variant="outline">
              <Link to="/settings/automations">
                إدارة الأتمتة
                <ChevronLeft className="w-4 h-4 mr-2" />
              </Link>
            </Button>
          </div>
        </div>
      )}

      {/* Language Settings */}
      <div className="bg-card rounded-xl border p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Globe className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold">اللغة والمنطقة</h3>
            <p className="text-sm text-muted-foreground">تخصيص لغة الواجهة</p>
          </div>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>لغة الواجهة</Label>
            <Select
              value={settings.language}
              onValueChange={(value) => updateSetting("language", value)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ar">العربية</SelectItem>
                <SelectItem value="en">English</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between">
            <Label>المنطقة الزمنية</Label>
            <Select
              value={settings.timezone}
              onValueChange={(value) => updateSetting("timezone", value)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="asia_riyadh">الرياض (GMT+3)</SelectItem>
                <SelectItem value="asia_dubai">دبي (GMT+4)</SelectItem>
                <SelectItem value="africa_cairo">القاهرة (GMT+2)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Appearance Settings */}
      <div className="bg-card rounded-xl border p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Palette className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold">المظهر</h3>
            <p className="text-sm text-muted-foreground">تخصيص مظهر الواجهة</p>
          </div>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>الوضع الداكن</Label>
            <Switch
              checked={settings.dark_mode}
              onCheckedChange={(checked) => updateSetting("dark_mode", checked)}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label>الرسوم المتحركة</Label>
            <Switch
              checked={settings.animations_enabled}
              onCheckedChange={(checked) =>
                updateSetting("animations_enabled", checked)
              }
            />
          </div>
        </div>
      </div>

      {/* Notification Settings */}
      <div className="bg-card rounded-xl border p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Bell className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold">الإشعارات</h3>
            <p className="text-sm text-muted-foreground">إعدادات التنبيهات</p>
          </div>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>إشعارات المهام الجديدة</Label>
            <Switch
              checked={settings.new_task_notifications}
              onCheckedChange={(checked) =>
                updateSetting("new_task_notifications", checked)
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <Label>إشعارات تحديث الحالة</Label>
            <Switch
              checked={settings.status_update_notifications}
              onCheckedChange={(checked) =>
                updateSetting("status_update_notifications", checked)
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <Label>تنبيهات المهام المتأخرة</Label>
            <Switch
              checked={settings.overdue_task_notifications}
              onCheckedChange={(checked) =>
                updateSetting("overdue_task_notifications", checked)
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <Label>إشعارات البريد الإلكتروني</Label>
            <Switch
              checked={settings.email_notifications}
              onCheckedChange={(checked) =>
                updateSetting("email_notifications", checked)
              }
            />
          </div>
        </div>
      </div>

      {/* Security Settings */}
      <div className="bg-card rounded-xl border p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Shield className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold">الأمان</h3>
            <p className="text-sm text-muted-foreground">إعدادات الحماية</p>
          </div>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>المصادقة الثنائية</Label>
            <Switch
              checked={settings.two_factor_enabled}
              onCheckedChange={(checked) =>
                updateSetting("two_factor_enabled", checked)
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <Label>تسجيل الخروج التلقائي</Label>
            <Select
              value={String(settings.auto_logout_minutes)}
              onValueChange={(value) =>
                updateSetting(
                  "auto_logout_minutes",
                  value === "never" ? 0 : parseInt(value)
                )
              }
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="15">15 دقيقة</SelectItem>
                <SelectItem value="30">30 دقيقة</SelectItem>
                <SelectItem value="60">ساعة</SelectItem>
                <SelectItem value="0">أبداً</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-start">
        <Button size="lg" onClick={handleSave} disabled={saving}
          style={{ background: "linear-gradient(135deg,#0d4d0d,#1a7d1a)" }}>
          {saving && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
          حفظ الإعدادات
        </Button>
      </div>
    </div>
  );
}
