 import { useState, useEffect } from "react";
 import { useNavigate } from "react-router-dom";
 import { useAuth } from "@/hooks/useAuth";
 import { usePermissions } from "@/hooks/usePermissions";
 import { 
   ALL_PERMISSIONS, 
   ROLES, 
   getPermissionsByCategory, 
   PermissionKey, 
   RoleKey 
 } from "@/lib/permissions";
 import { Button } from "@/components/ui/button";
 import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
 import { Checkbox } from "@/components/ui/checkbox";
 import { Badge } from "@/components/ui/badge";
 import { useToast } from "@/hooks/use-toast";
 import { Loader2, Shield, Save, RotateCcw, Lock, CheckCircle2 } from "lucide-react";
 import { 
   Table, 
   TableBody, 
   TableCell, 
   TableHead, 
   TableHeader, 
   TableRow 
 } from "@/components/ui/table";
 import {
   Accordion,
   AccordionContent,
   AccordionItem,
   AccordionTrigger,
 } from "@/components/ui/accordion";
 
 const Permissions = () => {
   const navigate = useNavigate();
   const { isGeneralManager, loading: authLoading } = useAuth();
   const { allRolePermissions, loading: permLoading, updateRolePermissions, refetch } = usePermissions();
   const { toast } = useToast();
   
   const [localPermissions, setLocalPermissions] = useState<Record<RoleKey, string[]>>({} as Record<RoleKey, string[]>);
   const [saving, setSaving] = useState(false);
   const [hasChanges, setHasChanges] = useState(false);
 
   // تهيئة الصلاحيات المحلية من البيانات المحملة
   useEffect(() => {
     if (allRolePermissions.length > 0) {
       const permsMap: Record<RoleKey, string[]> = {} as Record<RoleKey, string[]>;
       allRolePermissions.forEach(rp => {
         permsMap[rp.role as RoleKey] = [...rp.permissions];
       });
       setLocalPermissions(permsMap);
       setHasChanges(false);
     }
   }, [allRolePermissions]);
 
   // التحقق من صلاحية الوصول
   if (authLoading || permLoading) {
     return (
       <div className="min-h-screen flex items-center justify-center">
         <Loader2 className="w-8 h-8 animate-spin text-primary" />
       </div>
     );
   }
 
   if (!isGeneralManager) {
     return (
       <div className="min-h-screen flex flex-col items-center justify-center gap-4">
         <Lock className="w-16 h-16 text-muted-foreground" />
         <h1 className="text-2xl font-bold">غير مسموح</h1>
         <p className="text-muted-foreground">ليس لديك صلاحية للوصول إلى هذه الصفحة</p>
         <Button onClick={() => navigate("/")}>العودة للرئيسية</Button>
       </div>
     );
   }
 
   const permissionsByCategory = getPermissionsByCategory();
   const rolesExceptGM = Object.keys(ROLES).filter(r => r !== 'GeneralManager') as RoleKey[];
 
   // تبديل صلاحية معينة لدور معين
   const togglePermission = (role: RoleKey, permission: PermissionKey) => {
     setLocalPermissions(prev => {
       const currentPerms = prev[role] || [];
       const hasPermission = currentPerms.includes(permission);
       
       const newPerms = hasPermission
         ? currentPerms.filter(p => p !== permission)
         : [...currentPerms, permission];
       
       return { ...prev, [role]: newPerms };
     });
     setHasChanges(true);
   };
 
   // تبديل جميع صلاحيات فئة معينة لدور معين
   const toggleCategoryForRole = (role: RoleKey, _category: string, permissions: typeof ALL_PERMISSIONS[PermissionKey][]) => {
     const permKeys = permissions.map(p => p.key);
     const currentPerms = localPermissions[role] || [];
     const allHave = permKeys.every(pk => currentPerms.includes(pk));
     
     setLocalPermissions(prev => {
       if (allHave) {
         // إزالة جميع صلاحيات هذه الفئة
         return { ...prev, [role]: currentPerms.filter(p => !permKeys.includes(p as PermissionKey)) };
       } else {
         // إضافة جميع صلاحيات هذه الفئة
         const newPerms = [...new Set([...currentPerms, ...permKeys])];
         return { ...prev, [role]: newPerms };
       }
     });
     setHasChanges(true);
   };
 
   // حفظ التغييرات
   const handleSave = async () => {
     setSaving(true);
     try {
       for (const role of rolesExceptGM) {
         const success = await updateRolePermissions(role, localPermissions[role] || []);
         if (!success) {
           throw new Error(`فشل في تحديث صلاحيات ${ROLES[role].label}`);
         }
       }
       
       toast({
         title: "تم الحفظ بنجاح",
         description: "تم تحديث صلاحيات الأدوار",
       });
       setHasChanges(false);
     } catch (error) {
       toast({
         variant: "destructive",
         title: "خطأ",
         description: "فشل في حفظ التغييرات",
       });
     } finally {
       setSaving(false);
     }
   };
 
   // إعادة تعيين التغييرات
   const handleReset = () => {
     refetch();
     setHasChanges(false);
   };
 
   // حساب نسبة الصلاحيات لكل دور
   const getPermissionPercentage = (role: RoleKey) => {
     const total = Object.keys(ALL_PERMISSIONS).length;
     const has = (localPermissions[role] || []).length;
     return Math.round((has / total) * 100);
   };
 
   return (
     <div className="space-y-6">
       {/* Header */}
       <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
         <div>
           <h1 className="text-2xl font-bold flex items-center gap-2">
             <Shield className="w-7 h-7 text-primary" />
             إدارة الصلاحيات
           </h1>
           <p className="text-muted-foreground mt-1">
             تحكم في صلاحيات كل دور في النظام
           </p>
         </div>
         
         <div className="flex gap-2">
           <Button
             variant="outline"
             onClick={handleReset}
             disabled={!hasChanges || saving}
           >
             <RotateCcw className="w-4 h-4 ml-2" />
             إلغاء التغييرات
           </Button>
           <Button
             onClick={handleSave}
             disabled={!hasChanges || saving}
           >
             {saving ? (
               <Loader2 className="w-4 h-4 ml-2 animate-spin" />
             ) : (
               <Save className="w-4 h-4 ml-2" />
             )}
             حفظ التغييرات
           </Button>
         </div>
       </div>
 
       {/* ملخص الأدوار */}
       <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
         {rolesExceptGM.map(role => (
           <Card key={role} className="text-center">
             <CardHeader className="pb-2">
               <CardTitle className="text-sm font-medium">
                 {ROLES[role].label}
               </CardTitle>
             </CardHeader>
             <CardContent>
               <div className="text-2xl font-bold text-primary">
                 {getPermissionPercentage(role)}%
               </div>
               <p className="text-xs text-muted-foreground">
                 {(localPermissions[role] || []).length} / {Object.keys(ALL_PERMISSIONS).length}
               </p>
             </CardContent>
           </Card>
         ))}
       </div>
 
       {/* جدول الصلاحيات */}
       <Card>
         <CardHeader>
           <CardTitle>مصفوفة الصلاحيات</CardTitle>
           <CardDescription>
             اختر الصلاحيات المناسبة لكل دور. المدير العام لديه جميع الصلاحيات تلقائياً.
           </CardDescription>
         </CardHeader>
         <CardContent>
           <Accordion type="multiple" className="w-full" defaultValue={Object.keys(permissionsByCategory)}>
             {Object.entries(permissionsByCategory).map(([category, permissions]) => (
               <AccordionItem key={category} value={category}>
                 <AccordionTrigger className="hover:no-underline">
                   <div className="flex items-center gap-2">
                     <Badge variant="outline">{permissions.length}</Badge>
                     <span>{category}</span>
                   </div>
                 </AccordionTrigger>
                 <AccordionContent>
                   <div className="overflow-x-auto">
                     <Table>
                       <TableHeader>
                         <TableRow>
                           <TableHead className="w-[200px]">الصلاحية</TableHead>
                           {rolesExceptGM.map(role => (
                             <TableHead key={role} className="text-center min-w-[100px]">
                               <div className="flex flex-col items-center gap-1">
                                 <span className="text-xs">{ROLES[role].label}</span>
                                 <Button
                                   variant="ghost"
                                   size="sm"
                                   className="h-6 text-xs"
                                   onClick={() => toggleCategoryForRole(role, category, permissions)}
                                 >
                                   {permissions.every(p => (localPermissions[role] || []).includes(p.key))
                                     ? "إلغاء الكل"
                                     : "تحديد الكل"
                                   }
                                 </Button>
                               </div>
                             </TableHead>
                           ))}
                         </TableRow>
                       </TableHeader>
                       <TableBody>
                         {permissions.map(permission => (
                           <TableRow key={permission.key}>
                             <TableCell className="font-medium">
                               {permission.label}
                             </TableCell>
                             {rolesExceptGM.map(role => {
                               const hasPermission = (localPermissions[role] || []).includes(permission.key);
                               return (
                                 <TableCell key={role} className="text-center">
                                   <div className="flex justify-center">
                                     <Checkbox
                                       checked={hasPermission}
                                       onCheckedChange={() => togglePermission(role, permission.key)}
                                       className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                                     />
                                   </div>
                                 </TableCell>
                               );
                             })}
                           </TableRow>
                         ))}
                       </TableBody>
                     </Table>
                   </div>
                 </AccordionContent>
               </AccordionItem>
             ))}
           </Accordion>
         </CardContent>
       </Card>
 
       {/* ملاحظة المدير العام */}
       <Card className="border-primary/20 bg-primary/5">
         <CardContent className="flex items-center gap-3 py-4">
           <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
           <p className="text-sm">
             <strong>ملاحظة:</strong> المدير العام لديه جميع الصلاحيات تلقائياً ولا يمكن تعديل صلاحياته.
           </p>
         </CardContent>
       </Card>
     </div>
   );
 };
 
 export default Permissions;