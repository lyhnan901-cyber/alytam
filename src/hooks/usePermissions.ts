 import { useState, useEffect, useCallback } from 'react';
 import { supabase } from '@/integrations/supabase/client';
 import { useAuth } from './useAuth';
 import { PermissionKey, RoleKey } from '@/lib/permissions';
 
 interface RolePermissions {
   role: RoleKey;
   permissions: string[];
 }
 
 interface UsePermissionsReturn {
   permissions: Record<PermissionKey, boolean>;
   allRolePermissions: RolePermissions[];
   loading: boolean;
   error: string | null;
   hasPermission: (permission: PermissionKey) => boolean;
   updateRolePermissions: (role: RoleKey, permissions: string[]) => Promise<boolean>;
   refetch: () => void;
 }
 
 export function usePermissions(): UsePermissionsReturn {
   const { role, isGeneralManager } = useAuth();
   const [allRolePermissions, setAllRolePermissions] = useState<RolePermissions[]>([]);
   const [userPermissions, setUserPermissions] = useState<string[]>([]);
   const [loading, setLoading] = useState(true);
   const [error, setError] = useState<string | null>(null);
 
   const fetchPermissions = useCallback(async () => {
     try {
       setLoading(true);
       setError(null);
 
       // جلب جميع صلاحيات الأدوار
       const { data, error: fetchError } = await supabase
         .from('role_permissions')
         .select('role, permissions');
 
       if (fetchError) {
         throw fetchError;
       }
 
       if (data) {
         setAllRolePermissions(data as RolePermissions[]);
         
         // تعيين صلاحيات المستخدم الحالي
         if (role) {
           const currentRolePerms = data.find(r => r.role === role);
           setUserPermissions(currentRolePerms?.permissions || []);
         }
       }
     } catch (err) {
       console.error('Error fetching permissions:', err);
       setError('فشل في تحميل الصلاحيات');
     } finally {
       setLoading(false);
     }
   }, [role]);
 
   useEffect(() => {
     fetchPermissions();
   }, [fetchPermissions]);
 
   // فحص صلاحية معينة
   const hasPermission = useCallback((permission: PermissionKey): boolean => {
     // المدير العام لديه جميع الصلاحيات
     if (isGeneralManager) return true;
     return userPermissions.includes(permission);
   }, [userPermissions, isGeneralManager]);
 
   // إنشاء كائن الصلاحيات
   const permissions = new Proxy({} as Record<PermissionKey, boolean>, {
     get: (_, prop: string) => hasPermission(prop as PermissionKey),
   });
 
   // تحديث صلاحيات دور معين (للمدير العام فقط)
   const updateRolePermissions = async (roleToUpdate: RoleKey, newPermissions: string[]): Promise<boolean> => {
     try {
       const { error: updateError } = await supabase
         .from('role_permissions')
         .update({ permissions: newPermissions })
         .eq('role', roleToUpdate);
 
       if (updateError) {
         throw updateError;
       }
 
       // تحديث الحالة المحلية
       setAllRolePermissions(prev => 
         prev.map(rp => 
           rp.role === roleToUpdate 
             ? { ...rp, permissions: newPermissions }
             : rp
         )
       );
 
       return true;
     } catch (err) {
       console.error('Error updating permissions:', err);
       setError('فشل في تحديث الصلاحيات');
       return false;
     }
   };
 
   return {
     permissions,
     allRolePermissions,
     loading,
     error,
     hasPermission,
     updateRolePermissions,
     refetch: fetchPermissions,
   };
 }