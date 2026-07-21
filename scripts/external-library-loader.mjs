const LIBRARIES = {
  email: {
    src: "https://cdn.jsdelivr.net/npm/@emailjs/browser@3/dist/email.min.js",
    isReady: (windowRef) => Boolean(windowRef.emailjs?.send),
    getValue: (windowRef) => windowRef.emailjs,
  },
  qr: {
    src: "https://cdn.jsdelivr.net/npm/qrcode@1.5.1/build/qrcode.min.js",
    isReady: (windowRef) => Boolean(windowRef.QRCode?.toCanvas),
    getValue: (windowRef) => windowRef.QRCode,
  },
  segmentation: {
    src: "https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/selfie_segmentation.js",
    isReady: (windowRef) => Boolean(windowRef.SelfieSegmentation),
    getValue: (windowRef) => windowRef.SelfieSegmentation,
  },
};

export function createExternalLibraryLoader(options = {}) {
  const getWindow = options.getWindow || (() => globalThis.window);
  const getDocument = options.getDocument || (() => globalThis.document);
  const pending = new Map();

  function loadLibrary(key) {
    const config = LIBRARIES[key];
    if (!config) return Promise.reject(new Error(`Unknown library: ${key}`));
    const windowRef = getWindow();
    if (config.isReady(windowRef)) {
      return Promise.resolve(config.getValue(windowRef));
    }
    if (pending.has(key)) return pending.get(key);
    const promise = new Promise((resolve, reject) => {
      const script = getDocument().createElement("script");
      script.src = config.src;
      script.async = true;
      script.onload = () => {
        if (config.isReady(windowRef)) {
          resolve(config.getValue(windowRef));
          return;
        }
        pending.delete(key);
        reject(new Error(`${key} library loaded without its expected API`));
      };
      script.onerror = () => {
        pending.delete(key);
        reject(new Error(`${key} library failed to load`));
      };
      getDocument().head.appendChild(script);
    });
    pending.set(key, promise);
    return promise;
  }

  return {
    loadEmailJsLibrary: () => loadLibrary("email"),
    loadQrCodeLibrary: () => loadLibrary("qr"),
    loadSelfieSegmentationLibrary: () => loadLibrary("segmentation"),
  };
}

const defaultLoader = createExternalLibraryLoader();

export const loadEmailJsLibrary = defaultLoader.loadEmailJsLibrary;
export const loadQrCodeLibrary = defaultLoader.loadQrCodeLibrary;
export const loadSelfieSegmentationLibrary =
  defaultLoader.loadSelfieSegmentationLibrary;
