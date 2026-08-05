import ExcelJS from "exceljs";
import { getAllCases } from "./case.service.js";
import { getAllVehicles } from "./vehicle.service.js";

export const getCasesSummaryByStatus = async ({ agencyCode } = {}) => {
  const cases = await getAllCases({ agencyCode, includeAll: true });
  const summary = {};
  cases.forEach((c) => {
    summary[c.status] = (summary[c.status] || 0) + 1;
  });
  return summary;
};

export const getCasesSummaryByAgency = async ({ agencyCode } = {}) => {
  const cases = await getAllCases({ agencyCode, includeAll: true });
  const summary = {};
  cases.forEach((c) => {
    const key = c.Agency?.code || "Unknown";
    summary[key] = (summary[key] || 0) + 1;
  });
  return summary;
};

export const getVehicleUtilization = async ({ agencyCode } = {}) => {
  const vehicles = await getAllVehicles({ agencyCode });
  const summary = {};
  vehicles.forEach((v) => {
    summary[v.status] = (summary[v.status] || 0) + 1;
  });
  return summary;
};

export const generateCasesExcel = async ({ agencyCode, status } = {}) => {
  const cases = await getAllCases({ agencyCode, status, includeAll: true });

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Cases");

  sheet.columns = [
    { header: "Case ID", key: "caseNumber", width: 15 },
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
