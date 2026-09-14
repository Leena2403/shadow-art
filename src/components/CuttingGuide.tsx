/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Scissors, Check, CheckSquare, Search, Ruler, Box } from 'lucide-react';
import { BoardConfig, StickData } from '../types';

interface CuttingGuideProps {
  sticks: StickData[];
  board: BoardConfig;
}

export const CuttingGuide: React.FC<CuttingGuideProps> = ({ sticks, board }) => {
  const [completedSticks, setCompletedSticks] = useState<Record<number, boolean>>({});
  const [filterQuery, setFilterQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'id' | 'length-asc' | 'length-desc'>('id');

  const toggleStick = (id: number) => {
    setCompletedSticks((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const markAll = (completed: boolean) => {
    const updated: Record<number, boolean> = {};
    if (completed) {
      sticks.forEach((s) => {
        updated[s.id] = true;
      });
    }
    setCompletedSticks(updated);
  };

  // Metrics
  const totalLengthCm = sticks.reduce((acc, s) => acc + s.heightCm, 0);
  const totalDowelMeters = (totalLengthCm / 100).toFixed(2);
  const standardRods = Math.ceil(totalLengthCm / 90); // assume 90cm usable per 1m rod accounting for saw kerf

  const completedCount = Object.values(completedSticks).filter(Boolean).length;
  const progressPercent = sticks.length > 0 ? Math.round((completedCount / sticks.length) * 100) : 0;

  // Filter & sort
  const filtered = sticks.filter((s) => {
    if (!filterQuery) return true;
    const q = filterQuery.toLowerCase();
    return (
      s.id.toString().includes(q) ||
      s.heightCm.toString().includes(q) ||
      `col ${s.col + 1}`.includes(q) ||
      `row ${s.row + 1}`.includes(q)
    );
  });

  filtered.sort((a, b) => {
    if (sortBy === 'id') return a.id - b.id;
    if (sortBy === 'length-asc') return a.heightCm - b.heightCm;
    return b.heightCm - a.heightCm;
  });

  return (
    <div className="bg-neutral-900/90 border border-neutral-800 rounded-xl p-5 shadow-xl flex flex-col gap-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-neutral-800">
        <div>
          <h2 className="text-lg font-semibold text-neutral-100 flex items-center gap-2">
            <Scissors className="w-5 h-5 text-amber-400" />
            Wood Dowel Cutting &amp; Assembly Guide
          </h2>
          <p className="text-xs text-neutral-400 mt-0.5">
            Physical workshop bill of materials. Cut vertical dowel sticks to exact length and insert perpendicularly into dot paper.
          </p>
        </div>

        {/* Progress Badge */}
        <div className="flex items-center gap-2 bg-neutral-950 px-3 py-1.5 rounded-lg border border-neutral-800 text-xs">
          <span className="text-neutral-400">Assembled:</span>
          <strong className="text-amber-400 font-mono">
            {completedCount} / {sticks.length} ({progressPercent}%)
          </strong>
        </div>
      </div>

      {/* Bill of Materials Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-neutral-950/60 p-3 rounded-lg border border-neutral-800 text-xs">
          <span className="text-neutral-400 block mb-1">Total Sticks</span>
          <span className="text-lg font-bold font-mono text-neutral-100">{sticks.length}</span>
        </div>

        <div className="bg-neutral-950/60 p-3 rounded-lg border border-neutral-800 text-xs">
          <span className="text-neutral-400 block mb-1">Total Dowel Wood</span>
          <span className="text-lg font-bold font-mono text-amber-400">
            {totalLengthCm.toFixed(1)} cm <span className="text-xs font-normal text-neutral-400">({totalDowelMeters}m)</span>
          </span>
        </div>

        <div className="bg-neutral-950/60 p-3 rounded-lg border border-neutral-800 text-xs">
          <span className="text-neutral-400 block mb-1">Dowel Diameter</span>
          <span className="text-lg font-bold font-mono text-neutral-100">{board.stickDiameterMm} mm</span>
        </div>

        <div className="bg-neutral-950/60 p-3 rounded-lg border border-neutral-800 text-xs">
          <span className="text-neutral-400 block mb-1">Stock Needed (1m rods)</span>
          <span className="text-lg font-bold font-mono text-amber-400">
            ~{standardRods} <span className="text-xs font-normal text-neutral-400">rods</span>
          </span>
        </div>
      </div>

      {/* Controls: Search, Sort, Mark All */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs pt-1">
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-500" />
          <input
            type="text"
            placeholder="Search by stick # or length..."
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            className="w-full bg-neutral-950 border border-neutral-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-neutral-400 text-[11px]">Sort:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-neutral-950 border border-neutral-800 rounded-md px-2 py-1 text-xs text-neutral-200 focus:outline-none cursor-pointer"
          >
            <option value="id">Stick # ID</option>
            <option value="length-asc">Shortest First</option>
            <option value="length-desc">Tallest First</option>
          </select>

          <button
            onClick={() => markAll(true)}
            className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded transition text-xs"
          >
            Check All
          </button>
          <button
            onClick={() => markAll(false)}
            className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-400 rounded transition text-xs"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Scrollable Checklist Table */}
      <div className="max-h-72 overflow-y-auto rounded-lg border border-neutral-800 bg-neutral-950/80">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-neutral-900/90 text-neutral-400 sticky top-0 border-b border-neutral-800 font-medium">
            <tr>
              <th className="p-2.5 w-10 text-center">Done</th>
              <th className="p-2.5">Stick #</th>
              <th className="p-2.5">Cut Length (cm)</th>
              <th className="p-2.5">Grid Coordinate</th>
              <th className="p-2.5">Base (X, Y) cm</th>
              <th className="p-2.5">Shadow Reach</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-850">
            {filtered.map((s) => {
              const isDone = !!completedSticks[s.id];
              return (
                <tr
                  key={`row-${s.id}`}
                  onClick={() => toggleStick(s.id)}
                  className={`transition cursor-pointer select-none ${
                    isDone
                      ? 'bg-neutral-900/30 text-neutral-500 line-through'
                      : 'hover:bg-neutral-900/60 text-neutral-200'
                  }`}
                >
                  <td className="p-2.5 text-center">
                    <input
                      type="checkbox"
                      checked={isDone}
                      onChange={() => {}} // handled by row click
                      className="accent-amber-500 rounded cursor-pointer"
                    />
                  </td>
                  <td className="p-2.5 font-mono font-bold text-amber-400 flex items-center gap-1.5">
                    <span>#{s.id}</span>
                    {s.group && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-sans font-medium bg-pink-500/15 text-pink-300 border border-pink-500/30">
                        {s.group}
                      </span>
                    )}
                  </td>
                  <td className="p-2.5 font-mono font-bold text-neutral-100">
                    <span className="bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 text-amber-300">
                      {s.heightCm.toFixed(1)} cm
                    </span>
                  </td>
                  <td className="p-2.5 font-mono text-neutral-400">
                    Col {s.col + 1}, Row {s.row + 1}
                  </td>
                  <td className="p-2.5 font-mono text-neutral-400">
                    ({s.xCm.toFixed(1)}, {s.yCm.toFixed(1)})
                  </td>
                  <td className="p-2.5 font-mono text-neutral-400">
                    {s.shadowLengthCm.toFixed(1)} cm
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
