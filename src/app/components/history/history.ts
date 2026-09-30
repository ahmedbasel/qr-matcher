import {
  Component,
  OnInit,
  ChangeDetectorRef,
  Output,
  EventEmitter
} from '@angular/core';

import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { FirestoreService } from '../../services/firestore.service';

interface ScanHistory {
  id: string;
  testingNumber: string;
  woodenNumber: string;
  matchResult: boolean;
  createdAt: any;
}

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [
    DatePipe,
    FormsModule
  ],
  templateUrl: './history.html',
  styleUrl: './history.scss'
})
export class History implements OnInit {

  scans: ScanHistory[] = [];

  loading = true;

  searchTerm = '';

  selectedMonth = 'all';

  selectedDay = 'all';

  days = Array.from(
    { length: 31 },
    (_, index) => index + 1
  );

  months = [
    { value: 'all', label: 'All Months' },
    { value: '0', label: 'January' },
    { value: '1', label: 'February' },
    { value: '2', label: 'March' },
    { value: '3', label: 'April' },
    { value: '4', label: 'May' },
    { value: '5', label: 'June' },
    { value: '6', label: 'July' },
    { value: '7', label: 'August' },
    { value: '8', label: 'September' },
    { value: '9', label: 'October' },
    { value: '10', label: 'November' },
    { value: '11', label: 'December' }
  ];

  @Output() back = new EventEmitter<void>();

  constructor(
    private firestoreService: FirestoreService,
    private cdr: ChangeDetectorRef
  ) {}

  async ngOnInit(): Promise<void> {

    try {

      this.scans = await this.firestoreService.getScans();

      console.log(
        'History:',
        this.scans
      );

      this.cdr.detectChanges();

    } catch (error) {

      console.error(
        'Error loading history:',
        error
      );

      this.cdr.detectChanges();

    } finally {

      this.loading = false;

      this.cdr.detectChanges();

    }

  }

  onMonthChange(): void {

    this.selectedDay = 'all';

  }

  get filteredScans(): ScanHistory[] {

    const search =
      this.searchTerm.trim().toLowerCase();

    return this.scans.filter(scan => {

      const matchesSearch =
        !search ||
        scan.testingNumber?.toLowerCase().includes(search) ||
        scan.woodenNumber?.toLowerCase().includes(search);

      const scanDate =
        scan.createdAt?.toDate?.();

      const matchesMonth =
        this.selectedMonth === 'all' ||
        (
          scanDate &&
          scanDate.getMonth() === Number(this.selectedMonth)
        );

      const matchesDay =
        this.selectedDay === 'all' ||
        (
          scanDate &&
          scanDate.getDate() === Number(this.selectedDay)
        );

      return (
        matchesSearch &&
        matchesMonth &&
        matchesDay
      );

    });

  }

  goBack(): void {
    this.back.emit();
  }

}