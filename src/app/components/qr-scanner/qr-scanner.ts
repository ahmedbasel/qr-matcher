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

  private readonly zxingReader = new BrowserQRCodeReader();

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


  constructor() {

    afterNextRender(() => {

      setTimeout(() => {
        this.startScanner();
      }, 150);

    });

  }


  async startScanner(): Promise<void> {

    if (this.startingCamera || this.alreadyScanned) {
      return;
    }

    this.startingCamera = true;

    this.errorMessage = '';
    this.statusMessage = 'Starting camera...';

    try {

      const video = this.video?.nativeElement;

      if (!video) {

        this.errorMessage =
          'Camera element not found.';

        return;
      }

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


      /*
       * Try native BarcodeDetector first.
       * If unavailable, ZXing will be used.
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

        } catch {

          this.nativeDetector = null;

        }

      }


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

    }

    finally {

      this.startingCamera = false;

    }

  }


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

      if (this.alreadyScanned) {
        return;
      }


      try {

        if (
          video.readyState >=
          HTMLMediaElement.HAVE_CURRENT_DATA
        ) {

          const results =
            await this.nativeDetector.detect(video);


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


      this.nativeAnimationFrame =
        requestAnimationFrame(
          detect
        );

    };


    detect();

  }


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
              !this.alreadyScanned
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

    }

  }


  /*
   * IMAGE SCANNING
   */

  onImageSelected(event: Event): void {

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

        }

      };


      image.onerror = () => {

        this.isLoading = false;

        this.errorMessage =
          'Could not load this image.';

      };


      image.src =
        reader.result as string;

    };


    reader.onerror = () => {

      this.isLoading = false;

      this.errorMessage =
        'Could not read the selected image.';

    };


    reader.readAsDataURL(file);

    input.value = '';

  }


  /*
   * More reliable image scanning:
   *
   * 1. Try native BarcodeDetector
   * 2. Try original image with jsQR
   * 3. Try grayscale
   * 4. Try multiple thresholds
   */

  private readQrFromImage(
    image: HTMLImageElement
  ): void {

    const BarcodeDetectorClass =
      (window as any).BarcodeDetector;


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


  private tryJsQrImage(
    image: HTMLImageElement
  ): void {

    const canvas =
      document.createElement('canvas');

    const context =
      canvas.getContext('2d', {
        willReadFrequently: true
      });


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
     * First attempt:
     * Original image
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
     * Second attempt:
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
     * More aggressive attempts
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

  }


  /*
   * PROCESS QR
   */

  processQrData(
    data: string
  ): void {

    if (this.alreadyScanned) {
      return;
    }


    console.log(
      'FINAL QR DATA:',
      data
    );


    let drumNumber:
      string | null = null;


    if (
      this.scanType === 'testing'
    ) {

      drumNumber =
        this.extractTestingLabelNumber(
          data
        );

    }

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


    if (!drumNumber) {

      this.isLoading = false;

      this.statusMessage = '';

      this.errorMessage =
        this.scanType === 'testing'
          ? 'QR found, but Testing Label Drum Number was not found.'
          : 'QR found, but Wooden Factory Drum Number was not found.';

      return;

    }


    /*
     * STOP EVERYTHING
     */

    this.alreadyScanned = true;

    this.scannedData = data;

    this.extractedDrumNumber =
      drumNumber;

    this.isLoading = false;

    this.errorMessage = '';

    this.statusMessage =
      'QR scanned successfully.';

    this.stopScanner();


    /*
     * IMPORTANT:
     *
     * Send Testing Number immediately
     * to App so it can be saved.
     */

    this.scanned.emit(
      drumNumber
    );


    /*
     * Wooden number is also sent
     * to App.
     *
     * App will compare it with
     * the saved Testing number.
     */

  }


  /*
   * GO TO WOODEN
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


    this.scanType = 'wooden';

    this.scannedData = '';

    this.extractedDrumNumber = '';

    this.errorMessage = '';

    this.isLoading = false;

    this.alreadyScanned = false;

    this.statusMessage =
      'Scan the Wooden Factory QR code.';


    this.goWooden.emit();


    setTimeout(() => {

      this.startScanner();

    }, 150);

  }


  /*
   * TESTING LABEL
   *
   * Example:
   * Drum Number: Q-30857
   *
   * Result:
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
   * WOODEN FACTORY
   *
   * Examples:
   *
   * R-30857-26
   * SER-R-30857-26
   *
   * Result:
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
   * STOP CAMERA
   */

  stopScanner(): void {

    if (
      this.nativeAnimationFrame
    ) {

      cancelAnimationFrame(
        this.nativeAnimationFrame
      );

      this.nativeAnimationFrame = 0;

    }


    this.zxingControls?.stop();

    this.zxingControls =
      undefined;


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


    this.nativeDetector = null;

  }


  closeScanner(): void {

    this.stopScanner();

    this.closed.emit();

  }


  ngOnDestroy(): void {

    this.stopScanner();

  }

}