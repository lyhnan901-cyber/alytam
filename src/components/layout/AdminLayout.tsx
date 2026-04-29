import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { AppSidebar } from "./AppSidebar";
import { TopBar } from "./TopBar";
import { AnnouncementBanner } from "./AnnouncementBanner";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";

export function AdminLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const isMobile = useIsMobile();
  const location = useLocation();

  const handleMenuToggle = () => {
    if (isMobile) {
      setMobileSidebarOpen(!mobileSidebarOpen);
    } else {
      setSidebarCollapsed(!sidebarCollapsed);
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        {/* Desktop sidebar */}
        {!isMobile && (
          <AppSidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
        )}

        {/* Mobile sidebar via Sheet */}
        {isMobile && (
          <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
            <SheetContent side="right" className="p-0 w-[280px] bg-sidebar text-sidebar-foreground border-sidebar-border">
              <AppSidebar collapsed={false} onToggle={() => setMobileSidebarOpen(false)} />
            </SheetContent>
          </Sheet>
        )}

        <div className="flex-1 flex flex-col min-h-screen overflow-x-hidden">
          <AnnouncementBanner />
          <TopBar onMenuToggle={handleMenuToggle} />
          <main className="flex-1 p-6 overflow-auto animate-fade-in">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
