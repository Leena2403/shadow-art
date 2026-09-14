/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PresetImage } from '../types';

export const PRESET_IMAGES: PresetImage[] = [
  {
    id: 'panda',
    name: 'Panda (Ears, Eyes & Nose)',
    category: 'Shadow Art',
    hasPinkGuides: true,
    recommendedLight: {
      xCm: 10,
      yCm: 26,
      zCm: 18,
      mode: 'ground',
    },
    svgDataUri: `data:image/svg+xml;utf8,${encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
        <rect width="200" height="200" fill="#ffffff" />
        <!-- Left & Right Ears (Solid Black Shapes) -->
        <circle cx="48" cy="48" r="26" fill="#000000" />
        <circle cx="152" cy="48" r="26" fill="#000000" />
        
        <!-- Left Eye (Black Shape with One Circular Hole of Light Inside) -->
        <ellipse cx="68" cy="118" rx="26" ry="21" transform="rotate(-15 68 118)" fill="#000000" />
        <circle cx="73" cy="110" r="7" fill="#ffffff" />

        <!-- Right Eye (Black Shape with One Circular Hole of Light Inside) -->
        <ellipse cx="132" cy="118" rx="26" ry="21" transform="rotate(15 132 118)" fill="#000000" />
        <circle cx="127" cy="110" r="7" fill="#ffffff" />

        <!-- Cute Rounded Nose -->
        <path d="M91,135 Q100,132 109,135 Q105,147 100,148 Q95,147 91,135 Z" fill="#000000" />

        <!-- Pink Stick Guide Lines (Construction Guides for Vertical Stick Placement Only) -->
        <!-- Left Ear Top Arc -->
        <path d="M25,45 A26,26 0 0,1 69,27" fill="none" stroke="#ff2079" stroke-width="4" stroke-linecap="round" />
        <!-- Right Ear Top Arc -->
        <path d="M131,27 A26,26 0 0,1 175,45" fill="none" stroke="#ff2079" stroke-width="4" stroke-linecap="round" />
        <!-- Left Eye Top Arc -->
        <path d="M46,106 Q64,95 87,103" fill="none" stroke="#ff2079" stroke-width="4" stroke-linecap="round" />
        <!-- Left Eye Pupil Lower Arc (Guides stick placement beneath the circular light hole) -->
        <path d="M66,118 A7,7 0 0,0 80,118" fill="none" stroke="#ff2079" stroke-width="3" stroke-linecap="round" />
        <!-- Right Eye Top Arc -->
        <path d="M113,103 Q136,95 154,106" fill="none" stroke="#ff2079" stroke-width="4" stroke-linecap="round" />
        <!-- Right Eye Pupil Lower Arc (Guides stick placement beneath the circular light hole) -->
        <path d="M120,118 A7,7 0 0,0 134,118" fill="none" stroke="#ff2079" stroke-width="3" stroke-linecap="round" />
        <!-- Nose Top Line -->
        <path d="M91,134 L109,134" fill="none" stroke="#ff2079" stroke-width="4" stroke-linecap="round" />
      </svg>
    `)}`
  },
  {
    id: 'circle',
    name: 'Circle',
    category: 'Basic',
    svgDataUri: `data:image/svg+xml;utf8,${encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
        <rect width="200" height="200" fill="white" />
        <circle cx="100" cy="100" r="60" fill="black" />
      </svg>
    `)}`
  },
  {
    id: 'ring',
    name: 'Ring Outline',
    category: 'Basic',
    svgDataUri: `data:image/svg+xml;utf8,${encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
        <rect width="200" height="200" fill="white" />
        <circle cx="100" cy="100" r="60" fill="none" stroke="black" stroke-width="14" />
      </svg>
    `)}`
  },
  {
    id: 'hummingbird',
    name: 'Hummingbird',
    category: 'Nature',
    svgDataUri: `data:image/svg+xml;utf8,${encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
        <rect width="200" height="200" fill="white" />
        <path d="M40,70 Q70,75 100,90 Q120,60 145,55 Q135,75 125,95 Q150,110 165,135 Q140,125 115,120 Q105,145 95,170 Q95,140 85,115 Q65,110 40,70 Z" fill="black" />
        <path d="M40,70 L15,65 L35,72 Z" fill="black" />
        <circle cx="55" cy="74" r="3" fill="white" />
      </svg>
    `)}`
  },
  {
    id: 'wolf',
    name: 'Howling Wolf',
    category: 'Wildlife',
    svgDataUri: `data:image/svg+xml;utf8,${encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
        <rect width="200" height="200" fill="white" />
        <path d="M120,40 Q130,55 125,70 Q145,85 150,110 Q155,140 160,175 L80,175 Q85,145 90,130 Q70,140 60,160 L50,160 Q65,125 90,110 Q95,95 100,70 Q105,50 120,40 Z" fill="black" />
        <path d="M120,40 L140,30 L130,48 Z" fill="black" />
      </svg>
    `)}`
  },
  {
    id: 'cat',
    name: 'Cat Silhouette',
    category: 'Animals',
    svgDataUri: `data:image/svg+xml;utf8,${encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
        <rect width="200" height="200" fill="white" />
        <path d="M80,60 L75,35 L95,50 Q105,48 115,50 L135,35 L130,60 Q145,75 145,95 Q145,115 135,130 Q140,150 145,175 L75,175 Q75,150 80,130 Q65,115 65,95 Q65,75 80,60 Z" fill="black" />
        <path d="M145,160 Q175,150 170,120 Q165,100 150,115" fill="none" stroke="black" stroke-width="12" stroke-linecap="round" />
      </svg>
    `)}`
  },
  {
    id: 'heart_origami',
    name: 'Geometric Heart',
    category: 'Geometric',
    svgDataUri: `data:image/svg+xml;utf8,${encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
        <rect width="200" height="200" fill="white" />
        <polygon points="100,165 45,100 65,55 100,80 135,55 155,100" fill="black" stroke="black" stroke-width="4" stroke-linejoin="round" />
      </svg>
    `)}`
  },
  {
    id: 'rose',
    name: 'Botanical Rose',
    category: 'Art',
    svgDataUri: `data:image/svg+xml;utf8,${encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
        <rect width="200" height="200" fill="white" />
        <circle cx="100" cy="85" r="35" fill="black" />
        <path d="M85,85 C85,60 115,60 115,85 C115,105 85,105 85,85 Z" fill="white" />
        <circle cx="100" cy="85" r="12" fill="black" />
        <path d="M98,120 L98,175 L102,175 L102,120 Z" fill="black" />
        <path d="M102,140 Q130,130 135,150 Q115,155 102,145 Z" fill="black" />
        <path d="M98,150 Q70,140 65,160 Q85,165 98,155 Z" fill="black" />
      </svg>
    `)}`
  }
];
