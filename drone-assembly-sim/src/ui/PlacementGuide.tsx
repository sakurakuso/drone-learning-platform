import type { AssemblyState, PartDefinition } from '../contracts';
import { mountingDescription, placementGuide } from '../scene/guidance';
import { guidanceCopy } from './guidanceCopy';
import type { Language } from './i18n';

export function PlacementGuide({ part, definitions, state, language, onLocate, onSelect }: {
  part: PartDefinition; definitions: readonly PartDefinition[]; state: AssemblyState; language: Language;
  onLocate: () => void; onSelect: (id: string) => void;
}) {
  const c = guidanceCopy[language];
  const guide = placementGuide(part, state);
  const status = state.exploded ? 'inspection' : guide.status;
  const [x, y, z] = part.targetTransform.position;
  const zone = [z < -0.1 ? c.front : z > 0.1 ? c.rear : '', x < -0.1 ? c.left : x > 0.1 ? c.right : c.center].filter(Boolean).join(' · ');
  const aligned = guide.positionOK && guide.angleOK && guide.scaleOK;
  const hint = status === 'installed' ? c.installedHint : status === 'invalid' ? c.invalidHint : status === 'blocked' ? c.blockedHint : status === 'ready' ? c.readyHint : status === 'scale' ? c.scaleHint : c.alignHint;
  return <section className={`placement-guide status-${status}`} data-placement-status={status} aria-label={c.title}>
    <div className="mount-heading"><h2>{c.title}</h2><span>{c.datum}</span></div>
    <div className="mount-zone">⌖ {zone}</div>
    <p className="mount-description">{mountingDescription(part, language)}</p>
    <details className="target-coordinates"><summary>{c.target}</summary><code>X {x.toFixed(2)} · Y {y.toFixed(2)} · Z {z.toFixed(2)}</code></details>
    <button type="button" className="button subtle full locate-button" onClick={onLocate}>⌖ {c.locate}</button>
    <ol className="placement-stages" aria-label={c.title}>
      {c.stages.map((label, i) => {
        const done = i === 0 || i === 1 && aligned || i === 2 && guide.status === 'installed';
        const active = !state.exploded && (i === 1 && !aligned && status !== 'blocked' || i === 2 && status === 'ready');
        return <li key={label} className={`${done ? 'done' : ''} ${active ? 'active' : ''}`} aria-current={active ? 'step' : undefined}><span>{done ? '✓' : i + 1}</span><strong>{label}</strong></li>;
      })}
    </ol>
    <div className="placement-status" role="status" aria-live="polite"><span aria-hidden="true">{status === 'ready' || status === 'installed' ? '✓' : status === 'blocked' || status === 'scale' ? '!' : '→'}</span>{c.status[status]}</div>
    {!state.exploded && <>
      <div className="tolerance-comparison">
        {[{label:c.position, value:guide.distance, limit:part.tolerances.position, ok:guide.positionOK, unit:''}, {label:c.angle, value:guide.angle * 180 / Math.PI, limit:part.tolerances.angleRadians * 180 / Math.PI, ok:guide.angleOK, unit:'°'}].map(item => <div className={`tolerance-row ${item.ok ? 'passed' : 'outside'}`} key={item.label}>
          <div><strong>{item.label}</strong><span>{item.ok ? '✓' : '→'} {item.ok ? c.within : c.outside}</span></div>
          <div className="tolerance-meter"><span style={{width:`${Number.isFinite(item.value) ? Math.min(100, item.value / item.limit * 50) : 100}%`}}/><i/></div>
          <small>{Number.isFinite(item.value) ? item.value.toFixed(item.unit ? 1 : 3) : '—'}{item.unit} / {c.limit} {item.limit.toFixed(item.unit ? 0 : 2)}{item.unit}</small>
        </div>)}
      </div>
      <p className="comparison-note">{c.committed}</p>
    </>}
    {guide.missing.length > 0 && !state.exploded && <div className="mount-prerequisites"><strong>{c.prerequisites}</strong>{guide.missing.map(id => { const required = definitions.find(p => p.id === id); return <button className="button compact" type="button" key={id} onClick={() => onSelect(id)}><span>{required ? language === 'zh' ? required.name : required.nameEn : id}<small>{id}</small></span> →</button>; })}</div>}
    {!state.exploded && <p className="mount-hint">{hint}</p>}
  </section>;
}
