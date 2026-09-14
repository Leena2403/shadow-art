/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import { BoardConfig, LightConfig, StickData } from '../types';
import { ShadowPolygon } from '../utils/shadowMath';
import { Eye, Zap, Sparkles, Layers, Compass, HelpCircle } from 'lucide-react';

interface ThreeDViewProps {
  sticks: StickData[];
  board: BoardConfig;
  light: LightConfig;
  targetDesignMask?: Uint8Array;
  maskWidth?: number;
  maskHeight?: number;
  shadowPolygons?: ShadowPolygon[];
}

export const ThreeDView: React.FC<ThreeDViewProps> = ({
  sticks,
  board,
  light,
  shadowPolygons = [],
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [hoveredStick, setHoveredStick] = useState<StickData | null>(null);
  const [showRays, setShowRays] = useState<boolean>(true);
  const [showGuideCurves, setShowGuideCurves] = useState<boolean>(false);
  const [lightIntensity, setLightIntensity] = useState<number>(1.2);

  // References to keep scene objects
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sticksGroupRef = useRef<THREE.Group | null>(null);
  const raysGroupRef = useRef<THREE.Group | null>(null);
  const lightMeshRef = useRef<THREE.Mesh | null>(null);
  const pointLightRef = useRef<THREE.PointLight | null>(null);
  const animFrameId = useRef<number | null>(null);

  // Texture canvas reference for ground board
  const dotCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const boardTextureRef = useRef<THREE.CanvasTexture | null>(null);

  // Camera Orbit State
  const isOrbiting = useRef(false);
  const prevMousePos = useRef({ x: 0, y: 0 });
  const cameraOrbit = useRef({
    theta: -Math.PI / 2, // azimuth pointing north so top of board is up
    phi: 0.12,          // nearly top-down by default
    radius: 34,
    target: new THREE.Vector3(board.widthCm / 2, 0, board.heightCm / 2),
  });

  const updateCameraPosition = useCallback(() => {
    if (!cameraRef.current) return;
    const { theta, phi, radius, target } = cameraOrbit.current;
    cameraRef.current.position.x = target.x + radius * Math.sin(phi) * Math.cos(theta);
    cameraRef.current.position.z = target.z + radius * Math.sin(phi) * Math.sin(theta);
    cameraRef.current.position.y = target.y + radius * Math.cos(phi);
    cameraRef.current.lookAt(target);
  }, []);

  // Preset Camera Angles
  const setCameraView = (view: 'panda-face' | 'gallery' | 'light') => {
    const target = new THREE.Vector3(board.widthCm / 2, 0, board.heightCm / 2);
    cameraOrbit.current.target.copy(target);

    if (view === 'panda-face') {
      // Top-down view oriented so Panda face is right-side up (ears at top, nose at bottom)
      cameraOrbit.current.theta = -Math.PI / 2;
      cameraOrbit.current.phi = 0.12;
      cameraOrbit.current.radius = Math.max(board.widthCm, board.heightCm) * 1.7;
    } else if (view === 'gallery') {
      // 3D perspective showing vertical stick dowels standing perpendicular and casting shadows
      cameraOrbit.current.theta = -0.75;
      cameraOrbit.current.phi = 0.85;
      cameraOrbit.current.radius = Math.max(board.widthCm, board.heightCm) * 1.85;
    } else if (view === 'light') {
      // Look from near the fixed overhead lamp looking down
      const dx = light.xCm - target.x;
      const dz = light.yCm - target.z;
      const angle = Math.atan2(dz, dx);
      cameraOrbit.current.theta = angle;
      cameraOrbit.current.phi = 0.65;
      cameraOrbit.current.radius = Math.hypot(dx, dz, light.zCm) * 1.15;
    }
    updateCameraPosition();
  };

  // Render ground board texture: dot paper + cast shadow art (NO pink lines in final output)
  const redrawBoardTexture = useCallback(() => {
    const canvas = dotCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const boardW = board.widthCm;
    const boardH = board.heightCm;

    // 1. Clean ivory-paper background
    ctx.fillStyle = '#faf7ef';
    ctx.fillRect(0, 0, width, height);

    // 2. Subtle dot grid (dot paper)
    const margin = 1.0;
    const usableW = boardW - 2 * margin;
    const usableH = boardH - 2 * margin;
    const cols = Math.floor(usableW / board.gridSpacingCm) + 1;
    const rows = Math.floor(usableH / board.gridSpacingCm) + 1;

    ctx.fillStyle = '#d0c6b1';
    for (let r = 0; r < rows; r++) {
      const yFrac = (margin + r * board.gridSpacingCm) / boardH;
      const py = (1.0 - yFrac) * height;
      for (let c = 0; c < cols; c++) {
        const xFrac = (margin + c * board.gridSpacingCm) / boardW;
        const px = xFrac * width;
        ctx.beginPath();
        ctx.arc(px, py, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Border outline
    ctx.strokeStyle = '#c4b8a4';
    ctx.lineWidth = 4;
    ctx.strokeRect(10, 10, width - 20, height - 20);

    // 3. Render the cast shadow art formed by the vertical sticks under the overhead lamp
    // In ground mode, light shines from (light.xCm, light.yCm, light.zCm).
    // The vertical sticks cast rich, dark, cohesive shadows forming the features!
    if (light.mode === 'ground' && sticks.length > 0) {
      ctx.save();
      // Deep velvety cast shadow tone
      ctx.fillStyle = 'rgba(16, 18, 24, 0.94)';
      ctx.strokeStyle = 'rgba(16, 18, 24, 0.94)';

      // 1. Draw contiguous shadow polygons calculated from the stick leading edge
      if (shadowPolygons && shadowPolygons.length > 0) {
        for (const poly of shadowPolygons) {
          if (poly.points.length < 3) continue;
          ctx.beginPath();
          const p0 = { x: (poly.points[0].xCm / boardW) * width, y: (1.0 - poly.points[0].yCm / boardH) * height };
          ctx.moveTo(p0.x, p0.y);
          for (let i = 1; i < poly.points.length; i++) {
            const pi = { x: (poly.points[i].xCm / boardW) * width, y: (1.0 - poly.points[i].yCm / boardH) * height };
            ctx.lineTo(pi.x, pi.y);
          }
          ctx.closePath();
          ctx.fill();
        }
      } else {
        // Fallback: group adjacent sticks
        const groups: Record<string, StickData[]> = {};
        for (const s of sticks) {
          const g = s.group || 'General';
          if (!groups[g]) groups[g] = [];
          groups[g].push(s);
        }
        for (const list of Object.values(groups)) {
          list.sort((a, b) => a.xCm - b.xCm);
          for (let i = 0; i < list.length - 1; i++) {
            const sA = list[i];
            const sB = list[i + 1];
            if (Math.hypot(sB.xCm - sA.xCm, sB.yCm - sA.yCm) > 1.8) continue;
            const pA0 = { x: (sA.xCm / boardW) * width, y: (1.0 - sA.yCm / boardH) * height };
            const pB0 = { x: (sB.xCm / boardW) * width, y: (1.0 - sB.yCm / boardH) * height };
            const pB1 = { x: (sB.shadowTipXCm / boardW) * width, y: (1.0 - sB.shadowTipYCm / boardH) * height };
            const pA1 = { x: (sA.shadowTipXCm / boardW) * width, y: (1.0 - sA.shadowTipYCm / boardH) * height };

            ctx.beginPath();
            ctx.moveTo(pA0.x, pA0.y);
            ctx.lineTo(pB0.x, pB0.y);
            ctx.lineTo(pB1.x, pB1.y);
            ctx.lineTo(pA1.x, pA1.y);
            ctx.closePath();
            ctx.fill();
          }
        }
      }

      // Draw shadow capsule strokes for all sticks to ensure smooth rounded terminations
      const shadowStrokeWidth = Math.max(16, ((board.stickDiameterMm / 10) / boardW) * width * 1.35);
      ctx.lineWidth = shadowStrokeWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      for (const s of sticks) {
        const p0 = { x: (s.xCm / boardW) * width, y: (1.0 - s.yCm / boardH) * height };
        const p1 = { x: (s.shadowTipXCm / boardW) * width, y: (1.0 - s.shadowTipYCm / boardH) * height };

        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p1.x, p1.y);
        ctx.stroke();
      }

      ctx.restore();
    }

    // 4. Draw stick base hole markers (natural wooden dowel drill marks)
    ctx.fillStyle = '#b7ab98';
    const holeRadius = Math.max(3.5, ((board.stickDiameterMm / 10) / boardW) * width * 0.5);
    for (const s of sticks) {
      const px = (s.xCm / boardW) * width;
      const py = (1.0 - s.yCm / boardH) * height;
      ctx.beginPath();
      ctx.arc(px, py, holeRadius, 0, Math.PI * 2);
      ctx.fill();
    }

    // 5. Optional Construction Guides (Dashed pink lines, ONLY if user explicitly toggles for alignment)
    // By default, pink lines NEVER appear on the final output!
    if (showGuideCurves) {
      ctx.save();
      ctx.strokeStyle = '#ff2079';
      ctx.lineWidth = 3.0;
      ctx.setLineDash([5, 5]);

      const groups: Record<string, StickData[]> = {};
      for (const s of sticks) {
        const g = s.group || 'General';
        let subKey = g;
        if (g.includes('Eye')) {
          subKey = s.yCm > 8.9 ? `${g}-upper` : `${g}-lower`;
        }
        if (!groups[subKey]) groups[subKey] = [];
        groups[subKey].push(s);
      }

      for (const list of Object.values(groups)) {
        list.sort((a, b) => a.xCm - b.xCm);
        ctx.beginPath();
        for (let i = 0; i < list.length; i++) {
          const px = (list[i].xCm / boardW) * width;
          const py = (1.0 - list[i].yCm / boardH) * height;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();
      }
      ctx.restore();
    }

    if (boardTextureRef.current) {
      boardTextureRef.current.needsUpdate = true;
    }
  }, [board, light, sticks, showGuideCurves]);

  // Init Three.js scene
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 600;
    const height = container.clientHeight || 450;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0c10);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.5, 1000);
    cameraRef.current = camera;
    cameraOrbit.current.target.set(board.widthCm / 2, 0, board.heightCm / 2);
    cameraOrbit.current.radius = Math.max(board.widthCm, board.heightCm) * 1.7;
    updateCameraPosition();

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    container.replaceChildren(renderer.domElement);

    // Ambient light (subtle, so shadows pop dramatically)
    const ambientLight = new THREE.AmbientLight(0x282c38, 0.9);
    scene.add(ambientLight);

    // Main Fixed Point Light (Casting Shadows)
    const pointLight = new THREE.PointLight(0xfffaed, 2.5, 300, 1.2);
    pointLight.castShadow = true;
    pointLight.shadow.mapSize.width = 2048;
    pointLight.shadow.mapSize.height = 2048;
    pointLight.shadow.camera.near = 0.5;
    pointLight.shadow.camera.far = 250;
    pointLight.shadow.bias = -0.001;
    scene.add(pointLight);
    pointLightRef.current = pointLight;

    // Visual bulb mesh for the light source
    const bulbGeo = new THREE.SphereGeometry(0.7, 16, 16);
    const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffd43b });
    const bulbMesh = new THREE.Mesh(bulbGeo, bulbMat);
    scene.add(bulbMesh);
    lightMeshRef.current = bulbMesh;

    // Baseboard Ground Plane (Wood material with dot texture)
    const boardW = board.widthCm;
    const boardH = board.heightCm;

    // Canvas texture for the dot paper & cast shadow on the board
    const dotCanvas = document.createElement('canvas');
    dotCanvas.width = 1024;
    dotCanvas.height = 1024;
    dotCanvasRef.current = dotCanvas;

    const boardTexture = new THREE.CanvasTexture(dotCanvas);
    boardTextureRef.current = boardTexture;

    const boardGeo = new THREE.BoxGeometry(boardW, 0.4, boardH);
    const boardMat = new THREE.MeshStandardMaterial({
      map: boardTexture,
      roughness: 0.75,
      metalness: 0.05,
    });
    const boardMesh = new THREE.Mesh(boardGeo, boardMat);
    // Center at (boardW/2, -0.2, boardH/2) so base top surface is exactly at Y=0
    boardMesh.position.set(boardW / 2, -0.2, boardH / 2);
    boardMesh.receiveShadow = true;
    scene.add(boardMesh);

    // If wall mode, add a vertical back wall
    if (light.mode === 'wall') {
      const wallGeo = new THREE.PlaneGeometry(boardW * 1.5, boardH * 1.5);
      const wallMat = new THREE.MeshStandardMaterial({
        color: 0xf0ede6,
        roughness: 0.9,
      });
      const wallMesh = new THREE.Mesh(wallGeo, wallMat);
      wallMesh.position.set(boardW / 2, boardH * 0.6, boardH);
      wallMesh.receiveShadow = true;
      scene.add(wallMesh);
    }

    // Surrounding tabletop floor
    const floorGeo = new THREE.PlaneGeometry(160, 160);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x111318,
      roughness: 0.95,
    });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.set(boardW / 2, -0.41, boardH / 2);
    floorMesh.receiveShadow = true;
    scene.add(floorMesh);

    // Groups for sticks and rays
    const sticksGroup = new THREE.Group();
    scene.add(sticksGroup);
    sticksGroupRef.current = sticksGroup;

    const raysGroup = new THREE.Group();
    scene.add(raysGroup);
    raysGroupRef.current = raysGroup;

    // Initial draw of board texture
    redrawBoardTexture();

    // Render loop
    const animate = () => {
      animFrameId.current = requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();

    // Resize observer
    const handleResize = () => {
      if (!container || !rendererRef.current || !cameraRef.current) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animFrameId.current) cancelAnimationFrame(animFrameId.current);
      renderer.dispose();
    };
  }, [board.widthCm, board.heightCm, board.gridSpacingCm, light.mode, redrawBoardTexture, updateCameraPosition]);

  // Update light position in 3D scene
  useEffect(() => {
    const posX = light.xCm;
    const posY = light.zCm; // vertical altitude
    const posZ = light.yCm; // horizontal depth

    if (pointLightRef.current) {
      pointLightRef.current.position.set(posX, posY, posZ);
      pointLightRef.current.intensity = lightIntensity * 3.5;
    }
    if (lightMeshRef.current) {
      lightMeshRef.current.position.set(posX, posY, posZ);
    }
  }, [light, lightIntensity]);

  // Re-render board texture whenever sticks, light or guides toggle changes
  useEffect(() => {
    redrawBoardTexture();
  }, [redrawBoardTexture]);

  // Rebuild 3D sticks & rays whenever sticks data or settings change
  useEffect(() => {
    if (!sticksGroupRef.current || !raysGroupRef.current || !sceneRef.current) return;

    // Clear previous sticks
    while (sticksGroupRef.current.children.length > 0) {
      const obj = sticksGroupRef.current.children[0];
      sticksGroupRef.current.remove(obj);
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m) => m.dispose());
        } else {
          obj.material.dispose();
        }
      }
    }

    // Clear previous rays
    while (raysGroupRef.current.children.length > 0) {
      const obj = raysGroupRef.current.children[0];
      raysGroupRef.current.remove(obj);
      if (obj instanceof THREE.Line) {
        obj.geometry.dispose();
        obj.material.dispose();
      }
    }

    const stickRadius = (board.stickDiameterMm / 10) / 2; // cm

    // Natural wood birch/bamboo dowel material
    const woodMat = new THREE.MeshStandardMaterial({
      color: 0xc8965a,
      roughness: 0.65,
      metalness: 0.05,
    });

    const lightPos = new THREE.Vector3(light.xCm, light.zCm, light.yCm);
    const rayMaterial = new THREE.LineBasicMaterial({
      color: 0xf59e0b,
      transparent: true,
      opacity: 0.22,
    });

    // Generate sticks
    sticks.forEach((s) => {
      const height = s.heightCm;
      // Cylinder geometry: height along Y, centered at Y=0
      const cylinderGeo = new THREE.CylinderGeometry(stickRadius, stickRadius, height, 12);
      const stickMesh = new THREE.Mesh(cylinderGeo, woodMat);

      // Position stick so base sits exactly at ground (Y = 0)
      // Stick center is at Y = height / 2
      stickMesh.position.set(s.xCm, height / 2, s.yCm);
      stickMesh.castShadow = true;
      stickMesh.receiveShadow = false;
      stickMesh.userData = { stickData: s };

      sticksGroupRef.current?.add(stickMesh);

      // Optional light rays
      if (showRays) {
        const tipPos = new THREE.Vector3(s.xCm, height, s.yCm);
        const shadowTipPos = new THREE.Vector3(
          s.shadowTipXCm,
          light.mode === 'ground' ? 0.02 : s.shadowLengthCm,
          s.shadowTipYCm
        );

        const rayPoints = [lightPos, tipPos, shadowTipPos];
        const rayGeo = new THREE.BufferGeometry().setFromPoints(rayPoints);
        const rayLine = new THREE.Line(rayGeo, rayMaterial);
        raysGroupRef.current?.add(rayLine);
      }
    });
  }, [sticks, board.stickDiameterMm, light, showRays]);

  // Mouse interaction for orbit and hovering
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    isOrbiting.current = true;
    prevMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isOrbiting.current) {
      const dx = e.clientX - prevMousePos.current.x;
      const dy = e.clientY - prevMousePos.current.y;
      prevMousePos.current = { x: e.clientX, y: e.clientY };

      cameraOrbit.current.theta -= dx * 0.008;
      cameraOrbit.current.phi = Math.max(0.08, Math.min(Math.PI / 2 - 0.05, cameraOrbit.current.phi - dy * 0.008));
      updateCameraPosition();
      return;
    }

    // Raycasting for stick hover inspection
    if (!rendererRef.current || !cameraRef.current || !sticksGroupRef.current) return;
    const rect = rendererRef.current.domElement.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1
    );

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, cameraRef.current);
    const intersects = raycaster.intersectObjects(sticksGroupRef.current.children);

    if (intersects.length > 0) {
      const data = intersects[0].object.userData.stickData as StickData | undefined;
      if (data) setHoveredStick(data);
    } else {
      setHoveredStick(null);
    }
  };

  const handlePointerUp = () => {
    isOrbiting.current = false;
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    cameraOrbit.current.radius = Math.max(
      8,
      Math.min(100, cameraOrbit.current.radius + (e.deltaY > 0 ? 2 : -2))
    );
    updateCameraPosition();
  };

  // Group counts for UI summary
  const featureCounts: Record<string, number> = {};
  for (const s of sticks) {
    const g = s.group || 'General';
    featureCounts[g] = (featureCounts[g] || 0) + 1;
  }

  return (
    <div className="bg-neutral-900/90 border border-neutral-800 rounded-xl p-5 shadow-xl flex flex-col gap-4 relative">
      {/* Header Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-neutral-800">
        <div>
          <h2 className="text-lg font-semibold text-neutral-100 flex items-center gap-2">
            <Eye className="w-5 h-5 text-amber-400" />
            3D Simulation &amp; Real-time Cast Shadow
          </h2>
          <p className="text-xs text-neutral-400 mt-0.5">
            Physical vertical wooden sticks cast shadows under overhead light to reveal the panda, with two circular holes of light in the eyes.
          </p>
        </div>

        {/* View & Display Controls */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <button
            onClick={() => setCameraView('panda-face')}
            className="px-3 py-1.5 bg-amber-500 text-neutral-950 font-bold rounded-lg transition hover:bg-amber-400 shadow flex items-center gap-1.5 cursor-pointer"
            title="Orient view directly looking down onto the panda artwork"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Panda Shadow Art (Top-Down)
          </button>
          <button
            onClick={() => setCameraView('gallery')}
            className="px-2.5 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg transition cursor-pointer flex items-center gap-1"
          >
            <Compass className="w-3.5 h-3.5 text-neutral-400" />
            Gallery Angled
          </button>
          <button
            onClick={() => setCameraView('light')}
            className="px-2.5 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 rounded-lg transition flex items-center gap-1 cursor-pointer"
            title="View from the overhead lamp"
          >
            <Zap className="w-3 h-3" />
            Overhead Light
          </button>

          <div className="h-4 w-px bg-neutral-700 mx-1" />

          <button
            onClick={() => setShowRays(!showRays)}
            className={`px-2.5 py-1.5 rounded-lg transition text-xs flex items-center gap-1 cursor-pointer ${
              showRays
                ? 'bg-neutral-700 text-amber-300 font-medium border border-amber-500/40'
                : 'bg-neutral-800 text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Light Rays
          </button>

          <button
            onClick={() => setShowGuideCurves(!showGuideCurves)}
            className={`px-2.5 py-1.5 rounded-lg transition text-xs flex items-center gap-1 cursor-pointer ${
              showGuideCurves
                ? 'bg-pink-500/20 text-pink-300 font-medium border border-pink-500/40'
                : 'bg-neutral-800 text-neutral-400 hover:text-neutral-200'
            }`}
            title="Pink lines are construction guides for stick placement only (omitted from final artwork by default)"
          >
            <Layers className="w-3.5 h-3.5" />
            {showGuideCurves ? 'Guide Curves (Pink): ON' : 'Guide Curves: OFF'}
          </button>
        </div>
      </div>

      {/* Feature Breakdown Badge Row */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-lg bg-neutral-950/70 border border-neutral-800/80 text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-neutral-400 text-[11px] font-medium">Vertical Stick Placement:</span>
          {Object.entries(featureCounts).map(([feature, count]) => (
            <span
              key={feature}
              className="px-2 py-0.5 rounded bg-neutral-900 border border-neutral-700/80 text-[11px] text-neutral-200"
            >
              <strong className="text-amber-400">{feature}:</strong> {count} sticks
            </span>
          ))}
        </div>
        <span className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-pulse" />
          Eye Pupil Holes: 2 Unshadowed Light Apertures
        </span>
      </div>

      {/* 3D Viewport */}
      <div
        ref={mountRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onWheel={handleWheel}
        className="w-full h-[470px] rounded-xl overflow-hidden cursor-grab active:cursor-grabbing relative bg-neutral-950 border border-neutral-800/80 select-none"
      >
        {/* Hover Inspector Card */}
        {hoveredStick && (
          <div className="absolute top-4 left-4 z-10 bg-neutral-900/95 border border-amber-500/50 p-3 rounded-lg shadow-xl backdrop-blur-sm text-xs pointer-events-none">
            <div className="flex items-center justify-between gap-4 font-bold text-amber-400 pb-1 border-b border-neutral-800">
              <span>Stick #{hoveredStick.id} ({hoveredStick.group || 'General'})</span>
              <span className="font-mono text-neutral-100 bg-amber-500/20 px-1.5 py-0.5 rounded">
                {hoveredStick.heightCm.toFixed(1)} cm
              </span>
            </div>
            <div className="mt-1.5 space-y-0.5 text-neutral-300 text-[11px]">
              <div>
                Base Hole: <span className="text-neutral-100 font-mono">X: {hoveredStick.xCm}cm, Y: {hoveredStick.yCm}cm</span>
              </div>
              <div>
                Shadow Length: <span className="text-amber-400/90 font-mono">{hoveredStick.shadowLengthCm} cm</span>
              </div>
              <div>
                Shadow Tip: <span className="text-neutral-400 font-mono">({hoveredStick.shadowTipXCm}, {hoveredStick.shadowTipYCm}) cm</span>
              </div>
            </div>
          </div>
        )}

        {/* Viewport Floating Hints */}
        <div className="absolute bottom-3 left-4 text-[11px] text-neutral-400 bg-neutral-900/85 px-3 py-1.5 rounded-lg border border-neutral-800 pointer-events-none backdrop-blur-sm">
          Left Drag: Orbit &bull; Scroll: Zoom &bull; Hover sticks to inspect height
        </div>

        {/* Total Sticks & Shadow Badge */}
        <div className="absolute top-4 right-4 bg-neutral-900/90 px-3 py-1.5 rounded-lg border border-neutral-800 text-xs text-neutral-300 flex items-center gap-2 shadow">
          <span>Total Sticks: <strong className="text-amber-400 font-mono">{sticks.length}</strong></span>
          <span className="text-neutral-600">&bull;</span>
          <span className="text-neutral-400">Fixed Light: <span className="text-neutral-200 font-mono">({light.xCm}, {light.yCm}, {light.zCm})cm</span></span>
        </div>
      </div>
    </div>
  );
};
