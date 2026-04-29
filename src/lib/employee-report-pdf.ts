import jsPDF from "jspdf";
import "jspdf-autotable";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

interface EmployeeSummaryForPDF {
  employeeName: string;
  departmentName: string | null;
  todayCount: number;
  yesterdayCount: number;
  completedCount: number;
  inProgressCount: number;
  overdueCount: number;
  completionRate: number;
  totalTimeMinutes: number;
}

function formatTime(minutes: number): string {
  if (minutes === 0) return "0";
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins} د`;
  if (mins === 0) return `${hours} س`;
  return `${hours}س ${mins}د`;
}

export async function generateEmployeeReportPDF(
  employees: EmployeeSummaryForPDF[],
  stats: {
    total: number;
    completed: number;
    inProgress: number;
    overdue: number;
    completionRate: number;
    totalMinutes: number;
  },
  departmentName: string = "جميع الأقسام"
): Promise<void> {
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

  // Header
  doc.setFillColor(59, 130, 246);
  doc.rect(0, 0, pageWidth, 25, "F");
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.text("تقرير مهام الموظفين", pageWidth - margin, 16, { align: "right" });
  
  doc.setFontSize(10);
  doc.text(`التاريخ: ${format(new Date(), "PPP", { locale: ar })}`, margin, 16);
  doc.text(`القسم: ${departmentName}`, margin, 22);

  // Stats boxes
  let yPos = 35;
  const boxWidth = (pageWidth - margin * 2 - 25) / 6;
  const boxHeight = 18;
  
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(9);

  const statsBoxes = [
    { label: "إجمالي المهام", value: stats.total.toString(), color: [59, 130, 246] },
    { label: "المكتملة", value: stats.completed.toString(), color: [34, 197, 94] },
    { label: "قيد التنفيذ", value: stats.inProgress.toString(), color: [249, 115, 22] },
    { label: "المتأخرة", value: stats.overdue.toString(), color: [239, 68, 68] },
    { label: "نسبة الإنجاز", value: `${stats.completionRate}%`, color: [99, 102, 241] },
    { label: "الوقت المسجل", value: formatTime(stats.totalMinutes), color: [107, 114, 128] },
  ];

  statsBoxes.forEach((box, index) => {
    const x = pageWidth - margin - (index + 1) * boxWidth - index * 5;
    doc.setFillColor(box.color[0], box.color[1], box.color[2]);
    doc.roundedRect(x, yPos, boxWidth, boxHeight, 2, 2, "F");
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.text(box.value, x + boxWidth / 2, yPos + 8, { align: "center" });
    doc.setFontSize(8);
    doc.text(box.label, x + boxWidth / 2, yPos + 14, { align: "center" });
  });

  yPos += boxHeight + 15;

  // Table
  doc.setTextColor(0, 0, 0);
  
  const tableData = employees.map((emp) => [
    `${emp.completionRate}%`,
    formatTime(emp.totalTimeMinutes),
    emp.overdueCount.toString(),
    emp.inProgressCount.toString(),
    emp.completedCount.toString(),
    emp.yesterdayCount.toString(),
    emp.todayCount.toString(),
    emp.departmentName || "-",
    emp.employeeName,
  ]);

  (doc as any).autoTable({
    startY: yPos,
    head: [[
      "الإنجاز %",
      "الوقت",
      "متأخرة",
      "جارية",
      "مكتملة",
      "أمس",
      "اليوم",
      "القسم",
      "الموظف",
    ]],
    body: tableData,
    theme: "striped",
    styles: {
      font: "Cairo",
      fontSize: 9,
      halign: "center",
      cellPadding: 3,
    },
    headStyles: {
      fillColor: [59, 130, 246],
      textColor: 255,
      halign: "center",
    },
    columnStyles: {
      8: { halign: "right" },
      7: { halign: "right" },
    },
    margin: { left: margin, right: margin },
  });

  // Footer
  const finalY = (doc as any).lastAutoTable.finalY || yPos + 50;
  doc.setFontSize(8);
  doc.setTextColor(128, 128, 128);
  doc.text(
    `تم إنشاء التقرير بتاريخ ${format(new Date(), "PPPp", { locale: ar })}`,
    pageWidth / 2,
    Math.min(finalY + 10, pageHeight - 10),
    { align: "center" }
  );

  // Save
  doc.save(`تقرير-مهام-الموظفين-${format(new Date(), "yyyy-MM-dd")}.pdf`);
}
