import {
  ChangeDetectorRef,
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
  BrowserQRCodeReader,
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

  @ViewChild('video')
  video?: ElementRef<HTMLVideoElement>;

  @Input()
  scanType: 'testing' | 'wooden' = 'testing';

  @Output()
  scanned = new EventEmitter<string>();

  @Output()
  closed = new EventEmitter<void>();

  @Output()
  goWooden = new EventEmitter<void>();

  private readonly zxingReader =
    new BrowserQRCodeReader();

  private zxingControls?: IScannerControls;

  scannedData = '';

  extractedDrumNumber = '';

  errorMessage = '';

  statusMessage = '';

  isLoading = false;

  private alreadyScanned = false;

  private startingCamera = false;


  constructor(
    private cdr: ChangeDetectorRef
  ) {

    afterNextRender(() => {

      setTimeout(() => {

        this.startScanner();

      }, 200);

    });

  }


  /*
   * START CAMERA
   *
   * Camera scanning uses ZXing only.
   */

  async startScanner(): Promise<void> {

    if (
      this.startingCamera ||
      this.alreadyScanned ||
      this.scannedData
    ) {
      return;
    }

    this.startingCamera = true;

    this.errorMessage = '';

    this.statusMessage =
      'Starting camera...';

    this.isLoading = true;

    this.cdr.detectChanges();


    try {

      const video =
        this.video?.nativeElement;


      if (!video) {

        this.errorMessage =
          'Camera element not found.';

        this.isLoading = false;

        this.cdr.detectChanges();

        return;

      }


      /*
       * Make sure old camera is stopped.
       */

      this.stopScanner();


      /*
       * ZXing handles the camera.
       */

      this.zxingControls =
        await this.zxingReader.decodeFromConstraints(

          {
            video: {
              facingMode: {
                ideal: 'environment'
              },

              width: {
                ideal: 1920
              },

              height: {
                ideal: 1080
              }
            },

            audio: false

          },

          video,

          (result) => {

            if (
              !result ||
              this.alreadyScanned ||
              this.scannedData
            ) {
              return;
            }


            const data =
              result.getText();


            /*
             * VERY IMPORTANT:
             * Ignore empty ZXing results.
             */

            if (
              !data ||
              !data.trim()
            ) {

              console.warn(
                'ZXing returned empty QR data.'
              );

              return;

            }


            console.log(
              'ZXing QR:',
              data
            );


            this.processQrData(
              data.trim()
            );

          }

        );


      this.isLoading = false;

      this.statusMessage =
        'Point the camera at the QR code.';

      this.cdr.detectChanges();

    }

    catch (error) {

      console.error(
        'Camera / ZXing error:',
        error
      );


      this.isLoading = false;

      this.statusMessage = '';

      this.errorMessage =
        'Camera unavailable. Please allow camera permission or choose an image.';

      this.cdr.detectChanges();

    }

    finally {

      this.startingCamera = false;

    }

  }


  /*
   * IMAGE SCANNING
   */

  onImageSelected(
    event: Event
  ): void {

    const input =
      event.target as HTMLInputElement;

    const file =
      input.files?.[0];


    if (!file) {
      return;
    }


    this.stopScanner();


    this.errorMessage = '';

    this.scannedData = '';

    this.extractedDrumNumber = '';

    this.statusMessage =
      'Reading QR image...';

    this.isLoading = true;

    this.alreadyScanned = false;

    this.cdr.detectChanges();


    const reader =
      new FileReader();


    reader.onload = () => {

      const image =
        new Image();


      image.onload = () => {

        try {

          this.readQrFromImage(image);

        }

        catch (error) {

          console.error(
            'Image QR error:',
            error
          );


          this.isLoading = false;

          this.errorMessage =
            'Could not read this image.';

          this.cdr.detectChanges();

        }

      };


      image.onerror = () => {

        this.isLoading = false;

        this.errorMessage =
          'Could not load this image.';

        this.cdr.detectChanges();

      };


      image.src =
        reader.result as string;

    };


    reader.onerror = () => {

      this.isLoading = false;

      this.errorMessage =
        'Could not read the selected image.';

      this.cdr.detectChanges();

    };


    reader.readAsDataURL(file);

    input.value = '';

  }


  /*
   * IMAGE QR READER
   */

  private async readQrFromImage(
  image: HTMLImageElement
): Promise<void> {

  console.log('IMAGE SIZE:', {
    width: image.naturalWidth,
    height: image.naturalHeight
  });

  /*
   * =========================================
   * 1. ZXing
   * =========================================
   */

  try {

    const result =
      await this.zxingReader.decodeFromImageElement(
        image
      );

    const data =
      result?.getText()?.trim();


    if (data) {

      console.log(
        'ZXing IMAGE QR:',
        data
      );

      this.processQrData(data);

      return;

    }

  }

  catch (error) {

    console.warn(
      'ZXing image decode failed:',
      error
    );

  }


  /*
   * =========================================
   * 2. Native BarcodeDetector
   * =========================================
   */

  const BarcodeDetectorClass =
    (window as any).BarcodeDetector;


  if (BarcodeDetectorClass) {

    try {

      const detector =
        new BarcodeDetectorClass({
          formats: ['qr_code']
        });


      const results =
        await detector.detect(image);


      if (
        results &&
        results.length > 0
      ) {

        const data =
          results[0]?.rawValue?.trim();


        if (data) {

          console.log(
            'Native IMAGE QR:',
            data
          );

          this.processQrData(data);

          return;

        }

      }

    }

    catch (error) {

      console.warn(
        'Native image decoder failed:',
        error
      );

    }

  }


  /*
   * =========================================
   * 3. jsQR fallback
   * =========================================
   */

  console.log(
    'Trying jsQR fallback...'
  );


  try {

    this.tryJsQrImage(image);

  }

  catch (error) {

    console.error(
      'jsQR fallback failed:',
      error
    );


    this.isLoading = false;

    this.errorMessage =
      'Could not read this QR image.';

    this.cdr.detectChanges();

  }

}


  /*
   * JSQR IMAGE READER
   */

  private tryJsQrImage(
    image: HTMLImageElement
  ): void {

    const canvas =
      document.createElement('canvas');


    const context =
      canvas.getContext(
        '2d',
        {
          willReadFrequently: true
        }
      );


    if (!context) {

      throw new Error(
        'Canvas unavailable.'
      );

    }


    let width =
      image.naturalWidth;

    let height =
      image.naturalHeight;


    const MAX_SIZE = 2200;


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
        Math.round(
          width * scale
        );

      height =
        Math.round(
          height * scale
        );

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


    const original =
      context.getImageData(
        0,
        0,
        width,
        height
      );


    /*
     * Attempt 1:
     * Original image
     */

    let result =
      jsQR(
        original.data,
        width,
        height,
        {
          inversionAttempts: 'attemptBoth'
        }
      );


    if (result?.data) {

      this.processQrData(
        result.data.trim()
      );

      return;

    }


    /*
     * Attempt 2:
     * Grayscale
     */

    const gray =
      new Uint8ClampedArray(
        original.data
      );


    for (
      let i = 0;
      i < gray.length;
      i += 4
    ) {

      const value =
        Math.round(
          0.299 * gray[i] +
          0.587 * gray[i + 1] +
          0.114 * gray[i + 2]
        );


      gray[i] = value;

      gray[i + 1] = value;

      gray[i + 2] = value;

    }


    result =
      jsQR(
        gray,
        width,
        height,
        {
          inversionAttempts: 'attemptBoth'
        }
      );


    if (result?.data) {

      this.processQrData(
        result.data.trim()
      );

      return;

    }


    /*
     * Attempt 3:
     * Thresholds
     */

    const thresholds = [
      80,
      100,
      120,
      140,
      160,
      180,
      200
    ];


    for (
      const threshold of thresholds
    ) {

      const binary =
        new Uint8ClampedArray(
          gray
        );


      for (
        let i = 0;
        i < binary.length;
        i += 4
      ) {

        const value =
          binary[i] >= threshold
            ? 255
            : 0;


        binary[i] = value;

        binary[i + 1] = value;

        binary[i + 2] = value;

      }


      result =
        jsQR(
          binary,
          width,
          height,
          {
            inversionAttempts: 'attemptBoth'
          }
        );


      if (result?.data) {

        this.processQrData(
          result.data.trim()
        );

        return;

      }

    }


    /*
     * Nothing worked.
     */

    this.isLoading = false;

    this.statusMessage = '';

    this.errorMessage =
      'No QR code found. Make sure the full QR code is visible and clear.';

    this.cdr.detectChanges();

  }


  /*
   * PROCESS QR DATA
   */

  processQrData(
    data: string
  ): void {

    /*
     * Never accept empty data.
     */

    if (
      !data ||
      !data.trim()
    ) {

      console.warn(
        'Ignoring empty QR data.'
      );

      return;

    }


    if (
      this.alreadyScanned ||
      this.scannedData
    ) {
      return;
    }


    data =
      data.trim();


    console.log(
      '=============================='
    );

    console.log(
      'RAW QR DATA:',
      data
    );

    console.log(
      'QR DATA LENGTH:',
      data.length
    );

    console.log(
      'SCAN TYPE:',
      this.scanType
    );

    console.log(
      '=============================='
    );


    /*
     * Extract Drum Number.
     */

    let number: string | null = null;


    if (
      this.scanType === 'testing'
    ) {

      number =
        this.extractTestingLabelNumber(
          data
        );

    }

    else {

      number =
        this.extractWoodenFactoryNumber(
          data
        );

    }


    /*
     * QR was read,
     * but expected Drum Number wasn't found.
     */

    if (!number) {

      this.errorMessage =
        this.scanType === 'testing'

          ? 'QR detected, but no Testing Label Drum Number was found.'

          : 'QR detected, but no Wooden Factory Drum Number was found.';

      this.isLoading = false;

      this.cdr.detectChanges();

      console.warn(
        'QR detected but Drum Number extraction failed:',
        data
      );

      return;

    }


    /*
     * Lock scanner.
     */

    this.alreadyScanned = true;


    /*
     * Stop camera.
     */

    this.stopScanner();


    /*
     * Save raw QR data.
     */

    this.scannedData =
      data;


    /*
     * Save extracted Drum Number.
     */

    this.extractedDrumNumber =
      number;


    this.isLoading = false;

    this.errorMessage = '';

    this.statusMessage =
      'QR scanned successfully.';


    console.log(
      'Extracted Drum Number:',
      this.extractedDrumNumber
    );


    this.cdr.detectChanges();


    /*
     * Send ONLY the extracted Drum Number
     * to the parent.
     */

    this.scanned.emit(
      this.extractedDrumNumber
    );

  }


  /*
   * GO TO WOODEN FACTORY
   */

  goToWooden(): void {

    if (
      this.scanType !== 'testing' ||
      !this.extractedDrumNumber
    ) {

      return;

    }


    console.log(
      'Testing Number:',
      this.extractedDrumNumber
    );


    /*
     * Change step.
     */

    this.scanType =
      'wooden';


    /*
     * Clear previous result.
     */

    this.scannedData = '';

    this.extractedDrumNumber = '';

    this.errorMessage = '';

    this.isLoading = false;

    this.statusMessage =
      'Scan the Wooden Factory QR code.';


    /*
     * Allow new scan.
     */

    this.alreadyScanned = false;


    /*
     * Tell parent.
     */

    this.goWooden.emit();


    this.cdr.detectChanges();


    /*
     * Start camera after UI changes.
     */

    setTimeout(() => {

      this.startScanner();

    }, 250);

  }


  /*
   * TESTING LABEL EXTRACTION
   *
   * Q-30857
   * Drum Number: Q-30857
   * ABC Q-30857 XYZ
   *
   * Returns:
   * 30857
   */

extractTestingLabelNumber(
  data: string
): string | null {

  const match = data.match(
    /Drum\s*Number\s*:\s*([A-Z]-?\d{5})/i
  );

  if (!match) {
    return null;
  }

  return match[1];
}


  /*
   * WOODEN FACTORY EXTRACTION
   *
   * R-30857-26
   * SER-R-30857-26
   *
   * Returns:
   * 30857
   */

  extractWoodenFactoryNumber(
  data: string
): string | null {

  const match = data.match(
    /SER-([A-Z])-(\d{5})-26/i
  );

  if (!match) {
    return null;
  }

  return `${match[1]}-${match[2]}`;
}

  /*
   * STOP CAMERA
   */

  stopScanner(): void {

    /*
     * Stop ZXing.
     */

    this.zxingControls?.stop();

    this.zxingControls =
      undefined;


    /*
     * Stop video tracks.
     */

    const video =
      this.video?.nativeElement;


    if (
      video?.srcObject
    ) {

      const stream =
        video.srcObject as MediaStream;


      stream
        .getTracks()
        .forEach(
          track => track.stop()
        );


      video.srcObject = null;

    }

  }


  /*
   * CLOSE
   */

  closeScanner(): void {

    this.stopScanner();

    this.closed.emit();

  }


  /*
   * CLEANUP
   */

  ngOnDestroy(): void {

    this.stopScanner();

  }

}