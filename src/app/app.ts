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
  }

  handleScan(number: string): void {

    console.log('Scanned Number:', number);

    if (this.scanType === 'testing') {

      this.testingNumber = number;

      console.log(
        'Testing Number Saved:',
        this.testingNumber
      );

      // بعد Testing نروح تلقائي للـ Wooden
      this.scanType = 'wooden';

      this.showScanner = true;

      return;
    }

    if (this.scanType === 'wooden') {

      this.woodenNumber = number;

      console.log(
        'Wooden Number:',
        this.woodenNumber
      );

      this.matchResult =
        this.testingNumber === this.woodenNumber;

      this.showScanner = false;
    }
  }

  closeScanner(): void {

    this.showScanner = false;
  }

  scanAgain(): void {

    this.testingNumber = '';

    this.woodenNumber = '';

    this.matchResult = null;

    this.scanType = 'testing';

    this.showScanner = true;
  }
}