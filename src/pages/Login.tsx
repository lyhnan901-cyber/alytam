import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Heart, Mail, Lock, Eye, EyeOff, Loader2, Star, Users, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";

const STATS = [
  { icon: Heart, value: "25,000+", label: "يتيم مستفيد", color: "#D4A017" },
  { icon: Globe,  value: "7",       label: "دول خليجية",  color: "#86d386" },
  { icon: Users,  value: "450",     label: "متطوع نشط",   color: "#D4A017" },
  { icon: Star,   value: "97%",     label: "نسبة الرضا",  color: "#86d386" },
];

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [activeStatIdx, setActiveStatIdx] = useState(0);
  const navigate = useNavigate();
  const { signIn } = useAuth();

  // Cycle through stats
  useEffect(() => {
    const t = setInterval(() => setActiveStatIdx(i => (i + 1) % STATS.length), 3000);
    return () => clearInterval(t);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await signIn(email, password);
      navigate("/");
    } catch {
      // Handled in hook
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex" dir="rtl">

      {/* ═══════════════════════════════════════
          RIGHT PANEL — Login Form
      ═══════════════════════════════════════ */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 bg-white">
        <div className="w-full max-w-[420px] animate-fade-in">

          {/* Mobile Logo */}
          <div className="lg:hidden flex flex-col items-center mb-8">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-3 shadow-green"
              style={{ background: "linear-gradient(135deg, #052605, #166516)" }}>
              <Heart className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-lg font-bold text-center" style={{ color: "#052605" }}>
              مؤسسة اليتامى الخيرية التنموية
            </h1>
          </div>

          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-1 h-6 rounded-full" style={{ background: "linear-gradient(180deg, #D4A017, #b07d19)" }} />
              <p className="text-sm font-medium" style={{ color: "#D4A017" }}>
                نظام إدارة العمليات الداخلية
              </p>
            </div>
            <h2 className="text-3xl font-bold" style={{ color: "#052605" }}>
              أهلاً بعودتك 👋
            </h2>
            <p className="text-muted-foreground mt-2 text-sm">
              سجّل دخولك للوصول إلى لوحة التحكم
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-5">

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-semibold text-foreground/80">
                البريد الإلكتروني
              </Label>
              <div className="relative">
                <Mail className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="example@alyatama.org"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="pr-10 h-11 rounded-xl border-border/80 focus:border-green-400 focus:ring-green-400/20 transition-colors"
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm font-semibold text-foreground/80">
                  كلمة المرور
                </Label>
                <button type="button" className="text-xs font-medium hover:underline transition-colors"
                  style={{ color: "#166516" }}>
                  نسيت كلمة المرور؟
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="pr-10 pl-10 h-11 rounded-xl border-border/80 focus:border-green-400 focus:ring-green-400/20 transition-colors"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 rounded-xl text-white font-semibold text-base shadow-green hover:opacity-90 transition-all"
              style={{ background: "linear-gradient(135deg, #0d4d0d, #1a7d1a)" }}
            >
              {isLoading
                ? <><Loader2 className="w-4 h-4 animate-spin ml-2" /> جاري تسجيل الدخول...</>
                : "تسجيل الدخول"}
            </Button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-border/60" />
            <span className="text-xs text-muted-foreground">للتواصل مع الدعم الفني</span>
            <div className="flex-1 h-px bg-border/60" />
          </div>

          <p className="text-center text-sm text-muted-foreground">
            <span className="font-medium" style={{ color: "#166516" }}>
              📧 support@alyatama.org.sa
            </span>
          </p>

          {/* Footer */}
          <p className="text-center text-xs text-muted-foreground/60 mt-8">
            جميع الحقوق محفوظة © {new Date().getFullYear()} مؤسسة اليتامى الخيرية التنموية
          </p>
        </div>
      </div>

      {/* ═══════════════════════════════════════
          LEFT PANEL — Branding (Desktop only)
      ═══════════════════════════════════════ */}
      <div className="hidden lg:flex lg:w-[52%] relative overflow-hidden gradient-hero">

        {/* Decorative Circles */}
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, #D4A017, transparent)" }} />
        <div className="absolute -bottom-24 -right-24 w-80 h-80 rounded-full opacity-8"
          style={{ background: "radial-gradient(circle, #2a9d2a, transparent)" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-5"
          style={{ background: "radial-gradient(circle, #D4A017, transparent)" }} />

        {/* Grid Pattern */}
        <div className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 40px, rgba(212,160,23,0.5) 40px, rgba(212,160,23,0.5) 41px),
                              repeating-linear-gradient(90deg, transparent, transparent 40px, rgba(212,160,23,0.5) 40px, rgba(212,160,23,0.5) 41px)`
          }} />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between w-full p-12 text-white">

          {/* Top — Logo */}
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center animate-pulse-gold"
              style={{ background: "rgba(212, 160, 23, 0.2)", border: "1.5px solid rgba(212, 160, 23, 0.5)" }}>
              <Heart className="w-7 h-7" style={{ color: "#D4A017" }} />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-snug">مؤسسة اليتامى الخيرية التنموية</h1>
              <p className="text-sm" style={{ color: "#D4A017" }}>فرع المملكة العربية السعودية</p>
            </div>
          </div>

          {/* Center — Main Message */}
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full"
              style={{ background: "rgba(212, 160, 23, 0.15)", border: "1px solid rgba(212, 160, 23, 0.3)" }}>
              <Star className="w-3.5 h-3.5" style={{ color: "#D4A017" }} />
              <span className="text-xs font-medium" style={{ color: "#D4A017" }}>
                رعاية اليوم لبناء الغد
              </span>
            </div>

            <h2 className="text-4xl xl:text-5xl font-bold leading-tight">
              نظام إدارة<br />
              <span style={{ color: "#D4A017" }}>العمليات الخيرية</span><br />
              المتكامل
            </h2>

            <p className="text-white/70 text-base max-w-sm leading-relaxed">
              منصة رقمية متكاملة لإدارة حالات اليتامى، ومتابعة التبرعات،
              وتنسيق المتطوعين، وإدارة المخازن — كل شيء في مكان واحد.
            </p>

            {/* Rotating Stat */}
            <div className="p-5 rounded-2xl animate-scale-in"
              style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)", backdropFilter: "blur(12px)" }}>
              {STATS.map((s, i) => {
                const Icon = s.icon;
                return i === activeStatIdx ? (
                  <div key={i} className="flex items-center gap-4 animate-fade-in">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: "rgba(212,160,23,0.2)" }}>
                      <Icon className="w-6 h-6" style={{ color: s.color }} />
                    </div>
                    <div>
                      <p className="text-3xl font-bold" style={{ color: s.color }}>{s.value}</p>
                      <p className="text-sm text-white/70">{s.label}</p>
                    </div>
                  </div>
                ) : null;
              })}
            </div>

            {/* Stat Dots */}
            <div className="flex gap-2">
              {STATS.map((_, i) => (
                <button key={i} onClick={() => setActiveStatIdx(i)}
                  className="h-1.5 rounded-full transition-all duration-300"
                  style={{
                    width: i === activeStatIdx ? "24px" : "6px",
                    background: i === activeStatIdx ? "#D4A017" : "rgba(255,255,255,0.3)"
                  }} />
              ))}
            </div>
          </div>

          {/* Bottom — Certifications */}
          <div className="flex flex-wrap gap-3">
            {["رخصة خيرية 987654321", "سجل تجاري 1234567890", "ISO 9001:2015"].map(tag => (
              <div key={tag} className="px-3 py-1.5 rounded-lg text-xs text-white/60"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
                {tag}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
