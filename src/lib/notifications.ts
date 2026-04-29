import { supabase } from "@/integrations/supabase/client";

type NotificationType = "task_assigned" | "status_changed" | "approval_required" | "automation" | "overdue" | "info";

interface CreateNotificationParams {
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  relatedTaskId?: string;
  relatedRequestId?: string;
}

export async function createNotification({
  userId,
  title,
  message,
  type,
  relatedTaskId,
  relatedRequestId,
}: CreateNotificationParams) {
  try {
    const { error } = await supabase.from("notifications").insert({
      user_id: userId,
      title,
      message,
      type,
      related_task_id: relatedTaskId,
      related_request_id: relatedRequestId,
    });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Error creating notification:", error);
    return false;
  }
}

export async function notifyTaskAssigned(
  assigneeId: string,
  taskTitle: string,
  taskId: string
) {
  return createNotification({
    userId: assigneeId,
    title: "مهمة جديدة مُعيّنة لك",
    message: `تم تعيينك للعمل على المهمة: ${taskTitle}`,
    type: "task_assigned",
    relatedTaskId: taskId,
  });
}

export async function notifyStatusChanged(
  userId: string,
  taskTitle: string,
  taskId: string,
  newStatus: string
) {
  const statusLabels: Record<string, string> = {
    New: "جديد",
    NotStarted: "لم يبدأ",
    InProgress: "قيد التنفيذ",
    Completed: "مكتمل",
    PendingDeptHeadReview: "بانتظار مراجعة رئيس القسم",
    PendingSupervisorReview: "بانتظار مراجعة المشرف",
    PendingExecutiveReview: "بانتظار مراجعة المدير التنفيذي",
    PendingGMApproval: "بانتظار موافقة المدير العام",
    Approved: "معتمد",
    NeedRevision: "يحتاج تعديل",
    Rejected: "مرفوض",
  };

  return createNotification({
    userId,
    title: "تحديث حالة المهمة",
    message: `تم تغيير حالة المهمة "${taskTitle}" إلى: ${statusLabels[newStatus] || newStatus}`,
    type: "status_changed",
    relatedTaskId: taskId,
  });
}

export async function notifyApprovalRequired(
  reviewerId: string,
  taskTitle: string,
  taskId: string,
  level: string
) {
  const levelLabels: Record<string, string> = {
    DeptHead: "رئيس القسم",
    Supervisor: "المشرف",
    Executive: "المدير التنفيذي",
    GeneralManager: "المدير العام",
  };

  return createNotification({
    userId: reviewerId,
    title: "مطلوب موافقتك",
    message: `المهمة "${taskTitle}" بحاجة لموافقة ${levelLabels[level] || level}`,
    type: "approval_required",
    relatedTaskId: taskId,
  });
}

export async function notifyNewComment(
  authorId: string,
  taskId: string,
  taskTitle: string,
  assigneeId: string | null,
  departmentId: string | null,
  taskLevel: string
) {
  const { supabase } = await import("@/integrations/supabase/client");
  const notifiedUsers = new Set<string>();
  notifiedUsers.add(authorId); // Don't notify the author

  // Notify the assignee
  if (assigneeId && !notifiedUsers.has(assigneeId)) {
    await createNotification({
      userId: assigneeId,
      title: "تعليق جديد على مهمتك",
      message: `تم إضافة تعليق جديد على المهمة: ${taskTitle}`,
      type: "info",
      relatedTaskId: taskId,
    });
    notifiedUsers.add(assigneeId);
  }

  // Notify department head if task is at Employee level
  if (taskLevel === "Employee" && departmentId) {
    const { data: deptUsers } = await supabase
      .from("profiles")
      .select("id")
      .eq("department_id", departmentId);

    if (deptUsers) {
      for (const deptUser of deptUsers) {
        const { data: roles } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", deptUser.id)
          .eq("role", "DepartmentHead")
          .single();

        if (roles && !notifiedUsers.has(deptUser.id)) {
          await createNotification({
            userId: deptUser.id,
            title: "تعليق جديد على مهمة قسمك",
            message: `تم إضافة تعليق جديد على المهمة: ${taskTitle}`,
            type: "info",
            relatedTaskId: taskId,
          });
          notifiedUsers.add(deptUser.id);
          break;
        }
      }
    }
  }

  // Notify supervisor if task is at DeptHead level
  if (taskLevel === "DeptHead") {
    const { data: supervisors } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "Supervisor");

    if (supervisors) {
      for (const supervisor of supervisors) {
        if (!notifiedUsers.has(supervisor.user_id)) {
          await createNotification({
            userId: supervisor.user_id,
            title: "تعليق جديد على مهمة",
            message: `تم إضافة تعليق جديد على المهمة: ${taskTitle}`,
            type: "info",
            relatedTaskId: taskId,
          });
          notifiedUsers.add(supervisor.user_id);
          break;
        }
      }
    }
  }

  return true;
}

// Notify about automation action
export async function notifyAutomation(
  userId: string,
  title: string,
  message: string,
  taskId: string
) {
  return createNotification({
    userId,
    title,
    message,
    type: "automation",
    relatedTaskId: taskId,
  });
}

// Notify about overdue task
export async function notifyTaskOverdue(
  userId: string,
  taskTitle: string,
  taskId: string
) {
  return createNotification({
    userId,
    title: "⚠️ مهمة متأخرة",
    message: `المهمة "${taskTitle}" تجاوزت موعد التسليم المحدد`,
    type: "overdue",
    relatedTaskId: taskId,
  });
}
