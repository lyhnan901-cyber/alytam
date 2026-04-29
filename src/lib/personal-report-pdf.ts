import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

interface PersonalReportData {
  userName: string;
  dateRange: string;
  stats: {
    total: number;
    completed: number;
    inProgress: number;
    pending: number;
    notStarted: number;
    completionRate: number;
    totalMinutes: number;
  };
  tasks: {
    taskNumber: number;
    title: string;
    status: string;
    priority: string;
    dueDate: string;
  }[];
}

function formatTime(minutes: number): string {
  if (minutes === 0) return "0 دقيقة";
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins} دقيقة`;
  if (mins === 0) return `${hours} ساعة`;
  return `${hours} ساعة ${mins} دقيقة`;
}

export async function exportPersonalReportPDF(data: PersonalReportData) {
  const { userName, dateRange, stats, tasks } = data;

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
  const margin = 15;
  let yPos = margin;

  const centerText = (text: string, y: number, fontSize: number = 12) => {
    doc.setFontSize(fontSize);
    const textWidth = doc.getTextWidth(text);
    doc.text(text, (pageWidth - textWidth) / 2, y);
  };

  const rightText = (text: string, y: number, fontSize: number = 12) => {
    doc.setFontSize(fontSize);
    doc.text(text, pageWidth - margin, y, { align: "right" });
  };

  // Title
  doc.setFillColor(59, 130, 246);
  doc.rect(0, 0, pageWidth, 30, "F");
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  centerText("تقرير الأداء الشخصي", yPos + 12);
  yPos += 35;

  // User name and date range
  doc.setTextColor(0);
  doc.setFontSize(14);
  rightText(userName, yPos);
  yPos += 8;
  doc.setFontSize(10);
  doc.setTextColor(100);
  rightText(dateRange, yPos);
  yPos += 15;

  // Statistics Box
  doc.setFillColor(245, 247, 250);
  doc.roundedRect(margin, yPos - 5, pageWidth - margin * 2, 55, 3, 3, "F");

  doc.setTextColor(0);
  doc.setFontSize(11);

  // Stats grid (2 rows, 3 columns)
  const statsData = [
    [
      { label: "إجمالي المهام", value: String(stats.total), color: [59, 130, 246] },
      { label: "المكتملة", value: String(stats.completed), color: [34, 197, 94] },
      { label: "قيد التنفيذ", value: String(stats.inProgress), color: [249, 115, 22] },
    ],
    [
      { label: "قائمة الانتظار", value: String(stats.pending), color: [99, 102, 241] },
      { label: "لم تبدأ", value: String(stats.notStarted), color: [156, 163, 175] },
      { label: "نسبة الإنجاز", value: `${stats.completionRate}%`, color: [139, 92, 246] },
    ],
  ];

  const colWidth = (pageWidth - margin * 2) / 3;
  let statY = yPos + 5;

  statsData.forEach((row) => {
    row.forEach((stat, colIndex) => {
      const x = pageWidth - margin - (colIndex + 1) * colWidth + colWidth / 2;
      
      doc.setTextColor(stat.color[0], stat.color[1], stat.color[2]);
      doc.setFontSize(18);
      doc.text(stat.value, x, statY, { align: "center" });
      
      doc.setFontSize(9);
      doc.setTextColor(100);
      doc.text(stat.label, x, statY + 7, { align: "center" });
    });
    statY += 25;
  });

  yPos += 60;

  // Time Logged
  doc.setFillColor(220, 252, 231);
  doc.roundedRect(margin, yPos - 2, pageWidth - margin * 2, 15, 3, 3, "F");
  doc.setFontSize(11);
  doc.setTextColor(22, 101, 52);
  centerText(`الوقت المسجل: ${formatTime(stats.totalMinutes)}`, yPos + 7);

  yPos += 22;

  // Tasks Table Title
  doc.setTextColor(0);
  doc.setFontSize(14);
  rightText("قائمة المهام", yPos);
  yPos += 8;

  // Tasks Table
  if (tasks.length > 0) {
    autoTable(doc, {
      startY: yPos,
      head: [["تاريخ الاستحقاق", "الأولوية", "الحالة", "العنوان", "الرقم"]],
      body: tasks.slice(0, 20).map((task) => [
        task.dueDate,
        task.priority,
        task.status,
        task.title.substring(0, 35) + (task.title.length > 35 ? "..." : ""),
        String(task.taskNumber),
      ]),
      theme: "grid",
      styles: {
        font: "Cairo",
        fontSize: 9,
        cellPadding: 3,
        halign: "center",
        valign: "middle",
      },
      headStyles: {
        fillColor: [59, 130, 246],
        textColor: 255,
        fontStyle: "bold",
        halign: "center",
      },
      alternateRowStyles: {
        fillColor: [249, 250, 251],
      },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 20 },
        2: { cellWidth: 35 },
        3: { cellWidth: 75, halign: "right" },
        4: { cellWidth: 15 },
      },
      margin: { left: margin, right: margin },
    });

    yPos = (doc as any).lastAutoTable.finalY + 10;
  } else {
    doc.setFontSize(10);
    doc.setTextColor(100);
    centerText("لا توجد مهام في هذه الفترة", yPos + 10);
    yPos += 25;
  }

  // Summary by Status
  if (tasks.length > 0) {
    const statusSummary = [
      { status: "مكتملة", count: stats.completed, color: [34, 197, 94] },
      { status: "قيد التنفيذ", count: stats.inProgress, color: [251, 191, 36] },
      { status: "قائمة الانتظار", count: stats.pending, color: [59, 130, 246] },
      { status: "لم تبدأ", count: stats.notStarted, color: [156, 163, 175] },
    ];

    // Check if we need a new page
    if (yPos > doc.internal.pageSize.getHeight() - 50) {
      doc.addPage();
      yPos = margin;
    }

    doc.setFontSize(12);
    doc.setTextColor(0);
    rightText("ملخص الحالات", yPos);
    yPos += 8;

    statusSummary.forEach((item) => {
      const barWidth = stats.total > 0 ? (item.count / stats.total) * (pageWidth - margin * 2 - 50) : 0;
      
      // Background bar
      doc.setFillColor(240, 240, 240);
      doc.roundedRect(margin, yPos, pageWidth - margin * 2 - 50, 8, 2, 2, "F");
      
      // Filled bar
      if (barWidth > 0) {
        doc.setFillColor(item.color[0], item.color[1], item.color[2]);
        doc.roundedRect(margin, yPos, barWidth, 8, 2, 2, "F");
      }
      
      // Label
      doc.setFontSize(9);
      doc.setTextColor(0);
      doc.text(`${item.count}`, pageWidth - margin - 40, yPos + 6);
      doc.setTextColor(100);
      doc.setFontSize(8);
      doc.text(item.status, pageWidth - margin - 48, yPos - 2, { align: "right" });
      
      yPos += 15;
    });
  }

  // Footer
  const footerY = doc.internal.pageSize.getHeight() - 10;
  doc.setFontSize(8);
  doc.setTextColor(150);
  centerText(`تم الإنشاء في ${format(new Date(), "PPP", { locale: ar })}`, footerY);

  // Generate filename
  const filename = `تقريري-${format(new Date(), "yyyy-MM-dd")}.pdf`;

  // Download
  doc.save(filename);
}
