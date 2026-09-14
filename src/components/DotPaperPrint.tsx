/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState } from 'react';
import { Printer, Download, FileText, ZoomIn, ZoomOut, Check, Sparkles, Compass, Eye } from 'lucide-react';
import { BoardConfig, LightConfig, StickData } from '../types';
import { generateCuttingListCsv, ShadowPolygon } from '../utils/shadowMath';

interface DotPaperPrintProps {
  sticks: StickData[];
  board: BoardConfig;
  light: LightConfig;
  shadowPolygons?: ShadowPolygon[];
}

export const DotPaperPrint: React.FC<DotPaperPrintProps> = ({
  sticks,
  board,
  light,
  shadowPolygons = [],
}) => {
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [showNumbers, setShowNumbers] = useState<boolean>(true);
  const [colorCodeHeights, setColorCodeHeights] = useState<boolean>(true);
  const [showFilledShadows, setShowFilledShadows] = useState<boolean>(true);
  const [showShadowRays, setShowShadowRays] = useState<boolean>(false);
  const [copiedCsv, setCopiedCsv] = useState<boolean>(false);
  const printAreaRef = useRef<HTMLDivElement | null>(null);

  const widthMm = board.widthCm * 10;
  const heightMm = board.heightCm * 10;
  const gridPitchMm = board.gridSpacingCm * 10;
  const marginMm = 10; // 1 cm margin

  // Color helper based on stick height
  const getStickColor = (hCm: number) => {
    if (!colorCodeHeights) return '#1f2937';
    const minH = board.minStickHeightCm;
    const maxH = board.maxStickHeightCm;
    const t = Math.max(0, Math.min(1, (hCm - minH) / (maxH - minH || 1)));

    if (t < 0.5) {
      return '#d97706'; // amber-600
    } else {
      return '#c2410c'; // orange-700
    }
  };

  // Export SVG file
  const handleDownloadSvg = () => {
    const svgEl = printAreaRef.current?.querySelector('svg');
    if (!svgEl) return;

    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(svgEl);
    const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `stick-shadow-dot-paper-${board.widthCm}x${board.heightCm}cm.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Export cutting list CSV
  const handleDownloadCsv = () => {
    const csvContent = generateCuttingListCsv(sticks, board);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `dowel-cutting-list-${sticks.length}-sticks.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Copy CSV to clipboard
  const handleCopyCsv = () => {
    const csvContent = generateCuttingListCsv(sticks, board);
    navigator.clipboard.writeText(csvContent).then(() => {
      setCopiedCsv(true);
      setTimeout(() => setCopiedCsv(false), 2000);
    });
  };

  // Trigger browser print dialog
  const handlePrint = () => {
    window.print();
  };

  const isLeadingEdge = (board.placementMode || 'leading-edge') === 'leading-edge';

  return (
    <div className="flex flex-col gap-4">
      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-neutral-900/90 p-4 rounded-xl border border-neutral-800">
        <div>
          <h3 className="text-base font-semibold text-neutral-100 flex items-center gap-2">
            <Printer className="w-4 h-4 text-amber-400" />
            Printable 1:1 Dot-Paper Blueprint
          </h3>
          <p className="text-xs text-neutral-400 mt-0.5">
            {isLeadingEdge
              ? 'Sticks are placed only on the front arc/edge. Lengths in cm show exact cut heights.'
              : 'Exact physical drill centers and dowel lengths labeled at every stick.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs shadow-md transition cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            Print Template (1:1)
          </button>

          <button
            onClick={handleDownloadSvg}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium border border-neutral-700 transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Export SVG
          </button>

          <button
            onClick={handleDownloadCsv}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium border border-neutral-700 transition cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5" />
            Cutting List (CSV)
          </button>
        </div>
      </div>

      {/* Visual Controls Bar */}
      <div className="flex flex-wrap items-center justify-between bg-neutral-950 p-2.5 rounded-lg border border-neutral-800 text-xs gap-3">
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-1.5 text-neutral-200 cursor-pointer bg-neutral-900/80 px-2.5 py-1 rounded-md border border-neutral-700">
            <input
              type="checkbox"
              checked={showFilledShadows}
              onChange={(e) => setShowFilledShadows(e.target.checked)}
              className="accent-amber-500 rounded cursor-pointer"
            />
            <span className="flex items-center gap-1 text-amber-300 font-semibold">
              <Eye className="w-3.5 h-3.5" />
              Show Predicted Shadows (Filled)
            </span>
          </label>

          <label className="flex items-center gap-1.5 text-neutral-300 cursor-pointer">
            <input
              type="checkbox"
              checked={showNumbers}
              onChange={(e) => setShowNumbers(e.target.checked)}
              className="accent-amber-500 rounded cursor-pointer"
            />
            <span>Show Stick IDs</span>
          </label>

          <label className="flex items-center gap-1.5 text-neutral-300 cursor-pointer">
            <input
              type="checkbox"
              checked={colorCodeHeights}
              onChange={(e) => setColorCodeHeights(e.target.checked)}
              className="accent-amber-500 rounded cursor-pointer"
            />
            <span>Color-Code Heights</span>
          </label>

          <label className="flex items-center gap-1.5 text-neutral-300 cursor-pointer">
            <input
              type="checkbox"
              checked={showShadowRays}
              onChange={(e) => setShowShadowRays(e.target.checked)}
              className="accent-amber-500 rounded cursor-pointer"
            />
            <span className="flex items-center gap-1 text-neutral-300">
              <Sparkles className="w-3 h-3 text-neutral-400" />
              Centerline Rays
            </span>
          </label>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-neutral-400 text-[11px]">Zoom Preview:</span>
          <button
            onClick={() => setZoomLevel((z) => Math.max(0.6, z - 0.15))}
            className="p-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded cursor-pointer"
            title="Zoom out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="font-mono text-neutral-300 text-[11px] w-12 text-center">
            {Math.round(zoomLevel * 100)}%
          </span>
          <button
            onClick={() => setZoomLevel((z) => Math.min(2.0, z + 0.15))}
            className="p-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded cursor-pointer"
            title="Zoom in"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* The Printable Paper Container */}
      <div
        ref={printAreaRef}
        className="w-full overflow-auto bg-neutral-950/60 p-6 rounded-xl border border-neutral-800 flex justify-center items-center min-h-[500px]"
        id="printable-dot-paper-section"
      >
        <div
          style={{
            transform: `scale(${zoomLevel})`,
            transformOrigin: 'top center',
            transition: 'transform 0.15s ease',
          }}
          className="print:transform-none bg-white text-neutral-900 shadow-2xl rounded-sm p-8 border border-neutral-300 max-w-full"
        >
          {/* Paper Header Info (Printed) */}
          <div className="flex justify-between items-end border-b-2 border-neutral-900 pb-2 mb-4 text-neutral-900">
            <div>
              <h1 className="text-base font-bold tracking-tight uppercase">
                Stick Shadow Art &bull; Dot-Paper Template
              </h1>
              <p className="text-[11px] text-neutral-600">
                Board: {board.widthCm}×{board.heightCm} cm &bull; Grid Pitch: {board.gridSpacingCm} cm &bull; Dowel &Oslash;: {board.stickDiameterMm} mm
              </p>
            </div>
            <div className="text-right">
              <span className="inline-block bg-amber-100 text-amber-900 text-[10px] font-bold px-2 py-0.5 rounded border border-amber-300">
                {isLeadingEdge ? 'Leading Arc Mode (Sticks on 1 Edge Only)' : 'Grid Mode'}
              </span>
              <p className="text-[11px] font-mono font-bold text-neutral-800 mt-0.5">
                Total Sticks: {sticks.length}
              </p>
            </div>
          </div>

          {/* Scaled SVG Dot Paper (True mm units) */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width={`${widthMm + 40}mm`}
            height={`${heightMm + 50}mm`}
            viewBox={`-20 -20 ${widthMm + 40} ${heightMm + 50}`}
            className="mx-auto block"
            style={{ maxWidth: '100%', height: 'auto' }}
          >
            <defs>
              {/* Dot Grid Pattern */}
              <pattern
                id="dot-pattern"
                x="0"
                y="0"
                width={gridPitchMm}
                height={gridPitchMm}
                patternUnits="userSpaceOnUse"
              >
                <circle cx={gridPitchMm / 2} cy={gridPitchMm / 2} r="0.6" fill="#cbd5e1" />
              </pattern>
            </defs>

            {/* Board Boundary Box */}
            <rect
              x="0"
              y="0"
              width={widthMm}
              height={heightMm}
              fill="#ffffff"
              stroke="#0f172a"
              strokeWidth={1.5}
            />

            {/* Dot Grid Layer inside margins */}
            <rect
              x={marginMm}
              y={marginMm}
              width={widthMm - 2 * marginMm}
              height={heightMm - 2 * marginMm}
              fill="url(#dot-pattern)"
            />

            {/* Centimeter Axis Rulers around the board */}
            {Array.from({ length: Math.floor(board.widthCm) + 1 }).map((_, cm) => {
              const xPos = cm * 10;
              return (
                <g key={`x-tick-${cm}`}>
                  <line x1={xPos} y1={-5} x2={xPos} y2={0} stroke="#475569" strokeWidth={0.8} />
                  <line x1={xPos} y1={heightMm} x2={xPos} y2={heightMm + 5} stroke="#475569" strokeWidth={0.8} />
                  {cm % 2 === 0 && (
                    <text
                      x={xPos}
                      y={-8}
                      fontSize="3.5"
                      textAnchor="middle"
                      fill="#475569"
                      fontFamily="sans-serif"
                    >
                      {cm}cm
                    </text>
                  )}
                </g>
              );
            })}

            {Array.from({ length: Math.floor(board.heightCm) + 1 }).map((_, cm) => {
              const yPos = heightMm - cm * 10;
              return (
                <g key={`y-tick-${cm}`}>
                  <line x1={-5} y1={yPos} x2={0} y2={yPos} stroke="#475569" strokeWidth={0.8} />
                  <line x1={widthMm} y1={yPos} x2={widthMm + 5} y2={yPos} stroke="#475569" strokeWidth={0.8} />
                  {cm % 2 === 0 && (
                    <text
                      x={-8}
                      y={yPos + 1.2}
                      fontSize="3.5"
                      textAnchor="end"
                      fill="#475569"
                      fontFamily="sans-serif"
                    >
                      {cm}cm
                    </text>
                  )}
                </g>
              );
            })}

            {/* Origin indicator (0,0) */}
            <circle cx={0} cy={heightMm} r={1.5} fill="#0f172a" />
            <text
              x={-6}
              y={heightMm + 10}
              fontSize="4"
              fontWeight="bold"
              fill="#0f172a"
              fontFamily="sans-serif"
            >
              (0,0)
            </text>

            {/* Physical Light Source Placement Indicator */}
            {(() => {
              const lxMm = light.xCm * 10;
              const lyMm = heightMm - light.yCm * 10;
              const centerX = widthMm / 2;
              const centerY = heightMm / 2;

              return (
                <g className="light-marker-group">
                  <line
                    x1={lxMm}
                    y1={lyMm}
                    x2={centerX}
                    y2={centerY}
                    stroke="#f59e0b"
                    strokeWidth={1}
                    strokeDasharray="3,3"
                  />
                  <circle cx={lxMm} cy={lyMm} r={5} fill="#fef3c7" stroke="#d97706" strokeWidth={1.5} />
                  <circle cx={lxMm} cy={lyMm} r={2} fill="#d97706" />

                  <rect
                    x={lxMm < 0 ? lxMm - 24 : lxMm + 8}
                    y={lyMm - 12}
                    width={48}
                    height={20}
                    rx={2}
                    fill="#ffffff"
                    stroke="#d97706"
                    strokeWidth={1}
                  />
                  <text
                    x={lxMm < 0 ? lxMm : lxMm + 32}
                    y={lyMm - 6}
                    fontSize="3"
                    fontWeight="bold"
                    fill="#92400e"
                    textAnchor="middle"
                    fontFamily="sans-serif"
                  >
                    LIGHT POSITION
                  </text>
                  <text
                    x={lxMm < 0 ? lxMm : lxMm + 32}
                    y={lyMm - 1}
                    fontSize="2.6"
                    fill="#78350f"
                    textAnchor="middle"
                    fontFamily="sans-serif"
                  >
                    X: {light.xCm.toFixed(1)}cm, Y: {light.yCm.toFixed(1)}cm
                  </text>
                  <text
                    x={lxMm < 0 ? lxMm : lxMm + 32}
                    y={lyMm + 4}
                    fontSize="2.6"
                    fontWeight="bold"
                    fill="#b45309"
                    textAnchor="middle"
                    fontFamily="sans-serif"
                  >
                    Height: {light.zCm.toFixed(1)} cm
                  </text>
                </g>
              );
            })()}

            {/* PREDICTED FILLED SHADOW REGIONS (Actual shadow-art silhouette) */}
            {showFilledShadows && shadowPolygons && shadowPolygons.length > 0 && (
              <g id="predicted-shadow-polygons" className="predicted-shadow-polygons">
                {shadowPolygons.map((poly, pIdx) => {
                  const pts = poly.points
                    .map((pt) => `${pt.xCm * 10},${heightMm - pt.yCm * 10}`)
                    .join(' ');
                  return (
                    <polygon
                      key={`shadow-poly-${pIdx}`}
                      points={pts}
                      fill="#0f172a"
                      opacity={0.88}
                    />
                  );
                })}
              </g>
            )}

            {/* Stick Dowel Shadow Capsules */}
            {showFilledShadows && (
              <g id="predicted-shadow-capsules" className="predicted-shadow-capsules">
                {sticks.map((s) => {
                  const xMm = s.xCm * 10;
                  const yMm = heightMm - s.yCm * 10;
                  const tipXMm = s.shadowTipXCm * 10;
                  const tipYMm = heightMm - s.shadowTipYCm * 10;
                  return (
                    <line
                      key={`shadow-cap-${s.id}`}
                      x1={xMm}
                      y1={yMm}
                      x2={tipXMm}
                      y2={tipYMm}
                      stroke="#0f172a"
                      strokeWidth={Math.max(2.4, board.stickDiameterMm * 0.95)}
                      strokeLinecap="round"
                      opacity={0.88}
                    />
                  );
                })}
              </g>
            )}

            {/* OPTIONAL SHADOW RAY PROJECTIONS (Visualizing how 1 arc creates full shape) */}
            {showShadowRays &&
              sticks.map((s) => {
                const xMm = s.xCm * 10;
                const yMm = heightMm - s.yCm * 10;
                const tipXMm = s.shadowTipXCm * 10;
                const tipYMm = heightMm - s.shadowTipYCm * 10;

                return (
                  <g key={`shadow-ray-${s.id}`} opacity={0.45}>
                    {/* Shadow span line */}
                    <line
                      x1={xMm}
                      y1={yMm}
                      x2={tipXMm}
                      y2={tipYMm}
                      stroke="#94a3b8"
                      strokeWidth={1.2}
                      strokeDasharray="1.5,1.5"
                    />
                    {/* Shadow termination tip marker */}
                    <circle cx={tipXMm} cy={tipYMm} r={0.9} fill="#475569" />
                  </g>
                );
              })}

            {/* STICKS MARKINGS ON DOT PAPER */}
            {sticks.map((s) => {
              const xMm = s.xCm * 10;
              const yMm = heightMm - s.yCm * 10;
              const stickColor = getStickColor(s.heightCm);

              return (
                <g key={`stick-${s.id}`} className="stick-location">
                  {/* Base hole circle (with diameter matching dowel) */}
                  <circle
                    cx={xMm}
                    cy={yMm}
                    r={Math.max(1.6, board.stickDiameterMm * 0.5)}
                    fill="#ffffff"
                    stroke={stickColor}
                    strokeWidth={1.2}
                  />
                  {/* Inner center dot for drill bit centering */}
                  <circle cx={xMm} cy={yMm} r={0.5} fill={stickColor} />

                  {/* ID number */}
                  {showNumbers && (
                    <text
                      x={xMm}
                      y={yMm - 2.8}
                      fontSize="2.4"
                      textAnchor="middle"
                      fill="#64748b"
                      fontWeight="bold"
                      fontFamily="monospace"
                    >
                      #{s.id}
                    </text>
                  )}

                  {/* Prominent Stick Length in cm */}
                  <text
                    x={xMm}
                    y={yMm + 4.0}
                    fontSize="2.8"
                    textAnchor="middle"
                    fill={stickColor}
                    fontWeight="bold"
                    fontFamily="sans-serif"
                  >
                    {s.heightCm.toFixed(1)}cm
                  </text>
                </g>
              );
            })}

            {/* 10 CM CALIBRATION RULER */}
            <g transform={`translate(${marginMm}, ${heightMm + 15})`}>
              <line x1={0} y1={0} x2={100} y2={0} stroke="#0f172a" strokeWidth={1.5} />
              <line x1={0} y1={-3} x2={0} y2={3} stroke="#0f172a" strokeWidth={1.5} />
              <line x1={50} y1={-2} x2={50} y2={2} stroke="#0f172a" strokeWidth={1} />
              <line x1={100} y1={-3} x2={100} y2={3} stroke="#0f172a" strokeWidth={1.5} />
              <text x={50} y={-4} fontSize="3" textAnchor="middle" fill="#0f172a" fontWeight="bold">
                10 cm Physical Verification Ruler (Must measure exactly 10 cm when printed)
              </text>
            </g>
          </svg>

          {/* Footer Physical Instructions */}
          <div className="mt-6 pt-3 border-t border-neutral-200 flex justify-between items-center text-[10px] text-neutral-500">
            <div>
              <strong>Assembly Tip:</strong> Sticks are located along the front arc/edge. Drill holes perpendicular to board, cut dowels to labeled length, and place light at labeled position.
            </div>
            <div>
              Stick Shadow Art Studio
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
