import ExcelJS from "exceljs";
import { getAllCases } from "./case.service.js";

export const getCasesSummaryByStatus = async ({ agencyCode } = {}) => {
  const cases = await getAllCases({ agencyCode });
  const summary = {};
  cases.forEach((c) => {
    summary[c.status] = (summary[c.status] || 0) + 1;
  });
  return summary;
};

export const generateCasesExcel = async ({ agencyCode, status } = {}) => {
  const cases = await getAllCases({ agencyCode, status });

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Cases");

  sheet.columns = [
    { header: "Case #", key: "caseNumber", width: 15 },
    { header: "Agency", key: "agency", width: 10 },
    { header: "Category", key: "category", width: 15 },
    { header: "Priority", key: "priority", width: 10 },
    { header: "Status", key: "status", width: 15 },
    { header: "Location", key: "location", width: 30 },
  ];

  cases.forEach((c) => {
    sheet.addRow({
      caseNumber: c.caseNumber,
      agency: c.Agency?.code,
      category: c.category,
      priority: c.priority,
      status: c.status,
      location: c.location,
    });
  });

  return workbook.xlsx.writeBuffer();
};
