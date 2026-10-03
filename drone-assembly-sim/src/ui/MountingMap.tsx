import type { AssemblyState, PartDefinition, TeachingStep } from '../contracts';
import { guideTargets } from '../scene/guidance';
import { guidanceCopy } from './guidanceCopy';
import type { Language } from './i18n';

/** Project the shared teaching target coordinates, never a separate installation map. */
export function MountingMap({ definitions, steps, state, language, onSelect }: {
  definitions: readonly PartDefinition[]; steps: readonly TeachingStep[]; state: AssemblyState;
  language: Language; onSelect: (id: string) => void;
}) {
  const c = guidanceCopy[language];
  const targets = guideTargets(definitions, steps, state, false);
  const extent = Math.max(3.2, ...definitions.flatMap(p => [Math.abs(p.targetTransform.position[0]), Math.abs(p.targetTransform.position[2])]));
  const project = (n: number, origin: number) => origin + n / extent * 71;
  return <details className="mounting-map" open={!state.selectedPartId}>
    <summary>{c.map}</summary>
    <svg viewBox="0 0 276 218" role="group" aria-label={c.map}>
      <title>{c.map}</title>
      <text x="138" y="17" textAnchor="middle" className="map-direction map-front">↑ {c.front}</text>
      <text x="138" y="210" textAnchor="middle" className="map-direction">{c.rear}</text>
      <text x="5" y="109" className="map-direction">{c.left}</text>
      <text x="271" y="109" textAnchor="end" className="map-direction">{c.right}</text>
      <path d="M138 30 V190 M57 109 H219" className="map-axis"/>
      <rect x="110" y="80" width="56" height="58" rx="7" className="map-deck"/>
      <path d="M113 84 L88 60 M163 84 L188 60 M113 134 L88 158 M163 134 L188 158" className="map-arm"/>
      {targets.map(part => {
        const x = project(part.targetTransform.position[0], 138), z = project(part.targetTransform.position[2], 109);
        const selected = state.selectedPartId === part.id;
        const installed = state.parts[part.id].installed;
        const label = language === 'zh' ? part.name : part.nameEn;
        return <g key={part.id} role="button" tabIndex={0} aria-label={`${label} ${part.id}`} aria-pressed={selected} className={`map-target ${selected ? 'selected' : ''} ${installed ? 'installed' : ''}`} onClick={() => onSelect(part.id)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelect(part.id); } }}>
          <title>{label} · {part.id}</title>
          <circle cx={x} cy={z} r="12"/>
          <text x={x} y={z + 3.5} textAnchor="middle">{installed ? '✓' : part.id.split('-').at(-1)}</text>
          <text x={x} y={z + (part.category === 'control' ? -20 : 24)} textAnchor="middle" className="map-id">{part.id}</text>
        </g>;
      })}
    </svg>
    <p>{c.mapHint}</p>
  </details>;
}
