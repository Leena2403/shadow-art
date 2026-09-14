/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type ProjectionMode = 'ground' | 'wall';

export type StickPlacementMode = 'leading-edge' | 'grid-edge' | 'filled-grid';

export interface LightConfig {
  mode: ProjectionMode;
  // Position in cm relative to board origin (0,0) which is bottom-left of board
  xCm: number;
  yCm: number;
  zCm: number; // Height above ground
  intensity: number;
}

export interface BoardConfig {
  widthCm: number;          // e.g. 20 cm
  heightCm: number;         // e.g. 20 cm
  gridSpacingCm: number;    // e.g. 0.8 cm (distance between dots)
  stickDiameterMm: number;  // e.g. 3 mm
  maxStickHeightCm: number; // e.g. 14 cm
  minStickHeightCm: number; // e.g. 0.5 cm
  placementMode: StickPlacementMode; // 'leading-edge' (one arc/edge), 'grid-edge', or 'filled-grid'
  edgeStickSpacingCm: number; // e.g. 0.8 cm
  snapToGrid: boolean;      // snap edge sticks to nearest dot-paper grid intersection
}

export interface StickData {
  id: number;
  col: number;          // grid column index (0-based)
  row: number;          // grid row index (0-based)
  xCm: number;          // base X coordinate on dot paper in cm
  yCm: number;          // base Y coordinate on dot paper in cm
  heightCm: number;     // stick length in cm
  shadowTipXCm: number; // where the tip's shadow hits the ground (or wall)
  shadowTipYCm: number;
  shadowLengthCm: number;
  isContour: boolean;   // outline edge vs fill
  group?: string;       // feature name (e.g. 'Left Ear', 'Left Eye', 'Nose')
}

export interface ImageProcessingOptions {
  threshold: number;      // 0-255
  edgeSensitivity: number;// 0-100
  invert: boolean;
  blurRadius: number;
  outlineThickness: number;
}

export interface PresetImage {
  id: string;
  name: string;
  category: string;
  svgDataUri: string;
  recommendedLight?: {
    xCm: number;
    yCm: number;
    zCm: number;
    mode: ProjectionMode;
  };
  hasPinkGuides?: boolean;
}
