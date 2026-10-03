import * as THREE from 'three';
import type { PartDefinition, Transform } from '../contracts';

/** Geometry is schematic and uses shared teaching units, never CAD filename dimensions. */
export function createPartGeometry(definition: PartDefinition, ghost = false): THREE.Group {
  const { kind, size, color, radius } = definition.geometry;
  if (size.length !== 3 || size.some(n => !Number.isFinite(n) || n <= 0)) {
    throw new Error(`零件 ${definition.id} 的教学几何尺寸无效`);
  }
  const [w, h, d] = size;
  const group = new THREE.Group();
  group.name = definition.id;
  group.userData.partId = definition.id;
  const base = new THREE.MeshStandardMaterial({
    color, roughness: 0.65, metalness: kind === 'motor' ? 0.55 : 0.18,
    transparent: ghost, opacity: ghost ? 0.22 : 1, depthWrite: !ghost,
    emissive: ghost ? '#218cbe' : '#000000', emissiveIntensity: ghost ? 0.45 : 0,
  });
  function mesh(geometry: THREE.BufferGeometry, position: THREE.Vector3 = new THREE.Vector3()) {
    const item = new THREE.Mesh(geometry, base);
    item.position.copy(position);
    item.userData.partId = definition.id;
    group.add(item);
    return item;
  }
  function tube(a: THREE.Vector3, b: THREE.Vector3, r: number) {
    const delta = b.clone().sub(a);
    const item = mesh(new THREE.CylinderGeometry(r, r, delta.length(), 12), a.clone().add(b).multiplyScalar(0.5));
    item.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize());
  }
  switch (kind) {
    case 'frame':
      mesh(new THREE.BoxGeometry(w, h, d));
      break;
    case 'motor': {
      const r = Math.min(radius ?? Math.min(w, d) / 2, w / 2, d / 2);
      mesh(new THREE.CylinderGeometry(r, r, h * 0.8, 20), new THREE.Vector3(0, -h * 0.1, 0));
      mesh(new THREE.CylinderGeometry(r * 0.18, r * 0.18, h * 0.2, 12), new THREE.Vector3(0, h * 0.4, 0));
      break;
    }
    case 'propeller': {
      // A generic blade silhouette, not evidence of the reference rotor/blade count.
      mesh(new THREE.CylinderGeometry(Math.min(w, d) * 0.25, Math.min(w, d) * 0.25, h, 16));
      const blade = mesh(new THREE.SphereGeometry(1, 16, 8));
      blade.scale.set(w / 2, h * 0.35, d / 2);
      break;
    }
    case 'landing-gear': {
      const r = Math.min(w * 0.4, h * 0.06, d * 0.025);
      const y = h / 2 - r, z = d / 2 - r;
      for (const s of [-1, 1]) {
        tube(new THREE.Vector3(0, y, s * z * 0.6), new THREE.Vector3(0, -y, s * z * 0.6), r);
      }
      tube(new THREE.Vector3(0, -y, -z), new THREE.Vector3(0, -y, z), r);
      tube(new THREE.Vector3(0, y, -z * 0.6), new THREE.Vector3(0, y, z * 0.6), r);
      break;
    }
    case 'guard': {
      const r = Math.min(h / 2, w * 0.04, d * 0.04);
      const x = w / 2 - r, z = d / 2 - r;
      const points = [new THREE.Vector3(-x, 0, -z), new THREE.Vector3(x, 0, -z), new THREE.Vector3(x, 0, z), new THREE.Vector3(-x, 0, z)];
      points.forEach((a, i) => tube(a, points[(i + 1) % 4], r));
      break;
    }
    case 'controller':
    case 'battery': {
      mesh(new THREE.BoxGeometry(w, h * 0.86, d), new THREE.Vector3(0, -h * 0.07, 0));
      const cap = mesh(new THREE.BoxGeometry(w * 0.7, h * 0.14, d * 0.65), new THREE.Vector3(0, h * 0.43, 0));
      cap.material = base.clone();
      (cap.material as THREE.MeshStandardMaterial).color.multiplyScalar(kind === 'battery' ? 0.55 : 1.3);
      break;
    }
    default:
      throw new Error(`不支持的共享几何类型：${kind as string}`);
  }
  // Outline follows the silhouette; ghosts stay translucent without opaque outlines.
  if (!ghost) {
    group.children.filter(o => o instanceof THREE.Mesh).forEach(o => {
      const item = o as THREE.Mesh;
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(item.geometry, 35), new THREE.LineBasicMaterial({ color: '#101c29', transparent: true, opacity: 0.55 }));
      edges.userData.partId = definition.id;
      item.add(edges);
    });
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
      const material = o.material as THREE.MeshStandardMaterial;
      material.emissive.set(selected ? '#30a9e8' : '#000000');
      material.emissiveIntensity = selected ? 0.55 : 0;
    }
  });
}

/** Material/geometry sets ensure shared resources within a part are released once. */
export function disposeObject(object: THREE.Object3D) {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  object.traverse(o => {
    if (o instanceof THREE.Mesh || o instanceof THREE.LineSegments) {
      geometries.add(o.geometry);
      (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => materials.add(m));
    }
  });
  geometries.forEach(g => g.dispose());
  materials.forEach(m => m.dispose());
  object.removeFromParent();
}
