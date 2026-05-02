// نقطة الاتصال بـ Supabase.
//
// التطبيق يدعم تعدد الفروع (نفس الكود + نفس الـ deployment، لكل فرع قاعدة بيانات
// منفصلة). يتم اختيار قاعدة البيانات تلقائياً حسب الـ subdomain الذي يفتح منه
// المستخدم التطبيق:
//   branch1.example.com → قاعدة الفرع الأول
//   branch2.example.com → قاعدة الفرع الثاني
// أي subdomain آخر (أو localhost) يستخدم القيم الافتراضية من VITE_SUPABASE_URL
// و VITE_SUPABASE_PUBLISHABLE_KEY.
//
// لإضافة فرع جديد لاحقاً: أضِف عناصر إلى الخريطة في getBranchConfig() أدناه
// وأضف متغيرات البيئة المقابلة في إعدادات النشر (راجع supabase/README.md).

import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

type BranchConfig = {
  url: string;
  publishableKey: string;
  storageKey: string;
};

const DEFAULT_URL = import.meta.env.VITE_SUPABASE_URL as string;
const DEFAULT_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

function readEnv(name: string): string | undefined {
  // Vite يستبدل import.meta.env.X في وقت البناء، فلا يمكن قراءة القيم بمفاتيح
  // ديناميكية مباشرةً. نستخدم خريطة صريحة للحصول على دعم الـ tree-shaking.
  const env = import.meta.env as Record<string, string | undefined>;
  return env[name];
}

function getBranchConfig(): BranchConfig {
  // خريطة الفروع: subdomain → أسماء متغيرات البيئة لقاعدة البيانات الخاصة بالفرع.
  // أضِف هنا أي فرع جديد.
  const branchEnvMap: Record<string, { urlVar: string; keyVar: string }> = {
    branch1: {
      urlVar: "VITE_BRANCH1_SUPABASE_URL",
      keyVar: "VITE_BRANCH1_SUPABASE_PUBLISHABLE_KEY",
    },
    branch2: {
      urlVar: "VITE_BRANCH2_SUPABASE_URL",
      keyVar: "VITE_BRANCH2_SUPABASE_PUBLISHABLE_KEY",
    },
  };

  const fallback: BranchConfig = {
    url: DEFAULT_URL,
    publishableKey: DEFAULT_KEY,
    storageKey: "sb-auth-default",
  };

  if (typeof window === "undefined") {
    return fallback;
  }

  const hostname = window.location.hostname;
  // خذ أول مقطع من الـ hostname كـ subdomain (مثلاً "branch2" من
  // branch2.alyatama.org أو branch2.app.example.com).
  const sub = hostname.split(".")[0]?.toLowerCase();
  const cfg = sub ? branchEnvMap[sub] : undefined;

  if (cfg) {
    const url = readEnv(cfg.urlVar);
    const key = readEnv(cfg.keyVar);
    if (url && key) {
      return {
        url,
        publishableKey: key,
        // مفتاح تخزين منفصل لكل فرع لمنع تسرب الجلسات بين الفروع.
        storageKey: `sb-auth-${sub}`,
      };
    }
    // إذا الـ subdomain يدلّ على فرع لكن متغيراته غير معرّفة في البيئة،
    // نسجّل تحذيراً ونرجع للافتراضي بدل الفشل الصامت.
    if (typeof console !== "undefined") {
      console.warn(
        `[supabase] الفرع "${sub}" مطلوب من الـ subdomain لكن متغيرات البيئة ` +
          `${cfg.urlVar} / ${cfg.keyVar} غير مضبوطة — يتم استخدام الإعدادات الافتراضية.`,
      );
    }
  }

  return fallback;
}

const config = getBranchConfig();

export const supabase = createClient<Database>(
  config.url,
  config.publishableKey,
  {
    auth: {
      storage: typeof window !== "undefined" ? window.localStorage : undefined,
      storageKey: config.storageKey,
      persistSession: true,
      autoRefreshToken: true,
    },
  },
);
