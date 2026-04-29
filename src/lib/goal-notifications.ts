import { supabase } from "@/integrations/supabase/client";
import { createNotification } from "./notifications";
import { startOfWeek, endOfWeek } from "date-fns";

interface GoalCheckResult {
  approaching: boolean;
  exceeded: boolean;
  percent: number;
  actualMinutes: number;
  goalMinutes: number;
}

/**
 * Check user's weekly goal progress and send notifications if thresholds are met
 */
export async function checkAndNotifyGoalProgress(userId: string): Promise<GoalCheckResult | null> {
  try {
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 0 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 0 });

    // Fetch user's goal
    const { data: goalData } = await supabase
      .from("weekly_time_goals")
      .select("target_minutes")
      .eq("user_id", userId)
      .maybeSingle();

    const goalMinutes = goalData?.target_minutes || 2400; // 40 hours default

    // Fetch actual time this week
    const { data: timeData } = await supabase
      .from("time_entries")
      .select("duration_minutes")
      .eq("user_id", userId)
      .not("duration_minutes", "is", null)
      .gte("start_time", weekStart.toISOString())
      .lte("start_time", weekEnd.toISOString());

    const actualMinutes = (timeData || []).reduce(
      (sum, entry) => sum + (entry.duration_minutes || 0),
      0
    );

    const percent = Math.round((actualMinutes / goalMinutes) * 100);
    const approaching = percent >= 80 && percent < 100;
    const exceeded = percent >= 100;

    return {
      approaching,
      exceeded,
      percent,
      actualMinutes,
      goalMinutes,
    };
  } catch (error) {
    console.error("Error checking goal progress:", error);
    return null;
  }
}

/**
 * Send notification when user is approaching their weekly goal (80%+)
 */
export async function notifyGoalApproaching(userId: string, percent: number) {
  return createNotification({
    userId,
    title: "🎯 اقتراب من الهدف الأسبوعي",
    message: `أنت على وشك تحقيق هدفك الأسبوعي! تقدمك الحالي: ${percent}%`,
    type: "info",
  });
}

/**
 * Send notification when user exceeds their weekly goal (100%+)
 */
export async function notifyGoalAchieved(userId: string, percent: number) {
  return createNotification({
    userId,
    title: "🏆 تحقيق الهدف الأسبوعي!",
    message: `مبروك! لقد حققت هدفك الأسبوعي بنسبة ${percent}%`,
    type: "info",
  });
}

/**
 * Trigger goal check when time entry is completed
 */
export async function triggerGoalCheck(userId: string): Promise<void> {
  const result = await checkAndNotifyGoalProgress(userId);
  
  if (!result) return;

  // Check localStorage to avoid duplicate notifications
  const lastNotificationKey = `goal_notification_${userId}`;
  const lastNotification = localStorage.getItem(lastNotificationKey);
  const weekKey = startOfWeek(new Date(), { weekStartsOn: 0 }).toISOString().split("T")[0];
  
  if (lastNotification === `${weekKey}_exceeded`) {
    // Already notified about exceeding this week
    return;
  }
  
  if (lastNotification === `${weekKey}_approaching` && !result.exceeded) {
    // Already notified about approaching, but not yet exceeded
    return;
  }

  if (result.exceeded) {
    await notifyGoalAchieved(userId, result.percent);
    localStorage.setItem(lastNotificationKey, `${weekKey}_exceeded`);
  } else if (result.approaching) {
    await notifyGoalApproaching(userId, result.percent);
    localStorage.setItem(lastNotificationKey, `${weekKey}_approaching`);
  }
}
