/**
 * Get job title based on role for مؤسسة اليتامى الخيرية التنموية
 */
export function getJobTitle(role: string | null, departmentName?: string | null): string {
  const generalTitles: Record<string, string> = {
    GeneralManager:   "المدير العام",
    ExecutiveManager: "نائب المدير التنفيذي",
    Supervisor:       "مشرف الأقسام",
    CustomerService:  "أخصائي خدمة المستفيدين",
    DepartmentHead:   "رئيس القسم",
    Employee:         "موظف",
  };

  if (role && generalTitles[role]) return generalTitles[role];

  const deptTitles: Record<string, string> = {
    "الموارد البشرية":        "أخصائي موارد بشرية",
    "الإدارة المالية":        "محاسب / أخصائي مالي",
    "إدارة المشاريع":         "مدير مشروع تنموي",
    "الإعلام والعلاقات العامة": "مسؤول إعلام وعلاقات",
    "المستفيدين والحالات":   "أخصائي دراسة حالات",
    "المخازن والإمدادات":    "أمين مخازن إغاثية",
    "التصميم والإعلام":      "مصمم / صانع محتوى خيري",
    "تنمية الموارد المالية":  "مسؤول تنمية موارد",
    "المتابعة الميدانية":    "مشرف توزيع ميداني",
    "التدريب والتطوير":      "أخصائي تدريب",
    "التقنية وتطوير الأنظمة": "مطور أنظمة / تقنية",
    "القانوني والعقود":      "مستشار قانوني",
    "الشؤون الإدارية":       "موظف إداري",
    "مركز الاتصال":          "موظف خدمة عملاء",
    "إدارة الفعاليات":       "منسق فعاليات",
    "قسم الصيانة والمباني":  "فني صيانة",
    "قسم النقل واللوجستيات": "سائق لوجستي",
    "قسم البحث والدراسات":   "باحث اجتماعي",
  };

  if (role === "DepartmentHead" && departmentName)
    return `رئيس ${departmentName}`;

  if (role === "Employee" && departmentName)
    return deptTitles[departmentName] || "موظف";

  return "مستخدم";
}

// ─── Utility Functions ─────────────────────────────────────────

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format number as Saudi Riyal
 */
export function formatSAR(amount: number): string {
  return new Intl.NumberFormat("ar-SA", {
    style: "currency",
    currency: "SAR",
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format date in Arabic locale
 */
export function formatDateAr(dateStr: string): string {
  if (!dateStr) return "";
  try {
    return new Date(dateStr).toLocaleDateString("ar-SA", {
      year: "numeric", month: "short", day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

/**
 * Get initials from full name
 */
export function getInitials(name: string): string {
  return name?.split(" ").slice(0, 2).map(w => w[0]).join("") || "م";
}

/**
 * Truncate text
 */
export function truncate(text: string, len = 60): string {
  return text?.length > len ? text.slice(0, len) + "..." : text || "";
}
