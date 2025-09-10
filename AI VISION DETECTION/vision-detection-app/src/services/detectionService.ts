// Import the Status type from App.tsx
import { Status } from '../App';

// Types for our detection service
export interface Detection {
  class: string;
  confidence: number;
  bbox: [number, number, number, number]; // [x, y, width, height]
}

interface CocoSsdPrediction {
  bbox: [number, number, number, number];
  class: string;
  score: number;
}

interface CocoSsdModel {
  detect: (img: HTMLImageElement) => Promise<CocoSsdPrediction[]>;
}

// This function loads the COCO-SSD model using TensorFlow.js
let model: CocoSsdModel | null = null;

// --- CHANGE 1: Accept the setStatus function as an argument ---
export const detectObjects = async (
  imageFile: File,
  setStatus: (status: Status) => void
): Promise<Detection[]> => {
  return new Promise<Detection[]>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async (event) => {
      if (!event.target?.result) {
        reject(new Error('Failed to read the image file'));
        return;
      }

      try {
        // Create an image element to use for detection
        const img = new Image();
        img.crossOrigin = 'anonymous';

        img.onload = async () => {
          try {
            // Load the model if not already loaded
            if (!model) {
              // --- CHANGE 2: Set status to loadingModel ---
              setStatus('loadingModel');

              // Dynamically import tf and cocoSsd
              const cocoSsd = await import('@tensorflow-models/coco-ssd');

              // Initialize model
              console.log('Loading COCO-SSD model...');
              model = await cocoSsd.load();
              console.log('Model loaded successfully');
            }

            // --- CHANGE 3: Set status to processingImage ---
            setStatus('processingImage');

            // Perform detection
            const predictions = await model.detect(img);

            // Convert predictions to our Detection interface
            const detections: Detection[] = predictions.map((pred: CocoSsdPrediction) => {
              const [x, y, width, height] = pred.bbox;
              return {
                class: pred.class,
                confidence: pred.score,
                bbox: [x, y, width, height],
              };
            });

            resolve(detections);
          } catch (error) {
            console.error('Error during detection:', error);
            reject(new Error('Failed to perform object detection'));
          }
        };

        img.onerror = () => {
          reject(new Error('Failed to load image for detection'));
        };

        // Set the image source to the file data
        img.src = event.target.result as string;
      } catch (error) {
        console.error('Error setting up detection:', error);
        reject(new Error('Error setting up object detection'));
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read the image file'));
    };

    reader.readAsDataURL(imageFile);
  });
};

