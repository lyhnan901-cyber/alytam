import { supabase } from "@/integrations/supabase/client";
import { createNotification } from "./notifications";
import type { Json } from "@/integrations/supabase/types";

// Types
export type TriggerEvent = "task_created" | "task_status_changed" | "task_overdue";

export interface ConditionJson {
  status?: string[];
  priority?: string[];
  department_id?: string;
  level?: string[];
}

export interface ActionJson {
  type: "send_notification" | "change_priority" | "change_assignee";
  target?: "assignee" | "department_head" | "supervisor" | "executive" | "assignee_and_department_head";
  title?: string;
  message?: string;
  new_priority?: "High" | "Medium" | "Low";
}

export interface TaskData {
  id: string;
  title: string;
  status: string;
  priority: string;
  level: string;
  department_id: string | null;
  assignee_id: string | null;
  request_id: string;
}

// Helper to safely parse JSON fields
function parseConditionJson(json: Json): ConditionJson {
  if (typeof json === 'object' && json !== null && !Array.isArray(json)) {
    return json as unknown as ConditionJson;
  }
  return {};
}

function parseActionJson(json: Json): ActionJson | null {
  if (typeof json === 'object' && json !== null && !Array.isArray(json)) {
    const obj = json as Record<string, unknown>;
    if (obj.type && typeof obj.type === 'string') {
      return obj as unknown as ActionJson;
    }
  }
  return null;
}

// Evaluate conditions against task data
export function evaluateConditions(task: TaskData, conditions: ConditionJson): boolean {
  // If no conditions, always match
  if (Object.keys(conditions).length === 0) return true;

  // Check status condition
  if (conditions.status && conditions.status.length > 0) {
    if (!conditions.status.includes(task.status)) return false;
  }

  // Check priority condition
  if (conditions.priority && conditions.priority.length > 0) {
    if (!conditions.priority.includes(task.priority)) return false;
  }

  // Check department condition
  if (conditions.department_id) {
    if (task.department_id !== conditions.department_id) return false;
  }

  // Check level condition
  if (conditions.level && conditions.level.length > 0) {
    if (!conditions.level.includes(task.level)) return false;
  }

  return true;
}

// Get target user IDs for notification
async function getTargetUserIds(
  target: ActionJson["target"],
  task: TaskData
): Promise<string[]> {
  const userIds: string[] = [];

  switch (target) {
    case "assignee":
      if (task.assignee_id) userIds.push(task.assignee_id);
      break;

    case "department_head":
      if (task.department_id) {
        const { data: deptUsers } = await supabase
          .from("profiles")
          .select("id")
          .eq("department_id", task.department_id);

        if (deptUsers) {
          for (const user of deptUsers) {
            const { data: roles } = await supabase
              .from("user_roles")
              .select("role")
              .eq("user_id", user.id)
              .eq("role", "DepartmentHead")
              .single();

            if (roles) {
              userIds.push(user.id);
              break;
            }
          }
        }
      }
      break;

    case "supervisor":
      const { data: supervisors } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "Supervisor");

      if (supervisors && supervisors.length > 0) {
        userIds.push(supervisors[0].user_id);
      }
      break;

    case "executive":
      const { data: executives } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "ExecutiveManager");

      if (executives && executives.length > 0) {
        userIds.push(executives[0].user_id);
      }
      break;

    case "assignee_and_department_head":
      if (task.assignee_id) userIds.push(task.assignee_id);
      if (task.department_id) {
        const { data: deptUsers2 } = await supabase
          .from("profiles")
          .select("id")
          .eq("department_id", task.department_id);

        if (deptUsers2) {
          for (const user of deptUsers2) {
            const { data: roles } = await supabase
              .from("user_roles")
              .select("role")
              .eq("user_id", user.id)
              .eq("role", "DepartmentHead")
              .single();

            if (roles && !userIds.includes(user.id)) {
              userIds.push(user.id);
              break;
            }
          }
        }
      }
      break;
  }

  return userIds;
}

// Replace template variables in message
function replaceTemplateVars(text: string, task: TaskData): string {
  return text
    .replace(/\{\{task_title\}\}/g, task.title)
    .replace(/\{\{task_status\}\}/g, task.status)
    .replace(/\{\{task_priority\}\}/g, task.priority);
}

// Execute action for a matched rule
export async function executeAction(
  task: TaskData,
  action: ActionJson,
  userId: string
): Promise<void> {
  switch (action.type) {
    case "send_notification":
      const targetUserIds = await getTargetUserIds(action.target, task);
      const title = replaceTemplateVars(action.title || "إشعار أتمتة", task);
      const message = replaceTemplateVars(action.message || "", task);

      for (const targetUserId of targetUserIds) {
        if (targetUserId !== userId) {
          await createNotification({
            userId: targetUserId,
            title,
            message,
            type: "info",
            relatedTaskId: task.id,
          });
        }
      }
      break;

    case "change_priority":
      if (action.new_priority) {
        await supabase
          .from("tasks")
          .update({ priority: action.new_priority })
          .eq("id", task.id);
      }
      break;

    case "change_assignee":
      const newAssignees = await getTargetUserIds(action.target, task);
      if (newAssignees.length > 0) {
        await supabase
          .from("tasks")
          .update({ assignee_id: newAssignees[0] })
          .eq("id", task.id);
      }
      break;
  }
}

// Main function to run all matching automations
export async function runAutomations(
  event: TriggerEvent,
  task: TaskData,
  userId: string
): Promise<void> {
  try {
    // Fetch active rules for this trigger
    const { data: rules, error } = await supabase
      .from("automation_rules")
      .select("*")
      .eq("is_active", true)
      .eq("trigger_event", event);

    if (error) {
      console.error("Error fetching automation rules:", error);
      return;
    }

    if (!rules || rules.length === 0) return;

    // Process each rule
    for (const rule of rules) {
      const conditions = parseConditionJson(rule.condition_json);
      const action = parseActionJson(rule.action_json);

      if (action && evaluateConditions(task, conditions)) {
        console.log(`Running automation: ${rule.name}`);
        await executeAction(task, action, userId);
      }
    }
  } catch (error) {
    console.error("Error running automations:", error);
  }
}

// Check for overdue tasks and run automations
export async function checkOverdueTasks(userId: string): Promise<void> {
  try {
    const today = new Date().toISOString().split("T")[0];

    const { data: overdueTasks, error } = await supabase
      .from("tasks")
      .select("*")
      .lt("due_date", today)
      .not("status", "in", '("Completed","Approved","Rejected")');

    if (error) {
      console.error("Error fetching overdue tasks:", error);
      return;
    }

    if (!overdueTasks || overdueTasks.length === 0) return;

    for (const task of overdueTasks) {
      const taskData: TaskData = {
        id: task.id,
        title: task.title,
        status: task.status,
        priority: task.priority,
        level: task.level,
        department_id: task.department_id,
        assignee_id: task.assignee_id,
        request_id: task.request_id,
      };

      await runAutomations("task_overdue", taskData, userId);
    }
  } catch (error) {
    console.error("Error checking overdue tasks:", error);
  }
}
