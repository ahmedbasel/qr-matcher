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


  openScanner(type: 'testing' | 'wooden'): void {

    this.scanType = type;

    this.showScanner = true;

    this.matchResult = null;

  }


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


      // Compare both numbers

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


      // Close scanner after second scan

      this.showScanner = false;

    }

  }


  goToWooden(): void {

    this.scanType = 'wooden';

    console.log(
      'Moving to Wooden Factory scan'
    );

  }


  closeScanner(): void {

    this.showScanner = false;

  }


  scanAgain(): void {

    // Reset everything

    this.testingNumber = '';

    this.woodenNumber = '';

    this.matchResult = null;

    this.scanType = 'testing';

    // Open Testing scanner again

    this.showScanner = true;

  }

}