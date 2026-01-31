
export enum ShapeType {
  SPHERE = 'SPHERE',
  BOX = 'BOX',
  TORUS = 'TORUS',
  DODECAHEDRON = 'DODECAHEDRON',
  PARTICLES = 'PARTICLES',
  SLIME = 'SLIME',
  RING = 'RING',
  COMPLEX = 'COMPLEX',
  LEVITROPE = 'LEVITROPE',
  VOXEL = 'VOXEL',
  PIXEL_GRID = 'PIXEL_GRID',
  PARTICLE_FIELD = 'PARTICLE_FIELD',
  ENVIRONMENT = 'ENVIRONMENT',
  HOUSEHOLD = 'HOUSEHOLD'
}

export type CameraMode = 'ORBIT' | 'DRONE' | 'MACRO' | 'CINEMATIC_PAN' | 'ZOOM_PULSE' | 'INTERACTIVE' | 'STATIC_WIDE' | 'PUSH_IN' | 'DOLLY_ZOOM' | 'TRACKING_ARC' | 'HANDHELD';

export type MusicStyle = 'SAKAMOTO' | 'ELECTRONIC' | 'GLITCH' | 'AMBIENT';

export interface SimulationParams {
  shapeType: ShapeType;
  colorPalette: string[];
  rotationSpeed: number;
  mutationScale: number;
  complexity: number;
  roughness: number;
  metalness: number;
  ior: number;
  clearcoat: number;
  transmission: number;
  thickness: number;
  viscosity: number;
  reflectivity: number;
  wireframe: boolean;
  bloomIntensity: number;
  environmentType: string;
  cameraMode: CameraMode;
  attenuationColor: string;
  attenuationDistance: number;
  anisotropy: number;
  anisotropyRotation: number;
  specularIntensity: number;
  specularColor: string;
  emissiveColor: string;
  emissiveIntensity: number;
  audioReactivity: number;
  levitationScale: number;
  backgroundKeywords?: string;
  particleDensity: number;
  voxelScale: number;
  shadowIntensity: number;
  objectCount: number;
  fusionFactor: number; // 0 to 1, how much objects cluster/fuse
  iridescenceIntensity?: number; // 薄膜干渉（虹色反射）の強度 0.0-1.0
}

export interface SoundParams {
  baseFrequency: number;
  oscillatorType: 'sine' | 'square' | 'sawtooth' | 'triangle';
  filterFrequency: number;
  reverbWetness: number;
  distortionAmount: number;
  attack: number;
  release: number;
  rhythmSpeed: number;
  musicalScale: number[];
  harmonyType: 'CHORD' | 'MELODY' | 'AMBIENT';
  musicStyle?: MusicStyle;
  glitchAmount: number;
  // 坂本龍一⇔小室哲哉スタイルクロスフェード
  styleRatio?: number;      // 0.0 = 坂本 (Ambient/Piano), 1.0 = 小室 (Trance/Synth)
  bpm?: number;             // 60-180
  gateIntensity?: number;   // トランスゲートの深さ 0.0-1.0
}

export interface AISimulationResponse {
  simulation: SimulationParams;
  sound: SoundParams;
  description: string;
  imagePrompt: string;
  backgroundImageUrl?: string;
}
