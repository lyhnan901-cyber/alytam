import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

interface EmployeeStats {
  id: string;
  name: string;
  email: string;
  departmentId: string | null;
  departmentName: string | null;
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  pendingTasks: number;
  completionRate: number;
  totalTimeMinutes: number;
  avgTaskTime: number;
  overdueTasks: number;
}

interface DepartmentStats {
  id: string;
  name: string;
  employeeCount: number;
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  completionRate: number;
  totalTimeMinutes: number;
  avgEmployeeCompletionRate: number;
}

interface GMReportData {
  employees: EmployeeStats[];
  departments: DepartmentStats[];
  summary: {
    totalEmployees: number;
    totalTasks: number;
    totalCompleted: number;
    totalOverdue: number;
    totalTime: number;
    avgCompletionRate: number;
  };
  dateRange: string;
  topPerformers: EmployeeStats[];
  lowPerformers: EmployeeStats[];
}

function formatTime(minutes: number): string {
  if (minutes === 0) return "0 دقيقة";
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins} د`;
  if (mins === 0) return `${hours} س`;
  return `${hours}س ${mins}د`;
}

export async function exportGMReportPDF(data: GMReportData) {
  const { employees, departments, summary, dateRange, topPerformers, lowPerformers } = data;

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

  const addNewPageIfNeeded = (requiredSpace: number = 30) => {
    if (yPos > pageHeight - requiredSpace) {
      doc.addPage();
      yPos = margin;
    }
  };

  // Header
  doc.setFillColor(59, 130, 246);
  doc.rect(0, 0, pageWidth, 25, "F");
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  centerText("تقرير المدير العام الشامل", 16);
  yPos = 35;

  // Date range
  doc.setTextColor(100);
  doc.setFontSize(10);
  centerText(`الفترة: ${dateRange}`, yPos);
  yPos += 6;
  doc.setFontSize(9);
  doc.setTextColor(150);
  centerText(`تم الإنشاء في: ${format(new Date(), "PPPp", { locale: ar })}`, yPos);
  yPos += 12;
  doc.setTextColor(0);

  // Summary Stats Box
  doc.setFillColor(245, 245, 245);
  doc.rect(margin, yPos, pageWidth - margin * 2, 25, "F");
  doc.setFontSize(10);

  const stats = [
    { label: "الموظفين", value: summary.totalEmployees },
    { label: "إجمالي المهام", value: summary.totalTasks },
    { label: "المكتملة", value: summary.totalCompleted },
    { label: "المتأخرة", value: summary.totalOverdue },
    { label: "الوقت الكلي", value: formatTime(summary.totalTime) },
    { label: "متوسط الإنجاز", value: `${summary.avgCompletionRate}%` },
  ];

  const statWidth = (pageWidth - margin * 2) / stats.length;
  stats.forEach((stat, index) => {
    const x = pageWidth - margin - statWidth * index - statWidth / 2;
    doc.setFontSize(12);
    doc.setTextColor(59, 130, 246);
    doc.text(String(stat.value), x, yPos + 10, { align: "center" });
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text(stat.label, x, yPos + 16, { align: "center" });
  });

  yPos += 32;

  // Department Summary Table
  doc.setFontSize(14);
  doc.setTextColor(0);
  doc.text("أداء الأقسام", pageWidth - margin, yPos, { align: "right" });
  yPos += 6;

  autoTable(doc, {
    startY: yPos,
    head: [[
      "متوسط إنجاز الموظفين",
      "الوقت المسجل",
      "نسبة الإنجاز",
      "قيد التنفيذ",
      "المكتملة",
      "إجمالي المهام",
      "الموظفين",
      "القسم",
    ]],
    body: departments.map((d) => [
      `${d.avgEmployeeCompletionRate}%`,
      formatTime(d.totalTimeMinutes),
      `${d.completionRate}%`,
      String(d.inProgressTasks),
      String(d.completedTasks),
      String(d.totalTasks),
      String(d.employeeCount),
      d.name,
    ]),
    theme: "grid",
    styles: { font: "Cairo", fontSize: 8, cellPadding: 3, halign: "center" },
    headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [249, 250, 251] },
    margin: { left: margin, right: margin },
  });

  yPos = (doc as any).lastAutoTable.finalY + 15;
  addNewPageIfNeeded(60);

  // Top & Low Performers Side by Side
  const halfWidth = (pageWidth - margin * 3) / 2;

  doc.setFontSize(12);
  doc.setTextColor(0);
  doc.text("الموظفين المتميزين", pageWidth - margin, yPos, { align: "right" });
  doc.text("يحتاجون دعم", margin + halfWidth - 10, yPos, { align: "right" });
  yPos += 5;

  // Top Performers Table
  autoTable(doc, {
    startY: yPos,
    head: [["المهام", "نسبة الإنجاز", "القسم", "الاسم", "#"]],
    body: topPerformers.slice(0, 5).map((e, i) => [
      `${e.completedTasks}/${e.totalTasks}`,
      `${e.completionRate}%`,
      e.departmentName || "-",
      e.name,
      String(i + 1),
    ]),
    theme: "grid",
    styles: { font: "Cairo", fontSize: 8, cellPadding: 2, halign: "center" },
    headStyles: { fillColor: [34, 197, 94], textColor: 255, fontStyle: "bold" },
    margin: { left: pageWidth / 2 + margin / 2, right: margin },
    tableWidth: halfWidth,
  });

  const topTableEndY = (doc as any).lastAutoTable.finalY;

  // Low Performers Table
  autoTable(doc, {
    startY: yPos,
    head: [["المتأخرة", "نسبة الإنجاز", "القسم", "الاسم"]],
    body: lowPerformers.slice(0, 5).map((e) => [
      String(e.overdueTasks),
      `${e.completionRate}%`,
      e.departmentName || "-",
      e.name,
    ]),
    theme: "grid",
    styles: { font: "Cairo", fontSize: 8, cellPadding: 2, halign: "center" },
    headStyles: { fillColor: [249, 115, 22], textColor: 255, fontStyle: "bold" },
    margin: { left: margin, right: pageWidth / 2 + margin / 2 },
    tableWidth: halfWidth,
  });

  const lowTableEndY = (doc as any).lastAutoTable.finalY;
  yPos = Math.max(topTableEndY, lowTableEndY) + 15;
  addNewPageIfNeeded(80);

  // Employee Details Table
  doc.setFontSize(14);
  doc.setTextColor(0);
  doc.text("تفاصيل جميع الموظفين", pageWidth - margin, yPos, { align: "right" });
  yPos += 6;

  autoTable(doc, {
    startY: yPos,
    head: [[
      "الوقت",
      "نسبة الإنجاز",
      "المتأخرة",
      "قائمة الانتظار",
      "قيد التنفيذ",
      "المكتملة",
      "الإجمالي",
      "القسم",
      "الموظف",
    ]],
    body: employees.map((e) => [
      formatTime(e.totalTimeMinutes),
      `${e.completionRate}%`,
      String(e.overdueTasks),
      String(e.pendingTasks),
      String(e.inProgressTasks),
      String(e.completedTasks),
      String(e.totalTasks),
      e.departmentName || "-",
      e.name,
    ]),
    theme: "grid",
    styles: { font: "Cairo", fontSize: 7, cellPadding: 2, halign: "center" },
    headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [249, 250, 251] },
    margin: { left: margin, right: margin },
    columnStyles: {
      8: { halign: "right" },
      7: { halign: "right" },
    },
  });

  // Footer on each page
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`صفحة ${i} من ${pageCount}`, pageWidth / 2, pageHeight - 8, { align: "center" });
  }

  // Save
  const filename = `تقرير-المدير-العام-${format(new Date(), "yyyy-MM-dd")}.pdf`;
  doc.save(filename);
}
