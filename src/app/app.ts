import { Component } from '@angular/core';
import { CsvCleanerComponent } from './components/csvcleaning.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CsvCleanerComponent],
  template: `<app-csv-cleaner />`
})
export class App {}
