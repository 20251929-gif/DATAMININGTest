export interface MonthlySummary {
  monthKey: string;        // e.g., "2020-02"
  monthLabel: string;      // e.g., "February 2020"
  totalVisits: number;     // Unique visits (deduplicated by Visit ID in PySpark)
  totalProcedures: number; // Total rows/procedures in that month
  totalProfit: number;     // Total fee sum for that month
}
