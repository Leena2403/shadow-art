/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useCallback } from 'react';
import { ImageWorkflow } from './components/ImageWorkflow';
import { LightConfigPanel } from './components/LightConfigPanel';
import { ThreeDView } from './components/ThreeDView';
import { DotPaperPrint } from './components/DotPaperPrint';
import { CuttingGuide } from './components/CuttingGuide';
import { BoardConfig, LightConfig } from './types';
import { calculateSticks } from './utils/shadowMath';
import { Sparkles, Box, Printer, Scissors, HelpCircle } from 'lucide-react';

export default function App() {
  // Board configuration (dimensions in cm)
  const [board, setBoard] = useState<BoardConfig>({
    widthCm: 20,
    heightCm: 20,
    gridSpacingCm: 0.8,
    stickDiameterMm: 3,
    maxStickHeightCm: 14,
    minStickHeightCm: 0.6,
    placementMode: 'leading-edge',
    edgeStickSpacingCm: 0.42,
    snapToGrid: false,
  });

  // Fixed light source configuration (in cm)
  // Default to overhead top-light (X=10, Y=26, Z=18) so pink arcs cast shadows down to form ears, eyes & nose
  const [light, setLight] = useState<LightConfig>({
    mode: 'ground',
    xCm: 10,
    yCm: 26,
    zCm: 18,
    intensity: 1.2,
  });

  // Selected design mask from image workflow
  const [maskData, setMaskData] = useState<{
    mask: Uint8Array;
    width: number;
    height: number;
  } | null>(null);

  // Active view tab for output inspection
  const [activeTab, setActiveTab] = useState<'3d' | 'dot-paper' | 'cutting'>('3d');

  // Callback when selection mask changes in ImageWorkflow
  const handleSelectionChange = useCallback((mask: Uint8Array, width: number, height: number) => {
    setMaskData({ mask, width, height });
  }, []);

  const handleLightPresetChange = useCallback((newLight: { xCm: number; yCm: number; zCm: number; mode: 'ground' | 'wall' }) => {
    setLight((prev) => ({ ...prev, ...newLight }));
  }, []);

  // Compute stick coordinates and heights whenever mask, board, or light changes
  const calculationResult = useMemo(() => {
    if (!maskData || maskData.mask.length === 0) {
      return null;
    }
    return calculateSticks(
      maskData.mask,
      maskData.width,
      maskData.height,
      board,
      light
    );
  }, [maskData, board, light]);

  const sticks = calculationResult?.sticks || [];

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Simple Minimal Header (No navbar, no extra menus) */}
        <header className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-neutral-800/80">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-500 text-neutral-950 flex items-center justify-center font-black shadow-lg shadow-amber-500/20">
                <Box className="w-5 h-5" />
              </div>
              <h1 className="text-xl font-bold tracking-tight text-white">
                Stick Shadow Art Studio
              </h1>
            </div>
            <p className="text-xs text-neutral-400 mt-1 max-w-xl">
              Turn image outlines and silhouettes into physical shadow art. Perpendicular vertical sticks on a dot grid cast shadows that recreate your design under a fixed light.
            </p>
          </div>

          {/* Quick Metrics Badge */}
          {calculationResult && (
            <div className="flex items-center gap-3 bg-neutral-900 px-3.5 py-2 rounded-xl border border-neutral-800 text-xs">
              <div>
                <span className="text-neutral-400 block text-[10px] uppercase tracking-wider">Sticks Needed</span>
                <span className="font-mono font-bold text-amber-400 text-sm">
                  {sticks.length} sticks
                </span>
              </div>
              <div className="h-6 w-px bg-neutral-800" />
              <div>
                <span className="text-neutral-400 block text-[10px] uppercase tracking-wider">Height Range</span>
                <span className="font-mono font-bold text-neutral-200 text-sm">
                  {calculationResult.minHeightCm} - {calculationResult.maxHeightCm} cm
                </span>
              </div>
              <div className="h-6 w-px bg-neutral-800" />
              <div>
                <span className="text-neutral-400 block text-[10px] uppercase tracking-wider">Dowel Material</span>
                <span className="font-mono font-bold text-neutral-200 text-sm">
                  {calculationResult.totalDowelLengthCm} cm
                </span>
              </div>
            </div>
          )}
        </header>

        {/* Step 1: Image & Outline Extraction Workflow */}
        <section id="image-workflow-section">
          <ImageWorkflow
            onSelectionChange={handleSelectionChange}
            onLightPresetChange={handleLightPresetChange}
          />
        </section>

        {/* Step 2: Fixed Light Source & Board Geometry Setup */}
        <section id="light-config-section">
          <LightConfigPanel
            light={light}
            board={board}
            onLightChange={setLight}
            onBoardChange={setBoard}
          />
        </section>

        {/* Step 3: Interactive Output Navigation & Views */}
        <section id="results-section" className="space-y-4">
          {/* Segmented Tab Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-neutral-900/90 p-2 rounded-xl border border-neutral-800">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setActiveTab('3d')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ${
                  activeTab === '3d'
                    ? 'bg-amber-500 text-neutral-950 font-bold shadow-md'
                    : 'text-neutral-300 hover:text-white hover:bg-neutral-800'
                }`}
              >
                <Box className="w-4 h-4" />
                3D Simulation &amp; Shadows
              </button>

              <button
                onClick={() => setActiveTab('dot-paper')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'dot-paper'
                    ? 'bg-amber-500 text-neutral-950 font-bold shadow-md'
                    : 'text-neutral-300 hover:text-white hover:bg-neutral-800'
                }`}
              >
                <Printer className="w-4 h-4" />
                Printable Dot-Paper (1:1 Scale)
              </button>

              <button
                onClick={() => setActiveTab('cutting')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'cutting'
                    ? 'bg-amber-500 text-neutral-950 font-bold shadow-md'
                    : 'text-neutral-300 hover:text-white hover:bg-neutral-800'
                }`}
              >
                <Scissors className="w-4 h-4" />
                Dowel Cutting Guide
              </button>
            </div>

            <div className="text-xs text-neutral-400 font-mono pr-2">
              Fixed Light: ({light.xCm.toFixed(1)}, {light.yCm.toFixed(1)}, {light.zCm.toFixed(1)}) cm
            </div>
          </div>

          {/* Tab Content Display */}
          {activeTab === '3d' && (
            <ThreeDView
              sticks={sticks}
              board={board}
              light={light}
              shadowPolygons={calculationResult?.shadowPolygons}
            />
          )}

          {activeTab === 'dot-paper' && (
            <DotPaperPrint
              sticks={sticks}
              board={board}
              light={light}
              shadowPolygons={calculationResult?.shadowPolygons}
            />
          )}

          {activeTab === 'cutting' && (
            <CuttingGuide
              sticks={sticks}
              board={board}
            />
          )}
        </section>

        {/* Physical Assembly Walkthrough Instructions */}
        <footer className="bg-neutral-900/60 rounded-xl p-5 border border-neutral-800/60 text-xs text-neutral-400 space-y-3">
          <h3 className="font-semibold text-neutral-200 flex items-center gap-1.5 text-sm">
            <HelpCircle className="w-4 h-4 text-amber-400" />
            How to Assemble Your Physical Stick Shadow Artwork
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-[11px] leading-relaxed">
            <div className="bg-neutral-950/60 p-3 rounded-lg border border-neutral-800/80">
              <span className="text-amber-400 font-bold block mb-1">1. Print Dot-Paper</span>
              Print the 1:1 scale dot-paper template (or export SVG). Glue it onto a flat wooden or foam baseboard. Verify the 10 cm ruler on the print to confirm 100% scale.
            </div>
            <div className="bg-neutral-950/60 p-3 rounded-lg border border-neutral-800/80">
              <span className="text-amber-400 font-bold block mb-1">2. Cut Dowel Sticks</span>
              Using a small hobby saw or craft shears, cut standard wooden dowels or skewers to the exact length labeled in cm at each circle on the paper.
            </div>
            <div className="bg-neutral-950/60 p-3 rounded-lg border border-neutral-800/80">
              <span className="text-amber-400 font-bold block mb-1">3. Insert &amp; Illuminate</span>
              Insert each stick vertically perpendicular to the board into its labeled hole. Position a flashlight or desk lamp at the exact coordinates indicated on the template. Turn off room lights to reveal the shadow design!
            </div>
          </div>
        </footer>
      </div>
    </main>
  );
}
