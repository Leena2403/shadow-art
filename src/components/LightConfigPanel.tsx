/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Lightbulb, Compass, Grid, Sparkles, Sliders } from 'lucide-react';
import { BoardConfig, LightConfig, StickPlacementMode } from '../types';

interface LightConfigPanelProps {
  light: LightConfig;
  board: BoardConfig;
  onLightChange: (updated: LightConfig) => void;
  onBoardChange: (updated: BoardConfig) => void;
}

export const LightConfigPanel: React.FC<LightConfigPanelProps> = ({
  light,
  board,
  onLightChange,
  onBoardChange,
}) => {
  // Preset light angles for physical realism
  const applyLightPreset = (preset: 'left-angled' | 'corner' | 'front-high' | 'top-overhead') => {
    if (preset === 'top-overhead') {
      onLightChange({
        ...light,
        xCm: board.widthCm / 2,
        yCm: board.heightCm + 6,
        zCm: 18,
      });
    } else if (preset === 'left-angled') {
      onLightChange({
        ...light,
        xCm: -8,
        yCm: board.heightCm / 2,
        zCm: 18,
      });
    } else if (preset === 'corner') {
      onLightChange({
        ...light,
        xCm: -7,
        yCm: -7,
        zCm: 20,
      });
    } else if (preset === 'front-high') {
      onLightChange({
        ...light,
        xCm: board.widthCm / 2,
        yCm: -9,
        zCm: 22,
      });
    }
  };

  const currentMode = board.placementMode || 'leading-edge';

  return (
    <div className="bg-neutral-900/90 border border-neutral-800 rounded-xl p-5 shadow-xl flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-neutral-800">
        <div>
          <h2 className="text-lg font-semibold text-neutral-100 flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-amber-400" />
            Light Source &amp; Stick Placement Strategy
          </h2>
          <p className="text-xs text-neutral-400 mt-0.5">
            Configure the fixed light position and placement rule. Sticks are placed along the light-facing edge so their shadows form the complete shape.
          </p>
        </div>

        {/* Projection Mode Toggle */}
        <div className="flex items-center gap-1 bg-neutral-950 p-1 rounded-lg border border-neutral-800 text-xs">
          <button
            onClick={() => onLightChange({ ...light, mode: 'ground' })}
            className={`px-3 py-1 rounded-md transition font-medium cursor-pointer ${
              light.mode === 'ground'
                ? 'bg-amber-500 text-neutral-950 shadow-sm font-bold'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Ground Tabletop
          </button>
          <button
            onClick={() => onLightChange({ ...light, mode: 'wall' })}
            className={`px-3 py-1 rounded-md transition font-medium cursor-pointer ${
              light.mode === 'wall'
                ? 'bg-amber-500 text-neutral-950 shadow-sm font-bold'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Back-Wall Screen
          </button>
        </div>
      </div>

      {/* Primary Stick Placement Selection */}
      <div className="p-3.5 bg-neutral-950/70 border border-amber-500/30 rounded-xl">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-amber-300">
              Stick Placement Rule
            </span>
          </div>
          <span className="text-[11px] text-neutral-400">
            {currentMode === 'leading-edge'
              ? 'Only front arc/edge has sticks — shadows recreate the full shape'
              : currentMode === 'grid-edge'
              ? 'Front boundary grid dots only'
              : 'Sticks across the entire grid'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
          <button
            onClick={() => onBoardChange({ ...board, placementMode: 'leading-edge' })}
            className={`p-3 rounded-lg border text-left transition flex flex-col gap-1 cursor-pointer ${
              currentMode === 'leading-edge'
                ? 'bg-amber-500/15 border-amber-500 text-neutral-100 shadow-sm shadow-amber-500/10'
                : 'bg-neutral-900/60 border-neutral-800 text-neutral-400 hover:text-neutral-200 hover:border-neutral-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-amber-400">One Arc / Edge Only</span>
              {currentMode === 'leading-edge' && (
                <span className="text-[10px] bg-amber-500 text-neutral-950 font-black px-1.5 py-0.2 rounded">
                  ACTIVE
                </span>
              )}
            </div>
            <p className="text-[11px] text-neutral-300 leading-snug">
              Puts sticks <strong>only on the light-facing edge</strong> (e.g. left arc of circle). Their cast shadows stretch across to form the entire shape.
            </p>
          </button>

          <button
            onClick={() => onBoardChange({ ...board, placementMode: 'grid-edge' })}
            className={`p-3 rounded-lg border text-left transition flex flex-col gap-1 cursor-pointer ${
              currentMode === 'grid-edge'
                ? 'bg-amber-500/15 border-amber-500 text-neutral-100 shadow-sm shadow-amber-500/10'
                : 'bg-neutral-900/60 border-neutral-800 text-neutral-400 hover:text-neutral-200 hover:border-neutral-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-neutral-200">Leading Grid Dots</span>
              {currentMode === 'grid-edge' && (
                <span className="text-[10px] bg-amber-500 text-neutral-950 font-black px-1.5 py-0.2 rounded">
                  ACTIVE
                </span>
              )}
            </div>
            <p className="text-[11px] text-neutral-400 leading-snug">
              Places sticks strictly on regular dot-paper grid intersections that touch the front edge.
            </p>
          </button>

          <button
            onClick={() => onBoardChange({ ...board, placementMode: 'filled-grid' })}
            className={`p-3 rounded-lg border text-left transition flex flex-col gap-1 cursor-pointer ${
              currentMode === 'filled-grid'
                ? 'bg-amber-500/15 border-amber-500 text-neutral-100 shadow-sm shadow-amber-500/10'
                : 'bg-neutral-900/60 border-neutral-800 text-neutral-400 hover:text-neutral-200 hover:border-neutral-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-neutral-200">Dense Grid Fill</span>
              {currentMode === 'filled-grid' && (
                <span className="text-[10px] bg-amber-500 text-neutral-950 font-black px-1.5 py-0.2 rounded">
                  ACTIVE
                </span>
              )}
            </div>
            <p className="text-[11px] text-neutral-400 leading-snug">
              Places sticks at every dot across the entire shape (high density pegboard).
            </p>
          </button>
        </div>

        {/* Fine Tuning for Edge Mode */}
        {currentMode === 'leading-edge' && (
          <div className="mt-3 pt-3 border-t border-neutral-800/80 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <div className="flex justify-between text-neutral-300 mb-1">
                <span>Stick Spacing along Edge</span>
                <span className="font-mono text-amber-400 font-bold">
                  {(board.edgeStickSpacingCm || 0.8).toFixed(1)} cm
                </span>
              </div>
              <input
                type="range"
                min="0.4"
                max="1.5"
                step="0.1"
                value={board.edgeStickSpacingCm || 0.8}
                onChange={(e) =>
                  onBoardChange({ ...board, edgeStickSpacingCm: parseFloat(e.target.value) })
                }
                className="w-full accent-amber-500 bg-neutral-800 rounded-lg h-1.5 cursor-pointer"
              />
              <span className="text-[10px] text-neutral-400">
                Smaller value = denser sticks along the arc. Larger value = fewer sticks to cut.
              </span>
            </div>

            <div className="flex items-center justify-between bg-neutral-900/60 p-2.5 rounded-lg border border-neutral-800">
              <div>
                <span className="font-medium text-neutral-200 block">Snap to Dot-Paper Grid</span>
                <span className="text-[10px] text-neutral-400">
                  Aligns stick bases with the closest grid dots
                </span>
              </div>
              <input
                type="checkbox"
                checked={board.snapToGrid || false}
                onChange={(e) => onBoardChange({ ...board, snapToGrid: e.target.checked })}
                className="w-4 h-4 accent-amber-500 cursor-pointer rounded"
              />
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
        {/* Light Source Coordinates */}
        <div className="md:col-span-5 bg-neutral-950/50 p-4 rounded-xl border border-neutral-800/80 flex flex-col justify-between">
          <div className="space-y-3.5">
            <div className="flex items-center justify-between text-xs font-semibold text-neutral-200 pb-1 border-b border-neutral-800">
              <span className="flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-amber-400" />
                Fixed Light Coordinates (cm)
              </span>
              <span className="text-[10px] text-neutral-500">Ref: Board Origin (0,0)</span>
            </div>

            {/* Quick Presets */}
            <div className="flex gap-1.5 pt-0.5">
              <button
                onClick={() => applyLightPreset('top-overhead')}
                className="flex-1 py-1 px-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-semibold text-[11px] rounded border border-amber-500/40 transition text-center cursor-pointer"
                title="Light from top-center shining down (ideal for Panda ears, eyes & nose)"
              >
                Top Overhead
              </button>
              <button
                onClick={() => applyLightPreset('left-angled')}
                className="flex-1 py-1 px-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-[11px] rounded transition text-center cursor-pointer"
              >
                Side Lamp
              </button>
              <button
                onClick={() => applyLightPreset('corner')}
                className="flex-1 py-1 px-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-[11px] rounded transition text-center cursor-pointer"
              >
                Diagonal
              </button>
              <button
                onClick={() => applyLightPreset('front-high')}
                className="flex-1 py-1 px-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-[11px] rounded transition text-center cursor-pointer"
              >
                Front Lamp
              </button>
            </div>

            {/* Light Height (Z) */}
            <div>
              <div className="flex justify-between text-xs text-neutral-300 mb-1">
                <span>Light Height ($Z_L$)</span>
                <span className="font-mono text-amber-400 font-semibold">{light.zCm.toFixed(1)} cm</span>
              </div>
              <input
                type="range"
                min="8"
                max="40"
                step="0.5"
                value={light.zCm}
                onChange={(e) => onLightChange({ ...light, zCm: parseFloat(e.target.value) })}
                className="w-full accent-amber-500 bg-neutral-800 rounded-lg h-1.5 cursor-pointer"
              />
            </div>

            {/* Light X Offset */}
            <div>
              <div className="flex justify-between text-xs text-neutral-300 mb-1">
                <span>Horizontal Offset ($X_L$)</span>
                <span className="font-mono text-amber-400 font-semibold">{light.xCm.toFixed(1)} cm</span>
              </div>
              <input
                type="range"
                min={-20}
                max={board.widthCm + 15}
                step="0.5"
                value={light.xCm}
                onChange={(e) => onLightChange({ ...light, xCm: parseFloat(e.target.value) })}
                className="w-full accent-amber-500 bg-neutral-800 rounded-lg h-1.5 cursor-pointer"
              />
            </div>

            {/* Light Y Offset */}
            <div>
              <div className="flex justify-between text-xs text-neutral-300 mb-1">
                <span>Vertical Offset ($Y_L$)</span>
                <span className="font-mono text-amber-400 font-semibold">{light.yCm.toFixed(1)} cm</span>
              </div>
              <input
                type="range"
                min={-20}
                max={board.heightCm + 15}
                step="0.5"
                value={light.yCm}
                onChange={(e) => onLightChange({ ...light, yCm: parseFloat(e.target.value) })}
                className="w-full accent-amber-500 bg-neutral-800 rounded-lg h-1.5 cursor-pointer"
              />
            </div>
          </div>

          <div className="mt-3 p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg text-[11px] text-amber-300/90">
            <strong>Physical Setup Note:</strong> Set your desk lamp / LED spotlight at{' '}
            <span className="font-mono font-bold">{light.zCm} cm</span> height,{' '}
            <span className="font-mono font-bold">{Math.abs(light.xCm)} cm</span>{' '}
            {light.xCm < 0 ? 'left' : 'right'} of the board.
          </div>
        </div>

        {/* Board & Dot Grid Parameters */}
        <div className="md:col-span-4 bg-neutral-950/50 p-4 rounded-xl border border-neutral-800/80 space-y-3.5 text-xs">
          <div className="flex items-center justify-between font-semibold text-neutral-200 pb-1 border-b border-neutral-800">
            <span className="flex items-center gap-1.5">
              <Grid className="w-3.5 h-3.5 text-amber-400" />
              Dot-Paper &amp; Stick Dimensions
            </span>
          </div>

          {/* Board Size */}
          <div>
            <div className="flex justify-between text-neutral-300 mb-1">
              <span>Board Dimensions</span>
              <span className="font-mono text-amber-400 font-semibold">
                {board.widthCm} × {board.heightCm} cm
              </span>
            </div>
            <div className="flex gap-1.5">
              {[
                { label: '20×20 cm', w: 20, h: 20 },
                { label: 'A4 (21×30)', w: 21, h: 30 },
                { label: '25×25 cm', w: 25, h: 25 },
              ].map((sz) => (
                <button
                  key={sz.label}
                  onClick={() => onBoardChange({ ...board, widthCm: sz.w, heightCm: sz.h })}
                  className={`flex-1 py-1 rounded text-center transition cursor-pointer ${
                    board.widthCm === sz.w && board.heightCm === sz.h
                      ? 'bg-amber-500 text-neutral-950 font-bold'
                      : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                  }`}
                >
                  {sz.label}
                </button>
              ))}
            </div>
          </div>

          {/* Grid Spacing (Dot Pitch) */}
          <div>
            <div className="flex justify-between text-neutral-300 mb-1">
              <span>Dot Grid Spacing (Pitch)</span>
              <span className="font-mono text-amber-400 font-semibold">{board.gridSpacingCm} cm</span>
            </div>
            <div className="flex gap-1.5">
              {[0.6, 0.8, 1.0, 1.2].map((spacing) => (
                <button
                  key={spacing}
                  onClick={() => onBoardChange({ ...board, gridSpacingCm: spacing })}
                  className={`flex-1 py-1 rounded text-center transition cursor-pointer ${
                    board.gridSpacingCm === spacing
                      ? 'bg-amber-500 text-neutral-950 font-bold'
                      : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                  }`}
                >
                  {spacing}cm
                </button>
              ))}
            </div>
          </div>

          {/* Max Stick Height */}
          <div>
            <div className="flex justify-between text-neutral-300 mb-1">
              <span>Max Stick Length</span>
              <span className="font-mono text-amber-400 font-semibold">{board.maxStickHeightCm} cm</span>
            </div>
            <input
              type="range"
              min="6"
              max="20"
              step="0.5"
              value={board.maxStickHeightCm}
              onChange={(e) =>
                onBoardChange({ ...board, maxStickHeightCm: parseFloat(e.target.value) })
              }
              className="w-full accent-amber-500 bg-neutral-800 rounded-lg h-1.5 cursor-pointer"
            />
          </div>

          {/* Stick Diameter */}
          <div>
            <div className="flex justify-between text-neutral-300 mb-1">
              <span>Dowel Stick Diameter</span>
              <span className="font-mono text-amber-400 font-semibold">{board.stickDiameterMm} mm</span>
            </div>
            <div className="flex gap-2">
              {[2, 3, 4, 5].map((dia) => (
                <button
                  key={dia}
                  onClick={() => onBoardChange({ ...board, stickDiameterMm: dia })}
                  className={`flex-1 py-1 rounded text-center transition cursor-pointer ${
                    board.stickDiameterMm === dia
                      ? 'bg-amber-500 text-neutral-950 font-bold'
                      : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                  }`}
                >
                  {dia}mm
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 2D Top-Down Spatial Map */}
        <div className="md:col-span-3 bg-neutral-950/80 p-3 rounded-xl border border-neutral-800/80 flex flex-col items-center justify-center relative min-h-[190px]">
          <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-2">
            Top-Down Ray Diagram
          </span>

          <div className="relative w-44 h-40 border border-dashed border-neutral-700/60 rounded-lg flex items-center justify-center bg-neutral-900/40 overflow-hidden">
            {/* Board representation */}
            <div className="w-24 h-24 bg-amber-950/30 border-2 border-amber-500/50 rounded flex flex-col items-center justify-center relative shadow-md">
              <span className="text-[9px] font-mono font-bold text-amber-300">DOT BOARD</span>
              <span className="text-[8px] text-amber-400/80">
                {board.widthCm}×{board.heightCm}cm
              </span>
            </div>

            {/* Light bulb indicator */}
            {(() => {
              const normX = ((light.xCm - board.widthCm / 2) / (board.widthCm * 1.6)) * 80 + 88;
              const normY = ((board.heightCm / 2 - light.yCm) / (board.heightCm * 1.6)) * 70 + 80;
              const clampedX = Math.max(10, Math.min(160, normX));
              const clampedY = Math.max(10, Math.min(145, normY));

              return (
                <div
                  style={{ left: `${clampedX}px`, top: `${clampedY}px` }}
                  className="absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-none"
                >
                  <div className="w-5 h-5 rounded-full bg-amber-400 text-neutral-950 flex items-center justify-center shadow-[0_0_12px_#f59e0b] animate-pulse">
                    <Lightbulb className="w-3 h-3" />
                  </div>
                  <span className="text-[8px] font-mono text-amber-300 bg-neutral-900/90 px-1 rounded mt-0.5 border border-amber-500/40 whitespace-nowrap">
                    Lamp ({light.zCm}cm high)
                  </span>
                </div>
              );
            })()}
          </div>
          <span className="text-[10px] text-neutral-400 mt-2 text-center">
            Sticks on the leading arc cast shadows forming the entire shape
          </span>
        </div>
      </div>
    </div>
  );
};
