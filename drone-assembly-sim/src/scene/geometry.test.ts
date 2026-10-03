import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { partDefinitions } from '../data/parts';
import { applyTransform, createPartGeometry, disposeObject, highlightPart, readTransform } from './geometry';

describe('shared teaching geometry', () => {
  it('keeps every shared part inside its declared size envelope', () => {
    partDefinitions.forEach(definition => {
      const object = createPartGeometry(definition);
      const bounds = new THREE.Box3().setFromObject(object);
      const size = bounds.getSize(new THREE.Vector3()).toArray();
      size.forEach((n, i) => expect(n, definition.id).toBeLessThanOrEqual(definition.geometry.size[i] + 1e-5));
      expect(object.userData.partId).toBe(definition.id);
      disposeObject(object);
    });
  });
  it('has independent instance materials and translucent target geometry', () => {
    const a = createPartGeometry(partDefinitions[0]);
    const b = createPartGeometry(partDefinitions[0]);
    const ghost = createPartGeometry(partDefinitions[0], true);
    const material = (object: THREE.Group) => (object.children[0] as THREE.Mesh).material as THREE.MeshStandardMaterial;
    highlightPart(a, true);
    expect(material(a).emissiveIntensity).toBeGreaterThan(0);
    expect(material(b).emissiveIntensity).toBe(0);
    expect(material(ghost).opacity).toBeLessThan(1);
    expect(material(ghost).depthWrite).toBe(false);
    [a, b, ghost].forEach(disposeObject);
  });
  it('round-trips transforms without mutating shared definitions', () => {
    const definition = partDefinitions[0];
    const before = JSON.stringify(definition);
    const object = createPartGeometry(definition);
    applyTransform(object, definition.initialTransform);
    const result = readTransform(object);
    expect(result.position).toEqual(definition.initialTransform.position);
    expect(result.rotation).toEqual(definition.initialTransform.rotation);
    result.position[0] = 999;
    expect(JSON.stringify(definition)).toBe(before);
    expect(object.position.x).toBe(definition.initialTransform.position[0]);
    disposeObject(object);
  });
  it('rejects nonfinite teaching sizes and zero quaternions', () => {
    expect(() => createPartGeometry({ ...partDefinitions[0], geometry: { ...partDefinitions[0].geometry, size: [1, NaN, 1] } })).toThrow();
    const object = new THREE.Group();
    expect(() => applyTransform(object, { position: [0, 0, 0], rotation: [0, 0, 0, 0], scale: [1, 1, 1] })).toThrow();
  });
  it('disposes all geometry and each shared material exactly once', () => {
    const object = createPartGeometry(partDefinitions.find(d => d.geometry.kind === 'guard')!);
    const geometries = new Set<THREE.BufferGeometry>();
    const materials = new Set<THREE.Material>();
    let geometryDisposals = 0, materialDisposals = 0;
    object.traverse(child => {
      if (child instanceof THREE.Mesh || child instanceof THREE.LineSegments) {
        geometries.add(child.geometry);
        (Array.isArray(child.material) ? child.material : [child.material]).forEach(m => materials.add(m));
      }
    });
    geometries.forEach(g => g.addEventListener('dispose', () => geometryDisposals++));
    materials.forEach(m => m.addEventListener('dispose', () => materialDisposals++));
    disposeObject(object);
    expect(geometryDisposals).toBe(geometries.size);
    expect(materialDisposals).toBe(materials.size);
  });
  it('releases the lines used by installation paths and direction arrows', () => {
    const group = new THREE.Group();
    const line = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineDashedMaterial());
    group.add(line);
    let released = 0;
    line.geometry.addEventListener('dispose', () => released++);
    (line.material as THREE.Material).addEventListener('dispose', () => released++);
    disposeObject(group);
    expect(released).toBe(2);
  });
});
