import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import type { PartDefinition, Transform } from '../contracts';
import { createSurfacePalette, printedLabel, type Surface } from './materials';

/** Detailed visual models retain the catalog's schematic dimensions and mounting poses. */
export function createPartGeometry(definition: PartDefinition, ghost = false): THREE.Group {
  const { kind, size, color, radius } = definition.geometry;
  if (size.length !== 3 || size.some(n => !Number.isFinite(n) || n <= 0)) throw new Error(`零件 ${definition.id} 的教学几何尺寸无效`);
  const [w, h, d] = size;
  const group = new THREE.Group(); group.name = definition.id; group.userData.partId = definition.id;
  // Preview silhouettes deliberately omit small hardware and expensive textured surfaces.
  if (ghost) {
    const material = new THREE.MeshStandardMaterial({ color, transparent: true, opacity: 0.16, depthWrite: false, emissive: '#218cbe', emissiveIntensity: 0.3 });
    let geometry: THREE.BufferGeometry;
    if (kind === 'motor') geometry = new THREE.CylinderGeometry(w / 2, w / 2, h, 24);
    else if (kind === 'guard') { geometry = new THREE.TorusGeometry(w / 2 - h / 2, h / 2, 6, 48); geometry.rotateX(Math.PI / 2); }
    else geometry = new THREE.BoxGeometry(w, h, d);
    const preview = new THREE.Mesh(geometry, material); preview.userData.partId = definition.id; group.add(preview);
    return group;
  }
  const palette = createSurfacePalette();
  group.userData.ownedMaterials = Object.values(palette);
  function mesh(geometry: THREE.BufferGeometry, surface: Surface = 'carbon', x = 0, y = 0, z = 0) {
    const item = new THREE.Mesh(geometry, palette[surface]);
    item.position.set(x, y, z); item.userData.partId = definition.id;
    item.castShadow = true; item.receiveShadow = true; group.add(item); return item;
  }
  function box(a: number, b: number, c: number, surface: Surface, x = 0, y = 0, z = 0, bevel = 0.015) {
    return mesh(new RoundedBoxGeometry(a, b, c, 2, Math.min(bevel, a / 4, b / 4, c / 4)), surface, x, y, z);
  }
  function cylinder(r: number, length: number, surface: Surface, x = 0, y = 0, z = 0, segments = 32) {
    return mesh(new THREE.CylinderGeometry(r, r, length, segments), surface, x, y, z);
  }
  function tube(a: THREE.Vector3, b: THREE.Vector3, r: number, surface: Surface) {
    const delta = b.clone().sub(a), mid = a.clone().add(b).multiplyScalar(0.5);
    const item = cylinder(r, delta.length(), surface, mid.x, mid.y, mid.z, 16);
    item.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize()); return item;
  }
  function bolt(x: number, y: number, z: number, r = 0.035, height = 0.025) {
    cylinder(r, height, 'aluminum', x, y, z, 6);
    cylinder(r * 0.42, height * 0.12, 'rubber', x, y + height * 0.47, z, 6);
  }
  function ring(r: number, thickness: number, surface: Surface, x = 0, y = 0, z = 0) {
    const item = mesh(new THREE.TorusGeometry(r, thickness, 8, 64), surface, x, y, z); item.rotation.x = Math.PI / 2; return item;
  }
  function marking(lines: string[], width: number, depth: number, x: number, y: number, z: number) {
    const material = printedLabel(lines);
    if (!material) return;
    const item = mesh(new THREE.PlaneGeometry(width, depth), 'white', x, y, z);
    item.material = material; item.rotation.x = -Math.PI / 2; item.castShadow = false;
  }
  switch (kind) {
    case 'frame': {
      // Laminated decks with standoffs, arm clamps and replaceable motor mounting plates.
      box(w * 0.44, h * 0.18, d * 0.65, 'carbon', 0, h * 0.32, 0, 0.06);
      box(w * 0.40, h * 0.18, d * 0.61, 'carbon', 0, -h * 0.32, 0, 0.06);
      for (const x of [-1, 1]) for (const z of [-1, 1]) {
        cylinder(0.05, h * 0.46, 'aluminum', x * w * 0.17, 0, z * d * 0.23);
        bolt(x * w * 0.17, h * 0.44, z * d * 0.23, 0.045, 0.02);
        const end = new THREE.Vector3(x * (w / 2 - 0.1), 0, z * (d / 2 - 0.1));
        tube(new THREE.Vector3(x * w * 0.13, 0, z * d * 0.13), end, h * 0.25, 'carbon');
        cylinder(0.095, h * 0.16, 'blackMetal', end.x, h * 0.26, end.z);
        for (const a of [-1, 1]) for (const b of [-1, 1]) bolt(end.x + a * 0.035, h * 0.38, end.z + b * 0.035, 0.017, 0.015);
        const clamp = box(0.3, h * 0.58, 0.2, 'blackMetal', x * w * 0.21, 0, z * d * 0.21);
        clamp.rotation.y = x * z * Math.PI / 4;
        bolt(x * w * 0.21, h * 0.34, z * d * 0.21);
      }
      for (const z of [-0.65, 0.72]) box(z < 0 ? 0.94 : 1.2, 0.012, z < 0 ? 0.7 : 1.45, 'rubber', 0, h * 0.42, z);
      for (const x of [-1, 1]) box(0.065, 0.015, 0.32, 'accent', x * w * 0.205, h * 0.42, -0.45);
      break;
    }
    case 'motor': {
      const r = Math.min(radius ?? Math.min(w, d) / 2, w / 2, d / 2);
      cylinder(r * 0.87, h * 0.14, 'blackMetal', 0, -h * 0.42);
      cylinder(r * 0.69, h * 0.36, 'blackMetal', 0, -h * 0.10);
      // Separate copper coils and structural ribs leave open gaps around the stator.
      for (let i = 0; i < 12; i++) {
        const theta = i * Math.PI / 6, x = Math.sin(theta), z = Math.cos(theta);
        const coil = box(r * 0.28, h * 0.33, r * 0.22, 'copper', x * r * 0.73, -h * 0.08, z * r * 0.73, 0.018);
        coil.rotation.y = theta;
        const rib = box(r * 0.08, h * 0.45, r * 0.1, 'blackMetal', x * r * 0.91, 0, z * r * 0.91);
        rib.rotation.y = theta;
        for (const offset of [-0.09, 0.01, 0.11]) {
          const winding = box(r * 0.29, h * 0.025, r * 0.23, 'copper', x * r * 0.73, h * offset, z * r * 0.73, 0.002);
          winding.rotation.y = theta;
        }
      }
      ring(r * 0.89, r * 0.055, 'aluminum', 0, h * 0.23);
      ring(r * 0.91, r * 0.045, 'blackMetal', 0, -h * 0.30);
      cylinder(r * 0.36, h * 0.12, 'blackMetal', 0, h * 0.23);
      for (let i = 0; i < 6; i++) {
        const angle = i * Math.PI / 3;
        const spoke = box(r * 0.72, h * 0.07, r * 0.16, 'blackMetal', Math.cos(angle) * r * 0.57, h * 0.22, Math.sin(angle) * r * 0.57);
        spoke.rotation.y = -angle;
        bolt(Math.cos(angle) * r * 0.52, h * 0.28, Math.sin(angle) * r * 0.52, 0.018, 0.014);
      }
      cylinder(r * 0.12, h * 0.22, 'aluminum', 0, h * 0.39);
      cylinder(r * 0.24, h * 0.08, 'aluminum', 0, h * 0.29, 0, 6);
      break;
    }
    case 'propeller': {
      cylinder(d * 0.35, h * 0.73, 'blackMetal');
      cylinder(d * 0.23, h * 0.14, 'aluminum', 0, h * 0.43, 0, 6);
      // Closed, tapered airfoil with varying pitch; not a flattened ellipsoid.
      for (const sign of [-1, 1]) {
        const positions: number[] = [], indices: number[] = [], uvs: number[] = [];
        const rows = 20, columns = 8;
        for (let layer = 0; layer < 2; layer++) for (let i = 0; i <= rows; i++) {
          const t = i / rows, span = d * 0.28 + t * (w / 2 - d * 0.28);
          const chord = d * (0.36 + 0.54 * Math.sin(Math.PI * t * 0.9)) * (1 - t * 0.32);
          const pitch = (1 - t) * 0.22 + 0.05;
          for (let j = 0; j <= columns; j++) {
            const v = j / columns, z = (v - 0.5) * chord + Math.sin(t * Math.PI) * d * 0.12;
            const camber = Math.sin(v * Math.PI) * h * 0.10;
            const y = z * Math.sin(pitch) + camber + (layer ? -1 : 1) * h * 0.07;
            positions.push(sign * span, y, sign * z); uvs.push(t * 2, v);
          }
        }
        const stride = columns + 1, layerSize = (rows + 1) * stride;
        for (let layer = 0; layer < 2; layer++) for (let i = 0; i < rows; i++) for (let j = 0; j < columns; j++) {
          const a = layer * layerSize + i * stride + j, b = a + stride;
          indices.push(...(layer === 0 ? [a, a + 1, b, a + 1, b + 1, b] : [a, b, a + 1, a + 1, b, b + 1]));
        }
        const rim: number[] = [];
        for (let i = 0; i <= rows; i++) rim.push(i * stride);
        for (let j = 1; j <= columns; j++) rim.push(rows * stride + j);
        for (let i = rows - 1; i >= 0; i--) rim.push(i * stride + columns);
        for (let j = columns - 1; j > 0; j--) rim.push(j);
        rim.forEach((a, i) => { const b = rim[(i + 1) % rim.length]; indices.push(a, b, a + layerSize, b, b + layerSize, a + layerSize); });
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2)); geometry.setIndex(indices); geometry.computeVertexNormals();
        mesh(geometry, 'carbon');
      }
      break;
    }
    case 'landing-gear': {
      const r = Math.min(w * 0.3, h * 0.05, d * 0.02), y = h / 2 - r * 1.8, z = d / 2 - r * 1.8;
      for (const sign of [-1, 1]) {
        tube(new THREE.Vector3(0, y, sign * z * 0.56), new THREE.Vector3(0, -y + 0.08, sign * z * 0.64), r, 'carbon');
        box(w * 0.88, h * 0.07, 0.22, 'blackMetal', 0, y - h * 0.03, sign * z * 0.56);
        box(w * 0.95, h * 0.06, 0.40, 'rubber', 0, -y, sign * z * 0.62);
      }
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, -y + 0.20, -z), new THREE.Vector3(0, -y + 0.02, -z * 0.86),
        new THREE.Vector3(0, -y, 0), new THREE.Vector3(0, -y + 0.02, z * 0.86), new THREE.Vector3(0, -y + 0.20, z),
      ]);
      mesh(new THREE.TubeGeometry(curve, 48, r, 12, false), 'aluminum');
      tube(new THREE.Vector3(0, y, -z * 0.56), new THREE.Vector3(0, y, z * 0.56), r, 'carbon');
      break;
    }
    case 'guard': {
      const r = Math.min(w, d) / 2 - h * 0.31;
      ring(r, h * 0.28, 'nylon');
      ring(r, h * 0.055, 'accent', 0, h * 0.28);
      // Reinforced support web sits underneath the rotor plane.
      for (let i = 0; i < 4; i++) {
        const theta = Math.PI / 4 + i * Math.PI / 2;
        tube(new THREE.Vector3(Math.cos(theta) * 0.15, -h * 0.24, Math.sin(theta) * 0.15), new THREE.Vector3(Math.cos(theta) * r, -h * 0.24, Math.sin(theta) * r), h * 0.095, 'nylon');
      }
      ring(0.14, h * 0.10, 'blackMetal', 0, -h * 0.22);
      break;
    }
    case 'controller': {
      box(w * 0.91, h * 0.67, d * 0.91, 'nylon', 0, -h * 0.07, 0, 0.045);
      box(w * 0.86, h * 0.12, d * 0.84, 'blackMetal', 0, h * 0.30, 0, 0.025);
      box(w * 0.85, h * 0.05, d * 0.80, 'pcb', 0, -h * 0.44, 0);
      for (const sign of [-1, 1]) for (let i = 0; i < 6; i++) {
        box(w * 0.095, h * 0.18, d * 0.10, 'rubber', sign * w * 0.45, h * 0.10, (i - 2.5) * d * 0.135);
        for (const row of [-1, 0, 1]) box(w * 0.034, h * 0.032, d * 0.013, 'gold', sign * w * 0.473, h * (0.11 + row * 0.045), (i - 2.5) * d * 0.135);
      }
      for (const x of [-1, 1]) for (const z of [-1, 1]) bolt(x * w * 0.35, h * 0.38, z * d * 0.32, 0.021, 0.015);
      marking(['FLIGHT CTRL', 'FRONT  ↑', 'TEACHING MODEL'], w * 0.58, d * 0.48, 0, h * 0.368, 0);
      box(w * 0.06, h * 0.025, d * 0.06, 'led', w * 0.25, h * 0.38, -d * 0.23);
      break;
    }
    case 'battery': {
      box(w * 0.92, h * 0.83, d * 0.91, 'rubber', 0, -h * 0.055, -d * 0.025, 0.065);
      for (const sign of [-1, 1]) {
        box(w * 0.96, h * 0.04, d * 0.91, 'nylon', 0, sign * h * 0.37 - h * 0.055, -d * 0.025);
        for (const x of [-1, 1]) box(w * 0.03, h * 0.82, d * 0.10, 'webbing', x * w * 0.48, -h * 0.02, sign * d * 0.24);
        box(w * 0.99, h * 0.045, d * 0.10, 'webbing', 0, h * 0.40, sign * d * 0.24);
        box(w * 0.16, h * 0.075, d * 0.12, 'blackMetal', w * 0.25, h * 0.415, sign * d * 0.24);
      }
      marking(['POWER PACK', 'HANDLE WITH CARE', 'TEACHING MODEL'], w * 0.65, d * 0.25, -w * 0.05, h * 0.383, -d * 0.015);
      for (const x of [-1, 1]) {
        const wire = mesh(new THREE.TorusGeometry(h * 0.12, h * 0.018, 6, 24, Math.PI), x === 1 ? 'accent' : 'rubber', x * w * 0.15, h * 0.05, d * 0.455);
        wire.rotation.z = Math.PI / 2;
      }
      box(w * 0.20, h * 0.22, d * 0.07, 'accent', 0, -h * 0.06, d * 0.46);
      for (const x of [-1, 1]) cylinder(h * 0.018, h * 0.08, 'gold', x * w * 0.045, h * 0.095, d * 0.46);
      break;
    }
    default: throw new Error(`不支持的共享几何类型：${kind as string}`);
  }
  return group;
}

export function applyTransform(object: THREE.Object3D, transform: Transform) {
  const values = [...transform.position, ...transform.rotation, ...transform.scale];
  if (values.some(n => !Number.isFinite(n)) || transform.scale.some(n => n <= 0) || Math.hypot(...transform.rotation) < 1e-8) {
    throw new Error('零件变换无效');
  }
  object.position.fromArray(transform.position);
  object.quaternion.fromArray(transform.rotation).normalize();
  object.scale.fromArray(transform.scale);
}

export function readTransform(object: THREE.Object3D): Transform {
  return { position: object.position.toArray(), rotation: object.quaternion.toArray(), scale: object.scale.toArray() };
}

export function highlightPart(group: THREE.Group, selected: boolean) {
  group.traverse(o => {
    if (o instanceof THREE.Mesh) {
      for (const material of (Array.isArray(o.material) ? o.material : [o.material])) {
        if (!(material instanceof THREE.MeshStandardMaterial)) continue;
        material.userData.originalEmissive ??= material.emissive.clone();
        material.userData.originalIntensity ??= material.emissiveIntensity;
        // A restrained tint preserves the material and the controller's lit status LED.
        if (selected && material.name !== 'led') {
          material.emissive.set('#30a9e8'); material.emissiveIntensity = 0.025;
        } else {
          material.emissive.copy(material.userData.originalEmissive);
          material.emissiveIntensity = material.userData.originalIntensity;
        }
      }
    }
  });
}

/** Material/geometry sets ensure shared resources within a part are released once. */
export function disposeObject(object: THREE.Object3D) {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  object.traverse(o => {
    (o.userData.ownedMaterials as THREE.Material[] | undefined)?.forEach(m => materials.add(m));
    if (o instanceof THREE.Mesh || o instanceof THREE.Line) {
      geometries.add(o.geometry);
      (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => materials.add(m));
    }
  });
  geometries.forEach(g => g.dispose());
  materials.forEach(m => Object.values(m).forEach(value => { if (value instanceof THREE.Texture) textures.add(value); }));
  textures.forEach(t => t.dispose());
  materials.forEach(m => m.dispose());
  object.removeFromParent();
}
