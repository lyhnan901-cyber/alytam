import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

// Interfaces
export interface RequestStats {
  total: number;
  byStatus: Record<string, number>;
  byPriority: Record<string, number>;
  byChannel: Record<string, number>;
  byType: Record<string, number>;
  avgProcessingDays: number;
}

export interface TaskStats {
  total: number;
  byStatus: Record<string, number>;
  byPriority: Record<string, number>;
  byLevel: Record<string, number>;
  completionRate: number;
  overdueCount: number;
  avgCompletionDays: number;
}

export interface EmployeeSummary {
  id: string;
  name: string;
  email: string;
  department: string | null;
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  overdueTasks: number;
  completionRate: number;
  totalMinutes: number;
}

export interface DepartmentSummary {
  id: string;
  name: string;
  employeeCount: number;
  totalTasks: number;
  completedTasks: number;
  completionRate: number;
  totalMinutes: number;
}

export interface LeadStats {
  total: number;
  byStatus: Record<string, number>;
  bySource: Record<string, number>;
  totalValue: number;
  wonValue: number;
  conversionRate: number;
}

export interface TimeStats {
  totalMinutes: number;
  byDepartment: { name: string; minutes: number }[];
  byEmployee: { name: string; minutes: number }[];
  topTasks: { title: string; minutes: number }[];
}

export interface ComprehensiveReportData {
  dateRange: string;
  requests: RequestStats;
  tasks: TaskStats;
  employees: EmployeeSummary[];
  departments: DepartmentSummary[];
  leads: LeadStats;
  time: TimeStats;
  summary: {
    totalRequests: number;
    totalTasks: number;
    totalLeads: number;
    totalEmployees: number;
    totalDepartments: number;
    overallCompletionRate: number;
    totalHours: number;
    totalDealsValue: number;
  };
}

function formatTime(minutes: number): string {
  if (minutes === 0) return "0 دقيقة";
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins} د`;
  if (mins === 0) return `${hours} س`;
  return `${hours}س ${mins}د`;
}

function formatNumber(num: number): string {
  return new Intl.NumberFormat("ar-SA").format(num);
}

function formatCurrency(num: number): string {
  return new Intl.NumberFormat("ar-SA", { style: "currency", currency: "SAR", maximumFractionDigits: 0 }).format(num);
}

const statusLabels: Record<string, string> = {
  New: "جديد",
  InProgress: "قيد التنفيذ",
  Completed: "مكتمل",
  Closed: "مغلق",
  NotStarted: "لم تبدأ",
  Approved: "معتمد",
  NeedRevision: "يحتاج مراجعة",
  Rejected: "مرفوض",
  PendingDeptHeadReview: "بانتظار رئيس القسم",
  PendingSupervisorReview: "بانتظار المشرف",
  PendingExecutiveReview: "بانتظار المدير التنفيذي",
  PendingGMApproval: "بانتظار المدير العام",
  new: "جديد",
  contacted: "تم التواصل",
  qualified: "مؤهل",
  proposal: "عرض سعر",
  negotiation: "تفاوض",
  won: "فاز",
  lost: "خسر",
};

const priorityLabels: Record<string, string> = {
  High: "عالي",
  Medium: "متوسط",
  Low: "منخفض",
};

const channelLabels: Record<string, string> = {
  whatsapp: "واتساب",
  phone: "هاتف",
  email: "بريد إلكتروني",
  referral: "إحالة",
  website_form: "نموذج موقع",
  website: "موقع إلكتروني",
};

const levelLabels: Record<string, string> = {
  Executive: "المدير التنفيذي",
  Supervisor: "المشرف",
  DeptHead: "رئيس القسم",
  Employee: "موظف",
};

const sourceLabels: Record<string, string> = {
  website: "الموقع",
  referral: "إحالة",
  social_media: "وسائل التواصل",
  cold_call: "اتصال بارد",
  event: "فعالية",
  other: "أخرى",
};

export async function exportComprehensiveReportPDF(data: ComprehensiveReportData) {
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  // Load Arabic font
  const fontUrl = "https://fonts.gstatic.com/s/cairo/v28/SLXgc1nY6HkvangtZmpcWmhzfH5lWWgcQyyS4J0.ttf";
  
  try {
    const response = await fetch(fontUrl);
    const fontBuffer = await response.arrayBuffer();
    const fontBase64 = btoa(
      new Uint8Array(fontBuffer).reduce((data, byte) => data + String.fromCharCode(byte), "")
    );
    
    doc.addFileToVFS("Cairo-Regular.ttf", fontBase64);
    doc.addFont("Cairo-Regular.ttf", "Cairo", "normal");
    doc.setFont("Cairo");
  } catch {
    console.warn("Could not load Arabic font, using default");
  }

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  let yPos = margin;

  const centerText = (text: string, y: number, fontSize: number = 12) => {
    doc.setFontSize(fontSize);
    const textWidth = doc.getTextWidth(text);
    doc.text(text, (pageWidth - textWidth) / 2, y);
  };

  const rightText = (text: string, y: number) => {
    doc.text(text, pageWidth - margin, y, { align: "right" });
  };

  const addNewPageIfNeeded = (requiredSpace: number = 30) => {
    if (yPos > pageHeight - requiredSpace) {
      doc.addPage();
      yPos = margin;
    }
  };

  const drawSectionTitle = (title: string) => {
    addNewPageIfNeeded(40);
    doc.setFontSize(14);
    doc.setTextColor(59, 130, 246);
    rightText(title, yPos);
    doc.setTextColor(0);
    yPos += 8;
  };

  // ========== PAGE 1: TITLE & EXECUTIVE SUMMARY ==========
  doc.setFillColor(59, 130, 246);
  doc.rect(0, 0, pageWidth, 30, "F");
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  centerText("التقرير الشامل للنظام", 18);
  yPos = 40;

  doc.setTextColor(100);
  doc.setFontSize(11);
  centerText(`الفترة: ${data.dateRange}`, yPos);
  yPos += 6;

  doc.setFontSize(9);
  doc.setTextColor(150);
  centerText(`تم الإنشاء في: ${format(new Date(), "PPPp", { locale: ar })}`, yPos);
  yPos += 15;
  doc.setTextColor(0);

  // Executive Summary Box
  doc.setFillColor(245, 245, 245);
  doc.rect(margin, yPos, pageWidth - margin * 2, 30, "F");

  const summaryStats = [
    { label: "قيمة الصفقات", value: formatCurrency(data.summary.totalDealsValue) },
    { label: "ساعات العمل", value: formatTime(data.summary.totalHours * 60) },
    { label: "نسبة الإنجاز", value: `${data.summary.overallCompletionRate}%` },
    { label: "الأقسام", value: formatNumber(data.summary.totalDepartments) },
    { label: "الموظفين", value: formatNumber(data.summary.totalEmployees) },
    { label: "الحالات المستفيدة", value: formatNumber(data.summary.totalLeads) },
    { label: "المهام", value: formatNumber(data.summary.totalTasks) },
    { label: "الطلبات", value: formatNumber(data.summary.totalRequests) },
  ];

  const statWidth = (pageWidth - margin * 2) / summaryStats.length;
  summaryStats.forEach((stat, index) => {
    const x = pageWidth - margin - statWidth * index - statWidth / 2;
    doc.setFontSize(11);
    doc.setTextColor(59, 130, 246);
    doc.text(String(stat.value), x, yPos + 12, { align: "center" });
    doc.setFontSize(7);
    doc.setTextColor(100);
    doc.text(stat.label, x, yPos + 18, { align: "center" });
  });
  yPos += 40;

  // ========== REQUESTS SECTION ==========
  drawSectionTitle("نظرة عامة على الطلبات");

  autoTable(doc, {
    startY: yPos,
    head: [["القيمة", "المقياس"]],
    body: [
      [String(data.requests.total), "إجمالي الطلبات"],
      [String(data.requests.byStatus["New"] || 0), "جديد"],
      [String(data.requests.byStatus["InProgress"] || 0), "قيد التنفيذ"],
      [String(data.requests.byStatus["Completed"] || 0), "مكتمل"],
      [String(data.requests.byStatus["Closed"] || 0), "مغلق"],
      [`${data.requests.avgProcessingDays.toFixed(1)} يوم`, "متوسط وقت المعالجة"],
    ],
    theme: "grid",
    styles: { font: "Cairo", fontSize: 9, cellPadding: 3, halign: "center" },
    headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: "bold" },
    margin: { left: pageWidth / 2 + 5, right: margin },
    tableWidth: (pageWidth - margin * 2) / 2 - 5,
  });

  // Requests by Priority & Channel
  autoTable(doc, {
    startY: yPos,
    head: [["العدد", "القناة", "العدد", "الأولوية"]],
    body: [
      [String(data.requests.byChannel["whatsapp"] || 0), "واتساب", String(data.requests.byPriority["High"] || 0), "عالي"],
      [String(data.requests.byChannel["phone"] || 0), "هاتف", String(data.requests.byPriority["Medium"] || 0), "متوسط"],
      [String(data.requests.byChannel["email"] || 0), "بريد إلكتروني", String(data.requests.byPriority["Low"] || 0), "منخفض"],
      [String(data.requests.byChannel["referral"] || 0), "إحالة", "", ""],
    ],
    theme: "grid",
    styles: { font: "Cairo", fontSize: 9, cellPadding: 3, halign: "center" },
    headStyles: { fillColor: [34, 197, 94], textColor: 255, fontStyle: "bold" },
    margin: { left: margin, right: pageWidth / 2 + 5 },
    tableWidth: (pageWidth - margin * 2) / 2 - 5,
  });

  yPos = (doc as any).lastAutoTable.finalY + 15;

  // ========== TASKS SECTION ==========
  drawSectionTitle("نظرة عامة على المهام");

  autoTable(doc, {
    startY: yPos,
    head: [["القيمة", "المقياس"]],
    body: [
      [String(data.tasks.total), "إجمالي المهام"],
      [String(data.tasks.byStatus["New"] || 0), "جديد"],
      [String(data.tasks.byStatus["NotStarted"] || 0), "لم تبدأ"],
      [String(data.tasks.byStatus["InProgress"] || 0), "قيد التنفيذ"],
      [String(data.tasks.byStatus["Completed"] || 0), "مكتمل"],
      [String(data.tasks.byStatus["Approved"] || 0), "معتمد"],
      [String(data.tasks.overdueCount), "متأخرة"],
      [`${data.tasks.completionRate}%`, "نسبة الإنجاز"],
      [`${data.tasks.avgCompletionDays.toFixed(1)} يوم`, "متوسط وقت الإنجاز"],
    ],
    theme: "grid",
    styles: { font: "Cairo", fontSize: 9, cellPadding: 3, halign: "center" },
    headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: "bold" },
    margin: { left: pageWidth / 2 + 5, right: margin },
    tableWidth: (pageWidth - margin * 2) / 2 - 5,
  });

  autoTable(doc, {
    startY: yPos,
    head: [["العدد", "المستوى", "العدد", "الأولوية"]],
    body: [
      [String(data.tasks.byLevel["Executive"] || 0), "المدير التنفيذي", String(data.tasks.byPriority["High"] || 0), "عالي"],
      [String(data.tasks.byLevel["Supervisor"] || 0), "المشرف", String(data.tasks.byPriority["Medium"] || 0), "متوسط"],
      [String(data.tasks.byLevel["DeptHead"] || 0), "رئيس القسم", String(data.tasks.byPriority["Low"] || 0), "منخفض"],
      [String(data.tasks.byLevel["Employee"] || 0), "موظف", "", ""],
    ],
    theme: "grid",
    styles: { font: "Cairo", fontSize: 9, cellPadding: 3, halign: "center" },
    headStyles: { fillColor: [249, 115, 22], textColor: 255, fontStyle: "bold" },
    margin: { left: margin, right: pageWidth / 2 + 5 },
    tableWidth: (pageWidth - margin * 2) / 2 - 5,
  });

  yPos = (doc as any).lastAutoTable.finalY + 15;

  // ========== NEW PAGE: EMPLOYEES ==========
  doc.addPage();
  yPos = margin;

  drawSectionTitle("أداء الموظفين");

  autoTable(doc, {
    startY: yPos,
    head: [["الوقت", "نسبة الإنجاز", "المتأخرة", "قيد التنفيذ", "المكتملة", "الإجمالي", "القسم", "الموظف"]],
    body: data.employees.map((e) => [
      formatTime(e.totalMinutes),
      `${e.completionRate}%`,
      String(e.overdueTasks),
      String(e.inProgressTasks),
      String(e.completedTasks),
      String(e.totalTasks),
      e.department || "-",
      e.name,
    ]),
    theme: "grid",
    styles: { font: "Cairo", fontSize: 8, cellPadding: 2, halign: "center" },
    headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [249, 250, 251] },
    margin: { left: margin, right: margin },
    columnStyles: {
      6: { halign: "right" },
      7: { halign: "right" },
    },
  });

  yPos = (doc as any).lastAutoTable.finalY + 15;

  // ========== DEPARTMENTS ==========
  drawSectionTitle("أداء الأقسام");

  autoTable(doc, {
    startY: yPos,
    head: [["الوقت المسجل", "نسبة الإنجاز", "المكتملة", "إجمالي المهام", "الموظفين", "القسم"]],
    body: data.departments.map((d) => [
      formatTime(d.totalMinutes),
      `${d.completionRate}%`,
      String(d.completedTasks),
      String(d.totalTasks),
      String(d.employeeCount),
      d.name,
    ]),
    theme: "grid",
    styles: { font: "Cairo", fontSize: 9, cellPadding: 3, halign: "center" },
    headStyles: { fillColor: [34, 197, 94], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [249, 250, 251] },
    margin: { left: margin, right: margin },
    columnStyles: {
      5: { halign: "right" },
    },
  });

  yPos = (doc as any).lastAutoTable.finalY + 15;

  // ========== NEW PAGE: LEADS & TIME ==========
  doc.addPage();
  yPos = margin;

  drawSectionTitle("نظرة عامة على الكفالات والحالات المستفيدة");

  autoTable(doc, {
    startY: yPos,
    head: [["القيمة", "المقياس"]],
    body: [
      [String(data.leads.total), "إجمالي الحالات المستفيدة"],
      [String(data.leads.byStatus["new"] || 0), "جديد"],
      [String(data.leads.byStatus["contacted"] || 0), "تم التواصل"],
      [String(data.leads.byStatus["qualified"] || 0), "مؤهل"],
      [String(data.leads.byStatus["proposal"] || 0), "عرض سعر"],
      [String(data.leads.byStatus["negotiation"] || 0), "تفاوض"],
      [String(data.leads.byStatus["won"] || 0), "فاز"],
      [String(data.leads.byStatus["lost"] || 0), "خسر"],
      [`${data.leads.conversionRate}%`, "نسبة التحويل"],
      [formatCurrency(data.leads.totalValue), "إجمالي قيمة الفرص"],
      [formatCurrency(data.leads.wonValue), "قيمة الصفقات الرابحة"],
    ],
    theme: "grid",
    styles: { font: "Cairo", fontSize: 9, cellPadding: 3, halign: "center" },
    headStyles: { fillColor: [139, 92, 246], textColor: 255, fontStyle: "bold" },
    margin: { left: pageWidth / 2 + 5, right: margin },
    tableWidth: (pageWidth - margin * 2) / 2 - 5,
  });

  autoTable(doc, {
    startY: yPos,
    head: [["العدد", "المصدر"]],
    body: Object.entries(data.leads.bySource).map(([source, count]) => [
      String(count),
      sourceLabels[source] || source,
    ]),
    theme: "grid",
    styles: { font: "Cairo", fontSize: 9, cellPadding: 3, halign: "center" },
    headStyles: { fillColor: [236, 72, 153], textColor: 255, fontStyle: "bold" },
    margin: { left: margin, right: pageWidth / 2 + 5 },
    tableWidth: (pageWidth - margin * 2) / 2 - 5,
  });

  yPos = (doc as any).lastAutoTable.finalY + 15;

  // ========== TIME TRACKING ==========
  drawSectionTitle("ملخص تتبع الوقت");

  doc.setFontSize(10);
  doc.setTextColor(0);
  doc.text(`إجمالي الوقت المسجل: ${formatTime(data.time.totalMinutes)}`, pageWidth - margin, yPos, { align: "right" });
  yPos += 10;

  // Top Tasks by Time
  autoTable(doc, {
    startY: yPos,
    head: [["الوقت المسجل", "المهمة"]],
    body: data.time.topTasks.slice(0, 10).map((t) => [formatTime(t.minutes), t.title]),
    theme: "grid",
    styles: { font: "Cairo", fontSize: 9, cellPadding: 3, halign: "center" },
    headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: "bold" },
    margin: { left: pageWidth / 2 + 5, right: margin },
    tableWidth: (pageWidth - margin * 2) / 2 - 5,
    columnStyles: {
      1: { halign: "right" },
    },
  });

  // Time by Department
  autoTable(doc, {
    startY: yPos,
    head: [["الوقت المسجل", "القسم"]],
    body: data.time.byDepartment.map((d) => [formatTime(d.minutes), d.name]),
    theme: "grid",
    styles: { font: "Cairo", fontSize: 9, cellPadding: 3, halign: "center" },
    headStyles: { fillColor: [34, 197, 94], textColor: 255, fontStyle: "bold" },
    margin: { left: margin, right: pageWidth / 2 + 5 },
    tableWidth: (pageWidth - margin * 2) / 2 - 5,
    columnStyles: {
      1: { halign: "right" },
    },
  });

  // Footer on each page
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`صفحة ${i} من ${pageCount}`, pageWidth / 2, pageHeight - 8, { align: "center" });
    doc.text("التقرير الشامل للنظام", pageWidth - margin, pageHeight - 8, { align: "right" });
  }

  // Save
  const filename = `التقرير-الشامل-${format(new Date(), "yyyy-MM-dd")}.pdf`;
  doc.save(filename);
}

// Executive Summary PDF Export
export async function exportExecutiveSummaryPDF(data: ComprehensiveReportData) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  // Load Arabic font
  const fontUrl = "https://fonts.gstatic.com/s/cairo/v28/SLXgc1nY6HkvangtZmpcWmhzfH5lWWgcQyyS4J0.ttf";
  
  try {
    const response = await fetch(fontUrl);
    const fontBuffer = await response.arrayBuffer();
    const fontBase64 = btoa(
      new Uint8Array(fontBuffer).reduce((data, byte) => data + String.fromCharCode(byte), "")
    );
    
    doc.addFileToVFS("Cairo-Regular.ttf", fontBase64);
    doc.addFont("Cairo-Regular.ttf", "Cairo", "normal");
    doc.setFont("Cairo");
  } catch {
    console.warn("Could not load Arabic font, using default");
  }

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  let yPos = margin;

  const centerText = (text: string, y: number, fontSize: number = 12) => {
    doc.setFontSize(fontSize);
    const textWidth = doc.getTextWidth(text);
    doc.text(text, (pageWidth - textWidth) / 2, y);
  };

  // Header
  doc.setFillColor(59, 130, 246);
  doc.rect(0, 0, pageWidth, 25, "F");
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  centerText("ملخص تنفيذي", 16);
  yPos = 35;

  doc.setTextColor(100);
  doc.setFontSize(10);
  centerText(`الفترة: ${data.dateRange}`, yPos);
  yPos += 15;
  doc.setTextColor(0);

  // Key Metrics
  const metrics = [
    { label: "إجمالي الطلبات", value: data.summary.totalRequests },
    { label: "إجمالي المهام", value: data.summary.totalTasks },
    { label: "الحالات المستفيدة", value: data.summary.totalLeads },
    { label: "نسبة الإنجاز", value: `${data.summary.overallCompletionRate}%` },
    { label: "ساعات العمل", value: `${data.summary.totalHours} س` },
    { label: "قيمة الصفقات الرابحة", value: new Intl.NumberFormat("ar-SA", { style: "currency", currency: "SAR", maximumFractionDigits: 0 }).format(data.leads.wonValue) },
  ];

  doc.setFontSize(12);
  doc.text("المقاييس الرئيسية", pageWidth - margin, yPos, { align: "right" });
  yPos += 8;

  metrics.forEach((m) => {
    doc.setFontSize(10);
    doc.text(`${m.label}: `, pageWidth - margin, yPos, { align: "right" });
    doc.setFontSize(11);
    doc.setTextColor(59, 130, 246);
    doc.text(String(m.value), pageWidth - margin - 80, yPos, { align: "right" });
    doc.setTextColor(0);
    yPos += 7;
  });

  yPos += 10;

  // Top Performers
  doc.setFontSize(12);
  doc.text("أفضل 5 موظفين أداءً", pageWidth - margin, yPos, { align: "right" });
  yPos += 5;

  const topEmployees = [...data.employees]
    .sort((a, b) => b.completionRate - a.completionRate)
    .slice(0, 5);

  autoTable(doc, {
    startY: yPos,
    head: [["نسبة الإنجاز", "القسم", "الاسم", "#"]],
    body: topEmployees.map((e, i) => [
      `${e.completionRate}%`,
      e.department || "-",
      e.name,
      String(i + 1),
    ]),
    theme: "grid",
    styles: { font: "Cairo", fontSize: 9, cellPadding: 3, halign: "center" },
    headStyles: { fillColor: [34, 197, 94], textColor: 255 },
    margin: { left: margin, right: margin },
    columnStyles: {
      2: { halign: "right" },
    },
  });

  // Save
  const filename = `ملخص-تنفيذي-${format(new Date(), "yyyy-MM-dd")}.pdf`;
  doc.save(filename);
}
