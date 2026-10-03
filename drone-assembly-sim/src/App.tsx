import { useCallback, useEffect, useRef, useState } from 'react';
import type { AssemblyAction, AssemblyState, InstallationCheckResult, PartCategory, SceneMetrics, ViewPreset } from './contracts';
import { categories, MODEL_ASSUMPTION, MODEL_ASSUMPTION_EN, MODEL_NOTICE, MODEL_NOTICE_EN, partDefinitions } from './data/parts';
import { teachingSteps } from './data/steps';
import { createAssemblyRules, integrationReady } from './integration/modules';
import { loadProgress, saveProgress, type LoadStatus } from './state/persistence';
import { categoryNames, errorMessages, strings, type Language } from './ui/i18n';
import { PartIcon } from './ui/PartIcon';
import { SceneViewport } from './ui/SceneViewport';
import { TransformEditor } from './ui/TransformEditor';
const rules = createAssemblyRules(partDefinitions);
type Notice = { check?: InstallationCheckResult; message?: keyof typeof strings.en; tone: 'neutral' | 'success' | 'error' };
function initial() { try { const loaded = loadProgress(localStorage, partDefinitions); return { state: loaded.state ?? rules.createInitialState(), status: loaded.status }; } catch { return { state: rules.createInitialState(), status: 'unavailable' as LoadStatus }; } }
function initialLanguage(): Language { try { return localStorage.getItem('drone-assembly-sim:language') === 'zh' ? 'zh' : 'en'; } catch { return 'en'; } }
export default function App() {
  const [boot] = useState(initial);
  const [state, setState] = useState<AssemblyState>(boot.state);
  const currentState = useRef(state); currentState.current = state;
  const [language, setLanguage] = useState<Language>(initialLanguage);
  const [query, setQuery] = useState(''); const [category, setCategory] = useState<PartCategory | 'all'>('all');
  const [notice, setNotice] = useState<Notice>({ tone: 'neutral' });
  const [metrics, setMetrics] = useState<SceneMetrics>(); const [sceneError, setSceneError] = useState('');
  const [offlineReady, setOfflineReady] = useState(false);
  const [explosionAmount, setExplosionAmount] = useState(1);
  const [isolated, setIsolated] = useState(false);
  const [hideGuards, setHideGuards] = useState(false);
  const [saving, setSaving] = useState(true); const [resetDialog, setResetDialog] = useState(false);
  const s = strings[language];
  const dispatch = useCallback((action: AssemblyAction) => {
    const before = currentState.current;
    const result = rules.apply(before, action);
    currentState.current = result.state; setState(result.state);
    if (result.feedback && !result.feedback.ok) setNotice({ check: result.feedback, tone: 'error' });
    else if (action.type === 'INSTALL_PART') setNotice({ check: result.feedback, message: 'checked', tone: 'success' });
    else if (action.type === 'REMOVE_PART') setNotice({ check: result.feedback, message: 'removed', tone: 'success' });
    else if (action.type === 'SET_TRANSFORM' && result.state !== before) setNotice({ message: 'moved', tone: 'success' });
    else if (action.type === 'UNDO' && result.state !== before) setNotice({ message: 'undoDone', tone: 'success' });
    else if (action.type === 'RESET') setNotice({ message: 'resetDone', tone: 'success' });
    else if (action.type === 'SELECT_PART') setNotice({ tone: 'neutral' });
  }, []);
  useEffect(() => { try { setSaving(saveProgress(localStorage, state, partDefinitions)); } catch { setSaving(false); } }, [state]);
  useEffect(() => { document.documentElement.lang = language === 'en' ? 'en' : 'zh-CN'; document.title = language === 'en' ? 'Drone Lab · Assembly Studio' : '无人机教学 · 组装工作台'; try { localStorage.setItem('drone-assembly-sim:language', language); } catch { /* Language stays usable without persistence. */ } }, [language]);
  useEffect(() => {
    if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
    let active = true;
    navigator.serviceWorker.register('/sw.js').then(() => navigator.serviceWorker.ready).then(() => { if (active) setOfflineReady(true); }).catch(() => { /* Local runtime remains usable without caching. */ });
    return () => { active = false; };
  }, []);
  const installedCount = Object.values(state.parts).filter(p => p.installed).length;
  const selected = partDefinitions.find(p => p.id === state.selectedPartId);
  const selectedState = selected ? state.parts[selected.id] : null;
  const currentStepIndex = teachingSteps.findIndex(step => step.partIds.some(id => !state.parts[id].installed));
  const currentStep = teachingSteps[currentStepIndex];
  const suggestedId = currentStep?.partIds.find(id => !state.parts[id].installed);
  const filtered = partDefinitions.filter(p => (category === 'all' || category === p.category) && `${p.name} ${p.nameEn} ${p.id}`.toLowerCase().includes(query.toLowerCase()));
  const name = (id: string) => { const p = partDefinitions.find(p => p.id === id); return p ? language === 'en' ? p.nameEn : p.name : id; };
  const editable = !!selectedState && !selectedState.installed && !state.exploded;
  const align = () => { if (!selected) return; dispatch({ type: 'SET_TRANSFORM', partId: selected.id, transform: structuredClone(selected.targetTransform) }); if (editable) setNotice({ message: 'aligned', tone: 'success' }); };
  return <div className="app" data-assembly-signature={JSON.stringify(state.parts)} data-history-length={state.history.length} data-installed-count={installedCount} data-revision={state.revision} data-mode={state.mode}>
    <header className="app-header"><div className="brand-mark">D<span>↗</span></div><div className="brand"><div className="eyebrow">{s.subtitle}</div><h1>{s.title}</h1></div><div className="header-meta"><span className="local-badge" title={import.meta.env.PROD ? offlineReady ? s.offlineReady : s.offlinePreparing : s.local}><i/>{import.meta.env.PROD && offlineReady ? s.offlineReady : s.local}</span><span className="count-badge">{partDefinitions.length} {s.pieces}</span><div className="language-toggle" aria-label="Language / 语言"><button className={language === 'en' ? 'active' : ''} onClick={() => setLanguage('en')}>EN</button><button className={language === 'zh' ? 'active' : ''} onClick={() => setLanguage('zh')}>中文</button></div></div></header>
    <div className="model-banner"><span className="model-label">{language === 'en' ? MODEL_NOTICE_EN : MODEL_NOTICE}</span><span title={language === 'en' ? MODEL_ASSUMPTION_EN : MODEL_ASSUMPTION}>{s.unitHint} <span aria-hidden="true">ⓘ</span></span></div>
    <main className="workspace">
      <aside className="library panel"><div className="panel-heading"><h2>{s.library}</h2><span className="small-counter">{installedCount}/{partDefinitions.length}</span></div><label className="search"><span aria-hidden="true">⌕</span><input value={query} onChange={event => setQuery(event.target.value)} aria-label={s.search} placeholder={s.search}/></label><div className="category-filter"><button className={category === 'all' ? 'active' : ''} onClick={() => setCategory('all')}>{s.all}</button>{categories.map(c => <button key={c} className={category === c ? 'active' : ''} onClick={() => setCategory(c)}>{categoryNames[language][c]}</button>)}</div>
        <div className="parts-list">{filtered.map(p => <button className={`part-row ${selected?.id === p.id ? 'selected' : ''} ${state.parts[p.id].installed ? 'installed' : ''}`} data-part-id={p.id} data-installed={state.parts[p.id].installed} key={p.id} onClick={() => dispatch({ type: 'SELECT_PART', partId: p.id })} title={`${p.nameEn} / ${p.name}`}><span className="part-icon"><PartIcon kind={p.geometry.kind} color={p.geometry.color}/></span><span className="part-text"><strong>{language === 'en' ? p.nameEn : p.name}</strong><small>{p.id}</small></span><span className="part-status" aria-label={state.parts[p.id].installed ? s.installed : s.scattered}>{state.parts[p.id].installed ? '✓' : '○'}</span></button>)}{!filtered.length && <p className="empty-list">{s.noMatch}</p>}</div>
        <div className="library-footer"><span className="legend-dot"/>{s.scattered}<span className="legend-dot installed"/>{s.installed}</div>
      </aside>
      <section className="workbench"><div className="workbench-toolbar"><div className="mode-tabs"><button className={state.mode === 'guided' ? 'active' : ''} onClick={() => dispatch({ type: 'SET_MODE', mode: 'guided' })}>{s.guided}</button><button className={state.mode === 'free' ? 'active' : ''} onClick={() => dispatch({ type: 'SET_MODE', mode: 'free' })}>{s.free}</button></div><div className="history-controls"><button className="button compact" disabled={!state.history.length} title={`${state.history.length} ${s.history}`} onClick={() => dispatch({ type: 'UNDO' })}>↶ <span>{s.undo}</span></button><button className="button compact" onClick={() => setResetDialog(true)}>↺ <span>{s.reset}</span></button></div></div>
        <div className="scene-shell"><SceneViewport state={state} language={language} explosionAmount={explosionAmount} isolated={isolated} hideGuards={hideGuards} onOperation={dispatch} onMetrics={setMetrics} onError={setSceneError}/><div className="scene-topline"><span className="scene-label">{state.exploded ? s.exploded : s.normal}</span>{selected && <span className="selection-chip"><i style={{background:selected.geometry.color}}/>{name(selected.id)} <small>{selected.id}</small></span>}</div><div className="scene-tools"><div className="segmented"><button disabled={!editable} className={state.interactionMode === 'translate' ? 'active' : ''} onClick={() => dispatch({ type: 'SET_INTERACTION_MODE', interactionMode: 'translate' })}>↔ {s.move}</button><button disabled={!editable} className={state.interactionMode === 'rotate' ? 'active' : ''} onClick={() => dispatch({ type: 'SET_INTERACTION_MODE', interactionMode: 'rotate' })}>⟳ {s.rotate}</button></div><select aria-label="Camera view / 视角" value={state.viewPreset} onChange={event => dispatch({ type: 'SET_VIEW_PRESET', viewPreset: event.target.value as ViewPreset })}>{(['perspective','top','front','side'] as const).map(v => <option key={v} value={v}>{s[v]}</option>)}</select><button aria-pressed={state.exploded} className={`button compact ${state.exploded ? 'accent' : ''}`} onClick={() => dispatch({ type: 'SET_EXPLODED', exploded: !state.exploded })}>◇ {s.exploded}</button></div>
        <div className="scene-display-tools"><button className={`button compact ${isolated ? 'accent' : ''}`} aria-pressed={isolated} disabled={!selected} onClick={() => setIsolated(!isolated)}>{language === 'zh' ? '隔离零件' : 'Isolate part'}</button><button className={`button compact ${hideGuards ? 'accent' : ''}`} aria-pressed={hideGuards} onClick={() => setHideGuards(!hideGuards)}>{language === 'zh' ? '隐藏保护架' : 'Hide guards'}</button>{state.exploded && <label>{language === 'zh' ? '展开程度' : 'Explosion amount'}<input type="range" min="0.01" max="1" step="0.01" aria-label="Explosion amount / 展开程度" value={explosionAmount} onChange={event => setExplosionAmount(Number(event.target.value))}/><output>{Math.round(explosionAmount * 100)}%</output></label>}</div>
        {sceneError && <div className="scene-error" role="alert"><strong>{s.rendererError}</strong><p>{sceneError}</p></div>}{!integrationReady && <div className="integration-tag">{s.pending}</div>}
        <div className="scene-bottomline"><span>{s.orbit}</span><span className={`fps ${metrics && metrics.fps < 30 ? 'low' : ''}`} title={metrics?.renderer}>{metrics ? `${Math.round(metrics.fps)} FPS · ${metrics.frameTimeMs.toFixed(1)} ms` : s.fpsWaiting}</span></div></div>
        <div className="workbench-footer"><span>{state.exploded ? s.explosionLock : s.ghost}</span><span className={saving ? 'save-ok' : 'save-error'} role="status">{saving ? '●' : '⚠'} {saving ? s.saved : s.saveError}</span></div>
      </section>
      <aside className="inspector panel"><div className="progress-card"><div className="progress-label"><h2>{s.progress}</h2><strong>{Math.round(installedCount / partDefinitions.length * 100)}<small>%</small></strong></div><div className="progress-track"><div style={{width:`${installedCount / partDefinitions.length * 100}%`}}/></div><div className="progress-meta"><span>{installedCount} / {partDefinitions.length} {s.assembled}</span><span>{partDefinitions.length - installedCount} {s.remaining}</span></div></div>
        <div className="inspector-scroll"><section className="guide-section"><div className="section-heading"><h2>{state.mode === 'guided' ? s.workflow : s.free}</h2><span className="eyebrow">{currentStepIndex < 0 ? '✓' : `${currentStepIndex + 1} / ${teachingSteps.length}`}</span></div>{state.mode === 'guided' ? <ol className="step-list">{teachingSteps.map((step,i) => { const done = step.partIds.every(id => state.parts[id].installed); const partial = step.partIds.filter(id => state.parts[id].installed).length; return <li key={step.id} className={done ? 'done' : i === currentStepIndex ? 'current' : ''}><button onClick={() => dispatch({ type: 'SELECT_PART', partId: step.partIds.find(id => !state.parts[id].installed) ?? step.partIds[0] })}><span className="step-number">{done ? '✓' : String(i+1).padStart(2,'0')}</span><span><strong>{language === 'en' ? step.titleEn : step.title}</strong>{i === currentStepIndex && <small>{language === 'en' ? step.descriptionEn : step.description}</small>}</span><em>{partial}/{step.partIds.length}</em></button></li> })}</ol> : <p className="muted free-hint">{s.freeHint}</p>}{currentStepIndex < 0 ? <div className="complete-card"><strong>✓ {s.complete}</strong><p>{s.completeText}</p></div> : state.mode === 'guided' && <button className="button subtle full" onClick={() => suggestedId && dispatch({ type: 'SELECT_PART', partId: suggestedId })}>{s.continue} →</button>}</section>
        <section className="selected-section"><div className="section-heading"><h2>{s.selected}</h2>{selectedState && <span className={`status-badge ${selectedState.installed ? 'installed' : ''}`}>{selectedState.installed ? s.installed : s.scattered}</span>}</div>{selected && selectedState ? <><div className="selected-part"><PartIcon kind={selected.geometry.kind} color={selected.geometry.color}/><div><h3>{name(selected.id)}</h3><small>{language === 'en' ? selected.name : selected.nameEn} · {selected.id}</small></div></div><TransformEditor transform={selectedState.transform} language={language} disabled={!editable} onApply={transform => dispatch({ type: 'SET_TRANSFORM', partId: selected.id, transform })}/>{(state.exploded || selectedState.installed) && <p className="lock-hint">{state.exploded ? s.explosionLock : s.lock}</p>}<div className="install-actions"><button className="button subtle full" onClick={align} disabled={!editable}>{s.align} <span>⌖</span></button><button className="button primary full" onClick={() => dispatch({ type: 'INSTALL_PART', partId: selected.id })} disabled={selectedState.installed || state.exploded}>{s.install} <span>→</span></button><button className="button danger full" onClick={() => dispatch({ type: 'REMOVE_PART', partId: selected.id })} disabled={!selectedState.installed || state.exploded}>{s.remove}</button></div><details className="references"><summary>{s.reference}</summary>{selected.referenceFiles.map(file => <p key={file}>{file.split('/').at(-1)}</p>)}</details></> : <div className="select-empty"><span>⌖</span><strong>{s.select}</strong><p>{s.selectHint}</p></div>}</section>
        <section className={`feedback-card ${notice.tone}`} aria-live="polite" data-feedback-code={notice.check?.code ?? ''}><h2>{s.feedback}</h2><p>{notice.message ? s[notice.message] : notice.check ? errorMessages[language][notice.check.code] : s.readyText}</p>{notice.check?.relatedPartIds?.length ? <div className="related-parts">{s.required}: {notice.check.relatedPartIds.map(name).join(', ')}</div> : null}{notice.check?.positionError !== undefined && <small>{s.errorDistance}: {notice.check.positionError.toFixed(3)}</small>}{notice.check?.angleErrorRadians !== undefined && <small>{s.errorAngle}: {(notice.check.angleErrorRadians * 180 / Math.PI).toFixed(1)}°</small>}</section>
        {boot.status === 'restored' && <p className="boot-status">↶ {s.restored}</p>}{boot.status === 'invalid' && <p className="boot-status warning">{s.invalidSave}</p>}{boot.status === 'unavailable' && <p className="boot-status warning">{s.unavailableSave}</p>}
        </div>
      </aside>
    </main>
    <footer className="app-footer">{language === 'en' ? MODEL_ASSUMPTION_EN : MODEL_ASSUMPTION}</footer>
    {resetDialog && <div className="modal-backdrop" onClick={() => setResetDialog(false)}><div className="modal" role="dialog" aria-modal="true" aria-labelledby="reset-title" onClick={event => event.stopPropagation()}><h2 id="reset-title">{s.resetTitle}</h2><p>{s.resetBody}</p><div><button className="button subtle" onClick={() => setResetDialog(false)}>{s.cancel}</button><button className="button primary" autoFocus onClick={() => { dispatch({ type: 'RESET' }); setResetDialog(false); }}>{s.confirmReset}</button></div></div></div>}
  </div>;
}
