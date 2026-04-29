 // تعريف جميع الصلاحيات المتاحة في النظام
 export const ALL_PERMISSIONS = {
   // لوحة التحكم
   dashboard_view: { key: 'dashboard_view', label: 'عرض لوحة التحكم', category: 'لوحة التحكم' },
   
   // الطلبات
   requests_view: { key: 'requests_view', label: 'عرض الطلبات', category: 'الطلبات' },
   requests_create: { key: 'requests_create', label: 'إنشاء طلب', category: 'الطلبات' },
   requests_edit: { key: 'requests_edit', label: 'تعديل الطلبات', category: 'الطلبات' },
   requests_delete: { key: 'requests_delete', label: 'حذف الطلبات', category: 'الطلبات' },
   
   // المهام
   tasks_view: { key: 'tasks_view', label: 'عرض المهام', category: 'المهام' },
   tasks_create: { key: 'tasks_create', label: 'إنشاء مهمة', category: 'المهام' },
   tasks_edit: { key: 'tasks_edit', label: 'تعديل المهام', category: 'المهام' },
   tasks_delete: { key: 'tasks_delete', label: 'حذف المهام', category: 'المهام' },
   tasks_assign: { key: 'tasks_assign', label: 'تعيين المهام', category: 'المهام' },
   
   // المستخدمين
   users_view: { key: 'users_view', label: 'عرض المستخدمين', category: 'المستخدمين' },
   users_create: { key: 'users_create', label: 'إنشاء مستخدم', category: 'المستخدمين' },
   users_edit: { key: 'users_edit', label: 'تعديل المستخدمين', category: 'المستخدمين' },
   users_deactivate: { key: 'users_deactivate', label: 'تعطيل المستخدمين', category: 'المستخدمين' },
   
   // الأقسام
   departments_view: { key: 'departments_view', label: 'عرض الأقسام', category: 'الأقسام' },
   departments_manage: { key: 'departments_manage', label: 'إدارة الأقسام', category: 'الأقسام' },
   
   // التقارير
   reports_view: { key: 'reports_view', label: 'عرض التقارير', category: 'التقارير' },
   reports_export: { key: 'reports_export', label: 'تصدير التقارير', category: 'التقارير' },
   
   // إدارة الحالات
   leads_view: { key: 'leads_view', label: 'عرض الحالات', category: 'إدارة الحالات' },
   leads_create: { key: 'leads_create', label: 'إضافة حالة مستفيدة', category: 'إدارة الحالات' },
   leads_edit: { key: 'leads_edit', label: 'تعديل حالة', category: 'إدارة الحالات' },
   leads_delete: { key: 'leads_delete', label: 'حذف حالة', category: 'إدارة الحالات' },
   
   // المستندات
   docs_view: { key: 'docs_view', label: 'عرض المستندات', category: 'المستندات' },
   docs_create: { key: 'docs_create', label: 'إنشاء مستند', category: 'المستندات' },
   docs_edit: { key: 'docs_edit', label: 'تعديل المستندات', category: 'المستندات' },
   docs_delete: { key: 'docs_delete', label: 'حذف المستندات', category: 'المستندات' },
   
   // الإعدادات
   settings_view: { key: 'settings_view', label: 'عرض الإعدادات', category: 'الإعدادات' },
   settings_manage: { key: 'settings_manage', label: 'إدارة الإعدادات', category: 'الإعدادات' },
   
   // التعميمات
   announcements_manage: { key: 'announcements_manage', label: 'إدارة التعميمات', category: 'التعميمات' },
   
   // سجل الأنشطة
   activity_log_view: { key: 'activity_log_view', label: 'عرض سجل الأنشطة', category: 'سجل الأنشطة' },
   
   // إدارة الصلاحيات
   permissions_manage: { key: 'permissions_manage', label: 'إدارة الصلاحيات', category: 'الصلاحيات' },
 } as const;
 
 export type PermissionKey = keyof typeof ALL_PERMISSIONS;
 
 // تعريف الأدوار
 export const ROLES = {
   GeneralManager: { key: 'GeneralManager', label: 'المدير العام' },
   ExecutiveManager: { key: 'ExecutiveManager', label: 'المدير التنفيذي' },
   Supervisor: { key: 'Supervisor', label: 'المشرف' },
   DepartmentHead: { key: 'DepartmentHead', label: 'رئيس القسم' },
   CustomerService: { key: 'CustomerService', label: 'خدمة المستفيدين' },
   Employee: { key: 'Employee', label: 'موظف' },
 } as const;
 
 export type RoleKey = keyof typeof ROLES;
 
 // تجميع الصلاحيات حسب الفئة
 export const getPermissionsByCategory = () => {
   const categories: Record<string, typeof ALL_PERMISSIONS[PermissionKey][]> = {};
   
   Object.values(ALL_PERMISSIONS).forEach(permission => {
     if (!categories[permission.category]) {
       categories[permission.category] = [];
     }
     categories[permission.category].push(permission);
   });
   
   return categories;
 };
 
 // قائمة الأدوار للعرض
 export const ROLES_LIST = Object.values(ROLES);
 
 // قائمة الصلاحيات للعرض
 export const PERMISSIONS_LIST = Object.values(ALL_PERMISSIONS);