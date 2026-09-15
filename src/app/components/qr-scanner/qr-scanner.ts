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


  private zxingReader =
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



  constructor() {

    afterNextRender(() => {

      setTimeout(() => {

        this.startScanner();

      }, 100);

    });

  }



  async startScanner(): Promise<void> {


    if (this.startingCamera) {
      return;
    }


    if (this.alreadyScanned) {
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
              ideal: 1280
            },

            height: {
              ideal: 720
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



      const BarcodeDetectorClass =
        (window as any).BarcodeDetector;



      if (BarcodeDetectorClass) {


        console.log(
          'Using Native BarcodeDetector'
        );


        try {


          this.nativeDetector =
            new BarcodeDetectorClass({
              formats: ['qr_code']
            });


          this.scanWithNativeDetector(
            video
          );


          return;


        } catch (error) {


          console.warn(
            'Native BarcodeDetector unavailable:',
            error
          );


          this.nativeDetector = null;

        }

      }



      console.log(
        'Using ZXing QR fallback'
      );


      await this.startZxing(video);



    } catch (error) {


      console.error(
        'Camera Error:',
        error
      );


      this.statusMessage = '';


      this.errorMessage =
        'Camera unavailable. Allow camera permission or choose an image.';



    } finally {


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
            await this.nativeDetector.detect(
              video
            );


          if (
            results &&
            results.length > 0
          ) {


            const data =
              results[0].rawValue;


            if (data) {


              console.log(
                'FAST NATIVE QR:',
                data
              );


              this.processQrData(
                data
              );


              return;

            }

          }

        }


      } catch (error) {


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
        await this.zxingReader
          .decodeFromConstraints(

            {

              video: {

                facingMode: {
                  ideal: 'environment'
                },

                width: {
                  ideal: 1280
                },

                height: {
                  ideal: 720
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
                  'FAST ZXING QR:',
                  data
                );


                this.processQrData(
                  data
                );

              }

            }

          );


    } catch (error) {


      console.error(
        'ZXing Error:',
        error
      );


      this.errorMessage =
        'QR scanner could not start.';

    }

  }



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


          console.log(
            'Image loaded:',
            image.width,
            image.height
          );


          this.readQrFromImage(
            image
          );


        } catch (error) {


          console.error(
            'Image QR Error:',
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



  private readQrFromImage(
    image: HTMLImageElement
  ): void {


    const canvas =
      document.createElement('canvas');


    const context =
      canvas.getContext('2d');


    if (!context) {

      throw new Error(
        'Canvas unavailable.'
      );

    }



    let width =
      image.naturalWidth;


    let height =
      image.naturalHeight;


    const MAX_SIZE = 1800;



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



    const imageData =
      context.getImageData(
        0,
        0,
        width,
        height
      );



    console.log(
      'Starting jsQR:',
      width,
      height
    );



    const qr =
      jsQR(
        imageData.data,
        width,
        height,
        {
          inversionAttempts:
            'attemptBoth'
        }
      );



    console.log(
      'jsQR result:',
      qr
    );



    this.isLoading = false;



    if (!qr) {


      this.statusMessage = '';


      this.errorMessage =
        'No QR code found. Use a clear image with the full QR code visible.';


      return;

    }



    console.log(
      'IMAGE QR:',
      qr.data
    );



    this.processQrData(
      qr.data
    );

  }



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



    if (
      this.scanType === 'testing'
    ) {


      drumNumber =
        this.extractTestingLabelNumber(
          data
        );


    } else {


      drumNumber =
        this.extractWoodenFactoryNumber(
          data
        );

    }



    console.log(
      'EXTRACTED DRUM NUMBER:',
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
      Testing:
      نعرض الداتا ونستنى المستخدم
      يضغط Go to Wooden Factory.
    */

    if (
      this.scanType === 'testing'
    ) {

      return;

    }



    /*
      Wooden:
      بعد القراءة نرسل الرقم للـ App
      عشان يعمل MATCH / NOT MATCH.
    */

    setTimeout(() => {

      this.scanned.emit(
        drumNumber!
      );

    }, 200);

  }



  goToWooden(): void {


    if (
      this.scanType !== 'testing' ||
      !this.extractedDrumNumber
    ) {

      return;

    }



    console.log(
      'Testing confirmed:',
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



    /*
      نخبر الـ App إننا انتقلنا
      من Testing إلى Wooden.
    */

    this.goWooden.emit();



    setTimeout(() => {

      this.startScanner();

    }, 100);

  }



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