
import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { SAOPass } from 'three/addons/postprocessing/SAOPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { SimulationParams, ShapeType, RenderMode } from '../types';
import { audioEngine } from '../services/audioEngine';

interface Visualizer3DProps {
  params: SimulationParams;
  backgroundUrl?: string;
}

// === Curl Noise for flow field (落合的「流れ場」) ===
// X4008警告防止: ゼロベクトルの正規化を回避
const curlNoise = (x: number, y: number, z: number, time: number): THREE.Vector3 => {
  const eps = 0.01;
  const n1 = noise3D(x, y + eps, z, time) - noise3D(x, y - eps, z, time);
  const n2 = noise3D(x, y, z + eps, time) - noise3D(x, y, z - eps, time);
  const n3 = noise3D(x + eps, y, z, time) - noise3D(x - eps, y, z, time);
  const n4 = noise3D(x, y, z + eps, time) - noise3D(x, y, z - eps, time);
  const n5 = noise3D(x, y + eps, z, time) - noise3D(x, y - eps, z, time);
  const n6 = noise3D(x + eps, y, z, time) - noise3D(x - eps, y, z, time);

  const result = new THREE.Vector3(
    (n1 - n2) / (2 * eps),
    (n3 - n4) / (2 * eps),
    (n5 - n6) / (2 * eps)
  );

  // ゼロベクトル除算防止: 長さが非常に小さい場合はデフォルトベクトルを返す
  const len = result.length();
  if (len < 0.0001) {
    return new THREE.Vector3(0, 1, 0); // デフォルトの上方向
  }
  return result.normalize();
};

// Simple 3D noise function
const noise3D = (x: number, y: number, z: number, t: number): number => {
  return Math.sin(x * 1.5 + t * 0.3) * Math.cos(y * 1.2 + t * 0.2) * Math.sin(z * 1.1 + t * 0.4) +
    Math.sin(x * 0.7 - t * 0.5) * Math.cos(z * 0.9 + t * 0.3) * 0.5;
};

// === Custom Transparent Theme Shader（テーマ画像透過マッピング + フレネル）===
const THEME_VERTEX_SHADER = `
varying vec3 vWorldPosition;
varying vec3 vWorldNormal;
varying vec2 vUv;
varying vec3 vViewDir;

void main() {
  vUv = uv;
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vWorldPosition = worldPos.xyz;
  vWorldNormal = normalize(mat3(modelMatrix) * normal);
  vViewDir = normalize(cameraPosition - worldPos.xyz);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const THEME_FRAGMENT_SHADER = `
precision highp float;

uniform sampler2D uThemeTexture;
uniform bool uHasTexture;
uniform float uTime;
uniform float uFresnelPower;
uniform float uTransmission;
uniform float uIridescence;
uniform float uMetalness;
uniform float uRoughness;
uniform vec3 uBaseColor;
uniform vec3 uEmissive;
uniform float uEmissiveIntensity;
uniform float uBandsLow;
uniform float uBandsMid;
uniform float uBandsHigh;
uniform vec3 uLightDir;
uniform float uIridescencePhase;
uniform float uIOR;

varying vec3 vWorldPosition;
varying vec3 vWorldNormal;
varying vec2 vUv;
varying vec3 vViewDir;

#define PI 3.14159265359
#define TAU 6.28318530718

float schlickFresnel(float cosT, float f0) {
  return f0 + (1.0 - f0) * pow(clamp(1.0 - cosT, 0.0, 1.0), uFresnelPower);
}

vec3 thinFilm(float cosT, float phase) {
  float d = cosT * 6.0;
  return vec3(
    sin(d * 2.0 + phase) * 0.5 + 0.5,
    sin(d * 2.0 + phase + TAU / 3.0) * 0.5 + 0.5,
    sin(d * 2.0 + phase + TAU * 2.0 / 3.0) * 0.5 + 0.5
  );
}

vec2 dirToEquirect(vec3 d) {
  return vec2(
    atan(d.z, d.x) / TAU + 0.5,
    asin(clamp(d.y, -1.0, 1.0)) / PI + 0.5
  );
}

void main() {
  vec3 N = normalize(vWorldNormal);
  if (!gl_FrontFacing) N = -N;
  vec3 V = normalize(vViewDir);
  float NdV = max(dot(N, V), 0.001);

  // Fresnel-Schlick
  float f0 = mix(0.04, 1.0, uMetalness);
  float F = schlickFresnel(NdV, f0);

  // Refraction / Reflection directions
  vec3 refractD = refract(-V, N, 1.0 / uIOR);
  if (length(refractD) < 0.001) refractD = -V; // total internal reflection fallback
  vec3 reflectD = reflect(-V, N);

  // Sample theme texture via equirectangular mapping
  vec3 txCol, rfCol;
  if (uHasTexture) {
    txCol = texture2D(uThemeTexture, dirToEquirect(refractD)).rgb;
    rfCol = texture2D(uThemeTexture, dirToEquirect(reflectD)).rgb;
  } else {
    // Procedural dark gradient fallback
    float g = dot(reflectD, vec3(0.0, 1.0, 0.0)) * 0.5 + 0.5;
    rfCol = mix(vec3(0.02, 0.02, 0.06), vec3(0.1, 0.08, 0.15), g);
    txCol = rfCol * 0.6;
  }

  // Thin-film iridescence（薄膜干渉）
  vec3 iri = thinFilm(NdV, uIridescencePhase);

  // Simplified PBR lighting
  vec3 L = normalize(uLightDir);
  float NdL = max(dot(N, L), 0.0);
  vec3 H = normalize(V + L);
  float NdH = max(dot(N, H), 0.0);
  float sp = exp2(10.0 * (1.0 - uRoughness));
  float spec = pow(NdH, sp) * (sp + 2.0) / 8.0;

  // Transmission factor（音声反応性あり）
  float trans = (1.0 - F) * uTransmission;
  trans += uBandsLow * 0.15;
  trans = clamp(trans, 0.0, 1.0);

  // Combine: Fresnel blends refraction vs reflection
  vec3 col = mix(txCol, rfCol, F);
  col = mix(col, col * iri, uIridescence + uBandsMid * 0.2);
  col += uBaseColor * NdL * (1.0 - uMetalness) * 0.2;
  col += spec * mix(vec3(1.0), uBaseColor, uMetalness) * 0.4;
  col += uEmissive * uEmissiveIntensity;
  col += iri * uBandsHigh * 0.12;
  col += uBaseColor * 0.03;

  // Alpha: perpendicular = transparent, grazing = opaque
  float a = mix(1.0 - trans, 1.0, F);
  a = clamp(a, 0.1, 0.95);

  gl_FragColor = vec4(col, a);
}
`;

// 1x1 fallback texture for shader when no theme image loaded
const createDefaultTexture = (): THREE.DataTexture => {
  const data = new Uint8Array([10, 10, 30, 255]);
  const tex = new THREE.DataTexture(data, 1, 1, THREE.RGBAFormat);
  tex.needsUpdate = true;
  return tex;
};

const Visualizer3D: React.FC<Visualizer3DProps> = ({ params, backgroundUrl }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const composerRef = useRef<EffectComposer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const mainLightRef = useRef<THREE.DirectionalLight | null>(null);
  const dynamicLightsRef = useRef<THREE.PointLight[]>([]);
  const meshRef = useRef<THREE.Object3D | null>(null);
  const particleSystemRef = useRef<THREE.Points | null>(null);
  const clockRef = useRef(new THREE.Clock());
  const reflectionProbeRef = useRef<THREE.CubeCamera | null>(null);
  const backgroundTextureRef = useRef<THREE.Texture | null>(null);
  // 遠景リング（場の境界）
  const fieldRingsRef = useRef<THREE.Mesh[]>([]);
  // 薄膜干渉の位相オフセット（動的虹色）
  const iridescencePhaseRef = useRef(0);
  // カスタムシェーダー用デフォルトテクスチャ
  const defaultTextureRef = useRef<THREE.DataTexture>(createDefaultTexture());

  const paramsRef = useRef(params);
  const originalPositionsMap = useRef<Map<THREE.Mesh, Float32Array>>(new Map());

  useEffect(() => {
    paramsRef.current = params;
    if (cameraRef.current && params.cameraMode !== 'INTERACTIVE') {
      const angle = Math.random() * Math.PI * 2;
      const radius = 35 + Math.random() * 10;
      cameraRef.current.position.set(Math.sin(angle) * radius, 20, Math.cos(angle) * radius);
      cameraRef.current.lookAt(0, 0, 0);
    }
    if (mainLightRef.current) mainLightRef.current.intensity = params.shadowIntensity ?? 1.5;
  }, [params]);

  useEffect(() => {
    if (!sceneRef.current || !backgroundUrl) return;
    new THREE.TextureLoader().load(backgroundUrl, (texture) => {
      texture.mapping = THREE.EquirectangularReflectionMapping;
      texture.colorSpace = THREE.SRGBColorSpace;
      backgroundTextureRef.current = texture;
      if (sceneRef.current) {
        sceneRef.current.background = texture;
        sceneRef.current.environment = texture;
      }
      // カスタムシェーダーマテリアルのテクスチャを更新
      if (meshRef.current) {
        meshRef.current.traverse(child => {
          if (child instanceof THREE.Mesh && child.material instanceof THREE.ShaderMaterial && child.material.uniforms.uThemeTexture) {
            child.material.uniforms.uThemeTexture.value = texture;
            child.material.uniforms.uHasTexture.value = true;
          }
        });
      }
      console.log("✅ Background texture loaded and applied (PBR + Shader)");
    });
  }, [backgroundUrl]);

  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050510); // より深い暗色（床/重力感を排除）
    scene.fog = new THREE.FogExp2(0x050510, 0.006); // 薄い霧（空間の奥行き）
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 10000);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.shadowMap.enabled = true;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // === ポストプロセス（落合的「にじみ」）===
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));

    const saoPass = new SAOPass(scene, camera);
    saoPass.params.saoBias = 0.5;
    saoPass.params.saoIntensity = 0.003;
    composer.addPass(saoPass);

    // 弱く・広いBloom（にじみ）
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.15,  // 強度：弱め
      0.8,   // 半径：広め
      0.9    // 閾値：高め
    );
    composer.addPass(bloomPass);

    composer.addPass(new OutputPass());
    composerRef.current = composer;

    // === ライティング（落合的「境界の可視化」）===
    const ambientLight = new THREE.AmbientLight(0x303050, 0.3);
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 1.5);
    mainLight.position.set(50, 100, 50);
    scene.add(mainLight);
    mainLightRef.current = mainLight;

    // リムライト（縁を光らせる）
    const rimLight = new THREE.DirectionalLight(0x6688ff, 0.8);
    rimLight.position.set(-30, 20, -40);
    scene.add(rimLight);

    // Dynamic colored lights
    const colors = [0xeeeeff, 0x88ccff, 0xffaaff, 0xaaffff];
    colors.forEach(c => {
      const p = new THREE.PointLight(c, 0, 80);
      scene.add(p);
      dynamicLightsRef.current.push(p);
    });

    const hemiLight = new THREE.HemisphereLight(0x4466aa, 0x111122, 0.4);
    scene.add(hemiLight);

    // Reflection probe
    const cubeRenderTarget = new THREE.WebGLCubeRenderTarget(512, { format: THREE.RGBAFormat, generateMipmaps: true });
    const cubeCamera = new THREE.CubeCamera(0.1, 1000, cubeRenderTarget);
    scene.add(cubeCamera);
    reflectionProbeRef.current = cubeCamera;

    // === 遠景リング（場の境界）===
    for (let i = 0; i < 3; i++) {
      const ringGeo = new THREE.TorusGeometry(80 + i * 30, 0.3 - i * 0.05, 16, 128);
      const ringMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color().setHSL(0.6 + i * 0.1, 0.3, 0.2),
        transparent: true,
        opacity: 0.15 - i * 0.03,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = Math.PI / 2 + i * 0.2;
      ring.rotation.z = i * 0.3;
      scene.add(ring);
      fieldRingsRef.current.push(ring);
    }

    // === 音声解析用の周波数帯分離 ===
    const getFrequencyBands = (audioData: Uint8Array | null) => {
      if (!audioData || audioData.length === 0) return { low: 0, mid: 0, high: 0 };
      const len = audioData.length;
      const lowEnd = Math.floor(len * 0.15);
      const midEnd = Math.floor(len * 0.5);

      let lowSum = 0, midSum = 0, highSum = 0;
      for (let i = 0; i < lowEnd; i++) lowSum += audioData[i];
      for (let i = lowEnd; i < midEnd; i++) midSum += audioData[i];
      for (let i = midEnd; i < len; i++) highSum += audioData[i];

      return {
        low: lowSum / (lowEnd * 255),
        mid: midSum / ((midEnd - lowEnd) * 255),
        high: highSum / ((len - midEnd) * 255),
      };
    };

    const animate = () => {
      const cp = paramsRef.current;
      if (!cp) return;

      requestAnimationFrame(animate);
      const time = clockRef.current.getElapsedTime();
      const audioData = audioEngine.getAnalyserData();
      const bands = getFrequencyBands(audioData);

      // 薄膜干渉の位相を「走らせる」（落合的虹色の動き）
      iridescencePhaseRef.current += 0.002 + bands.mid * 0.01;

      // === 呼吸（低周波：0.1Hz〜0.2Hz）===
      const breathe = Math.sin(time * 0.15) * 0.3 + Math.sin(time * 0.08) * 0.2;

      // Dynamic lights（縁を強調）
      dynamicLightsRef.current.forEach((l, i) => {
        const angle = time * 0.3 + i * (Math.PI * 2 / 4);
        l.position.set(Math.sin(angle) * 30, 15 + Math.sin(time * 0.5) * 8, Math.cos(angle) * 30);
        l.intensity = 50 + bands.mid * 150 * cp.audioReactivity;
      });

      // === 遠景リングの回転（場の壁）===
      fieldRingsRef.current.forEach((ring, i) => {
        ring.rotation.z += 0.001 * (i + 1);
        ring.rotation.x += 0.0005 * (3 - i);
      });

      // === メッシュアニメーション（Curl Noiseによる流れ場＋融合感）===
      if (meshRef.current) {
        meshRef.current.traverse(child => {
          if (child instanceof THREE.Mesh) {
            const originalPos = originalPositionsMap.current.get(child);
            if (originalPos) {
              const posAttr = child.geometry.getAttribute('position') as THREE.BufferAttribute;
              const mutation = cp.mutationScale || 5;
              const visc = cp.viscosity || 0.8;
              const viscTime = time * (1.2 - visc * 0.8);

              // 低域で融合度を制御（smooth unionの疑似表現）
              const fusionFactor = 0.8 + bands.low * 0.5;

              for (let i = 0; i < posAttr.count; i++) {
                const ix = originalPos[i * 3], iy = originalPos[i * 3 + 1], iz = originalPos[i * 3 + 2];
                const dist = Math.sqrt(ix * ix + iy * iy + iz * iz);

                // === Curl Noise による流れ場（方向の一貫性）===
                const curl = curlNoise(ix * 0.1, iy * 0.1, iz * 0.1, viscTime * 0.3);
                const flowStrength = 0.8 + bands.mid * 1.5;

                // === 呼吸（膨張収縮）===
                const breatheDisp = breathe * (1 + bands.low * 2);

                // === 流体的な波（粘菌的融合）===
                const wave1 = Math.sin(dist * 0.25 - viscTime * 0.6) * fusionFactor * 0.4;
                const wave2 = Math.sin(ix * 0.4 + iy * 0.3 - viscTime) * Math.cos(iz * 0.35 + viscTime * 0.5) * 0.3;
                const wave3 = Math.sin(dist * 0.12 + viscTime * 0.2) * 0.25; // 大きなうねり

                // === 微細振動（高域で粗さだけ震える）===
                const microTremor = bands.high * Math.sin(time * 20 + dist * 2) * 0.05;

                const norm = new THREE.Vector3(ix, iy, iz).normalize();
                const totalDisp = (wave1 + wave2 + wave3 + breatheDisp) * mutation * 0.35 + microTremor;

                // Curl Noise の流れを加算
                posAttr.setXYZ(i,
                  ix + norm.x * totalDisp + curl.x * flowStrength * 0.3,
                  iy + norm.y * totalDisp + curl.y * flowStrength * 0.3,
                  iz + norm.z * totalDisp + curl.z * flowStrength * 0.3
                );
              }
              posAttr.needsUpdate = true;
              child.geometry.computeVertexNormals();
            }

            // === マテリアル動的更新 ===
            if (child.material instanceof THREE.MeshPhysicalMaterial) {
              // PBRモード: 粗さをノイズで揺らす（一様でない金属感）
              const roughnessNoise = 0.15 + Math.sin(time * 0.5) * 0.1 + bands.high * 0.15;
              child.material.roughness = Math.max(0.05, Math.min(0.35, roughnessNoise));

              // 薄膜干渉の強度を動的に（中域で膜の厚み）
              const iridescenceDynamic = 0.4 + Math.sin(iridescencePhaseRef.current) * 0.3 + bands.mid * 0.2;
              child.material.iridescence = Math.max(0.3, Math.min(0.8, iridescenceDynamic));
            } else if (child.material instanceof THREE.ShaderMaterial && child.material.uniforms.uTime) {
              // TRANSPARENT_THEMEモード: シェーダーuniform更新
              const u = child.material.uniforms;
              u.uTime.value = time;
              u.uBandsLow.value = bands.low;
              u.uBandsMid.value = bands.mid;
              u.uBandsHigh.value = bands.high;
              u.uIridescencePhase.value = iridescencePhaseRef.current;
              // 動的な粗さ変動
              u.uRoughness.value = Math.max(0.05, Math.min(0.35, 0.15 + Math.sin(time * 0.5) * 0.1 + bands.high * 0.15));
              // 動的な虹色強度
              u.uIridescence.value = Math.max(0.2, Math.min(0.9, 0.4 + Math.sin(iridescencePhaseRef.current) * 0.3 + bands.mid * 0.2));
            }

            // 浮遊（重力からの解放）
            child.position.y = (child.userData.initialY || 0) + Math.sin(time * 0.3 + child.userData.offset) * cp.levitationScale * 1.5;
          }
        });
        meshRef.current.rotation.y += cp.rotationSpeed * 0.008;
      }

      // === パーティクルアニメーション（空気の可視化）===
      if (particleSystemRef.current) {
        particleSystemRef.current.rotation.y = time * 0.03;
        particleSystemRef.current.rotation.x = Math.sin(time * 0.02) * 0.08;

        // パーティクルも呼吸に同期
        const scale = 1 + breathe * 0.1;
        particleSystemRef.current.scale.setScalar(scale);
      }

      // === カメラ（ゆっくりした視差 + 遅延追従）===
      if (cameraRef.current) {
        const baseSpeed = 0.05 + Math.sin(time * 0.008) * 0.015;
        const orbitRadius = 38 + Math.sin(time * 0.1) * 8;

        const angleOffset = Math.sin(time * 0.02) * 0.4 + Math.sin(time * 0.05) * 0.2;
        cameraRef.current.position.x = Math.sin(time * baseSpeed + angleOffset) * orbitRadius;
        cameraRef.current.position.z = Math.cos(time * baseSpeed + angleOffset) * orbitRadius;

        // Y軸：床を感じさせない高さ変化
        const baseY = 12;
        const yVariation = Math.sin(time * 0.08) * 8 + Math.sin(time * 0.03) * 4;
        cameraRef.current.position.y = baseY + yVariation + bands.low * 3;

        // 注視点は少し遅れて追従（parallax）
        const lookDelay = 0.15;
        const lookX = Math.sin((time - lookDelay) * 0.05) * 2;
        const lookY = Math.sin((time - lookDelay) * 0.07) * 1.5;
        cameraRef.current.lookAt(lookX, lookY, lookX * 0.3);
      }

      if (reflectionProbeRef.current && rendererRef.current && sceneRef.current) {
        reflectionProbeRef.current.update(rendererRef.current, sceneRef.current);
      }
      composerRef.current?.render();
    };

    animate();
    return () => {
      renderer.dispose();
      audioEngine.stopRhythm();
    };
  }, []);

  useEffect(() => {
    if (!sceneRef.current || !params) return;
    if (meshRef.current) sceneRef.current.remove(meshRef.current);
    originalPositionsMap.current.clear();

    // === 落合的マテリアル（薄膜干渉×濡れた金属）===
    // X4122/X4008警告防止: 全ての値をサニタイズ
    const createMaterial = () => {
      // 値のクランプ関数（シェーダー警告防止）
      const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
      const safeValue = (v: number | undefined, fallback: number) => {
        const val = v ?? fallback;
        return isNaN(val) || !isFinite(val) ? fallback : val;
      };

      const iridescenceValue = clamp(safeValue(params.iridescenceIntensity, 0.5), 0.01, 1.0);
      const baseRoughness = clamp(0.1 + Math.random() * 0.15, 0.05, 0.35);
      const thickness = clamp(safeValue(params.thickness, 2), 0.1, 10);

      const mat = new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(params.colorPalette[0] || '#ccccdd').multiplyScalar(0.85),
        metalness: clamp(0.92 + Math.random() * 0.08, 0.9, 1.0),
        roughness: baseRoughness,
        transmission: 0.1,
        ior: 2.0,
        thickness: thickness,
        envMap: reflectionProbeRef.current?.renderTarget.texture,
        envMapIntensity: clamp(2.0 + iridescenceValue * 1.5, 0.1, 5.0),
        emissive: new THREE.Color(params.emissiveColor || '#0a0a15'),
        emissiveIntensity: 0.02,
        side: THREE.DoubleSide,
        // === クリアコート（上澄みの膜）===
        clearcoat: 0.9,
        clearcoatRoughness: 0.05,
        transparent: false,
        // === 薄膜干渉（落合的虹色）===
        iridescence: clamp(iridescenceValue * 0.8, 0.1, 0.8),
        iridescenceIOR: clamp(1.3 + Math.random() * 0.3, 1.1, 2.0),
        iridescenceThicknessRange: [100, clamp(350 + iridescenceValue * 300, 200, 800)],
        // === シーン（異方性反射）===
        sheen: clamp(iridescenceValue * 0.25, 0.01, 0.5),
        sheenRoughness: 0.25,
        sheenColor: new THREE.Color(params.colorPalette[2] || '#8888cc'),
      });

      if (backgroundTextureRef.current) {
        mat.envMap = backgroundTextureRef.current;
        mat.envMapIntensity = clamp(2.5 + iridescenceValue * 1.5, 0.1, 5.0);
      }

      return mat;
    };

    // === カスタムシェーダーマテリアル（テーマ画像透過 + フレネル）===
    const createThemeMaterial = () => {
      const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
      const safeValue = (v: number | undefined, fallback: number) => {
        const val = v ?? fallback;
        return isNaN(val) || !isFinite(val) ? fallback : val;
      };

      const hasTexture = !!backgroundTextureRef.current;
      const themeTexture = backgroundTextureRef.current || defaultTextureRef.current;

      return new THREE.ShaderMaterial({
        uniforms: {
          uThemeTexture: { value: themeTexture },
          uHasTexture: { value: hasTexture },
          uTime: { value: 0.0 },
          uFresnelPower: { value: clamp(safeValue(params.fresnelPower, 3.0), 1.0, 5.0) },
          uTransmission: { value: clamp(safeValue(params.transparencyLevel, 0.6), 0.0, 1.0) },
          uIridescence: { value: clamp(safeValue(params.iridescenceIntensity, 0.5), 0.0, 1.0) },
          uMetalness: { value: clamp(params.metalness ?? 0.3, 0.0, 1.0) },
          uRoughness: { value: clamp(params.roughness ?? 0.15, 0.0, 1.0) },
          uBaseColor: { value: new THREE.Color(params.colorPalette[0] || '#ccccdd') },
          uEmissive: { value: new THREE.Color(params.emissiveColor || '#0a0a15') },
          uEmissiveIntensity: { value: params.emissiveIntensity ?? 0.02 },
          uBandsLow: { value: 0.0 },
          uBandsMid: { value: 0.0 },
          uBandsHigh: { value: 0.0 },
          uLightDir: { value: new THREE.Vector3(50, 100, 50).normalize() },
          uIridescencePhase: { value: 0.0 },
          uIOR: { value: clamp(params.ior ?? 1.5, 1.0, 3.0) },
        },
        vertexShader: THEME_VERTEX_SHADER,
        fragmentShader: THEME_FRAGMENT_SHADER,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: true,
        depthTest: true,
      });
    };

    // === 形状生成（2〜5の核が融合する設計）===
    const getGeometry = (type: ShapeType): THREE.BufferGeometry => {
      const size = 4 + Math.random() * 4;

      switch (type) {
        case ShapeType.LEVITROPE: {
          // メタボール的：複数の球が融合（近似）
          const base = new THREE.SphereGeometry(size, 64, 64);
          return base;
        }
        case ShapeType.SLIME: {
          return new THREE.SphereGeometry(size, 48, 48);
        }
        case ShapeType.SPHERE: {
          return new THREE.SphereGeometry(size, 48, 48);
        }
        case ShapeType.BOX: {
          return new THREE.BoxGeometry(size, size, size, 16, 16, 16);
        }
        case ShapeType.TORUS: {
          return new THREE.TorusGeometry(size, size * 0.35, 32, 64);
        }
        case ShapeType.DODECAHEDRON: {
          return new THREE.DodecahedronGeometry(size, 4);
        }
        case ShapeType.RING: {
          return new THREE.TorusGeometry(size, size * 0.12, 32, 128);
        }
        case ShapeType.COMPLEX: {
          return new THREE.TorusKnotGeometry(size, size * 0.25, 200, 48);
        }
        case ShapeType.VOXEL: {
          return new THREE.BoxGeometry(size, size, size, 16, 16, 16);
        }
        case ShapeType.PARTICLES: {
          return new THREE.IcosahedronGeometry(size * 0.5, 3);
        }
        case ShapeType.PIXEL_GRID: {
          return new THREE.PlaneGeometry(size * 2, size * 2, 32, 32);
        }
        case ShapeType.PARTICLE_FIELD: {
          return new THREE.IcosahedronGeometry(size * 0.3, 2);
        }
        case ShapeType.ENVIRONMENT: {
          return new THREE.SphereGeometry(size * 2, 64, 64);
        }
        case ShapeType.HOUSEHOLD: {
          const r = Math.random();
          if (r < 0.15) {
            const seat = new THREE.BoxGeometry(4, 0.5, 4, 8, 2, 8);
            const back = new THREE.BoxGeometry(4, 4, 0.5, 8, 8, 2); back.translate(0, 2.2, -1.8);
            const leg = new THREE.BoxGeometry(0.3, 3, 0.3, 2, 8, 2);
            const l1 = leg.clone(); l1.translate(1.8, -1.5, 1.8);
            const l2 = leg.clone(); l2.translate(-1.8, -1.5, 1.8);
            const l3 = leg.clone(); l3.translate(1.8, -1.5, -1.8);
            const l4 = leg.clone(); l4.translate(-1.8, -1.5, -1.8);
            return BufferGeometryUtils.mergeGeometries([seat, back, l1, l2, l3, l4]);
          } else if (r < 0.30) {
            const base = new THREE.CylinderGeometry(1.5, 2, 0.5, 24, 4);
            const stem = new THREE.CylinderGeometry(0.2, 0.2, 5, 12, 8); stem.translate(0, 2.5, 0);
            const shade = new THREE.ConeGeometry(2.5, 3, 24, 8, true); shade.translate(0, 5, 0);
            return BufferGeometryUtils.mergeGeometries([base, stem, shade]);
          } else if (r < 0.45) {
            const base = new THREE.BoxGeometry(8, 2, 3.5, 16, 4, 8);
            const back = new THREE.BoxGeometry(8, 2.5, 1, 16, 8, 2); back.translate(0, 2, -1.25);
            const arm = new THREE.BoxGeometry(1, 2, 3.5, 2, 4, 8);
            const a1 = arm.clone(); a1.translate(3.5, 1, 0);
            const a2 = arm.clone(); a2.translate(-3.5, 1, 0);
            return BufferGeometryUtils.mergeGeometries([base, back, a1, a2]);
          } else if (r < 0.60) {
            const body = new THREE.CylinderGeometry(2, 2, 4, 48, 16, true);
            const bottom = new THREE.CircleGeometry(2, 48); bottom.rotateX(Math.PI / 2); bottom.translate(0, -2, 0);
            const handle = new THREE.TorusGeometry(1.2, 0.3, 12, 32, Math.PI); handle.translate(2, 0, 0);
            return BufferGeometryUtils.mergeGeometries([body, bottom, handle]);
          } else {
            return new THREE.TorusGeometry(size, size * 0.35, 48, 96);
          }
        }
        default: {
          return new THREE.IcosahedronGeometry(size, 20);
        }
      }
    };

    // === 2〜5の核が融合する配置（落合的）===
    const group = new THREE.Group();
    const count = Math.min(Math.max(params.objectCount || 3, 2), 5); // 2〜5個
    const fusionRadius = 8; // 融合距離

    const useThemeShader = params.renderMode === 'TRANSPARENT_THEME';

    for (let i = 0; i < count; i++) {
      const geo = getGeometry(params.shapeType);
      const material = useThemeShader ? createThemeMaterial() : createMaterial();
      const mesh = new THREE.Mesh(geo, material);

      // 中央に集まりつつ少しオフセット（融合感）
      const angle = (i / count) * Math.PI * 2;
      const dist = fusionRadius * (0.3 + Math.random() * 0.4);
      mesh.position.set(
        Math.cos(angle) * dist,
        (Math.random() - 0.5) * 6,
        Math.sin(angle) * dist
      );
      mesh.userData = { initialY: mesh.position.y, offset: Math.random() * Math.PI * 2, index: i };
      originalPositionsMap.current.set(mesh, new Float32Array(geo.getAttribute('position')!.array));
      group.add(mesh);
    }
    meshRef.current = group;
    sceneRef.current.add(group);

    // === 微粒子パーティクルシステム（空気の可視化）===
    if (particleSystemRef.current) {
      sceneRef.current.remove(particleSystemRef.current);
    }

    const particleCount = 2000;
    const particleGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      const radius = 30 + Math.random() * 70;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);

      // 淡い色（白〜青〜紫）
      const hue = 0.55 + Math.random() * 0.15;
      const color = new THREE.Color().setHSL(hue, 0.3, 0.7 + Math.random() * 0.2);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;

      sizes[i] = 0.2 + Math.random() * 0.4;
    }

    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    particleGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const particleMaterial = new THREE.PointsMaterial({
      size: 0.35,
      vertexColors: true,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const particles = new THREE.Points(particleGeometry, particleMaterial);
    particleSystemRef.current = particles;
    sceneRef.current.add(particles);
    console.log("✅ Ochiai-style scene created with", count, "fusion cores and", particleCount, "particles");
  }, [params]);

  return <div ref={containerRef} className="absolute inset-0 z-0 overflow-hidden" />;
};

export default Visualizer3D;
