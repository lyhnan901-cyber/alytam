import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface UseAllowedDepartmentsResult {
  /** قائمة معرّفات الأقسام المسموح بها للمستخدم. null = لا قيود (يرى الكل). */
  allowedDepartmentIds: string[] | null;
  /** هل المستخدم مقيَّد فعلاً (لديه قائمة بيضاء)؟ */
  isRestricted: boolean;
  /** هل التحميل جارٍ؟ */
  loading: boolean;
  /** أعد التحميل يدوياً. */
  refetch: () => Promise<void>;
  /** هل يمكن للمستخدم الوصول لقسم معيّن؟ يحترم: GM، NULL dept، عدم وجود قيود. */
  canAccessDepartment: (departmentId: string | null | undefined) => boolean;
}

/**
 * يجلب قائمة الأقسام المسموح بها للمستخدم الحالي من جدول
 * `user_department_access`. غياب الصفوف يعني عدم وجود قيود.
 *
 * المدير العام (GeneralManager) دائماً غير مقيَّد ويرى الكل، حتى لو وُجدت
 * صفوف له في الجدول لأي سبب.
 */
export function useAllowedDepartments(): UseAllowedDepartmentsResult {
  const { user, isGeneralManager } = useAuth();
  const [allowedDepartmentIds, setAllowedDepartmentIds] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!user) {
      setAllowedDepartmentIds(null);
      setLoading(false);
      return;
    }

    if (isGeneralManager) {
      // المدير العام دائماً يرى كل الأقسام — لا حاجة للاستعلام.
      setAllowedDepartmentIds(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from("user_department_access")
      .select("department_id")
      .eq("user_id", user.id);

    if (error) {
      // لا نُسقط الواجهة — في حالة الخطأ نعتبر المستخدم غير مقيَّد كي لا
      // نخفي شيئاً عن غير قصد. RLS هو الحارس النهائي على القراءة.
      console.error("[useAllowedDepartments] failed to fetch:", error);
      setAllowedDepartmentIds(null);
    } else if (!data || data.length === 0) {
      setAllowedDepartmentIds(null);
    } else {
      setAllowedDepartmentIds(data.map((r) => r.department_id));
    }
    setLoading(false);
  }, [user, isGeneralManager]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const isRestricted = allowedDepartmentIds !== null;

  const canAccessDepartment = useCallback(
    (departmentId: string | null | undefined) => {
      if (isGeneralManager) return true;
      if (!departmentId) return true;
      if (!isRestricted) return true;
      return allowedDepartmentIds!.includes(departmentId);
    },
    [allowedDepartmentIds, isRestricted, isGeneralManager]
  );

  return {
    allowedDepartmentIds,
    isRestricted,
    loading,
    refetch: fetch,
    canAccessDepartment,
  };
}
