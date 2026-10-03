import * as THREE from 'three';

/** Deterministic, local textures: no remote images or runtime network requests. */
function surfaceTexture(kind: 'weave' | 'grain' | 'fabric'): THREE.DataTexture {
  const side = 128, pixels = new Uint8Array(side * side * 4);
  for (let y = 0; y < side; y++) for (let x = 0; x < side; x++) {
    const hash = ((x * 73 + y * 151 + x * y * 7) % 29) / 29;
    const over = (Math.floor(x / 8) + Math.floor(y / 8)) % 2;
    const fiber = over ? x % 8 : y % 8;
    const value = kind === 'weave' ? 38 + (over ? 10 : 0) + Math.sin(fiber / 8 * Math.PI) * 24 + hash * 6
      : kind === 'grain' ? 170 + Math.sin(y * 3.1) * 24 + hash * 15
      : 95 + ((x % 4 < 2) !== (y % 4 < 2) ? 32 : 0) + hash * 12;
    const offset = (y * side + x) * 4;
    pixels[offset] = pixels[offset + 1] = pixels[offset + 2] = value;
    pixels[offset + 3] = 255;
  }
  const texture = new THREE.DataTexture(pixels, side, side, THREE.RGBAFormat);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(kind === 'weave' ? 3 : 2, kind === 'weave' ? 3 : 2);
  texture.colorSpace = kind === 'grain' ? THREE.NoColorSpace : THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

export type Surface = 'carbon' | 'aluminum' | 'blackMetal' | 'copper' | 'rubber' | 'nylon' | 'webbing' | 'gold' | 'pcb' | 'white' | 'accent' | 'led';

/** Per-part ownership lets disposal release textures without affecting another part. */
export function createSurfacePalette(): Record<Surface, THREE.MeshStandardMaterial> {
  const weave = surfaceTexture('weave'), grain = surfaceTexture('grain'), fabric = surfaceTexture('fabric');
  const make = (name: Surface, options: THREE.MeshStandardMaterialParameters) => {
    const material = new THREE.MeshStandardMaterial({ emissiveIntensity: 0, ...options });
    material.name = name;
    return material;
  };
  return {
    carbon: new THREE.MeshPhysicalMaterial({ name: 'carbon', emissiveIntensity: 0, color: '#87909b', map: weave, bumpMap: weave, bumpScale: 0.004, roughness: 0.42, metalness: 0.05, clearcoat: 0.24, clearcoatRoughness: 0.35 }),
    aluminum: make('aluminum', { color: '#c0c6cc', metalness: 0.96, roughness: 0.28, roughnessMap: grain, bumpMap: grain, bumpScale: 0.002 }),
    blackMetal: make('blackMetal', { color: '#30363d', metalness: 0.82, roughness: 0.3 }),
    copper: make('copper', { color: '#bc682f', metalness: 0.88, roughness: 0.3 }),
    rubber: make('rubber', { color: '#171b22', roughness: 0.93 }),
    nylon: make('nylon', { color: '#282e36', roughness: 0.62, metalness: 0.02 }),
    webbing: make('webbing', { color: '#4a4e55', map: fabric, roughness: 0.95 }),
    gold: make('gold', { color: '#d9b45e', metalness: 0.9, roughness: 0.28 }),
    pcb: make('pcb', { color: '#17463b', roughness: 0.55, metalness: 0.1 }),
    white: make('white', { color: '#dce1e6', roughness: 0.5 }),
    accent: make('accent', { color: '#df8d35', roughness: 0.5, metalness: 0.1 }),
    led: make('led', { color: '#67dbab', emissive: '#34c688', emissiveIntensity: 1.1, roughness: 0.28 }),
  };
}

/** Printed markings are generated locally and remain generic teaching-model labels. */
export function printedLabel(lines: string[]): THREE.MeshStandardMaterial | undefined {
  if (typeof document === 'undefined') return undefined;
  const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return undefined;
  ctx.fillStyle = '#d9dee0'; ctx.fillRect(0, 0, 512, 256);
  ctx.fillStyle = '#29323c'; ctx.fillRect(24, 22, 464, 4);
  lines.forEach((line, i) => {
    ctx.font = `${i === 0 ? 'bold 43' : '25'}px sans-serif`;
    ctx.fillText(line, 28, 82 + i * 48);
  });
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshStandardMaterial({ name: 'printed-label', map: texture, roughness: 0.68, metalness: 0 });
}
