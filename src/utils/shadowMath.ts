/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BoardConfig, LightConfig, StickData } from '../types';

export interface ShadowPolygon {
  group: string;
  points: { xCm: number; yCm: number }[];
}

export interface CalculationResult {
  sticks: StickData[];
  totalDowelLengthCm: number;
  minHeightCm: number;
  maxHeightCm: number;
  avgHeightCm: number;
  gridRows: number;
  gridCols: number;
  simulatedShadowMask: Uint8Array; // for 2D verification
  simWidth: number;
  simHeight: number;
  leadingEdgePoints: { xCm: number; yCm: number }[];
  trailingEdgePoints: { xCm: number; yCm: number }[];
  shadowPolygons: ShadowPolygon[];
}

/**
 * Calculates stick lengths and base positions.
 * Sticks are placed ONLY on the leading front edge/arc facing the light source,
 * and their shadows project across to the trailing edge to form the complete shape.
 */
export function calculateSticks(
  selectedMask: Uint8Array, // 1 for active shadow/outline pixel, 0 otherwise
  maskWidth: number,
  maskHeight: number,
  board: BoardConfig,
  light: LightConfig
): CalculationResult {
  const margin = 1.0; // 1 cm margin around board
  const usableWidth = board.widthCm - 2 * margin;
  const usableHeight = board.heightCm - 2 * margin;

  const cols = Math.max(3, Math.floor(usableWidth / board.gridSpacingCm) + 1);
  const rows = Math.max(3, Math.floor(usableHeight / board.gridSpacingCm) + 1);

  const sticks: StickData[] = [];
  const leadingEdgePoints: { xCm: number; yCm: number }[] = [];
  const trailingEdgePoints: { xCm: number; yCm: number }[] = [];
  let idCounter = 1;

  // Helper to test if a physical point (xCm, yCm) is inside selected mask
  const isSelectedAtCm = (xCm: number, yCm: number): boolean => {
    // Map board cm (0,0 bottom-left) to mask pixels (0,0 top-left)
    const normX = xCm / board.widthCm;
    const normY = 1.0 - (yCm / board.heightCm); // invert Y for screen coords

    if (normX < 0 || normX >= 1 || normY < 0 || normY >= 1) return false;

    const px = Math.floor(normX * maskWidth);
    const py = Math.floor(normY * maskHeight);
    const idx = py * maskWidth + px;
    return selectedMask[idx] === 1;
  };

  const lightX = light.xCm;
  const lightY = light.yCm;
  const lightZ = Math.max(1.0, light.zCm);
  const placementMode = board.placementMode || 'leading-edge';

  // Find bounding box of selected pixels in cm
  let minSelX = board.widthCm;
  let maxSelX = 0;
  let minSelY = board.heightCm;
  let maxSelY = 0;
  let hasSelection = false;

  for (let py = 0; py < maskHeight; py++) {
    for (let px = 0; px < maskWidth; px++) {
      if (selectedMask[py * maskWidth + px] === 1) {
        hasSelection = true;
        const xCm = (px / maskWidth) * board.widthCm;
        const yCm = (1.0 - py / maskHeight) * board.heightCm;
        if (xCm < minSelX) minSelX = xCm;
        if (xCm > maxSelX) maxSelX = xCm;
        if (yCm < minSelY) minSelY = yCm;
        if (yCm > maxSelY) maxSelY = yCm;
      }
    }
  }

  if (!hasSelection) {
    return {
      sticks: [],
      totalDowelLengthCm: 0,
      minHeightCm: 0,
      maxHeightCm: 0,
      avgHeightCm: 0,
      gridRows: rows,
      gridCols: cols,
      simulatedShadowMask: new Uint8Array(200 * 200),
      simWidth: 200,
      simHeight: 200,
      leadingEdgePoints: [],
      trailingEdgePoints: [],
      shadowPolygons: [],
    };
  }

  const shadowPolygons: ShadowPolygon[] = [];

  if (light.mode === 'ground') {
    if (placementMode === 'leading-edge') {
      // MODE: LEADING EDGE ONLY (Vertical sticks placed strictly at the entry contour)
      // Rays radiate from the fixed light source (lightX, lightY)
      const corners = [
        { x: minSelX, y: minSelY },
        { x: maxSelX, y: minSelY },
        { x: minSelX, y: maxSelY },
        { x: maxSelX, y: maxSelY },
      ];

      const angles = corners.map((c) => Math.atan2(c.y - lightY, c.x - lightX));
      const avgAngle = Math.atan2(
        (minSelY + maxSelY) / 2 - lightY,
        (minSelX + maxSelX) / 2 - lightX
      );

      const normAngles = angles.map((a) => {
        let diff = a - avgAngle;
        while (diff < -Math.PI) diff += 2 * Math.PI;
        while (diff > Math.PI) diff -= 2 * Math.PI;
        return avgAngle + diff;
      });

      const minAngle = Math.min(...normAngles) - 0.04;
      const maxAngle = Math.max(...normAngles) + 0.04;

      // Fine angular resolution to capture all features (large ears, eye patches with pupils, nose)
      const fineAngleStep = 0.011;
      const totalRays = Math.ceil((maxAngle - minAngle) / fineAngleStep);
      const maxRayDist = Math.hypot(board.widthCm - lightX, board.heightCm - lightY) + 12;
      const stepCm = 0.06;

      interface RayCandidate {
        theta: number;
        entryDist: number;
        exitDist: number;
        stickX: number;
        stickY: number;
        shadowTipX: number;
        shadowTipY: number;
        heightCm: number;
        shadowLengthCm: number;
        group: string;
      }

      const rawCandidates: RayCandidate[] = [];

      for (let i = 0; i <= totalRays; i++) {
        const theta = minAngle + i * fineAngleStep;
        const dirX = Math.cos(theta);
        const dirY = Math.sin(theta);

        // Find ALL shadow segments along this ray
        const raySegments: { entryDist: number; exitDist: number }[] = [];
        let inSegment = false;
        let segEntryDist = 0;
        let segExitDist = 0;

        for (let dist = 0.5; dist <= maxRayDist; dist += stepCm) {
          const sampleX = lightX + dirX * dist;
          const sampleY = lightY + dirY * dist;

          if (
            sampleX < 0 ||
            sampleX > board.widthCm ||
            sampleY < 0 ||
            sampleY > board.heightCm
          ) {
            if (inSegment) {
              segExitDist = dist - stepCm;
              if (segExitDist - segEntryDist >= 0.15) {
                raySegments.push({ entryDist: segEntryDist, exitDist: segExitDist });
              }
              inSegment = false;
            }
            continue;
          }

          const isInside = isSelectedAtCm(sampleX, sampleY);

          if (isInside && !inSegment) {
            inSegment = true;
            segEntryDist = dist;
            segExitDist = dist;
          } else if (isInside && inSegment) {
            segExitDist = dist;
          } else if (!isInside && inSegment) {
            inSegment = false;
            if (segExitDist - segEntryDist >= 0.15) {
              raySegments.push({ entryDist: segEntryDist, exitDist: segExitDist });
            }
          }
        }

        if (inSegment && segExitDist - segEntryDist >= 0.15) {
          raySegments.push({ entryDist: segEntryDist, exitDist: segExitDist });
        }

        for (const seg of raySegments) {
          const shadowSpan = seg.exitDist - seg.entryDist;
          if (shadowSpan < 0.15) continue;

          const stickX = lightX + dirX * seg.entryDist;
          const stickY = lightY + dirY * seg.entryDist;
          const shadowTipX = lightX + dirX * seg.exitDist;
          const shadowTipY = lightY + dirY * seg.exitDist;

          const dBase = seg.entryDist;
          const dTip = seg.exitDist;
          const reqShadowLen = Math.max(0.1, dTip - dBase);
          const calculatedH = (lightZ * reqShadowLen) / dTip;

          if (calculatedH >= board.minStickHeightCm) {
            const clampedH = Math.min(board.maxStickHeightCm, calculatedH);
            const roundedH = Math.round(clampedH * 10) / 10;

            // Semantic feature categorization
            let groupName = 'Nose';
            const normX = stickX / board.widthCm;
            const normY = stickY / board.heightCm;

            if (normY > 0.64) {
              groupName = normX < 0.5 ? 'Left Ear' : 'Right Ear';
            } else if (normY > 0.28) {
              if (normX < 0.46) {
                groupName = seg.entryDist < 16.8 ? 'Left Eye (Upper)' : 'Left Eye (Lower)';
              } else if (normX > 0.54) {
                groupName = seg.entryDist < 16.8 ? 'Right Eye (Upper)' : 'Right Eye (Lower)';
              } else {
                groupName = 'Nose';
              }
            } else {
              groupName = 'Nose';
            }

            rawCandidates.push({
              theta,
              entryDist: seg.entryDist,
              exitDist: seg.exitDist,
              stickX,
              stickY,
              shadowTipX,
              shadowTipY,
              heightCm: roundedH,
              shadowLengthCm: Math.round(reqShadowLen * 100) / 100,
              group: groupName,
            });
          }
        }
      }

      // Filter raw candidates per group to maintain clean physical spacing
      const targetSpacing = Math.max(0.32, board.edgeStickSpacingCm || 0.42);
      const groupsMap: Record<string, RayCandidate[]> = {};
      for (const cand of rawCandidates) {
        if (!groupsMap[cand.group]) groupsMap[cand.group] = [];
        groupsMap[cand.group].push(cand);
      }

      const filteredSticks: StickData[] = [];

      for (const [groupName, candList] of Object.entries(groupsMap)) {
        // Sort along sweep angle
        candList.sort((a, b) => a.theta - b.theta);

        const groupResult: StickData[] = [];
        let lastCand: RayCandidate | null = null;

        for (let i = 0; i < candList.length; i++) {
          const curr = candList[i];
          const isEndpoint = i === 0 || i === candList.length - 1;
          const distToLast = lastCand
            ? Math.hypot(curr.stickX - lastCand.stickX, curr.stickY - lastCand.stickY)
            : 999;

          if (isEndpoint || distToLast >= targetSpacing) {
            let finalStickX = curr.stickX;
            let finalStickY = curr.stickY;
            let finalH = curr.heightCm;
            let finalTipX = curr.shadowTipX;
            let finalTipY = curr.shadowTipY;
            let finalShadowLen = curr.shadowLengthCm;

            let col = Math.round((finalStickX - margin) / board.gridSpacingCm);
            let row = Math.round((finalStickY - margin) / board.gridSpacingCm);

            if (board.snapToGrid) {
              finalStickX = margin + col * board.gridSpacingCm;
              finalStickY = margin + row * board.gridSpacingCm;
              const dBase = Math.hypot(finalStickX - lightX, finalStickY - lightY);
              const dTip = Math.hypot(finalTipX - lightX, finalTipY - lightY);
              const reqLen = Math.max(0.1, dTip - dBase);
              finalShadowLen = Math.round(reqLen * 100) / 100;
              const calcH = (lightZ * reqLen) / dTip;
              finalH = Math.round(Math.min(board.maxStickHeightCm, Math.max(board.minStickHeightCm, calcH)) * 10) / 10;
            }

            const stickObj: StickData = {
              id: idCounter++,
              col: Math.max(0, col),
              row: Math.max(0, row),
              xCm: Math.round(finalStickX * 100) / 100,
              yCm: Math.round(finalStickY * 100) / 100,
              heightCm: finalH,
              shadowTipXCm: Math.round(finalTipX * 100) / 100,
              shadowTipYCm: Math.round(finalTipY * 100) / 100,
              shadowLengthCm: finalShadowLen,
              isContour: true,
              group: groupName,
            };

            groupResult.push(stickObj);
            filteredSticks.push(stickObj);
            leadingEdgePoints.push({ xCm: stickObj.xCm, yCm: stickObj.yCm });
            trailingEdgePoints.push({ xCm: stickObj.shadowTipXCm, yCm: stickObj.shadowTipYCm });
            lastCand = curr;
          }
        }

        // Build continuous shadow polygons for this group of sticks
        for (let i = 0; i < groupResult.length - 1; i++) {
          const sA = groupResult[i];
          const sB = groupResult[i + 1];
          const baseDist = Math.hypot(sB.xCm - sA.xCm, sB.yCm - sA.yCm);
          if (baseDist <= 2.2) {
            shadowPolygons.push({
              group: groupName,
              points: [
                { xCm: sA.xCm, yCm: sA.yCm },
                { xCm: sB.xCm, yCm: sB.yCm },
                { xCm: sB.shadowTipXCm, yCm: sB.shadowTipYCm },
                { xCm: sA.shadowTipXCm, yCm: sA.shadowTipYCm },
              ],
            });
          }
        }
      }

      sticks.push(...filteredSticks);
    } else if (placementMode === 'grid-edge') {
      // MODE: GRID EDGE ONLY
      // Look at grid dots: place sticks ONLY on dots that are on the front/leading edge
      for (let r = 0; r < rows; r++) {
        const yCm = margin + r * board.gridSpacingCm;

        for (let c = 0; c < cols; c++) {
          const xCm = margin + c * board.gridSpacingCm;

          // Check if this grid dot is inside shape
          if (!isSelectedAtCm(xCm, yCm)) continue;

          // Vector from light
          const dx = xCm - lightX;
          const dy = yCm - lightY;
          const dBase = Math.hypot(dx, dy);
          if (dBase < 0.2) continue;

          const dirX = dx / dBase;
          const dirY = dy / dBase;

          // Test if there is any selected shape BETWEEN this dot and the light
          // If yes, this dot is in the interior/shadow of another stick, so SKIP IT!
          let hasObstacleBefore = false;
          const testStep = board.gridSpacingCm * 0.6;
          for (let dist = testStep; dist <= dBase - 0.5; dist += testStep) {
            const bx = xCm - dirX * dist;
            const by = yCm - dirY * dist;
            if (isSelectedAtCm(bx, by)) {
              hasObstacleBefore = true;
              break;
            }
          }

          if (hasObstacleBefore) {
            // Not a leading edge dot - skip putting stick here!
            continue;
          }

          // This dot IS on the leading edge!
          // Find farthest exit point along ray away from light
          let exitDistFromLight = dBase;
          for (let dist = 0.2; dist <= Math.hypot(board.widthCm, board.heightCm); dist += 0.15) {
            const sx = xCm + dirX * dist;
            const sy = yCm + dirY * dist;
            if (sx < 0 || sx > board.widthCm || sy < 0 || sy > board.heightCm) break;
            if (isSelectedAtCm(sx, sy)) {
              exitDistFromLight = dBase + dist;
            }
          }

          const reqShadowLen = exitDistFromLight - dBase;
          if (reqShadowLen >= 0.2) {
            const calculatedH = (lightZ * reqShadowLen) / exitDistFromLight;
            if (calculatedH >= board.minStickHeightCm) {
              const clampedH = Math.min(board.maxStickHeightCm, calculatedH);
              const roundedH = Math.round(clampedH * 10) / 10;
              const shadowTipX = xCm + dirX * reqShadowLen;
              const shadowTipY = yCm + dirY * reqShadowLen;

              sticks.push({
                id: idCounter++,
                col: c,
                row: r,
                xCm: Math.round(xCm * 100) / 100,
                yCm: Math.round(yCm * 100) / 100,
                heightCm: roundedH,
                shadowTipXCm: Math.round(shadowTipX * 100) / 100,
                shadowTipYCm: Math.round(shadowTipY * 100) / 100,
                shadowLengthCm: Math.round(reqShadowLen * 100) / 100,
                isContour: true,
              });
            }
          }
        }
      }
    } else {
      // FILLED-GRID MODE (sticks at all grid dots)
      for (let r = 0; r < rows; r++) {
        const yCm = margin + r * board.gridSpacingCm;
        for (let c = 0; c < cols; c++) {
          const xCm = margin + c * board.gridSpacingCm;
          const dx = xCm - lightX;
          const dy = yCm - lightY;
          const distLightToBase = Math.hypot(dx, dy);
          if (distLightToBase < 0.2) continue;

          const dirX = dx / distLightToBase;
          const dirY = dy / distLightToBase;

          let maxRayDistCm = 0;
          let foundAny = false;
          const maxSearchDist = Math.hypot(board.widthCm, board.heightCm);

          if (isSelectedAtCm(xCm, yCm)) {
            foundAny = true;
            maxRayDistCm = 0.4;
          }

          for (let dist = 0.2; dist <= maxSearchDist; dist += 0.15) {
            const sampleX = xCm + dirX * dist;
            const sampleY = yCm + dirY * dist;
            if (sampleX < 0 || sampleX > board.widthCm || sampleY < 0 || sampleY > board.heightCm) break;
            if (isSelectedAtCm(sampleX, sampleY)) {
              foundAny = true;
              maxRayDistCm = dist;
            }
          }

          if (foundAny && maxRayDistCm > 0.3) {
            const calculatedH = (lightZ * maxRayDistCm) / (maxRayDistCm + distLightToBase);
            if (calculatedH >= board.minStickHeightCm) {
              const clampedH = Math.min(board.maxStickHeightCm, calculatedH);
              const roundedH = Math.round(clampedH * 10) / 10;
              const shadowLength = (roundedH / (lightZ - roundedH)) * distLightToBase;

              sticks.push({
                id: idCounter++,
                col: c,
                row: r,
                xCm: Math.round(xCm * 100) / 100,
                yCm: Math.round(yCm * 100) / 100,
                heightCm: roundedH,
                shadowTipXCm: Math.round((xCm + dirX * shadowLength) * 100) / 100,
                shadowTipYCm: Math.round((yCm + dirY * shadowLength) * 100) / 100,
                shadowLengthCm: Math.round(shadowLength * 100) / 100,
                isContour: true,
              });
            }
          }
        }
      }
    }
  } else {
    // WALL PROJECTION MODE:
    // Place sticks only on the front edge facing light
    const wallY = board.heightCm;
    const wallHeightCm = board.heightCm * 1.2;

    for (let c = 0; c < cols; c++) {
      const xCm = margin + c * board.gridSpacingCm;
      // Front row closest to light
      const frontRow = 0;
      const yCm = margin + frontRow * board.gridSpacingCm;

      if (yCm <= lightY || yCm >= wallY) continue;

      const t = (wallY - lightY) / (yCm - lightY);
      const wallX = lightX + t * (xCm - lightX);
      if (wallX < 0 || wallX > board.widthCm) continue;

      const normX = wallX / board.widthCm;
      let topZ = 0;
      let found = false;

      for (let testZ = 0.5; testZ <= wallHeightCm; testZ += 0.25) {
        const normY = 1.0 - testZ / wallHeightCm;
        if (normY >= 0 && normY <= 1) {
          const px = Math.floor(normX * maskWidth);
          const py = Math.floor(normY * maskHeight);
          if (selectedMask[py * maskWidth + px] === 1) {
            topZ = testZ;
            found = true;
          }
        }
      }

      if (found && topZ > 0.5) {
        const reqH = lightZ + (topZ - lightZ) / t;
        if (reqH >= board.minStickHeightCm) {
          const clampedH = Math.min(board.maxStickHeightCm, reqH);
          const roundedH = Math.round(clampedH * 10) / 10;

          sticks.push({
            id: idCounter++,
            col: c,
            row: frontRow,
            xCm: Math.round(xCm * 100) / 100,
            yCm: Math.round(yCm * 100) / 100,
            heightCm: roundedH,
            shadowTipXCm: Math.round(wallX * 100) / 100,
            shadowTipYCm: Math.round(wallY * 100) / 100,
            shadowLengthCm: Math.round(topZ * 100) / 100,
            isContour: true,
          });
        }
      }
    }
  }

  // Calculate statistics
  let totalDowelLength = 0;
  let minH = sticks.length > 0 ? sticks[0].heightCm : 0;
  let maxH = sticks.length > 0 ? sticks[0].heightCm : 0;

  for (const s of sticks) {
    totalDowelLength += s.heightCm;
    if (s.heightCm < minH) minH = s.heightCm;
    if (s.heightCm > maxH) maxH = s.heightCm;
  }

  const avgH = sticks.length > 0 ? Math.round((totalDowelLength / sticks.length) * 10) / 10 : 0;

  // Generate 2D simulated shadow buffer for instant verification
  const simWidth = 200;
  const simHeight = 200;
  const simulatedShadowMask = new Uint8Array(simWidth * simHeight);

  // Helper to scanline fill a 2D polygon into the simulated shadow buffer
  const fillPolyIntoMask = (polyPts: { x: number; y: number }[]) => {
    if (polyPts.length < 3) return;
    let minY = simHeight;
    let maxY = 0;
    for (const p of polyPts) {
      if (p.y < minY) minY = Math.floor(p.y);
      if (p.y > maxY) maxY = Math.ceil(p.y);
    }
    minY = Math.max(0, minY);
    maxY = Math.min(simHeight - 1, maxY);

    for (let y = minY; y <= maxY; y++) {
      const nodeX: number[] = [];
      let j = polyPts.length - 1;
      for (let i = 0; i < polyPts.length; i++) {
        const pi = polyPts[i];
        const pj = polyPts[j];
        if ((pi.y < y && pj.y >= y) || (pj.y < y && pi.y >= y)) {
          nodeX.push(pi.x + ((y - pi.y) / (pj.y - pi.y)) * (pj.x - pi.x));
        }
        j = i;
      }
      nodeX.sort((a, b) => a - b);
      for (let i = 0; i < nodeX.length; i += 2) {
        if (i + 1 >= nodeX.length) break;
        const xStart = Math.max(0, Math.floor(nodeX[i]));
        const xEnd = Math.min(simWidth - 1, Math.ceil(nodeX[i + 1]));
        for (let x = xStart; x <= xEnd; x++) {
          simulatedShadowMask[y * simWidth + x] = 1;
        }
      }
    }
  };

  // Rasterize all shadow polygons (the contiguous shadow regions)
  for (const poly of shadowPolygons) {
    const pts = poly.points.map((p) => ({
      x: (p.xCm / board.widthCm) * simWidth,
      y: (1.0 - p.yCm / board.heightCm) * simHeight,
    }));
    fillPolyIntoMask(pts);
  }

  // Draw stick dowel shadow capsules
  const radiusPx = Math.max(1, Math.round(((board.stickDiameterMm / 10) / board.widthCm) * simWidth * 0.5));
  for (const s of sticks) {
    const startX = Math.floor((s.xCm / board.widthCm) * simWidth);
    const startY = Math.floor((1.0 - s.yCm / board.heightCm) * simHeight);
    const endX = Math.floor((s.shadowTipXCm / board.widthCm) * simWidth);
    const endY = Math.floor((1.0 - s.shadowTipYCm / board.heightCm) * simHeight);

    let x0 = startX;
    let y0 = startY;
    const dx = Math.abs(endX - x0);
    const dy = Math.abs(endY - y0);
    const sx = x0 < endX ? 1 : -1;
    const sy = y0 < endY ? 1 : -1;
    let err = dx - dy;

    while (true) {
      for (let ox = -radiusPx; ox <= radiusPx; ox++) {
        for (let oy = -radiusPx; oy <= radiusPx; oy++) {
          const px = x0 + ox;
          const py = y0 + oy;
          if (px >= 0 && px < simWidth && py >= 0 && py < simHeight) {
            simulatedShadowMask[py * simWidth + px] = 1;
          }
        }
      }
      if (x0 === endX && y0 === endY) break;
      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        x0 += sx;
      }
      if (e2 < dx) {
        err += dx;
        y0 += sy;
      }
    }
  }

  return {
    sticks,
    totalDowelLengthCm: Math.round(totalDowelLength * 10) / 10,
    minHeightCm: minH,
    maxHeightCm: maxH,
    avgHeightCm: avgH,
    gridRows: rows,
    gridCols: cols,
    simulatedShadowMask,
    simWidth,
    simHeight,
    leadingEdgePoints,
    trailingEdgePoints,
    shadowPolygons,
  };
}

/**
 * Generates CSV cutting list for physical woodworking assembly
 */
export function generateCuttingListCsv(sticks: StickData[], board: BoardConfig): string {
  const lines: string[] = [];
  lines.push('Stick_ID,Grid_Col,Grid_Row,X_Position_cm,Y_Position_cm,Cut_Length_cm,Type');
  
  // Sort sticks by ID
  const sorted = [...sticks].sort((a, b) => a.id - b.id);
  for (const s of sorted) {
    lines.push(
      `${s.id},${s.col + 1},${s.row + 1},${s.xCm.toFixed(2)},${s.yCm.toFixed(2)},${s.heightCm.toFixed(1)},${s.isContour ? 'LeadingEdge' : 'Fill'}`
    );
  }

  return lines.join('\n');
}
