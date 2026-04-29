import { useState, useEffect } from "react";
import { X, Megaphone, AlertTriangle, CheckCircle, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface Announcement {
  id: string;
  title: string;
  content: string;
  type: "info" | "warning" | "success";
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
}

const DISMISSED_KEY = "dismissed_announcements";

export function AnnouncementBanner() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);

  useEffect(() => {
    // Load dismissed announcements from localStorage
    const stored = localStorage.getItem(DISMISSED_KEY);
    if (stored) {
      setDismissedIds(JSON.parse(stored));
    }

    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    const { data, error } = await supabase
      .from("announcements")
      .select("*")
      .eq("is_active", true)
      .or("expires_at.is.null,expires_at.gt.now()")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setAnnouncements(data as Announcement[]);
    }
  };

  const dismissAnnouncement = (id: string) => {
    const newDismissed = [...dismissedIds, id];
    setDismissedIds(newDismissed);
    localStorage.setItem(DISMISSED_KEY, JSON.stringify(newDismissed));
  };

  const visibleAnnouncements = announcements.filter(
    (a) => !dismissedIds.includes(a.id)
  );

  if (visibleAnnouncements.length === 0) {
    return null;
  }

  const getTypeStyles = (type: Announcement["type"]) => {
    switch (type) {
      case "warning":
        return {
          bg: "bg-amber-500/10 border-amber-500/30",
          text: "text-amber-700 dark:text-amber-300",
          icon: AlertTriangle,
        };
      case "success":
        return {
          bg: "bg-emerald-500/10 border-emerald-500/30",
          text: "text-emerald-700 dark:text-emerald-300",
          icon: CheckCircle,
        };
      default:
        return {
          bg: "bg-blue-500/10 border-blue-500/30",
          text: "text-blue-700 dark:text-blue-300",
          icon: Info,
        };
    }
  };

  return (
    <div className="space-y-1">
      {visibleAnnouncements.map((announcement) => {
        const styles = getTypeStyles(announcement.type);
        const Icon = styles.icon;

        return (
          <div
            key={announcement.id}
            className={cn(
              "flex items-center gap-3 px-4 py-3 border-b",
              styles.bg
            )}
          >
            <div className="flex items-center gap-2 flex-1">
              <Megaphone className={cn("w-5 h-5 shrink-0", styles.text)} />
              <Icon className={cn("w-4 h-4 shrink-0", styles.text)} />
              <span className={cn("font-semibold", styles.text)}>
                {announcement.title}:
              </span>
              <span className={cn("text-sm", styles.text)}>
                {announcement.content}
              </span>
            </div>
            <button
              onClick={() => dismissAnnouncement(announcement.id)}
              className={cn(
                "p-1 rounded-full hover:bg-black/10 transition-colors shrink-0",
                styles.text
              )}
              aria-label="إغلاق التعميم"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
