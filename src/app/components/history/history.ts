import {
  Component,
  OnInit,
  ChangeDetectorRef,
  Output,
  EventEmitter
} 
from '@angular/core';import { DatePipe } from '@angular/common';
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
  imports: [DatePipe],
  templateUrl: './history.html',
  styleUrl: './history.scss'
})
export class History implements OnInit {

  scans: ScanHistory[] = [];

  loading = true;

  constructor(
    private firestoreService: FirestoreService,
    private cdr: ChangeDetectorRef
  ) {}

@Output() back = new EventEmitter<void>();
goBack(): void {
  this.back.emit();
}
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

}