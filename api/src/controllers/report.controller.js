import { generateCasesExcel, getCasesSummaryByStatus } from "#services/report.service.js";
import { getScopedAgency } from "#utils/scope.util.js";

export const getCasesSummary = async (req, res, next) => {
  try {
    const summary = await getCasesSummaryByStatus({ agencyCode: getScopedAgency(req) });
    res.status(200).json({ data: summary });
  } catch (error) {
    next(error);
  }
};

export const exportCasesExcel = async (req, res, next) => {
  try {
    const buffer = await generateCasesExcel({
      agencyCode: getScopedAgency(req),
      status: req.query.status,
    });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", "attachment; filename=cases-report.xlsx");
    res.send(Buffer.from(buffer));
  } catch (error) {
    next(error);
  }
};
