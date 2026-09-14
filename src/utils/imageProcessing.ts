/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ImageProcessingOptions } from '../types';

export interface ProcessedImageData {
  width: number;
  height: number;
  outlineMask: Uint8Array; // 1 for outline pixel, 0 otherwise
  fillMask: Uint8Array;    // 1 for filled silhouette pixel, 0 otherwise
  pinkLineMask: Uint8Array;// 1 for detected pink stick guide line pixel
  hasPinkLines: boolean;
  previewUrl: string;      // data url showing extracted outlines/fill
}

/**
 * Runs edge detection & thresholding on imageBitmap/HTMLImageElement
 */
export function processImageToMasks(
  img: HTMLImageElement,
  targetResolution: number = 250,
  options: ImageProcessingOptions
): ProcessedImageData {
  const canvas = document.createElement('canvas');
  let { width, height } = img;
  
  // Maintain aspect ratio within targetResolution
  if (width > height) {
    if (width > targetResolution) {
      height = Math.round((height * targetResolution) / width);
      width = targetResolution;
    }
  } else {
    if (height > targetResolution) {
      width = Math.round((width * targetResolution) / height);
      height = targetResolution;
    }
  }

  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    throw new Error('Canvas 2D context unavailable');
  }

  // Draw white background then image
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);

  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;
  const totalPixels = width * height;

  // Grayscale array & Pink Line Detection
  const gray = new Float32Array(totalPixels);
  const pinkLineMask = new Uint8Array(totalPixels);
  let pinkPixelCount = 0;

  for (let i = 0; i < totalPixels; i++) {
    const idx = i * 4;
    const r = data[idx];
    const g = data[idx + 1];
    const b = data[idx + 2];
    const a = data[idx + 3] / 255;
    // Composite over white
    const cr = r * a + 255 * (1 - a);
    const cg = g * a + 255 * (1 - a);
    const cb = b * a + 255 * (1 - a);
    gray[i] = 0.299 * cr + 0.587 * cg + 0.114 * cb;

    // Detect hot pink / magenta guide lines (where sticks are placed)
    // Red high, Green low/medium, Blue medium/high, (Red - Green) significant
    const isPink = cr > 165 && cg < 140 && cb > 70 && (cr - cg) > 40;
    if (isPink) {
      pinkLineMask[i] = 1;
      pinkPixelCount++;
    }
  }

  const hasPinkLines = pinkPixelCount > 15;

  // Fill mask: based on threshold, filtering out blue background and pink stick markers
  const fillMask = new Uint8Array(totalPixels);
  for (let i = 0; i < totalPixels; i++) {
    const idx = i * 4;
    const r = data[idx];
    const g = data[idx + 1];
    const b = data[idx + 2];

    const val = gray[i];
    // Ignore light-blue backgrounds (e.g. from reference photos/drawings)
    const isCyanBlueBg = b > r + 30 && b > g && val > 130;
    const isPink = pinkLineMask[i] === 1;

    const isPureWhite = val > 215;
    let isDark = val < options.threshold && !isCyanBlueBg && !isPureWhite;
    if (isPink && !isPureWhite) {
      // Pink lines indicate the stick locations along the top edge of dark features
      isDark = true;
    }
    fillMask[i] = (options.invert ? !isDark : isDark) ? 1 : 0;
  }

  // Sobel Edge Detection for outlines
  const outlineMask = new Uint8Array(totalPixels);
  const sensitivity = Math.max(10, (100 - options.edgeSensitivity) * 3);

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;

      // 3x3 Sobel kernel
      const g00 = gray[(y - 1) * width + (x - 1)];
      const g01 = gray[(y - 1) * width + x];
      const g02 = gray[(y - 1) * width + (x + 1)];

      const g10 = gray[y * width + (x - 1)];
      const g12 = gray[y * width + (x + 1)];

      const g20 = gray[(y + 1) * width + (x - 1)];
      const g21 = gray[(y + 1) * width + x];
      const g22 = gray[(y + 1) * width + (x + 1)];

      const gx = -g00 + g02 - 2 * g10 + 2 * g12 - g20 + g22;
      const gy = -g00 - 2 * g01 - g02 + g20 + 2 * g21 + g22;

      const mag = Math.sqrt(gx * gx + gy * gy);
      if (mag > sensitivity) {
        outlineMask[idx] = 1;
        // Apply outline thickness if requested
        if (options.outlineThickness > 1) {
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              const nidx = (y + dy) * width + (x + dx);
              if (nidx >= 0 && nidx < totalPixels) {
                outlineMask[nidx] = 1;
              }
            }
          }
        }
      }
    }
  }

  // Create preview canvas
  const previewCanvas = document.createElement('canvas');
  previewCanvas.width = width;
  previewCanvas.height = height;
  const pCtx = previewCanvas.getContext('2d');
  if (pCtx) {
    const pImgData = pCtx.createImageData(width, height);
    for (let i = 0; i < totalPixels; i++) {
      const idx = i * 4;
      const isOutline = outlineMask[i] === 1;
      const isFill = fillMask[i] === 1;
      const isPink = hasPinkLines && pinkLineMask[i] === 1;

      if (isPink) {
        pImgData.data[idx] = 255;     // Pink stick guides
        pImgData.data[idx + 1] = 32;
        pImgData.data[idx + 2] = 121;
        pImgData.data[idx + 3] = 255;
      } else if (isOutline) {
        pImgData.data[idx] = 234;     // Amber outline
        pImgData.data[idx + 1] = 88;
        pImgData.data[idx + 2] = 12;
        pImgData.data[idx + 3] = 255;
      } else if (isFill) {
        pImgData.data[idx] = 30;     // Soft charcoal fill
        pImgData.data[idx + 1] = 41;
        pImgData.data[idx + 2] = 59;
        pImgData.data[idx + 3] = 255;
      } else {
        pImgData.data[idx] = 255;
        pImgData.data[idx + 1] = 255;
        pImgData.data[idx + 2] = 255;
        pImgData.data[idx + 3] = 255;
      }
    }
    pCtx.putImageData(pImgData, 0, 0);
  }

  return {
    width,
    height,
    outlineMask,
    fillMask,
    pinkLineMask,
    hasPinkLines,
    previewUrl: previewCanvas.toDataURL('image/png')
  };
}
