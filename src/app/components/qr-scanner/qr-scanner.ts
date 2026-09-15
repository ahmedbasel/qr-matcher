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

import jsQR from 'jsqr';

@Component({
  selector: 'app-qr-scanner',
  standalone: true,
  imports: [],
  templateUrl: './qr-scanner.html',
  styleUrl: './qr-scanner.scss'
})
export class QrScanner implements OnDestroy {

  // ==========================================
  // VIDEO ELEMENT
  // ==========================================

  @ViewChild('video')
  video?: ElementRef<HTMLVideoElement>;


  // ==========================================
  // SCAN TYPE
  // ==========================================

  @Input()
  scanType: 'testing' | 'wooden' = 'testing';


  // ==========================================
  // OUTPUT
  // ==========================================

  @Output()
  scanned = new EventEmitter<string>();

  @Output()
  closed = new EventEmitter<void>();


  // ==========================================
  // QR READER
  // ==========================================

  private reader = new BrowserMultiFormatReader();

  private controls?: IScannerControls;


  // ==========================================
  // UI STATE
  // ==========================================

  scannedData = '';

  errorMessage = '';

  statusMessage = '';

  isLoading = false;

  extractedDrumNumber = '';


  // ==========================================
  // SCAN STATE
  // ==========================================

  private alreadyScanned = false;


  // ==========================================
  // CONSTRUCTOR
  // ==========================================

  constructor() {

    afterNextRender(() => {

      setTimeout(() => {

        this.resetScannerState();

        this.startScanner();

      }, 100);

    });

  }


  // ==========================================
  // RESET SCANNER
  // ==========================================

  private resetScannerState(): void {

    this.stopScanner();

    this.scannedData = '';

    this.errorMessage = '';

    this.statusMessage = '';

    this.isLoading = false;

    this.extractedDrumNumber = '';

    this.alreadyScanned = false;

  }


  // ==========================================
  // START CAMERA
  // ==========================================

  async startScanner(): Promise<void> {

    try {

      this.errorMessage = '';

      this.statusMessage = 'Starting camera...';


      // Make sure video exists

      if (!this.video?.nativeElement) {

        this.errorMessage =
          'Camera element not found.';

        return;

      }


      // Find cameras

      const devices =
        await BrowserMultiFormatReader
          .listVideoInputDevices();


      if (!devices.length) {

        this.statusMessage =
          'No camera found. Choose an image instead.';

        return;

      }


      console.log(
        'Available cameras:',
        devices
      );


      // Try to find back camera

      const backCamera =
        devices.find(device =>
          /back|rear|environment/i.test(
            device.label
          )
        );


      const deviceId =
        backCamera?.deviceId ??
        devices[0].deviceId;


      console.log(
        'Using camera:',
        deviceId
      );


      this.statusMessage =
        'Camera ready. Point it at the QR code.';


      // Start camera

      this.controls =
        await this.reader.decodeFromVideoDevice(
          deviceId,
          this.video.nativeElement,
          (result) => {

            if (
              result &&
              !this.alreadyScanned
            ) {

              this.processQrData(
                result.getText()
              );

            }

          }
        );

    } catch (error) {

      console.error(
        'Camera Error:',
        error
      );

      this.statusMessage = '';

      this.errorMessage =
        'Camera unavailable. You can choose an image instead.';

    }

  }


  // ==========================================
  // IMAGE SELECTED
  // ==========================================

  onImageSelected(event: Event): void {

    const input =
      event.target as HTMLInputElement;


    const file =
      input.files?.[0];


    if (!file) {

      return;

    }


    console.log(
      'Selected image:',
      file.name
    );


    this.errorMessage = '';

    this.scannedData = '';

    this.extractedDrumNumber = '';

    this.statusMessage =
      'Loading image...';

    this.isLoading = true;

    this.alreadyScanned = false;


    // Stop camera

    this.stopScanner();


    const fileReader =
      new FileReader();


    fileReader.onload = () => {

      const image =
        new Image();


      image.onload = () => {

        try {

          console.log(
            'Image loaded:',
            image.width,
            image.height
          );


          this.statusMessage =
            'Reading QR code...';


          this.readQrFromImage(image);

        } catch (error) {

          console.error(
            'Image QR Error:',
            error
          );


          this.isLoading = false;

          this.statusMessage = '';

          this.errorMessage =
            'Could not read this image.';

        }

      };


      image.onerror = () => {

        this.isLoading = false;

        this.statusMessage = '';

        this.errorMessage =
          'Could not load this image.';

      };


      image.src =
        fileReader.result as string;

    };


    fileReader.onerror = () => {

      this.isLoading = false;

      this.statusMessage = '';

      this.errorMessage =
        'Could not read the selected image.';

    };


    fileReader.readAsDataURL(file);


    // Allow selecting same image again

    input.value = '';

  }


  // ==========================================
  // READ QR FROM IMAGE
  // ==========================================

  private readQrFromImage(
    image: HTMLImageElement
  ): void {

    const canvas =
      document.createElement('canvas');


    const context =
      canvas.getContext('2d');


    if (!context) {

      throw new Error(
        'Canvas is not supported.'
      );

    }


    // Limit huge images

    const MAX_SIZE = 1400;


    let width =
      image.naturalWidth;


    let height =
      image.naturalHeight;


    if (
      width > MAX_SIZE ||
      height > MAX_SIZE
    ) {

      const scale =
        Math.min(
          MAX_SIZE / width,
          MAX_SIZE / height
        );


      width =
        Math.round(width * scale);


      height =
        Math.round(height * scale);

    }


    canvas.width = width;

    canvas.height = height;


    context.drawImage(
      image,
      0,
      0,
      width,
      height
    );


    const imageData =
      context.getImageData(
        0,
        0,
        width,
        height
      );


    console.log(
      'Starting jsQR...',
      width,
      height
    );


    const qrCode =
      jsQR(
        imageData.data,
        imageData.width,
        imageData.height,
        {
          inversionAttempts:
            'attemptBoth'
        }
      );


    console.log(
      'jsQR result:',
      qrCode
    );


    this.isLoading = false;


    // No QR

    if (!qrCode) {

      this.statusMessage = '';

      this.errorMessage =
        'No QR code found in this image. Make sure the QR code is clear and fully visible.';

      return;

    }


    // QR found

    console.log(
      'QR DATA:',
      qrCode.data
    );


    this.processQrData(
      qrCode.data
    );

  }


  // ==========================================
  // PROCESS QR DATA
  // ==========================================

  processQrData(
    data: string
  ): void {

    if (this.alreadyScanned) {

      return;

    }


    console.log(
      'QR DATA:',
      data
    );


    let drumNumber:
      string | null = null;


    // ========================================
    // TESTING LABEL
    // ========================================

    if (
      this.scanType === 'testing'
    ) {

      drumNumber =
        this.extractTestingLabelNumber(
          data
        );

    }


    // ========================================
    // WOODEN FACTORY
    // ========================================

    else {

      drumNumber =
        this.extractWoodenFactoryNumber(
          data
        );

    }


    console.log(
      'Extracted Drum Number:',
      drumNumber
    );


    // ========================================
    // NUMBER NOT FOUND
    // ========================================

    if (!drumNumber) {

      this.isLoading = false;

      this.statusMessage = '';

      this.errorMessage =
        'QR found, but Drum Number was not found.';

      return;

    }


    // ========================================
    // SUCCESS
    // ========================================

    this.alreadyScanned = true;

    this.scannedData = data;

    this.extractedDrumNumber = drumNumber;

    this.isLoading = false;

    this.errorMessage = '';


    this.statusMessage =
      'QR scanned successfully.';


    // Stop current camera

    this.stopScanner();


    /*
     * IMPORTANT:
     *
     * We DO NOT emit immediately here.
     *
     * The first QR data stays visible
     * so the user can verify it.
     */

    if (this.scanType === 'testing') {

      console.log(
        'Testing Label scanned. Waiting for confirmation.'
      );

      return;

    }


    /*
     * Wooden Factory:
     *
     * After scanning the second QR,
     * send the extracted number to App.
     */

    setTimeout(() => {

      this.scanned.emit(
        drumNumber!
      );

    }, 300);

  }


  // ==========================================
  // CONTINUE TO WOODEN FACTORY
  // ==========================================

  continueToWooden(): void {

    if (
      this.scanType !== 'testing' ||
      !this.extractedDrumNumber
    ) {

      return;

    }


    console.log(
      'Testing Number confirmed:',
      this.extractedDrumNumber
    );


    /*
     * Change scanner mode.
     */

    this.scanType = 'wooden';


    /*
     * Clear previous result
     * before starting Wooden scan.
     */

    this.scannedData = '';

    this.extractedDrumNumber = '';

    this.errorMessage = '';

    this.statusMessage =
      'Scan the Wooden Factory QR code.';

    this.isLoading = false;

    this.alreadyScanned = false;


    /*
     * Start camera again.
     *
     * Small delay gives Angular time
     * to update the UI.
     */

    setTimeout(() => {

      this.startScanner();

    }, 150);

  }


  // ==========================================
  // TESTING LABEL EXTRACTION
  // ==========================================

  extractTestingLabelNumber(
    data: string
  ): string | null {

    /*
     * Example:
     *
     * Drum Number: Q-30857
     *
     * Result:
     *
     * 30857
     */

    const match =
      data.match(
        /Drum Number\s*:\s*Q-(\d+)/i
      );


    return match
      ? match[1]
      : null;

  }


  // ==========================================
  // WOODEN FACTORY EXTRACTION
  // ==========================================

  extractWoodenFactoryNumber(
    data: string
  ): string | null {

    /*
     * Examples:
     *
     * R-30857-26
     *
     * SER-R-30857-26
     *
     * Result:
     *
     * 30857
     */

    const match =
      data.match(
        /\bR-(\d+)-26\b/i
      );


    return match
      ? match[1]
      : null;

  }


  // ==========================================
  // STOP CAMERA
  // ==========================================

  stopScanner(): void {

    // Stop ZXing

    this.controls?.stop();

    this.controls =
      undefined;


    // Stop browser camera stream

    const video =
      this.video?.nativeElement;


    if (
      video?.srcObject
    ) {

      const stream =
        video.srcObject as MediaStream;


      stream
        .getTracks()
        .forEach(track => {

          track.stop();

        });


      video.srcObject = null;

    }

  }


  // ==========================================
  // CLOSE
  // ==========================================

  closeScanner(): void {

    this.stopScanner();

    this.closed.emit();

  }


  // ==========================================
  // DESTROY
  // ==========================================

  ngOnDestroy(): void {

    this.stopScanner();

  }

}