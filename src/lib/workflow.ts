import { supabase } from "@/integrations/supabase/client";
import { notifyTaskAssigned, notifyStatusChanged, notifyApprovalRequired } from "./notifications";
import { runAutomations, type TaskData } from "./automation";
import { logTaskCreated, logTaskStatusChanged, logTaskAssigned, logTaskApproved, logTaskRejected, logTaskCompleted } from "./activity-logger";
import { getBranchFlags } from "./branch-flags";

type TaskStatus = "New" | "NotStarted" | "InProgress" | "Completed" | "PendingDeptHeadReview" | "PendingSupervisorReview" | "PendingExecutiveReview" | "PendingGMApproval" | "Approved" | "NeedRevision" | "Rejected";
type TaskLevel = "Executive" | "Supervisor" | "DeptHead" | "Employee";
type RequestStatus = "New" | "InProgress" | "Completed" | "Closed";

interface WorkflowTransition {
  fromStatus: TaskStatus;
  toStatus: TaskStatus;
  fromLevel?: TaskLevel;
  toLevel?: TaskLevel;
}

// Workflow transition rules
export const workflowTransitions: Record<string, WorkflowTransition[]> = {
  // Executive Manager actions
  ExecutiveManager: [
    { fromStatus: "New", toStatus: "NotStarted", fromLevel: "Executive", toLevel: "Supervisor" },
  ],
  // Supervisor actions
  Supervisor: [
    { fromStatus: "NotStarted", toStatus: "NotStarted", fromLevel: "Supervisor", toLevel: "DeptHead" },
    { fromStatus: "PendingSupervisorReview", toStatus: "PendingExecutiveReview", fromLevel: "Supervisor", toLevel: "Executive" },
  ],
  // Department Head actions
  DepartmentHead: [
    { fromStatus: "NotStarted", toStatus: "NotStarted", fromLevel: "DeptHead", toLevel: "Employee" },
    { fromStatus: "PendingDeptHeadReview", toStatus: "PendingSupervisorReview", fromLevel: "DeptHead", toLevel: "Supervisor" },
    { fromStatus: "PendingDeptHeadReview", toStatus: "NeedRevision", fromLevel: "DeptHead", toLevel: "Employee" },
  ],
  // Employee actions
  Employee: [
    { fromStatus: "NotStarted", toStatus: "InProgress" },
    { fromStatus: "InProgress", toStatus: "Completed" },
    { fromStatus: "NeedRevision", toStatus: "InProgress" },
  ],
};

// Create initial task when request is created
export async function createInitialTask(
  requestId: string,
  title: string,
  executiveManagerId: string,
  userId: string
) {
  const { data, error } = await supabase
    .from("tasks")
    .insert({
      request_id: requestId,
      title,
      level: "Executive" as TaskLevel,
      status: "New" as TaskStatus,
      assignee_id: executiveManagerId,
      assigned_by: userId,
    })
    .select()
    .single();

  if (error) throw error;
  
  // Notify the executive manager about the new task
  if (data && executiveManagerId) {
    await notifyTaskAssigned(executiveManagerId, title, data.id);
    
    // Log activity
    await logTaskCreated(userId, data.id, title, data.level);
    
    // Run automations for task_created event
    const taskData: TaskData = {
      id: data.id,
      title: data.title,
      status: data.status,
      priority: data.priority,
      level: data.level,
      department_id: data.department_id,
      assignee_id: data.assignee_id,
      request_id: data.request_id,
    };
    await runAutomations("task_created", taskData, userId);
  }
  
  return data;
}

// Create task for internal request - routes directly to department head if specified
export async function createInternalRequestTask(
  requestId: string,
  title: string,
  departmentId: string,
  userId: string,
  description?: string,
  dueDate?: string
) {
  // Get department head - first find users in this department with DepartmentHead role
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id")
    .eq("department_id", departmentId);

  let assigneeId: string | null = null;
  
  if (profiles && profiles.length > 0) {
    const profileIds = profiles.map(p => p.id);
    const { data: deptHeadRole } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "DepartmentHead")
      .in("user_id", profileIds)
      .limit(1)
      .maybeSingle();
    
    assigneeId = deptHeadRole?.user_id || null;
  }

  const { data, error } = await supabase
    .from("tasks")
    .insert({
      request_id: requestId,
      title,
      description: description || null,
      level: assigneeId ? "DeptHead" as TaskLevel : "Executive" as TaskLevel,
      status: "NotStarted" as TaskStatus,
      department_id: departmentId,
      assignee_id: assigneeId || null,
      assigned_by: userId,
      due_date: dueDate || null,
    })
    .select()
    .single();

  if (error) throw error;
  
  // Notify the assignee about the new task
  if (data && assigneeId) {
    await notifyTaskAssigned(assigneeId, title, data.id);
    
    // Log activity
    await logTaskCreated(userId, data.id, title, data.level);
    if (assigneeId) {
      await logTaskAssigned(userId, data.id, title, assigneeId, data.level);
    }
    
    // Run automations for task_created event
    const taskData: TaskData = {
      id: data.id,
      title: data.title,
      status: data.status,
      priority: data.priority,
      level: data.level,
      department_id: data.department_id,
      assignee_id: data.assignee_id,
      request_id: data.request_id,
    };
    await runAutomations("task_created", taskData, userId);
  }
  
  return data;
}

// Send task to Supervisor (Executive Manager action)
export async function sendToSupervisor(taskId: string, userId: string, notes?: string) {
  // Get supervisor user
  const { data: supervisorRole } = await supabase
    .from("user_roles")
    .select("user_id")
    .eq("role", "Supervisor")
    .limit(1)
    .single();

  const supervisorId = supervisorRole?.user_id;

  return updateTaskStatus(
    taskId,
    "NotStarted",
    userId,
    notes,
    "Supervisor",
    supervisorId
  );
}

// Update task status with workflow logic
export async function updateTaskStatus(
  taskId: string,
  newStatus: TaskStatus,
  userId: string,
  notes?: string,
  newLevel?: TaskLevel,
  newAssigneeId?: string,
  departmentId?: string
) {
  // Get current task
  const { data: task, error: fetchError } = await supabase
    .from("tasks")
    .select("*")
    .eq("id", taskId)
    .single();

  if (fetchError) throw fetchError;

  const oldStatus = task.status as TaskStatus;
  const oldLevel = task.level as TaskLevel;

  // Build update object
  const updateData: Record<string, unknown> = {
    status: newStatus,
  };

  if (newLevel) updateData.level = newLevel;
  if (newAssigneeId) updateData.assignee_id = newAssigneeId;
  if (departmentId) updateData.department_id = departmentId;
  if (notes) updateData.review_notes = notes;
  
  if (newStatus === "Completed") {
    updateData.completed_at = new Date().toISOString();
    updateData.status = "PendingDeptHeadReview";
  }

  if (newStatus === "Approved") {
    updateData.completed_at = new Date().toISOString();
  }

  // Update task
  const { data: updatedTask, error: updateError } = await supabase
    .from("tasks")
    .update(updateData)
    .eq("id", taskId)
    .select()
    .single();

  if (updateError) throw updateError;

  // Record history
  await supabase.from("task_history").insert({
    task_id: taskId,
    from_status: oldStatus,
    to_status: newStatus === "Completed" ? "PendingDeptHeadReview" : newStatus,
    from_level: oldLevel,
    to_level: newLevel || oldLevel,
    changed_by: userId,
    notes,
  });

  // Send notifications
  const taskTitle = task.title;
  
  // Notify new assignee if changed
  if (newAssigneeId && newAssigneeId !== task.assignee_id) {
    await notifyTaskAssigned(newAssigneeId, taskTitle, taskId);
    await logTaskAssigned(userId, taskId, taskTitle, newAssigneeId, newLevel || oldLevel);
  }
  
  // Notify about status change to relevant users
  if (task.assignee_id && task.assignee_id !== userId) {
    await notifyStatusChanged(task.assignee_id, taskTitle, taskId, newStatus === "Completed" ? "PendingDeptHeadReview" : newStatus);
  }

  // Log status change activity
  await logTaskStatusChanged(userId, taskId, taskTitle, oldStatus, newStatus === "Completed" ? "PendingDeptHeadReview" : newStatus);

  // Log specific activities based on status
  if (newStatus === "Completed") {
    await logTaskCompleted(userId, taskId, taskTitle);
  } else if (newStatus === "Approved") {
    await logTaskApproved(userId, taskId, taskTitle);
  } else if (newStatus === "NeedRevision" || newStatus === "Rejected") {
    await logTaskRejected(userId, taskId, taskTitle);
  }

  // Run automations for task_status_changed event
  const taskData: TaskData = {
    id: updatedTask.id,
    title: updatedTask.title,
    status: updatedTask.status,
    priority: updatedTask.priority,
    level: updatedTask.level,
    department_id: updatedTask.department_id,
    assignee_id: updatedTask.assignee_id,
    request_id: updatedTask.request_id,
  };
  await runAutomations("task_status_changed", taskData, userId);

  return updatedTask;
}

// Assign task to department and department head
export async function assignTaskToDepartment(
  taskId: string,
  departmentId: string,
  departmentHeadId: string,
  userId: string
) {
  return updateTaskStatus(
    taskId,
    "NotStarted",
    userId,
    undefined,
    "DeptHead",
    departmentHeadId,
    departmentId
  );
}

// Assign task to employee
export async function assignTaskToEmployee(
  taskId: string,
  employeeId: string,
  userId: string
) {
  return updateTaskStatus(
    taskId,
    "NotStarted",
    userId,
    undefined,
    "Employee",
    employeeId
  );
}

// Roles that participate in the task-execution chain. GeneralManager and
// CustomerService are intentionally excluded — they cannot receive a direct
// task assignment because there is no TaskLevel that fits them.
export const directAssignableRoles = [
  "ExecutiveManager",
  "Supervisor",
  "DepartmentHead",
  "Employee",
] as const;

export type DirectAssignableRole = (typeof directAssignableRoles)[number];

// Roles that are ALLOWED to issue a direct task assignment (i.e. bypass the
// normal Exec → Supervisor → DeptHead → Employee chain). Currently the
// General Manager and the Supervisor. The Supervisor is constrained at the
// data layer to departments listed in `user_department_access` (see RLS).
export const rolesThatCanDirectAssign = [
  "GeneralManager",
  "Supervisor",
] as const;

export type DirectAssignerRole = (typeof rolesThatCanDirectAssign)[number];

export function canRoleDirectAssign(
  role: string | null | undefined
): role is DirectAssignerRole {
  return (
    role === "GeneralManager" ||
    role === "Supervisor"
  );
}

// Maps an assignee's role to the corresponding TaskLevel. Returns null if the
// role is not part of the execution chain (GeneralManager / CustomerService).
export function roleToTaskLevel(role: string | null | undefined): TaskLevel | null {
  switch (role) {
    case "ExecutiveManager":
      return "Executive";
    case "Supervisor":
      return "Supervisor";
    case "DepartmentHead":
      return "DeptHead";
    case "Employee":
      return "Employee";
    default:
      return null;
  }
}

async function getAssigneeLevelOrThrow(assigneeId: string): Promise<TaskLevel> {
  const { data: roleRow } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", assigneeId)
    .maybeSingle();
  const level = roleToTaskLevel(roleRow?.role);
  if (!level) {
    throw new Error(
      "لا يمكن التعيين المباشر لهذا المستخدم بسبب دوره. اختر شخصاً من السلسلة التنفيذية."
    );
  }
  return level;
}

// Direct-assign an EXISTING task to any user in the execution chain,
// bypassing Executive → Supervisor → DeptHead → Employee. Allowed for
// GeneralManager and Supervisor (see `canRoleDirectAssign`); the Supervisor
// is further constrained to departments in `user_department_access` via RLS.
// Reuses updateTaskStatus so history, notifications, and automations all fire.
export async function directAssignTask(
  taskId: string,
  assigneeId: string,
  departmentId: string | null,
  userId: string,
  notes?: string
) {
  const level = await getAssigneeLevelOrThrow(assigneeId);
  return updateTaskStatus(
    taskId,
    "NotStarted",
    userId,
    notes,
    level,
    assigneeId,
    departmentId || undefined
  );
}

// Create a NEW task that is already assigned directly, skipping the workflow
// chain. Allowed for GeneralManager and Supervisor (see `canRoleDirectAssign`);
// the Supervisor is constrained to departments in `user_department_access`
// via RLS. Mirrors createInitialTask: notifies the assignee, logs the
// activity, and runs task_created automations.
export async function createDirectAssignedTask(params: {
  requestId: string;
  title: string;
  description?: string;
  priority?: string;
  dueDate?: string | null;
  notes?: string;
  departmentId: string;
  assigneeId: string;
  createdBy: string;
}) {
  const level = await getAssigneeLevelOrThrow(params.assigneeId);

  const { data, error } = await supabase
    .from("tasks")
    .insert({
      request_id: params.requestId,
      title: params.title,
      description: params.description ?? null,
      priority: params.priority,
      due_date: params.dueDate ?? null,
      notes: params.notes ?? null,
      level,
      status: "NotStarted" as TaskStatus,
      department_id: params.departmentId,
      assignee_id: params.assigneeId,
      assigned_by: params.createdBy,
    })
    .select()
    .single();

  if (error) throw error;

  if (data) {
    await notifyTaskAssigned(params.assigneeId, params.title, data.id);
    await logTaskCreated(params.createdBy, data.id, params.title, data.level);
    await logTaskAssigned(
      params.createdBy,
      data.id,
      params.title,
      params.assigneeId,
      data.level
    );

    const taskData: TaskData = {
      id: data.id,
      title: data.title,
      status: data.status,
      priority: data.priority,
      level: data.level,
      department_id: data.department_id,
      assignee_id: data.assignee_id,
      request_id: data.request_id,
    };
    await runAutomations("task_created", taskData, params.createdBy);
  }

  return data;
}

// Department Head approves task
export async function approveTask(taskId: string, userId: string, notes?: string) {
  // Get task to determine current level
  const { data: task } = await supabase
    .from("tasks")
    .select("level, status")
    .eq("id", taskId)
    .single();

  if (!task) throw new Error("Task not found");

  let newStatus: TaskStatus;
  let newLevel: TaskLevel | undefined;

  // في فروع تستخدم سلسلة الأربع طبقات يُتجاوَز اعتماد المشرف؛ يصعد الاعتماد
  // مباشرة من رئيس القسم إلى المدير التنفيذي.
  const { fourTierWorkflow } = getBranchFlags();

  switch (task.status) {
    case "PendingDeptHeadReview":
      if (fourTierWorkflow) {
        newStatus = "PendingExecutiveReview";
        newLevel = "Executive";
      } else {
        newStatus = "PendingSupervisorReview";
        newLevel = "Supervisor";
      }
      break;
    case "PendingSupervisorReview":
      // يبقى هذا المسار للتوافق مع المهام القديمة على الفروع التقليدية،
      // ولأي مهمة عالقة في PendingSupervisorReview قبل تفعيل سلسلة الأربع طبقات.
      newStatus = "PendingExecutiveReview";
      newLevel = "Executive";
      break;
    case "PendingExecutiveReview":
      newStatus = "PendingGMApproval";
      break;
    case "PendingGMApproval":
      newStatus = "Approved";
      break;
    default:
      throw new Error("Invalid task status for approval");
  }

  return updateTaskStatus(taskId, newStatus, userId, notes, newLevel);
}

// Reject task and send back for revision
export async function rejectTask(taskId: string, userId: string, notes: string) {
  return updateTaskStatus(taskId, "NeedRevision", userId, notes, "Employee");
}

// Check if all tasks for a request are approved
export async function checkRequestCompletion(requestId: string) {
  const { data: tasks, error } = await supabase
    .from("tasks")
    .select("status")
    .eq("request_id", requestId);

  if (error) throw error;

  const allApproved = tasks.every((t) => t.status === "Approved");
  return allApproved;
}

// Close request (only GM can do this)
export async function closeRequest(requestId: string, userId: string) {
  const { data, error } = await supabase
    .from("requests")
    .update({
      status: "Closed" as RequestStatus,
      closed_by: userId,
      closed_at: new Date().toISOString(),
    })
    .eq("id", requestId)
    .select()
    .single();

  if (error) throw error;
  return data;
}
