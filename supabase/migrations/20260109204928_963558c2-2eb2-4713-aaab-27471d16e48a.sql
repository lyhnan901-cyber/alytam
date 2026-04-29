-- تحديث الأقسام الحالية لوكالة التسويق الإلكتروني

-- تحديث قسم التقنية إلى تطوير المواقع والمتاجر
UPDATE departments SET 
  name = 'تطوير المواقع والمتاجر',
  description = 'تطوير وبرمجة المواقع والمتاجر الإلكترونية',
  updated_at = now()
WHERE id = 'd1000000-0000-0000-0000-000000000002';

-- تحديث قسم العمليات إلى الإعلانات الممولة
UPDATE departments SET 
  name = 'الإعلانات الممولة',
  description = 'إدارة الحملات الإعلانية المدفوعة على مختلف المنصات',
  updated_at = now()
WHERE id = 'd1000000-0000-0000-0000-000000000005';

-- تحديث قسم المالية إلى الإدارة والاستراتيجية
UPDATE departments SET 
  name = 'الإدارة والاستراتيجية',
  description = 'التخطيط الاستراتيجي وإدارة الوكالة',
  updated_at = now()
WHERE id = 'd1000000-0000-0000-0000-000000000004';

-- تحديث قسم المبيعات إلى المبيعات وخدمة العملاء
UPDATE departments SET 
  name = 'المبيعات وخدمة العملاء',
  description = 'إدارة المبيعات والتواصل مع العملاء',
  updated_at = now()
WHERE id = 'd1000000-0000-0000-0000-000000000001';

-- تحديث قسم خدمة العملاء إلى إدارة السوشيال ميديا
UPDATE departments SET 
  name = 'إدارة السوشيال ميديا',
  description = 'إدارة حسابات التواصل الاجتماعي للعملاء',
  updated_at = now()
WHERE id = 'd1000000-0000-0000-0000-000000000006';

-- حذف قسم الموارد البشرية (لا يوجد موظفين مرتبطين)
DELETE FROM departments 
WHERE id = 'd1000000-0000-0000-0000-000000000003';

-- إضافة قسم المحتوى والتصميم
INSERT INTO departments (id, name, description, created_at, updated_at) VALUES
  (gen_random_uuid(), 'المحتوى والتصميم', 'إنشاء المحتوى الإبداعي والتصميم الجرافيكي', now(), now());

-- إضافة قسم تحسين محركات البحث (SEO)
INSERT INTO departments (id, name, description, created_at, updated_at) VALUES
  (gen_random_uuid(), 'تحسين محركات البحث (SEO)', 'تحسين ظهور المواقع في نتائج البحث', now(), now());