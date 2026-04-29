import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

// Activity types enum
export const ActivityTypes = {
  // Requests
  REQUEST_CREATED: "request_created",
  REQUEST_UPDATED: "request_updated",
  REQUEST_CLOSED: "request_closed",
  
  // Tasks
  TASK_CREATED: "task_created",
  TASK_STATUS_CHANGED: "task_status_changed",
  TASK_ASSIGNED: "task_assigned",
  TASK_APPROVED: "task_approved",
  TASK_REJECTED: "task_rejected",
  TASK_COMPLETED: "task_completed",
  
  // Comments and Time
  COMMENT_ADDED: "comment_added",
  TIME_LOGGED: "time_logged",
  
  // Documents
  DOCUMENT_CREATED: "document_created",
  DOCUMENT_UPDATED: "document_updated",
  
  // Leads
  LEAD_CREATED: "lead_created",
  LEAD_STATUS_CHANGED: "lead_status_changed",
  
  // Announcements
  ANNOUNCEMENT_CREATED: "announcement_created",
} as const;

export type ActivityType = typeof ActivityTypes[keyof typeof ActivityTypes];

// Entity types
export type EntityType = "request" | "task" | "comment" | "time_entry" | "document" | "lead" | "announcement";

interface LogActivityParams {
  userId: string;
  actionType: ActivityType;
  entityType: EntityType;
  entityId?: string;
  entityTitle?: string;
  metadata?: Json;
}

// Main logging function
export async function logActivity({
  userId,
  actionType,
  entityType,
  entityId,
  entityTitle,
  metadata = {} as Json,
}: LogActivityParams): Promise<void> {
  try {
    const { error } = await supabase.from("activity_logs").insert([{
      user_id: userId,
      action_type: actionType,
      entity_type: entityType,
      entity_id: entityId || null,
      entity_title: entityTitle || null,
      metadata: metadata as Json,
    }]);

    if (error) {
      console.error("Failed to log activity:", error);
    }
  } catch (err) {
    console.error("Error logging activity:", err);
  }
}

// Helper functions for specific activity types

export async function logRequestCreated(
  userId: string,
  requestId: string,
  requestNumber: number,
  requestType: string,
  isInternal: boolean = false
) {
  await logActivity({
    userId,
    actionType: ActivityTypes.REQUEST_CREATED,
    entityType: "request",
    entityId: requestId,
    entityTitle: `طلب ${isInternal ? "داخلي" : "مستفيد"} #${requestNumber}`,
    metadata: { request_type: requestType, is_internal: isInternal },
  });
}

export async function logTaskCreated(
  userId: string,
  taskId: string,
  taskTitle: string,
  level: string
) {
  await logActivity({
    userId,
    actionType: ActivityTypes.TASK_CREATED,
    entityType: "task",
    entityId: taskId,
    entityTitle: taskTitle,
    metadata: { level },
  });
}

export async function logTaskStatusChanged(
  userId: string,
  taskId: string,
  taskTitle: string,
  fromStatus: string,
  toStatus: string
) {
  await logActivity({
    userId,
    actionType: ActivityTypes.TASK_STATUS_CHANGED,
    entityType: "task",
    entityId: taskId,
    entityTitle: taskTitle,
    metadata: { from_status: fromStatus, to_status: toStatus },
  });
}

export async function logTaskAssigned(
  userId: string,
  taskId: string,
  taskTitle: string,
  assigneeId: string,
  level: string
) {
  await logActivity({
    userId,
    actionType: ActivityTypes.TASK_ASSIGNED,
    entityType: "task",
    entityId: taskId,
    entityTitle: taskTitle,
    metadata: { assignee_id: assigneeId, level },
  });
}

export async function logTaskApproved(
  userId: string,
  taskId: string,
  taskTitle: string
) {
  await logActivity({
    userId,
    actionType: ActivityTypes.TASK_APPROVED,
    entityType: "task",
    entityId: taskId,
    entityTitle: taskTitle,
  });
}

export async function logTaskRejected(
  userId: string,
  taskId: string,
  taskTitle: string
) {
  await logActivity({
    userId,
    actionType: ActivityTypes.TASK_REJECTED,
    entityType: "task",
    entityId: taskId,
    entityTitle: taskTitle,
  });
}

export async function logTaskCompleted(
  userId: string,
  taskId: string,
  taskTitle: string
) {
  await logActivity({
    userId,
    actionType: ActivityTypes.TASK_COMPLETED,
    entityType: "task",
    entityId: taskId,
    entityTitle: taskTitle,
  });
}

export async function logCommentAdded(
  userId: string,
  taskId: string,
  taskTitle: string
) {
  await logActivity({
    userId,
    actionType: ActivityTypes.COMMENT_ADDED,
    entityType: "comment",
    entityId: taskId,
    entityTitle: taskTitle,
  });
}

export async function logTimeLogged(
  userId: string,
  taskId: string,
  taskTitle: string,
  durationMinutes: number
) {
  await logActivity({
    userId,
    actionType: ActivityTypes.TIME_LOGGED,
    entityType: "time_entry",
    entityId: taskId,
    entityTitle: taskTitle,
    metadata: { duration_minutes: durationMinutes },
  });
}

export async function logDocumentCreated(
  userId: string,
  docId: string,
  docTitle: string
) {
  await logActivity({
    userId,
    actionType: ActivityTypes.DOCUMENT_CREATED,
    entityType: "document",
    entityId: docId,
    entityTitle: docTitle,
  });
}

export async function logDocumentUpdated(
  userId: string,
  docId: string,
  docTitle: string
) {
  await logActivity({
    userId,
    actionType: ActivityTypes.DOCUMENT_UPDATED,
    entityType: "document",
    entityId: docId,
    entityTitle: docTitle,
  });
}

export async function logLeadCreated(
  userId: string,
  leadId: string,
  leadName: string
) {
  await logActivity({
    userId,
    actionType: ActivityTypes.LEAD_CREATED,
    entityType: "lead",
    entityId: leadId,
    entityTitle: leadName,
  });
}

export async function logLeadStatusChanged(
  userId: string,
  leadId: string,
  leadName: string,
  fromStatus: string,
  toStatus: string
) {
  await logActivity({
    userId,
    actionType: ActivityTypes.LEAD_STATUS_CHANGED,
    entityType: "lead",
    entityId: leadId,
    entityTitle: leadName,
    metadata: { from_status: fromStatus, to_status: toStatus },
  });
}

export async function logAnnouncementCreated(
  userId: string,
  announcementId: string,
  announcementTitle: string
) {
  await logActivity({
    userId,
    actionType: ActivityTypes.ANNOUNCEMENT_CREATED,
    entityType: "announcement",
    entityId: announcementId,
    entityTitle: announcementTitle,
  });
}

// Activity label helpers for UI
export function getActivityLabel(actionType: string): string {
  const labels: Record<string, string> = {
    request_created: "أنشأ طلب",
    request_updated: "حدّث طلب",
    request_closed: "أغلق طلب",
    task_created: "أنشأ مهمة",
    task_status_changed: "غيّر حالة مهمة",
    task_assigned: "عيّن مهمة",
    task_approved: "وافق على مهمة",
    task_rejected: "رفض مهمة",
    task_completed: "أكمل مهمة",
    comment_added: "أضاف تعليق",
    time_logged: "سجّل وقت عمل",
    document_created: "أنشأ مستند",
    document_updated: "حدّث مستند",
    lead_created: "أضاف حالة مستفيدة جديدة",
    lead_status_changed: "غيّر حالة الملف",
    announcement_created: "أنشأ تعميم",
  };
  return labels[actionType] || actionType;
}

export function getActivityIcon(actionType: string): string {
  const icons: Record<string, string> = {
    request_created: "📝",
    request_updated: "✏️",
    request_closed: "🔒",
    task_created: "➕",
    task_status_changed: "🔄",
    task_assigned: "👤",
    task_approved: "✅",
    task_rejected: "❌",
    task_completed: "🎉",
    comment_added: "💬",
    time_logged: "⏱️",
    document_created: "📄",
    document_updated: "📝",
    lead_created: "👥",
    lead_status_changed: "📊",
    announcement_created: "📢",
  };
  return icons[actionType] || "📌";
}
