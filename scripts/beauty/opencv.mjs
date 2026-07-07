let openCvPromise = null;

export async function initializeOpenCV() {
  if (!openCvPromise) {
    openCvPromise = import("https://cdn.jsdelivr.net/npm/@techstark/opencv-js@5.0.0-release.1/+esm")
      .then((module) => module.default || module.cv || module)
      .then(waitForRuntime);
  }
  return openCvPromise;
}

export async function matFromCanvas(canvas) {
  const cv = await initializeOpenCV();
  return cv.imread(canvas);
}

export async function canvasFromMat(mat, canvas) {
  const cv = await initializeOpenCV();
  cv.imshow(canvas, mat);
  return canvas;
}

export function clone(mat) {
  return mat && typeof mat.clone === "function" ? mat.clone() : null;
}

export function dispose(...items) {
  items.forEach((item) => {
    if (item && typeof item.delete === "function") item.delete();
  });
}

export async function bilateral(sourceMat, diameter = 7, sigmaColor = 35, sigmaSpace = 35) {
  const cv = await initializeOpenCV();
  const output = new cv.Mat();
  cv.bilateralFilter(sourceMat, output, diameter, sigmaColor, sigmaSpace);
  return output;
}

export async function gaussian(sourceMat, kernelSize = 5) {
  const cv = await initializeOpenCV();
  const output = new cv.Mat();
  const size = new cv.Size(kernelSize, kernelSize);
  cv.GaussianBlur(sourceMat, output, size, 0, 0, cv.BORDER_DEFAULT);
  return output;
}

export async function lab(sourceMat) {
  const cv = await initializeOpenCV();
  const output = new cv.Mat();
  cv.cvtColor(sourceMat, output, cv.COLOR_RGBA2Lab);
  return output;
}

export async function rgb(sourceMat) {
  const cv = await initializeOpenCV();
  const output = new cv.Mat();
  cv.cvtColor(sourceMat, output, cv.COLOR_Lab2RGBA);
  return output;
}

export async function blend(baseMat, overlayMat, alpha = 0.5) {
  const cv = await initializeOpenCV();
  const output = new cv.Mat();
  cv.addWeighted(baseMat, 1 - alpha, overlayMat, alpha, 0, output);
  return output;
}

export async function inpaint(sourceMat, maskMat, radius = 3) {
  const cv = await initializeOpenCV();
  const output = new cv.Mat();
  cv.inpaint(sourceMat, maskMat, output, radius, cv.INPAINT_TELEA);
  return output;
}

export async function histogram(sourceMat, channel = 0) {
  const cv = await initializeOpenCV();
  const channels = [channel];
  const histSize = [256];
  const ranges = [0, 256];
  const hist = new cv.Mat();
  const sourceVector = new cv.MatVector();
  sourceVector.push_back(sourceMat);
  cv.calcHist(sourceVector, channels, new cv.Mat(), hist, histSize, ranges);
  sourceVector.delete();
  return hist;
}

function waitForRuntime(cv) {
  if (!cv) throw new Error("OpenCV module did not load");
  if (cv.Mat) return cv;
  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => reject(new Error("OpenCV runtime timed out")), 10000);
    cv.onRuntimeInitialized = () => {
      window.clearTimeout(timeout);
      resolve(cv);
    };
  });
}
