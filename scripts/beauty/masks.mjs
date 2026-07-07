export function buildBeautyMasks(faceResult, width, height) {
  const landmarks = getPrimaryLandmarks(faceResult);
  return {
    face: buildFaceMask(landmarks, width, height),
    teeth: buildMouthMask(landmarks, width, height),
    eyes: buildEyeMask(landmarks, width, height),
    underEyes: buildUnderEyeMask(landmarks, width, height)
  };
}

function getPrimaryLandmarks(faceResult) {
  return faceResult &&
    Array.isArray(faceResult.faceLandmarks) &&
    faceResult.faceLandmarks[0]
    ? faceResult.faceLandmarks[0]
    : null;
}

function buildFaceMask(landmarks, width, height) {
  if (!landmarks || !width || !height) {
    return centeredMask(width, height, 0.5, 0.46, 0.56, 0.68);
  }
  const bounds = getLandmarkBounds(landmarks, width, height);
  return expandBounds(bounds, width, height, 0.12, 0.16);
}

function buildMouthMask(landmarks, width, height) {
  if (!landmarks || landmarks.length < 15) {
    return centeredMask(width, height, 0.42, 0.58, 0.18, 0.08);
  }
  const bounds = getLandmarkBounds(sliceKnownLandmarks(landmarks, [13, 14, 78, 308]), width, height);
  return expandBounds(bounds, width, height, 0.08, 0.12);
}

function buildEyeMask(landmarks, width, height) {
  if (!landmarks || landmarks.length < 160) {
    return centeredMask(width, height, 0.5, 0.38, 0.42, 0.11);
  }
  const bounds = getLandmarkBounds(
    sliceKnownLandmarks(landmarks, [33, 133, 159, 263, 362, 386]),
    width,
    height
  );
  return expandBounds(bounds, width, height, 0.14, 0.16);
}

function buildUnderEyeMask(landmarks, width, height) {
  const eye = buildEyeMask(landmarks, width, height);
  return {
    x: eye.x,
    y: Math.min(height, eye.y + eye.height * 0.42),
    width: eye.width,
    height: eye.height * 0.9,
    feather: eye.feather
  };
}

function sliceKnownLandmarks(landmarks, indexes) {
  return indexes.map((index) => landmarks[index]).filter(Boolean);
}

function getLandmarkBounds(landmarks, width, height) {
  const xs = landmarks.map((point) => point.x * width);
  const ys = landmarks.map((point) => point.y * height);
  const left = Math.min(...xs);
  const right = Math.max(...xs);
  const top = Math.min(...ys);
  const bottom = Math.max(...ys);
  return {
    x: left,
    y: top,
    width: Math.max(1, right - left),
    height: Math.max(1, bottom - top),
    feather: 0.18
  };
}

function expandBounds(bounds, canvasWidth, canvasHeight, xPad, yPad) {
  const padX = bounds.width * xPad;
  const padY = bounds.height * yPad;
  const x = clamp(bounds.x - padX, 0, canvasWidth);
  const y = clamp(bounds.y - padY, 0, canvasHeight);
  const right = clamp(bounds.x + bounds.width + padX, 0, canvasWidth);
  const bottom = clamp(bounds.y + bounds.height + padY, 0, canvasHeight);
  return {
    x,
    y,
    width: Math.max(1, right - x),
    height: Math.max(1, bottom - y),
    feather: bounds.feather
  };
}

function centeredMask(width, height, centerX, centerY, maskWidth, maskHeight) {
  return {
    x: width * (centerX - maskWidth / 2),
    y: height * (centerY - maskHeight / 2),
    width: width * maskWidth,
    height: height * maskHeight,
    feather: 0.2
  };
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
