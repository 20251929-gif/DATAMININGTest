import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { MonthlySummary } from '../models/dentalvisits.model';

@Injectable({
  providedIn: 'root'
})
export class DentalDataCleanerService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:8000/api/analyze-csv';

  uploadAndMineCsv(file: File): Observable<MonthlySummary[]> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post<MonthlySummary[]>(this.apiUrl, formData);
  }
}