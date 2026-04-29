import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Home, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error("404: المسار غير موجود:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center"
      style={{ background: "linear-gradient(135deg, #f0f7f0 0%, #fef9ec 100%)" }}>
      <div className="text-center max-w-md px-6">
        {/* Icon */}
        <div className="w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-6"
          style={{ background: "rgba(22,101,22,0.1)" }}>
          <AlertTriangle className="w-12 h-12" style={{ color: "#166516" }} />
        </div>

        {/* Number */}
        <h1 className="text-7xl font-black mb-2" style={{ color: "#166516" }}>404</h1>

        {/* Text */}
        <h2 className="text-xl font-bold text-gray-800 mb-2">الصفحة غير موجودة</h2>
        <p className="text-gray-500 mb-8 text-sm">
          عذراً لم نتمكن من إيجاد الصفحة التي تبحث عنها.
          ربما تم نقلها أو حذفها.
        </p>

        {/* Brand */}
        <p className="text-xs mb-6 font-medium" style={{ color: "#D4A017" }}>
          مؤسسة اليتامى الخيرية التنموية
        </p>

        <Button onClick={() => navigate("/")} className="gap-2"
          style={{ background: "linear-gradient(135deg,#0d4d0d,#1a7d1a)" }}>
          <Home className="w-4 h-4" /> العودة للرئيسية
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
