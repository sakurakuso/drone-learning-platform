import { useEffect, useRef } from 'react';
import type { AssemblyState, SceneMetrics, SceneUserOperation } from '../contracts';
import { partDefinitions } from '../data/parts';
import { createSceneAdapter } from '../integration/modules';
import type { Language } from './i18n';
export function SceneViewport({ state, language, explosionAmount, isolated, hideGuards, showAllTargets, showTargetHints, focusRequest, onOperation, onMetrics, onError }: { state: AssemblyState; language: Language; explosionAmount: number; isolated: boolean; hideGuards: boolean; showAllTargets: boolean; showTargetHints: boolean; focusRequest: number; onOperation: (operation: SceneUserOperation) => void; onMetrics: (metrics: SceneMetrics) => void; onError: (message: string) => void }) {
  const container = useRef<HTMLDivElement>(null);
  const adapter = useRef<ReturnType<typeof createSceneAdapter> | null>(null);
  const callbacks = useRef({ onOperation, onMetrics, onError }); callbacks.current = { onOperation, onMetrics, onError };
  const initial = useRef(state);
  const initialLanguage = useRef(language);
  useEffect(() => {
    const element = container.current!;
    try {
      adapter.current = createSceneAdapter({ container: element, language: initialLanguage.current, showBuiltinControls: false, definitions: partDefinitions, state: initial.current, onOperation: action => callbacks.current.onOperation(action), onMetrics: metrics => callbacks.current.onMetrics(metrics), onError: message => callbacks.current.onError(message) });
      const resize = () => adapter.current?.resize(element.clientWidth, element.clientHeight);
      const observer = new ResizeObserver(resize); observer.observe(element); resize();
      return () => { observer.disconnect(); adapter.current?.dispose(); adapter.current = null; };
    } catch (error) { callbacks.current.onError(error instanceof Error ? error.message : String(error)); }
  }, []);
  useEffect(() => { adapter.current?.update(state, partDefinitions); }, [state]);
  useEffect(() => { adapter.current?.setLanguage?.(language); }, [language]);
  useEffect(() => { adapter.current?.setExplosionAmount?.(state.exploded ? explosionAmount : 0); }, [state.exploded, explosionAmount]);
  useEffect(() => { adapter.current?.setIsolation?.(isolated); }, [isolated]);
  useEffect(() => { adapter.current?.setHideOuter?.(hideGuards); }, [hideGuards]);
  useEffect(() => { adapter.current?.setShowAllTargets?.(showAllTargets); }, [showAllTargets]);
  useEffect(() => { adapter.current?.setTargetPreview?.(showTargetHints); }, [showTargetHints]);
  useEffect(() => { if (focusRequest > 0) adapter.current?.focusTarget?.(); }, [focusRequest]);
  return <div className="scene-canvas" ref={container} aria-label="Interactive 3D drone workbench / 交互式三维无人机工作台" />;
}
