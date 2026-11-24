import { Component, computed, inject, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { DentalDataCleanerService } from '../services/datacleaning.service';
import { MonthlySummary } from '../models/dentalvisits.model';

@Component({
  selector: 'app-csv-cleaner',
  standalone: true,
  imports: [CurrencyPipe],
  template: `
    <div style="padding: 1.5rem; font-family: sans-serif; max-width: 900px;">
      <h2>Dental Clinic Insights (PySpark Powered)</h2>
      <p>Upload <strong>dummyrecords.csv</strong> to clean records in PySpark and analyze monthly visits &amp; profits.</p>

      <input type="file" accept=".csv" (change)="onFileSelected($event)" />

      @if (isLoading()) {
        <p style="color: #2563eb; font-weight: bold; margin-top: 1rem;">
          Cleaning and mining data in PySpark...
        </p>
      }

      @if (errorMessage()) {
        <p style="color: #dc2626; margin-top: 1rem;">{{ errorMessage() }}</p>
      }

      @if (monthlyStats().length > 0 && !isLoading()) {
        <!-- Top Highlights Cards -->
        <div style="display: flex; gap: 1rem; margin: 1.5rem 0; flex-wrap: wrap;">
          <div style="flex: 1; min-width: 220px; padding: 1rem; border: 1px solid #cbd5e1; border-radius: 8px; background: #f8fafc;">
            <small style="color: #64748b; font-weight: bold;">MOST VISITS</small>
            <h3 style="margin: 0.25rem 0; color: #0f172a;">{{ topVisitsMonth()?.monthLabel }}</h3>
            <p style="margin: 0; color: #334155;"><strong>{{ topVisitsMonth()?.totalVisits }}</strong> unique visits</p>
          </div>

          <div style="flex: 1; min-width: 220px; padding: 1rem; border: 1px solid #cbd5e1; border-radius: 8px; background: #f8fafc;">
            <small style="color: #64748b; font-weight: bold;">HIGHEST PROFIT</small>
            <h3 style="margin: 0.25rem 0; color: #0f172a;">{{ topProfitMonth()?.monthLabel }}</h3>
            <p style="margin: 0; color: #334155;">
              <strong>{{ topProfitMonth()?.totalProfit | currency:'PHP':'symbol':'1.0-0' }}</strong> total profit
            </p>
          </div>
        </div>

        <!-- Monthly Plots Section -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 1.5rem; margin-bottom: 2rem;">
          
          <!-- Plot 1: Visits per Month -->
          <div style="padding: 1.25rem; border: 1px solid #e2e8f0; border-radius: 8px; background: #fff;">
            <h4 style="margin-top: 0; margin-bottom: 1rem; color: #1e293b;">Unique Visits by Month</h4>
            @for (row of monthlyStats(); track row.monthKey) {
              <div style="margin-bottom: 0.85rem;">
                <div style="display: flex; justify-content: space-between; font-size: 0.875rem; margin-bottom: 0.25rem;">
                  <span>{{ row.monthLabel }}</span>
                  <strong>{{ row.totalVisits }} visits</strong>
                </div>
                <div style="width: 100%; background: #e2e8f0; height: 14px; border-radius: 7px; overflow: hidden;">
                  <div
                    [style.width.%]="(row.totalVisits / maxVisits()) * 100"
                    style="background: #2563eb; height: 100%; border-radius: 7px; transition: width 0.4s ease;">
                  </div>
                </div>
              </div>
            }
          </div>

          <!-- Plot 2: Profit per Month -->
          <div style="padding: 1.25rem; border: 1px solid #e2e8f0; border-radius: 8px; background: #fff;">
            <h4 style="margin-top: 0; margin-bottom: 1rem; color: #1e293b;">Total Profit by Month</h4>
            @for (row of monthlyStats(); track row.monthKey) {
              <div style="margin-bottom: 0.85rem;">
                <div style="display: flex; justify-content: space-between; font-size: 0.875rem; margin-bottom: 0.25rem;">
                  <span>{{ row.monthLabel }}</span>
                  <strong>{{ row.totalProfit | currency:'PHP':'symbol':'1.0-0' }}</strong>
                </div>
                <div style="width: 100%; background: #e2e8f0; height: 14px; border-radius: 7px; overflow: hidden;">
                  <div
                    [style.width.%]="(row.totalProfit / maxProfit()) * 100"
                    style="background: #16a34a; height: 100%; border-radius: 7px; transition: width 0.4s ease;">
                  </div>
                </div>
              </div>
            }
          </div>

        </div>

        <!-- Monthly Breakdown Table -->
        <h3>Monthly Breakdown</h3>
        <table style="width: 100%; border-collapse: collapse; text-align: left;">
          <thead>
            <tr style="border-bottom: 2px solid #334155;">
              <th style="padding: 0.5rem;">Month</th>
              <th style="padding: 0.5rem;">Unique Visits</th>
              <th style="padding: 0.5rem;">Procedures</th>
              <th style="padding: 0.5rem;">Total Profit</th>
            </tr>
          </thead>
          <tbody>
            @for (row of monthlyStats(); track row.monthKey) {
              <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 0.5rem;">{{ row.monthLabel }}</td>
                <td style="padding: 0.5rem;">{{ row.totalVisits }}</td>
                <td style="padding: 0.5rem;">{{ row.totalProcedures }}</td>
                <td style="padding: 0.5rem;">{{ row.totalProfit | currency:'PHP':'symbol':'1.0-0' }}</td>
              </tr>
            }
          </tbody>
        </table>
      }
    </div>
  `
})
export class CsvCleanerComponent {
  private cleanerService = inject(DentalDataCleanerService);

  monthlyStats = signal<MonthlySummary[]>([]);
  isLoading = signal<boolean>(false);
  errorMessage = signal<string>('');

  topVisitsMonth = computed(() => {
    const stats = this.monthlyStats();
    if (!stats.length) return null;
    return stats.reduce((max, curr) => curr.totalVisits > max.totalVisits ? curr : max);
  });

  topProfitMonth = computed(() => {
    const stats = this.monthlyStats();
    if (!stats.length) return null;
    return stats.reduce((max, curr) => curr.totalProfit > max.totalProfit ? curr : max);
  });

  maxVisits = computed(() => Math.max(...this.monthlyStats().map(s => s.totalVisits), 1));
  maxProfit = computed(() => Math.max(...this.monthlyStats().map(s => s.totalProfit), 1));

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.isLoading.set(true);
    this.errorMessage.set('');

    this.cleanerService.uploadAndMineCsv(file).subscribe({
      next: (minedStats) => {
        this.monthlyStats.set(minedStats);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('PySpark API error:', err);
        this.errorMessage.set('Failed to connect to the PySpark server. Make sure FastAPI is running on port 8000.');
        this.isLoading.set(false);
      }
    });
  }
}
