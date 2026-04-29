import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { User, Mail, Building2, Shield, Loader2, Save, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { getJobTitle } from "@/lib/utils";

const profileSchema = z.object({
  full_name: z.string().min(2, "الاسم مطلوب").max(100),
  avatar_url: z.string().url().optional().or(z.literal("")),
});

type ProfileFormValues = z.infer<typeof profileSchema>;


export default function Profile() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [department, setDepartment] = useState<string | null>(null);
  const { user, profile, role } = useAuth();
  const { toast } = useToast();

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: "",
      avatar_url: "",
    },
  });

  useEffect(() => {
    const fetchProfileDetails = async () => {
      if (!user) return;

      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select(`
            full_name,
            avatar_url,
            departments:department_id(name)
          `)
          .eq("id", user.id)
          .single();

        if (error) throw error;

        form.reset({
          full_name: data.full_name || "",
          avatar_url: data.avatar_url || "",
        });

        setDepartment((data as any).departments?.name || null);
      } catch (error: any) {
        toast({
          variant: "destructive",
          title: "خطأ في جلب البيانات",
          description: error.message,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchProfileDetails();
  }, [user]);

  const onSubmit = async (values: ProfileFormValues) => {
    if (!user) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: values.full_name,
          avatar_url: values.avatar_url || null,
        })
        .eq("id", user.id);

      if (error) throw error;

      toast({
        title: "تم حفظ التغييرات بنجاح",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "خطأ في حفظ البيانات",
        description: error.message,
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="page-container max-w-2xl">
      {/* Page Header */}
      <div>
        <h1 className="page-title flex items-center gap-2">
          <User className="w-5 h-5 text-primary" /> الملف الشخصي
        </h1>
        <p className="page-subtitle">عرض وتعديل معلوماتك الشخصية في المؤسسة</p>
      </div>

      {/* Profile Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <Avatar className="w-20 h-20">
              <AvatarImage src={form.watch("avatar_url")} />
              <AvatarFallback className="bg-primary/10 text-primary text-2xl font-semibold">
                {form.watch("full_name")?.charAt(0) || "؟"}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-xl">{profile?.full_name}</CardTitle>
              <CardDescription className="flex items-center gap-1 mt-1">
                <Mail className="w-4 h-4" />
                {user?.email}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3 mb-6">
            <Badge variant="secondary" className="gap-1">
              <Shield className="w-3 h-3" />
              {getJobTitle(role, department)}
            </Badge>
            {department && (
              <Badge variant="outline" className="gap-1">
                <Building2 className="w-3 h-3" />
                {department}
              </Badge>
            )}
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="full_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      الاسم الكامل
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="أدخل اسمك الكامل" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="avatar_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Camera className="w-4 h-4" />
                      رابط الصورة الشخصية
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="url"
                        placeholder="https://example.com/avatar.jpg"
                        dir="ltr"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="pt-4">
                <Button type="submit" disabled={saving} className="gap-2"
                  style={{ background: "linear-gradient(135deg,#0d4d0d,#1a7d1a)" }}>
                  {saving ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> جاري الحفظ...</>
                  ) : (
                    <><Save className="w-4 h-4" /> حفظ التغييرات</>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Account Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">معلومات الحساب</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between py-2 border-b">
            <span className="text-muted-foreground">البريد الإلكتروني</span>
            <span className="font-medium" dir="ltr">{user?.email}</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b">
            <span className="text-muted-foreground">المسمى الوظيفي</span>
            <span className="font-medium">{getJobTitle(role, department)}</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b">
            <span className="text-muted-foreground">القسم</span>
            <span className="font-medium">{department || "-"}</span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-muted-foreground">تاريخ التسجيل</span>
            <span className="font-medium">
              {user?.created_at
                ? new Intl.DateTimeFormat("ar-SA", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  }).format(new Date(user.created_at))
                : "-"}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
