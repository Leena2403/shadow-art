/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Upload, Sparkles, Sliders, Brush, Eraser, CheckSquare, Trash2, Image as ImageIcon } from 'lucide-react';
import { ImageProcessingOptions, PresetImage } from '../types';
import { PRESET_IMAGES } from '../utils/presets';
import { processImageToMasks, ProcessedImageData } from '../utils/imageProcessing';

interface ImageWorkflowProps {
  onSelectionChange: (mask: Uint8Array, width: number, height: number) => void;
  onLightPresetChange?: (light: { xCm: number; yCm: number; zCm: number; mode: 'ground' | 'wall' }) => void;
}

export const ImageWorkflow: React.FC<ImageWorkflowProps> = ({ onSelectionChange, onLightPresetChange }) => {
  const [selectedPreset, setSelectedPreset] = useState<string>(PRESET_IMAGES[0].id);
  const [imgSrc, setImgSrc] = useState<string>(PRESET_IMAGES[0].svgDataUri);
  const [options, setOptions] = useState<ImageProcessingOptions>({
    threshold: 140,
    edgeSensitivity: 55,
    invert: false,
    blurRadius: 0,
    outlineThickness: 2,
  });

  const [processedData, setProcessedData] = useState<ProcessedImageData | null>(null);
  const [userSelectionMask, setUserSelectionMask] = useState<Uint8Array | null>(null);
  const [activeTool, setActiveTool] = useState<'brush' | 'eraser' | 'pan'>('brush');
  const [brushSize, setBrushSize] = useState<number>(12);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [selectionType, setSelectionType] = useState<'outline' | 'fill' | 'custom'>('fill');
  const [showPinkGuides, setShowPinkGuides] = useState<boolean>(true);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Load and process image
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const result = processImageToMasks(img, 240, options);
        setProcessedData(result);

        // Apply default selection based on current selectionType
        const initialMask = new Uint8Array(result.width * result.height);
        if (selectionType === 'outline') {
          initialMask.set(result.outlineMask);
        } else if (selectionType === 'fill') {
          initialMask.set(result.fillMask);
        } else {
          // Both outline and fill
          for (let i = 0; i < initialMask.length; i++) {
            initialMask[i] = result.outlineMask[i] || result.fillMask[i] ? 1 : 0;
          }
        }
        setUserSelectionMask(initialMask);
        onSelectionChange(initialMask, result.width, result.height);
      } catch (err) {
        console.error('Error processing image:', err);
      }
    };
    img.src = imgSrc;
  }, [imgSrc, options, selectionType, onSelectionChange]);

  // Draw on canvas whenever processedData or userSelectionMask changes
  const renderCanvas = useCallback(() => {
    if (!canvasRef.current || !processedData || !userSelectionMask) return;
    const canvas = canvasRef.current;
    canvas.width = processedData.width;
    canvas.height = processedData.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = processedData;
    const imgData = ctx.createImageData(width, height);

    for (let i = 0; i < width * height; i++) {
      const idx = i * 4;
      const isSelected = userSelectionMask[i] === 1;
      const isOutline = processedData.outlineMask[i] === 1;
      const isFill = processedData.fillMask[i] === 1;
      const isPinkLine = processedData.hasPinkLines && processedData.pinkLineMask[i] === 1;

      if (isPinkLine && showPinkGuides) {
        // High-contrast vibrant hot pink for stick placement arcs (guides only)
        imgData.data[idx] = 255;     // R
        imgData.data[idx + 1] = 32;  // G
        imgData.data[idx + 2] = 121; // B
        imgData.data[idx + 3] = 255;
      } else if (isSelected) {
        // Deep warm velvet charcoal for shadow areas (ears, eyes, nose)
        imgData.data[idx] = 24;      // R
        imgData.data[idx + 1] = 28;  // G
        imgData.data[idx + 2] = 36;  // B
        imgData.data[idx + 3] = 255;
      } else if (isOutline) {
        // Unselected outline in muted orange-gray
        imgData.data[idx] = 180;
        imgData.data[idx + 1] = 140;
        imgData.data[idx + 2] = 120;
        imgData.data[idx + 3] = 180;
      } else if (isFill) {
        // Unselected fill
        imgData.data[idx] = 45;
        imgData.data[idx + 1] = 55;
        imgData.data[idx + 2] = 72;
        imgData.data[idx + 3] = 160;
      } else {
        // Clean white background (including the circular pupil light holes!)
        imgData.data[idx] = 255;
        imgData.data[idx + 1] = 255;
        imgData.data[idx + 2] = 255;
        imgData.data[idx + 3] = 255;
      }
    }

    ctx.putImageData(imgData, 0, 0);
  }, [processedData, userSelectionMask, showPinkGuides]);

  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (typeof event.target?.result === 'string') {
        setImgSrc(event.target.result);
        setSelectedPreset('');
      }
    };
    reader.readAsDataURL(file);
  };

  // Preset click
  const handleSelectPreset = (preset: PresetImage) => {
    setSelectedPreset(preset.id);
    setImgSrc(preset.svgDataUri);
    if (preset.recommendedLight && onLightPresetChange) {
      onLightPresetChange(preset.recommendedLight);
    }
  };

  // Filter out chin / face outline to focus solely on ears, eyes and nose
  const handleFilterFaceOutline = () => {
    if (!processedData || !userSelectionMask) return;
    const { width, height } = processedData;
    const newMask = new Uint8Array(userSelectionMask);

    for (let y = 0; y < height; y++) {
      const normY = y / height;
      for (let x = 0; x < width; x++) {
        const normX = x / width;
        const idx = y * width + x;

        // Clear chin and cheek outlines outside of the central facial features
        if (normY > 0.77 || ((normX < 0.17 || normX > 0.83) && normY > 0.42)) {
          newMask[idx] = 0;
        }
      }
    }

    setUserSelectionMask(newMask);
    onSelectionChange(newMask, width, height);
  };

  // Selection tool actions
  const applyAction = (action: 'all-outline' | 'all-fill' | 'combine' | 'clear') => {
    if (!processedData) return;
    const { width, height, outlineMask, fillMask } = processedData;
    const newMask = new Uint8Array(width * height);

    if (action === 'all-outline') {
      newMask.set(outlineMask);
      setSelectionType('outline');
    } else if (action === 'all-fill') {
      newMask.set(fillMask);
      setSelectionType('fill');
    } else if (action === 'combine') {
      for (let i = 0; i < newMask.length; i++) {
        newMask[i] = outlineMask[i] || fillMask[i] ? 1 : 0;
      }
      setSelectionType('custom');
    } else if (action === 'clear') {
      newMask.fill(0);
      setSelectionType('custom');
    }

    setUserSelectionMask(newMask);
    onSelectionChange(newMask, width, height);
  };

  // Manual brush / eraser interaction on canvas
  const handleCanvasPointer = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing && e.type !== 'pointerdown') return;
    if (!canvasRef.current || !processedData || !userSelectionMask) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = processedData.width / rect.width;
    const scaleY = processedData.height / rect.height;

    const clientX = (e.clientX - rect.left) * scaleX;
    const clientY = (e.clientY - rect.top) * scaleY;

    const radius = brushSize * 0.5;
    const r2 = radius * radius;
    const newMask = new Uint8Array(userSelectionMask);
    const val = activeTool === 'brush' ? 1 : 0;

    let modified = false;
    const minX = Math.max(0, Math.floor(clientX - radius));
    const maxX = Math.min(processedData.width - 1, Math.ceil(clientX + radius));
    const minY = Math.max(0, Math.floor(clientY - radius));
    const maxY = Math.min(processedData.height - 1, Math.ceil(clientY + radius));

    for (let py = minY; py <= maxY; py++) {
      for (let px = minX; px <= maxX; px++) {
        const d2 = (px - clientX) * (px - clientX) + (py - clientY) * (py - clientY);
        if (d2 <= r2) {
          const idx = py * processedData.width + px;
          if (newMask[idx] !== val) {
            newMask[idx] = val;
            modified = true;
          }
        }
      }
    }

    if (modified) {
      setUserSelectionMask(newMask);
      onSelectionChange(newMask, processedData.width, processedData.height);
    }
  };

  return (
    <div className="bg-neutral-900/90 border border-neutral-800 rounded-xl p-5 shadow-xl flex flex-col gap-5">
      {/* Header with Title & Upload Button */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-neutral-800">
        <div>
          <h2 className="text-lg font-semibold text-neutral-100 flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-amber-500" />
            Image &amp; Outline Selection
          </h2>
          <p className="text-xs text-neutral-400 mt-0.5">
            Upload any image or choose a silhouette preset. Select outline edges or filled shadow regions to recreate with sticks.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            className="hidden"
            id="image-upload-input"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-medium transition cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            Upload Image
          </button>
        </div>
      </div>

      {/* Preset Pickers */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-neutral-400 font-medium mr-1 flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Presets:
        </span>
        {PRESET_IMAGES.map((preset) => (
          <button
            key={preset.id}
            onClick={() => handleSelectPreset(preset)}
            className={`px-2.5 py-1 text-xs rounded-md transition cursor-pointer ${
              selectedPreset === preset.id
                ? 'bg-amber-500 text-neutral-950 font-semibold shadow-sm'
                : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300'
            }`}
          >
            {preset.name}
          </button>
        ))}
      </div>

      {/* Main Interactive Canvas & Selection Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Canvas Display Viewport */}
        <div className="lg:col-span-7 flex flex-col items-center justify-center bg-neutral-950/80 rounded-xl p-4 border border-neutral-800 relative">
          {processedData?.hasPinkLines && (
            <div className="w-full mb-3 px-3 py-2 rounded-lg bg-neutral-900/90 border border-neutral-800 flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="text-neutral-300 font-medium flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-pink-400 shrink-0" />
                <span>
                  <strong>Pink lines</strong> are construction guides for stick placement only. Final output is formed by stick shadows, leaving two circular holes of light in the eyes.
                </span>
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowPinkGuides(!showPinkGuides)}
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold transition flex items-center gap-1 cursor-pointer ${
                    showPinkGuides
                      ? 'bg-pink-500/25 text-pink-300 border border-pink-500/40 hover:bg-pink-500/35'
                      : 'bg-neutral-800 text-neutral-400 border border-neutral-700 hover:text-neutral-200'
                  }`}
                  title="Toggle visibility of the pink stick guide lines"
                >
                  {showPinkGuides ? 'Guides: Visible' : 'Guides: Hidden (Pure Art)'}
                </button>
              </div>
            </div>
          )}

          <div className="relative rounded-lg overflow-hidden border border-neutral-800 bg-white shadow-inner max-w-full">
            <canvas
              ref={canvasRef}
              onPointerDown={(e) => {
                setIsDrawing(true);
                handleCanvasPointer(e);
              }}
              onPointerMove={handleCanvasPointer}
              onPointerUp={() => setIsDrawing(false)}
              onPointerLeave={() => setIsDrawing(false)}
              className="block cursor-crosshair touch-none max-h-[290px] w-auto object-contain mx-auto"
            />
          </div>

          {/* Interactive Tool bar under canvas */}
          <div className="flex flex-wrap items-center justify-between w-full mt-3 pt-3 border-t border-neutral-800/80 text-xs gap-2">
            <div className="flex items-center gap-1 bg-neutral-900 p-1 rounded-lg border border-neutral-800">
              <button
                onClick={() => setActiveTool('brush')}
                className={`p-1.5 rounded transition ${
                  activeTool === 'brush' ? 'bg-amber-500 text-neutral-950 font-bold' : 'text-neutral-400 hover:text-neutral-200'
                }`}
                title="Brush to add selection"
              >
                <Brush className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setActiveTool('eraser')}
                className={`p-1.5 rounded transition ${
                  activeTool === 'eraser' ? 'bg-amber-500 text-neutral-950 font-bold' : 'text-neutral-400 hover:text-neutral-200'
                }`}
                title="Eraser"
              >
                <Eraser className="w-3.5 h-3.5" />
              </button>
              <div className="h-3 w-px bg-neutral-700 mx-1" />
              <span className="text-[10px] text-neutral-400 pl-1">Size:</span>
              <input
                type="range"
                min="4"
                max="30"
                value={brushSize}
                onChange={(e) => setBrushSize(Number(e.target.value))}
                className="w-16 accent-amber-500 cursor-pointer h-1 bg-neutral-800 rounded"
              />
            </div>

            {/* Quick selection presets */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={handleFilterFaceOutline}
                className="px-2.5 py-1 bg-pink-500/20 hover:bg-pink-500/30 text-pink-300 border border-pink-500/40 rounded text-[11px] font-semibold transition flex items-center gap-1 cursor-pointer"
                title="Filter chin/cheek outline and focus solely on ears, eyes and nose"
              >
                <Sparkles className="w-3 h-3 text-pink-400" />
                Focus on Ears, Eyes &amp; Nose
              </button>
              <button
                onClick={() => applyAction('all-fill')}
                className="px-2 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded text-[11px] transition"
              >
                Filled Shapes
              </button>
              <button
                onClick={() => applyAction('all-outline')}
                className="px-2 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded text-[11px] transition"
              >
                Outlines
              </button>
              <button
                onClick={() => applyAction('clear')}
                className="p-1 text-neutral-400 hover:text-rose-400 rounded transition"
                title="Clear selection"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Outline & Filter Controls */}
        <div className="lg:col-span-5 flex flex-col justify-between bg-neutral-950/40 p-4 rounded-xl border border-neutral-800/80 text-xs">
          <div className="space-y-3.5">
            <div className="flex items-center justify-between font-medium text-neutral-200 pb-1 border-b border-neutral-800">
              <span className="flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-amber-400" />
                Outline &amp; Threshold Detection
              </span>
              <span className="text-[10px] text-amber-400/80 font-mono">Sobel Edge Algorithm</span>
            </div>

            {/* Threshold */}
            <div>
              <div className="flex justify-between text-neutral-300 mb-1">
                <span>Luminance Threshold</span>
                <span className="font-mono text-amber-400">{options.threshold}</span>
              </div>
              <input
                type="range"
                min="20"
                max="240"
                value={options.threshold}
                onChange={(e) => setOptions({ ...options, threshold: Number(e.target.value) })}
                className="w-full accent-amber-500 bg-neutral-800 rounded-lg h-1.5 cursor-pointer"
              />
            </div>

            {/* Edge Sensitivity */}
            <div>
              <div className="flex justify-between text-neutral-300 mb-1">
                <span>Outline Edge Sensitivity</span>
                <span className="font-mono text-amber-400">{options.edgeSensitivity}%</span>
              </div>
              <input
                type="range"
                min="10"
                max="90"
                value={options.edgeSensitivity}
                onChange={(e) => setOptions({ ...options, edgeSensitivity: Number(e.target.value) })}
                className="w-full accent-amber-500 bg-neutral-800 rounded-lg h-1.5 cursor-pointer"
              />
            </div>

            {/* Outline Thickness */}
            <div>
              <div className="flex justify-between text-neutral-300 mb-1">
                <span>Outline Stroke Width</span>
                <span className="font-mono text-amber-400">{options.outlineThickness} px</span>
              </div>
              <div className="flex gap-2">
                {[1, 2, 3].map((thickness) => (
                  <button
                    key={thickness}
                    onClick={() => setOptions({ ...options, outlineThickness: thickness })}
                    className={`flex-1 py-1 rounded text-center transition ${
                      options.outlineThickness === thickness
                        ? 'bg-amber-500 text-neutral-950 font-bold'
                        : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                    }`}
                  >
                    {thickness}px
                  </button>
                ))}
              </div>
            </div>

            {/* Invert toggle */}
            <div className="flex items-center justify-between pt-1">
              <label htmlFor="invert-toggle" className="text-neutral-300 cursor-pointer select-none">
                Invert Shadow Polarity
              </label>
              <input
                id="invert-toggle"
                type="checkbox"
                checked={options.invert}
                onChange={(e) => setOptions({ ...options, invert: e.target.checked })}
                className="w-4 h-4 accent-amber-500 cursor-pointer rounded"
              />
            </div>
          </div>

          {/* Legend Guide */}
          <div className="mt-4 p-2.5 rounded-lg bg-neutral-900/80 border border-neutral-800 text-[11px] text-neutral-400 space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-pink-500 inline-block shrink-0 shadow-sm shadow-pink-500/50" />
              <span>
                <strong className="text-pink-300">Pink Lines:</strong> Stick Placement Locations (Ears, Eyes, Nose)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-700 inline-block shrink-0" />
              <span>
                <strong className="text-neutral-200">Dark Shapes:</strong> Selected feature areas recreated by cast shadow
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-white border border-neutral-600 inline-block shrink-0" />
              <span>
                <strong className="text-neutral-300">White Areas:</strong> Unshadowed zones (e.g. eye pupil highlights)
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
