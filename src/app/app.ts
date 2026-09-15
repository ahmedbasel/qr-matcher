import { Component } from '@angular/core';
import { QrScanner } from './components/qr-scanner/qr-scanner';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [QrScanner],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {

  showScanner = false;

  scanType: 'testing' | 'wooden' = 'testing';

  testingNumber = '';

  woodenNumber = '';

  matchResult: boolean | null = null;


  // =========================
  // OPEN SCANNER
  // =========================

  openScanner(type: 'testing' | 'wooden'): void {

    this.scanType = type;

    this.showScanner = true;

  }


  // =========================
  // HANDLE SCAN
  // =========================

  handleScan(number: string): void {

    console.log('Scanned Number:', number);


    // =========================
    // TESTING LABEL
    // =========================

    if (this.scanType === 'testing') {

      this.testingNumber = number;

      console.log(
        'Testing Number Saved:',
        this.testingNumber
      );


      /*
       * Close the current scanner first.
       * Then open a completely new scanner
       * for Wooden Factory.
       */

      this.showScanner = false;


      setTimeout(() => {

        this.scanType = 'wooden';

        this.showScanner = true;

      }, 150);


      return;
    }


    // =========================
    // WOODEN FACTORY
    // =========================

    if (this.scanType === 'wooden') {

      this.woodenNumber = number;

      console.log(
        'Wooden Number:',
        this.woodenNumber
      );


      // Compare the numbers

      this.matchResult =
        this.testingNumber === this.woodenNumber;


      console.log(
        'MATCH RESULT:',
        this.matchResult
      );


      // Close scanner

      this.showScanner = false;

    }

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

    this.testingNumber = '';

    this.woodenNumber = '';

    this.matchResult = null;

    this.scanType = 'testing';


    // Open fresh scanner

    setTimeout(() => {

      this.showScanner = true;

    }, 100);

  }

}