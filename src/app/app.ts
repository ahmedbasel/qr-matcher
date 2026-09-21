
import { Component } from '@angular/core';
import { QrScanner } from './components/qr-scanner/qr-scanner';
import { FirestoreService } from '../app/services/firestore.service';
import { History } from './components/history/history';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [QrScanner, History],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {

  showHistory = false;

  showScanner = false;

  scanType: 'testing' | 'wooden' = 'testing';

  testingNumber = '';

  woodenNumber = '';

  matchResult: boolean | null = null;


  constructor(
    private firestoreService: FirestoreService
  ) {}


  // =========================
  // OPEN HISTORY
  // =========================

  openHistory(): void {

    this.showHistory = true;

    this.showScanner = false;

    this.matchResult = null;

  }


  // =========================
  // CLOSE HISTORY
  // =========================

  closeHistory(): void {

    this.showHistory = false;

  }


  // =========================
  // OPEN SCANNER
  // =========================

  openScanner(type: 'testing' | 'wooden'): void {

    this.showHistory = false;

    this.scanType = type;

    this.showScanner = true;

    this.matchResult = null;

  }


  // =========================
  // HANDLE SCAN
  // =========================

  async handleScan(number: string): Promise<void> {

    console.log(
      'Scanned Number:',
      number
    );


    // =========================
    // TESTING LABEL
    // =========================

    if (this.scanType === 'testing') {

      this.testingNumber = number;

      console.log(
        'Testing Number Saved:',
        this.testingNumber
      );

      return;

    }


    // =========================
    // WOODEN FACTORY
    // =========================

    if (this.scanType === 'wooden') {

      this.woodenNumber = number;

      console.log(
        'Wooden Number Saved:',
        this.woodenNumber
      );


      // =========================
      // COMPARE BOTH NUMBERS
      // =========================

      const testingCode =
        this.testingNumber.match(/^[A-Z]-\d{5}$/i)?.[0] ?? '';

      const woodenCode =
        this.woodenNumber.match(/^[A-Z]-\d{5}$/i)?.[0] ?? '';

      this.matchResult =
        testingCode !== '' &&
        woodenCode !== '' &&
        testingCode.toUpperCase() === woodenCode.toUpperCase();


      console.log(
        'Testing:',
        this.testingNumber
      );

      console.log(
        'Wooden:',
        this.woodenNumber
      );

      console.log(
        'Match:',
        this.matchResult
      );


      // =========================
      // CLOSE SCANNER
      // SHOW RESULT
      // =========================

      this.showScanner = false;


      // =========================
      // SAVE HISTORY
      // =========================

      try {

        await this.firestoreService.saveScan(
          this.testingNumber,
          this.woodenNumber,
          this.matchResult!
        );

        console.log(
          'History saved successfully!'
        );

      } catch (error) {

        console.error(
          'Error saving history:',
          error
        );

      }

    }

  }


  // =========================
  // GO TO WOODEN
  // =========================

  goToWooden(): void {

    this.scanType = 'wooden';

    console.log(
      'Moving to Wooden Factory scan'
    );

  }


  // =========================
  // CLOSE SCANNER
  // =========================

  closeScanner(): void {

    this.showScanner = false;

  }


  // =========================
  // SCAN AGAIN
  // =========================

  scanAgain(): void {

    this.showHistory = false;

    this.testingNumber = '';

    this.woodenNumber = '';

    this.matchResult = null;

    this.scanType = 'testing';

    this.showScanner = true;

  }

}
