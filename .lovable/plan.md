
# خطة إنشاء صفحة تقرير مهام الموظفين

## الهدف
إنشاء صفحة تقارير شاملة للمدراء والمشرفين لمتابعة مهام كل موظف يومياً - مع إظهار مهام الأمس واليوم وحالة الإنجاز (مكتملة، قيد التنفيذ، لم تبدأ، متأخرة، إلخ).

## المميزات الرئيسية

### 1. لوحة التحكم الرئيسية
- **اختيار الموظف**: قائمة منسدلة لاختيار موظف معين أو عرض الكل
- **اختيار الفترة**: اليوم، أمس، هذا الأسبوع، فترة مخصصة
- **اختيار القسم**: تصفية حسب القسم

### 2. بطاقات الإحصائيات السريعة
- إجمالي المهام
- المهام المكتملة
- المهام قيد التنفيذ
- المهام المتأخرة
- نسبة الإنجاز
- الوقت المسجل

### 3. جدول تفصيلي للموظفين
يعرض لكل موظف:
| الموظف | القسم | مهام اليوم | مهام الأمس | المكتملة | قيد التنفيذ | المتأخرة | نسبة الإنجاز |

### 4. عرض مهام موظف محدد
عند اختيار موظف، يظهر:
- قائمة مهام اليوم مع حالة كل مهمة
- قائمة مهام الأمس مع حالة الإنجاز
- الوقت المسجل لكل مهمة
- تفاصيل المهمة والأولوية

### 5. رسوم بيانية
- مخطط دائري لتوزيع حالات المهام
- مخطط شريطي لمقارنة أداء الموظفين

### 6. التصدير
- تصدير PDF للتقرير
- تصدير CSV للبيانات

---

## التفاصيل التقنية

### الملفات الجديدة

#### 1. `src/pages/EmployeeTasksReport.tsx`
الصفحة الرئيسية للتقرير

```text
المكونات:
├── Header (عنوان + أزرار التصدير)
├── FiltersSection
│   ├── EmployeeSelect
│   ├── DepartmentSelect
│   ├── DateRangePicker
│   └── ResetFiltersButton
├── StatsCards (بطاقات الإحصائيات)
├── EmployeesTable (جدول الموظفين)
├── SelectedEmployeeDetails (تفاصيل الموظف المحدد)
│   ├── TodayTasksList
│   ├── YesterdayTasksList
│   └── TaskStatusBadges
└── ChartsSection
    ├── TaskDistributionPieChart
    └── EmployeeComparisonBarChart
```

#### 2. `src/components/employee-report/EmployeeTaskCard.tsx`
بطاقة عرض مهمة الموظف

#### 3. `src/components/employee-report/EmployeeSummaryTable.tsx`
جدول ملخص الموظفين

#### 4. `src/components/employee-report/DailyTasksSection.tsx`
قسم المهام اليومية

### تعديل الملفات الموجودة

#### 1. `src/App.tsx`
إضافة مسار جديد:
```typescript
<Route
  path="/reports/employees"
  element={
    <ProtectedRoute allowedRoles={["GeneralManager", "ExecutiveManager", "Supervisor", "DepartmentHead"]}>
      <EmployeeTasksReport />
    </ProtectedRoute>
  }
/>
```

#### 2. `src/components/layout/AppSidebar.tsx`
إضافة رابط للصفحة الجديدة في القائمة الجانبية

---

## هيكل البيانات

### استعلامات قاعدة البيانات

```sql
-- جلب المهام لموظف في تاريخ محدد
SELECT 
  t.*,
  p.full_name as assignee_name,
  d.name as department_name,
  COALESCE(SUM(te.duration_minutes), 0) as time_spent
FROM tasks t
LEFT JOIN profiles p ON t.assignee_id = p.id
LEFT JOIN departments d ON t.department_id = d.id
LEFT JOIN time_entries te ON te.task_id = t.id
WHERE t.assignee_id = $employee_id
  AND (t.due_date = $date OR t.created_at::date = $date)
GROUP BY t.id, p.full_name, d.name
```

### واجهات TypeScript

```typescript
interface EmployeeTasksSummary {
  employeeId: string;
  employeeName: string;
  departmentName: string | null;
  todayTasks: TaskDetails[];
  yesterdayTasks: TaskDetails[];
  stats: {
    total: number;
    completed: number;
    inProgress: number;
    overdue: number;
    completionRate: number;
    timeSpentMinutes: number;
  };
}

interface TaskDetails {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate: string | null;
  createdAt: string;
  completedAt: string | null;
  timeSpentMinutes: number;
}
```

---

## تصميم الواجهة

```text
┌─────────────────────────────────────────────────────────────┐
│  📊 تقرير مهام الموظفين                    [PDF] [CSV]      │
├─────────────────────────────────────────────────────────────┤
│  [القسم ▼] [الموظف ▼] [اليوم ▼] [من تاريخ] [إلى تاريخ]     │
├───────────┬───────────┬───────────┬───────────┬─────────────┤
│  📋 45    │  ✅ 32    │  🔄 8     │  ⚠️ 5     │  📈 71%     │
│  إجمالي  │  مكتملة   │  جارية    │  متأخرة   │  الإنجاز    │
├─────────────────────────────────────────────────────────────┤
│                    جدول الموظفين                            │
├──────┬────────┬──────┬──────┬──────┬──────┬──────┬─────────┤
│الموظف│ القسم  │اليوم │ أمس  │مكتمل │جاري  │متأخر │الإنجاز %│
├──────┼────────┼──────┼──────┼──────┼──────┼──────┼─────────┤
│أحمد  │التصميم │  5   │  4   │  7   │  1   │  1   │  78%    │
│سارة  │التسويق │  3   │  5   │  6   │  2   │  0   │  75%    │
└──────┴────────┴──────┴──────┴──────┴──────┴──────┴─────────┘
│                                                             │
│  ── عند اختيار موظف محدد ──                                │
│                                                             │
│  ┌─────────────────────┐  ┌─────────────────────┐          │
│  │   مهام اليوم (5)    │  │   مهام الأمس (4)    │          │
│  ├─────────────────────┤  ├─────────────────────┤          │
│  │ ✅ تصميم الشعار    │  │ ✅ مراجعة المحتوى  │          │
│  │ 🔄 تحديث الموقع    │  │ ✅ اجتماع الفريق   │          │
│  │ ⏳ إعداد التقرير   │  │ ✅ تسليم المشروع   │          │
│  └─────────────────────┘  │ ⚠️ مهمة متأخرة     │          │
│                           └─────────────────────┘          │
└─────────────────────────────────────────────────────────────┘
```

---

## ترميز حالات المهام

| الحالة | اللون | الأيقونة | التسمية |
|--------|-------|----------|---------|
| Completed/Approved | أخضر | ✅ | مكتملة |
| InProgress | برتقالي | 🔄 | قيد التنفيذ |
| New/NotStarted | رمادي | ⏳ | لم تبدأ |
| Overdue | أحمر | ⚠️ | متأخرة |
| PendingReview | أزرق | 👁️ | بانتظار المراجعة |
| Rejected | أحمر داكن | ❌ | مرفوضة |

---

## الصلاحيات

| الدور | الصلاحية |
|-------|---------|
| GeneralManager | جميع الموظفين والأقسام |
| ExecutiveManager | جميع الموظفين والأقسام |
| Supervisor | جميع الموظفين والأقسام |
| DepartmentHead | موظفي قسمه فقط |

---

## خطوات التنفيذ

1. **إنشاء المكونات الفرعية**
   - `EmployeeTaskCard.tsx`
   - `EmployeeSummaryTable.tsx`
   - `DailyTasksSection.tsx`

2. **إنشاء الصفحة الرئيسية**
   - `EmployeeTasksReport.tsx`

3. **تحديث التوجيه والقائمة**
   - تعديل `App.tsx`
   - تعديل `AppSidebar.tsx`

4. **إضافة دالة تصدير PDF**
   - إنشاء `src/lib/employee-report-pdf.ts`

---

## النتيجة المتوقعة

صفحة تقارير احترافية تتيح للمدراء:
- متابعة أداء كل موظف يومياً
- مقارنة مهام اليوم بالأمس
- معرفة المهام المتأخرة لكل موظف
- تصدير التقارير للمشاركة
- تصفية حسب القسم والموظف والتاريخ
