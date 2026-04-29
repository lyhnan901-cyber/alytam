import { Search, Menu, Bell, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NotificationsDropdown } from "@/components/notifications/NotificationsDropdown";
import { useAuth } from "@/hooks/useAuth";

interface TopBarProps { onMenuToggle: () => void; }

export function TopBar({ onMenuToggle }: TopBarProps) {
  const { profile } = useAuth();
  const now = new Date();
  const timeStr = now.toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" });

  return (
    <header className="h-14 bg-card border-b border-border flex items-center justify-between px-4 sm:px-6 sticky top-0 z-40 shadow-xs">
      {/* Right — Menu + Search */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onMenuToggle}
          className="lg:hidden min-w-[44px] min-h-[44px] touch-manipulation">
          <Menu className="w-5 h-5" />
        </Button>

        <div className="relative hidden md:block">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input type="search" placeholder="بحث سريع في النظام..."
            className="w-[280px] pr-10 rounded-xl bg-muted/50 border-border/60 focus-visible:ring-primary/30 text-sm h-9" />
        </div>
      </div>

      {/* Center — Org badge (sm+) */}
      <div className="hidden sm:flex items-center gap-2">
        <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: "linear-gradient(135deg, #052605, #166516)" }}>
          <Heart className="w-3.5 h-3.5 text-white" />
        </div>
        <span className="text-xs font-semibold text-muted-foreground hidden lg:block">
          مؤسسة اليتامى الخيرية التنموية
        </span>
      </div>

      {/* Left — Actions */}
      <div className="flex items-center gap-1">
        {/* Time */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-muted-foreground"
          style={{ background: "rgba(22,101,22,0.06)" }}>
          <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          {timeStr}
        </div>

        {/* Notifications */}
        <NotificationsDropdown />

        {/* User Avatar */}
        <div className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold cursor-pointer mr-1"
          style={{ background: "linear-gradient(135deg, #D4A017, #e0b53a)", color: "#052605" }}>
          {profile?.full_name?.charAt(0) || "م"}
        </div>
      </div>
    </header>
  );
}
