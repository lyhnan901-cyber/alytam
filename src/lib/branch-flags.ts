// راية ميزات (Feature flags) خاصة بكل فرع.
//
// التطبيق ينشر فروعاً متعددة من نفس الكود (راجع `client.ts` لاكتشاف الفرع
// المعتمد على الـ subdomain). بعض السلوكيات تختلف بين الفروع. هذا الملف هو
// المصدر الوحيد للحقيقة لتلك الفروقات السلوكية حتى لا تتشتّت الفحوصات في
// أنحاء الكود.
//
// **هام:** الفحص يعتمد على `window.location.hostname`، فيتم في وقت التشغيل
// داخل المتصفح. لا تستدعِ هذه الدوال خلال SSR/build (لا يوجد SSR هنا).

/** subdomain مخصّص للفرع الذي يطبّق الـ workflow الجديد ذو الأربع طبقات. */
const FOUR_TIER_BRANCH_SUBDOMAIN = "branch2";

export function getCurrentBranchSubdomain(): string | null {
  if (typeof window === "undefined") return null;
  const host = window.location.hostname;
  const sub = host.split(".")[0]?.toLowerCase();
  return sub || null;
}

export interface BranchFeatureFlags {
  /**
   * عند تفعيلها يستخدم النظام سلسلة المهام ذات الأربع طبقات:
   *   GeneralManager → ExecutiveManager → DepartmentHead → Employee
   * ويُستثنى دور Supervisor من السلسلة ومن واجهات إدارة الأدوار/الصلاحيات.
   *
   * عند تعطيلها يبقى السلوك التقليدي بخمس طبقات (مع المشرف).
   */
  fourTierWorkflow: boolean;
}

export function getBranchFlags(): BranchFeatureFlags {
  const sub = getCurrentBranchSubdomain();
  return {
    fourTierWorkflow: sub === FOUR_TIER_BRANCH_SUBDOMAIN,
  };
}
