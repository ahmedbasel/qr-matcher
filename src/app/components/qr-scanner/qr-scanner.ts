import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnDestroy,
  Output,
  ViewChild,
  afterNextRender
} from '@angular/core';

import {
  BrowserMultiFormatReader,
  IScannerControls
} from '@zxing/browser';

@Component({
  selector: 'app-qr-scanner',
  standalone: true,
  imports: [],
  templateUrl: './qr-scanner.html',
  styleUrl: './qr-scanner.scss'
})
export class QrScanner implements OnDestroy {

  @ViewChild('video')
  video?: ElementRef<HTMLVideoElement>;

  @Input()
  scanType: 'testing' | 'wooden' = 'testing';

  @Output()
  scanned = new EventEmitter<string>();

  @Output()
  closed = new EventEmitter<void>();

  private reader = new BrowserMultiFormatReader();

  private controls?: IScannerControls;

  scannedData = '';

  errorMessage = '';

  constructor() {

    afterNextRender(() => {

      this.startScanner();

    });

  }

  async startScanner(): Promise<void> {

    try {

      if (!this.video?.nativeElement) {

        console.error(
          'Video element not found.'
        );

        this.errorMessage =
          'Camera element not found.';

        return;
      }

      const devices =
        await BrowserMultiFormatReader
          .listVideoInputDevices();

      if (!devices.length) {

        this.errorMessage =
          'No camera found.';

        return;
      }

      console.log(
        'Cameras:',
        devices
      );

      const backCamera =
        devices.find(device =>
          /back|rear|environment/i
            .test(device.label)
        );

      const deviceId =
        backCamera?.deviceId ??
        devices[0].deviceId;

      console.log(
        'Using camera:',
        deviceId
      );

      this.controls =
        await this.reader.decodeFromVideoDevice(
          deviceId,
          this.video.nativeElement,
          (result) => {

            if (!result) {
              return;
            }

            this.scannedData =
              result.getText();

            console.log(
              'QR DATA:',
              this.scannedData
            );

            let drumNumber: string | null = null;

            if (this.scanType === 'testing') {

              drumNumber =
                this.extractTestingLabelNumber(
                  this.scannedData
                );

              console.log(
                'Testing Label Number:',
                drumNumber
              );

            } else {

              drumNumber =
                this.extractWoodenFactoryNumber(
                  this.scannedData
                );

              console.log(
                'Wooden Factory Number:',
                drumNumber
              );
            }

            this.stopScanner();

            if (drumNumber) {

              this.scanned.emit(
                drumNumber
              );

            } else {

              this.errorMessage =
                'Drum Number not found in this QR code.';
            }

          }
        );

    } catch (error) {

      console.error(
        'Camera Error:',
        error
      );

      this.errorMessage =
        'Unable to access the camera.';
    }
  }

  extractTestingLabelNumber(
    data: string
  ): string | null {

    const match =
      data.match(
        /Drum Number\s*:\s*Q-(\d+)/i
      );

    return match
      ? match[1]
      : null;
  }

  extractWoodenFactoryNumber(
    data: string
  ): string | null {

    const match =
      data.match(
        /\bR-(\d+)-26\b/i
      );

    return match
      ? match[1]
      : null;
  }

  stopScanner(): void {

    this.controls?.stop();

    this.controls = undefined;

    const video =
      this.video?.nativeElement;

    if (video?.srcObject) {

      const stream =
        video.srcObject as MediaStream;

      stream
        .getTracks()
        .forEach(track =>
          track.stop()
        );

      video.srcObject = null;
    }
  }

  closeScanner(): void {

    this.stopScanner();

    this.closed.emit();
  }

  ngOnDestroy(): void {

    this.stopScanner();
  }
}