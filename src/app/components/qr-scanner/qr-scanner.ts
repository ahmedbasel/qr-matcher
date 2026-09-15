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

  private nativeDetector: any = null;

  private nativeAnimationFrame = 0;

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
      }, 150);

    });

  }


  async startScanner(): Promise<void> {

    /*
     * Don't start the camera again if:
     *
     * 1. Camera is already starting
     * 2. QR was already scanned
     * 3. We already have data displayed
     */

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


    try {

      const video =
        this.video?.nativeElement;


      if (!video) {

        this.errorMessage =
          'Camera element not found.';

        this.cdr.detectChanges();

        return;

      }


      /*
       * Make sure any old scanner
       * is completely stopped.
       */

      this.stopScanner();


      const stream =
        await navigator.mediaDevices.getUserMedia({

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

        });


      video.srcObject = stream;

      video.setAttribute(
        'playsinline',
        'true'
      );

      video.muted = true;


      await video.play();


      this.statusMessage =
        'Point the camera at the QR code.';


      this.cdr.detectChanges();


      /*
       * Try native BarcodeDetector first.
       */

      const BarcodeDetectorClass =
        (window as any).BarcodeDetector;


      if (BarcodeDetectorClass) {

        try {

          this.nativeDetector =
            new BarcodeDetectorClass({
              formats: ['qr_code']
            });


          this.scanWithNativeDetector(
            video
          );


          return;

        }

        catch {

          this.nativeDetector = null;

        }

      }


      /*
       * Fallback to ZXing.
       */

      await this.startZxing(video);

    }

    catch (error) {

      console.error(
        'Camera error:',
        error
      );

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
   * NATIVE QR DETECTOR
   */

  private scanWithNativeDetector(
    video: HTMLVideoElement
  ): void {

    if (
      this.alreadyScanned ||
      !this.nativeDetector
    ) {
      return;
    }


    const detect = async () => {

      if (
        this.alreadyScanned ||
        this.scannedData
      ) {
        return;
      }


      try {

        if (
          video.readyState >=
          HTMLMediaElement.HAVE_CURRENT_DATA
        ) {

          const results =
            await this.nativeDetector.detect(
              video
            );


          if (
            results &&
            results.length > 0
          ) {

            const data =
              results[0]?.rawValue;


            if (data) {

              console.log(
                'Native QR:',
                data
              );


              this.processQrData(data);


              return;

            }

          }

        }

      }

      catch (error) {

        console.warn(
          'Native QR detection error:',
          error
        );

      }


      if (
        !this.alreadyScanned &&
        !this.scannedData
      ) {

        this.nativeAnimationFrame =
          requestAnimationFrame(
            detect
          );

      }

    };


    detect();

  }


  /*
   * ZXING CAMERA SCANNER
   */

  private async startZxing(
    video: HTMLVideoElement
  ): Promise<void> {

    try {

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
              result &&
              !this.alreadyScanned &&
              !this.scannedData
            ) {

              const data =
                result.getText();


              console.log(
                'ZXing QR:',
                data
              );


              this.processQrData(data);

            }

          }

        );

    }

    catch (error) {

      console.error(
        'ZXing error:',
        error
      );


      this.errorMessage =
        'QR scanner could not start.';


      this.cdr.detectChanges();

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


    /*
     * Stop camera immediately.
     */

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

  private readQrFromImage(
    image: HTMLImageElement
  ): void {

    const BarcodeDetectorClass =
      (window as any).BarcodeDetector;


    /*
     * First try native BarcodeDetector.
     */

    if (BarcodeDetectorClass) {

      try {

        const detector =
          new BarcodeDetectorClass({
            formats: ['qr_code']
          });


        detector
          .detect(image)

          .then((results: any[]) => {

            if (
              results &&
              results.length > 0 &&
              results[0]?.rawValue
            ) {

              this.processQrData(
                results[0].rawValue
              );

              return;

            }


            this.tryJsQrImage(image);

          })

          .catch(() => {

            this.tryJsQrImage(image);

          });


        return;

      }

      catch {

        // Continue to jsQR

      }

    }


    this.tryJsQrImage(image);

  }


  /*
   * JSQR IMAGE FALLBACK
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
     * Original
     */

    let result =
      jsQR(
        original.data,
        width,
        height,
        {
          inversionAttempts:
            'attemptBoth'
        }
      );


    if (result) {

      this.processQrData(
        result.data
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
          inversionAttempts:
            'attemptBoth'
        }
      );


    if (result) {

      this.processQrData(
        result.data
      );

      return;

    }


    /*
     * Attempt 3:
     * Multiple thresholds
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
            inversionAttempts:
              'attemptBoth'
          }
        );


      if (result) {

        this.processQrData(
          result.data
        );

        return;

      }

    }


    this.isLoading = false;

    this.statusMessage = '';

    this.errorMessage =
      'No QR code found. Make sure the full QR code is visible and clear.';


    this.cdr.detectChanges();

  }


  /*
   * PROCESS QR RESULT
   */

  processQrData(
    data: string
  ): void {

    /*
     * Ignore duplicate results.
     */

    if (
      this.alreadyScanned ||
      this.scannedData
    ) {
      return;
    }


    console.log(
      'FINAL QR DATA:',
      data
    );


    let drumNumber:
      string | null = null;


    /*
     * TESTING LABEL
     */

    if (
      this.scanType === 'testing'
    ) {

      drumNumber =
        this.extractTestingLabelNumber(
          data
        );

    }

    /*
     * WOODEN FACTORY
     */

    else {

      drumNumber =
        this.extractWoodenFactoryNumber(
          data
        );

    }


    console.log(
      'DRUM NUMBER:',
      drumNumber
    );


    /*
     * QR FOUND BUT INVALID FORMAT
     */

    if (!drumNumber) {

      this.isLoading = false;

      this.statusMessage = '';


      this.errorMessage =
        this.scanType === 'testing'

          ? 'QR found, but Testing Label Drum Number was not found.'

          : 'QR found, but Wooden Factory Drum Number was not found.';


      this.cdr.detectChanges();

      return;

    }


    /*
     * IMPORTANT:
     *
     * Lock scanner FIRST.
     */

    this.alreadyScanned = true;


    /*
     * STOP CAMERA FIRST.
     */

    this.stopScanner();


    /*
     * SAVE DATA.
     */

    this.scannedData =
      data;


    this.extractedDrumNumber =
      drumNumber;


    this.isLoading = false;

    this.errorMessage = '';

    this.statusMessage =
      'QR scanned successfully.';


    /*
     * FORCE ANGULAR TO UPDATE
     * THE HTML IMMEDIATELY.
     */

    this.cdr.detectChanges();


    /*
     * SEND NUMBER TO PARENT.
     */

    this.scanned.emit(
      drumNumber
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
     * Clear Testing UI.
     */

    this.scannedData = '';

    this.extractedDrumNumber = '';

    this.errorMessage = '';

    this.isLoading = false;


    /*
     * Allow scanner again.
     */

    this.alreadyScanned = false;


    this.statusMessage =
      'Scan the Wooden Factory QR code.';


    /*
     * Tell parent.
     */

    this.goWooden.emit();


    this.cdr.detectChanges();


    /*
     * Start camera ONLY after
     * clicking the button.
     */

    setTimeout(() => {

      this.startScanner();

    }, 200);

  }


  /*
   * TESTING LABEL EXTRACTION
   *
   * Example:
   *
   * Drum Number: Q-30857
   *
   * Returns:
   *
   * 30857
   */

  extractTestingLabelNumber(
    data: string
  ): string | null {

    const match =
      data.match(
        /Drum\s*Number\s*:\s*Q-(\d+)/i
      );


    return match
      ? match[1]
      : null;

  }


  /*
   * WOODEN FACTORY EXTRACTION
   *
   * Examples:
   *
   * R-30857-26
   *
   * SER-R-30857-26
   *
   * Returns:
   *
   * 30857
   */

  extractWoodenFactoryNumber(
    data: string
  ): string | null {

    const match =
      data.match(
        /(?:^|[^A-Z0-9])R-(\d+)-26(?:[^A-Z0-9]|$)/i
      );


    return match
      ? match[1]
      : null;

  }


  /*
   * STOP EVERYTHING
   */

  stopScanner(): void {

    /*
     * Stop native detection loop.
     */

    if (
      this.nativeAnimationFrame
    ) {

      cancelAnimationFrame(
        this.nativeAnimationFrame
      );

      this.nativeAnimationFrame = 0;

    }


    /*
     * Stop ZXing.
     */

    this.zxingControls?.stop();

    this.zxingControls =
      undefined;


    /*
     * Stop camera tracks.
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


    /*
     * Clear detector.
     */

    this.nativeDetector = null;

  }


  /*
   * CLOSE SCANNER
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