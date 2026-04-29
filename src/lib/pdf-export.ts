import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatMinutesToHours } from "./csv-export";

interface TableData {
  headers: string[];
  rows: string[][];
}

interface PDFReportOptions {
  title: string;
  subtitle?: string;
  dateRange?: string;
  tables: {
    title: string;
    data: TableData;
  }[];
  summaryStats?: {
    label: string;
    value: string;
  }[];
}

// Base64 encoded Arabic-compatible font would go here
// For now, we'll use a simpler approach with Unicode support

export async function exportTimeReportPDF(options: PDFReportOptions) {
  const { title, subtitle, dateRange, tables, summaryStats } = options;
  
  // Create PDF with RTL support
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  // Set up for RTL
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  let yPos = margin;

  // Helper function to center text (for RTL approximation)
  const centerText = (text: string, y: number, fontSize: number = 12) => {
    doc.setFontSize(fontSize);
    const textWidth = doc.getTextWidth(text);
    doc.text(text, (pageWidth - textWidth) / 2, y);
  };

  // Helper to add text aligned right
  const rightText = (text: string, y: number, fontSize: number = 12) => {
    doc.setFontSize(fontSize);
    doc.text(text, pageWidth - margin, y, { align: "right" });
  };

  // Title
  doc.setFontSize(20);
  centerText(title, yPos);
  yPos += 10;

  // Subtitle
  if (subtitle) {
    doc.setFontSize(12);
    doc.setTextColor(100);
    centerText(subtitle, yPos);
    yPos += 8;
  }

  // Date range
  if (dateRange) {
    doc.setFontSize(10);
    doc.setTextColor(120);
    centerText(dateRange, yPos);
    yPos += 10;
  }

  doc.setTextColor(0);

  // Summary Stats
  if (summaryStats && summaryStats.length > 0) {
    yPos += 5;
    doc.setFontSize(11);
    doc.setFillColor(245, 245, 245);
    doc.rect(margin, yPos - 5, pageWidth - margin * 2, summaryStats.length * 8 + 10, "F");
    
    summaryStats.forEach((stat, index) => {
      const statY = yPos + index * 8;
      doc.setFont("helvetica", "bold");
      doc.text(`${stat.value}`, pageWidth - margin - 5, statY + 3, { align: "right" });
      doc.setFont("helvetica", "normal");
      doc.text(`:${stat.label}`, pageWidth - margin - doc.getTextWidth(stat.value) - 10, statY + 3, { align: "right" });
    });
    
    yPos += summaryStats.length * 8 + 15;
  }

  // Tables
  tables.forEach((table, tableIndex) => {
    // Check if we need a new page
    if (yPos > pageHeight - 60) {
      doc.addPage();
      yPos = margin;
    }

    // Table title
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    rightText(table.title, yPos);
    yPos += 8;
    doc.setFont("helvetica", "normal");

    // Draw table using autoTable
    autoTable(doc, {
      startY: yPos,
      head: [table.data.headers],
      body: table.data.rows,
      theme: "grid",
      styles: {
        fontSize: 10,
        cellPadding: 4,
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
      margin: { left: margin, right: margin },
      tableWidth: "auto",
    });

    // Get the final Y position after the table
    yPos = (doc as any).lastAutoTable.finalY + 15;
  });

  // Footer
  const footerY = pageHeight - 10;
  doc.setFontSize(8);
  doc.setTextColor(150);
  const date = new Date().toLocaleDateString("ar-SA");
  centerText(`Generated: ${date}`, footerY);

  // Generate filename
  const filename = `${title.replace(/\s+/g, "-")}-${new Date().toISOString().split("T")[0]}.pdf`;
  
  // Download
  doc.save(filename);
}

// Simplified export functions for time reports
export function exportTaskSummaryPDF(
  data: { task_title: string; user_count: number; total_minutes: number }[],
  dateRange?: string
) {
  exportTimeReportPDF({
    title: "Time Report - Tasks",
    subtitle: "Task Summary",
    dateRange,
    summaryStats: [
      { label: "Total Tasks", value: String(data.length) },
      {
        label: "Total Time",
        value: formatMinutesToHours(data.reduce((s, t) => s + t.total_minutes, 0)),
      },
    ],
    tables: [
      {
        title: "Tasks Summary",
        data: {
          headers: ["Task", "Users", "Total Time"],
          rows: data.map((t) => [
            t.task_title,
            String(t.user_count),
            formatMinutesToHours(t.total_minutes),
          ]),
        },
      },
    ],
  });
}

export function exportUserSummaryPDF(
  data: { user_name: string; task_count: number; total_minutes: number }[],
  dateRange?: string
) {
  exportTimeReportPDF({
    title: "Time Report - Users",
    subtitle: "User Summary",
    dateRange,
    summaryStats: [
      { label: "Total Users", value: String(data.length) },
      {
        label: "Total Time",
        value: formatMinutesToHours(data.reduce((s, u) => s + u.total_minutes, 0)),
      },
    ],
    tables: [
      {
        title: "Users Summary",
        data: {
          headers: ["User", "Tasks", "Total Time"],
          rows: data.map((u) => [
            u.user_name,
            String(u.task_count),
            formatMinutesToHours(u.total_minutes),
          ]),
        },
      },
    ],
  });
}

export function exportDeptSummaryPDF(
  data: { department_name: string; user_count: number; total_minutes: number }[],
  dateRange?: string
) {
  exportTimeReportPDF({
    title: "Time Report - Departments",
    subtitle: "Department Summary",
    dateRange,
    summaryStats: [
      { label: "Total Departments", value: String(data.length) },
      {
        label: "Total Time",
        value: formatMinutesToHours(data.reduce((s, d) => s + d.total_minutes, 0)),
      },
    ],
    tables: [
      {
        title: "Departments Summary",
        data: {
          headers: ["Department", "Users", "Total Time"],
          rows: data.map((d) => [
            d.department_name,
            String(d.user_count),
            formatMinutesToHours(d.total_minutes),
          ]),
        },
      },
    ],
  });
}

export function exportFullReportPDF(
  taskData: { task_title: string; user_count: number; total_minutes: number }[],
  userData: { user_name: string; task_count: number; total_minutes: number }[],
  deptData: { department_name: string; user_count: number; total_minutes: number }[],
  dateRange?: string
) {
  const totalMinutes = taskData.reduce((s, t) => s + t.total_minutes, 0);
  
  exportTimeReportPDF({
    title: "Time Tracking Report",
    subtitle: "Complete Summary",
    dateRange,
    summaryStats: [
      { label: "Tasks", value: String(taskData.length) },
      { label: "Users", value: String(userData.length) },
      { label: "Departments", value: String(deptData.length) },
      { label: "Total Time", value: formatMinutesToHours(totalMinutes) },
    ],
    tables: [
      {
        title: "Tasks Summary",
        data: {
          headers: ["Task", "Users", "Time"],
          rows: taskData.slice(0, 10).map((t) => [
            t.task_title.substring(0, 30),
            String(t.user_count),
            formatMinutesToHours(t.total_minutes),
          ]),
        },
      },
      {
        title: "Users Summary",
        data: {
          headers: ["User", "Tasks", "Time"],
          rows: userData.slice(0, 10).map((u) => [
            u.user_name,
            String(u.task_count),
            formatMinutesToHours(u.total_minutes),
          ]),
        },
      },
      {
        title: "Departments Summary",
        data: {
          headers: ["Department", "Users", "Time"],
          rows: deptData.map((d) => [
            d.department_name,
            String(d.user_count),
            formatMinutesToHours(d.total_minutes),
          ]),
        },
      },
    ],
  });
}

// Department Performance Report PDF Export
export interface DepartmentReportData {
  id: string;
  name: string;
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  pendingTasks: number;
  completionRate: number;
  totalTimeMinutes: number;
  employeeCount: number;
  avgTasksPerEmployee: number;
}

export function exportDepartmentReportPDF(
  data: DepartmentReportData[],
  monthLabel: string,
  summaryStats: { totalTasks: number; totalCompleted: number; totalTime: number; avgCompletionRate: number }
) {
  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  exportTimeReportPDF({
    title: "Department Performance Report",
    subtitle: monthLabel,
    summaryStats: [
      { label: "Total Tasks", value: String(summaryStats.totalTasks) },
      { label: "Completed Tasks", value: String(summaryStats.totalCompleted) },
      { label: "Total Time", value: formatTime(summaryStats.totalTime) },
      { label: "Avg Completion Rate", value: `${summaryStats.avgCompletionRate}%` },
    ],
    tables: [
      {
        title: "Department Details",
        data: {
          headers: ["Department", "Employees", "Total Tasks", "Completed", "In Progress", "Completion %", "Work Hours"],
          rows: data.map((dept) => [
            dept.name,
            String(dept.employeeCount),
            String(dept.totalTasks),
            String(dept.completedTasks),
            String(dept.inProgressTasks),
            `${dept.completionRate}%`,
            formatTime(dept.totalTimeMinutes),
          ]),
        },
      },
    ],
  });
}

// Monthly Comparison Report PDF Export
export interface MonthlyComparisonData {
  month: string;
  monthLabel: string;
  departments: {
    name: string;
    totalTasks: number;
    completedTasks: number;
    completionRate: number;
    totalTimeMinutes: number;
  }[];
}

export function exportMonthlyComparisonPDF(
  data: MonthlyComparisonData[],
  departmentNames: string[]
) {
  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    return `${hours}h`;
  };

  // Create comparison table for each department
  const tables = departmentNames.map(deptName => {
    const rows = data.map(monthData => {
      const dept = monthData.departments.find(d => d.name === deptName);
      return [
        monthData.monthLabel,
        String(dept?.totalTasks || 0),
        String(dept?.completedTasks || 0),
        `${dept?.completionRate || 0}%`,
        formatTime(dept?.totalTimeMinutes || 0),
      ];
    });

    return {
      title: deptName,
      data: {
        headers: ["Month", "Total Tasks", "Completed", "Completion %", "Work Hours"],
        rows,
      },
    };
  });

  // Summary table showing all departments comparison
  const summaryRows = departmentNames.map(deptName => {
    const avgCompletionRate = data.reduce((sum, m) => {
      const dept = m.departments.find(d => d.name === deptName);
      return sum + (dept?.completionRate || 0);
    }, 0) / data.length;
    
    const totalTasks = data.reduce((sum, m) => {
      const dept = m.departments.find(d => d.name === deptName);
      return sum + (dept?.totalTasks || 0);
    }, 0);

    return [
      deptName,
      String(totalTasks),
      `${Math.round(avgCompletionRate)}%`,
    ];
  });

  exportTimeReportPDF({
    title: "Monthly Performance Comparison",
    subtitle: `${data[data.length - 1]?.monthLabel} - ${data[0]?.monthLabel}`,
    summaryStats: [
      { label: "Months Compared", value: String(data.length) },
      { label: "Departments", value: String(departmentNames.length) },
    ],
    tables: [
      {
        title: "Summary by Department",
        data: {
          headers: ["Department", "Total Tasks", "Avg Completion %"],
          rows: summaryRows,
        },
      },
      ...tables.slice(0, 5), // Limit to first 5 departments to avoid too many pages
    ],
  });
}
