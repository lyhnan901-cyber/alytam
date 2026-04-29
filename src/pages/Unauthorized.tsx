import { ShieldX, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export default function Unauthorized() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ background: "linear-gradient(135deg, #f0f7f0 0%, #fef9ec 100%)" }}>
      <div className="text-center max-w-md">
        <div className="w-20 h-20 rounded-3xl bg-red-50 flex items-center justify-center mx-auto mb-6 border border-red-100">
          <ShieldX className="w-10 h-10 text-red-500" />
        </div>
        <h1 className="text-2xl font-bold mb-2">غير مصرح بالدخول</h1>
        <p className="text-muted-foreground mb-2 max-w-sm mx-auto text-sm">
          ليس لديك الصلاحية للوصول إلى هذه الصفحة.
          يرجى التواصل مع مسؤول النظام.
        </p>
        <p className="text-xs font-medium mb-6" style={{ color: "#D4A017" }}>
          مؤسسة اليتامى الخيرية التنموية
        </p>
        <Button onClick={() => navigate("/")} className="gap-2"
          style={{ background: "linear-gradient(135deg,#0d4d0d,#1a7d1a)" }}>
          <Home className="w-4 h-4" /> العودة للرئيسية
        </Button>
      </div>
    </div>
  );
}
