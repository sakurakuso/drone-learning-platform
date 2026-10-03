import { useEffect, useState } from 'react';
import { Euler, Quaternion, MathUtils } from 'three';
import type { Transform } from '../contracts';
import { strings, type Language } from './i18n';
function fields(t: Transform) {
  const e = new Euler().setFromQuaternion(new Quaternion(...t.rotation), 'XYZ');
  return [...t.position, e.x * 180 / Math.PI, e.y * 180 / Math.PI, e.z * 180 / Math.PI].map(v => String(Math.round(v * 1000) / 1000));
}
export function TransformEditor({transform, disabled, language, onApply}: {transform: Transform; disabled: boolean; language: Language; onApply: (t: Transform) => void}) {
  const [values, setValues] = useState(() => fields(transform));
  useEffect(() => setValues(fields(transform)), [transform]);
  const s = strings[language];
  return <form className="transform-form" onSubmit={event => { event.preventDefault(); const numbers = values.map(Number); const q = new Quaternion().setFromEuler(new Euler(...numbers.slice(3).map(MathUtils.degToRad) as [number,number,number], 'XYZ')); onApply({ position: numbers.slice(0,3) as [number,number,number], rotation: q.toArray() as [number,number,number,number], scale: [...transform.scale] }); }}>
    {[s.position, s.rotation].map((label, group) => <fieldset key={group} disabled={disabled}><legend>{label}</legend><div className="axis-fields">{['X','Y','Z'].map((axis, i) => { const index = group * 3 + i; return <label key={axis}><span className={`axis axis-${axis.toLowerCase()}`}>{axis}</span><input aria-label={`${group === 0 ? 'Position' : 'Rotation'} ${axis}`} type="number" step={group === 0 ? '0.1' : '5'} required value={values[index]} onChange={event => setValues(old => old.map((value, n) => n === index ? event.target.value : value))}/></label> })}</div></fieldset>)}
    <button type="submit" className="button subtle full" disabled={disabled}>{s.apply}</button>
  </form>;
}
