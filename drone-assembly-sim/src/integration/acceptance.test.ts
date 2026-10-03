import { describe, expect, it } from 'vitest';
import { createAssemblyRules } from '../assembly';
import { partDefinitions } from '../data/parts';
import { teachingSteps } from '../data/steps';
import { loadProgress, saveProgress } from '../state/persistence';
describe('shared catalog and UI integration acceptance', () => {
  it('assembles every teaching step, rejects errors, removes a leaf and undoes it after persistence', () => {
    const rules=createAssemblyRules(partDefinitions); let state=rules.createInitialState();
    const early=rules.apply(state,{type:'INSTALL_PART',partId:'BAT-01'}); expect(early.feedback?.code).toBe('MISSING_PREREQUISITES'); expect(early.state).toBe(state);
    for(const step of teachingSteps) for(const id of step.partIds) {const definition=partDefinitions.find(p=>p.id===id)!; state=rules.apply(state,{type:'SET_TRANSFORM',partId:id,transform:definition.targetTransform}).state; const installed=rules.apply(state,{type:'INSTALL_PART',partId:id}); expect(installed.feedback?.ok).toBe(true); state=installed.state;}
    expect(Object.values(state.parts).filter(p=>p.installed)).toHaveLength(17);
    const dependency=rules.apply(state,{type:'REMOVE_PART',partId:'FRAME-01'}); expect(dependency.feedback?.code).toBe('DEPENDENTS_INSTALLED'); expect(dependency.state).toBe(state);
    const parts=structuredClone(state.parts); state=rules.apply(state,{type:'SET_EXPLODED',exploded:true}).state; expect(state.parts).toEqual(parts); state=rules.apply(state,{type:'SET_EXPLODED',exploded:false}).state;
    state=rules.apply(state,{type:'REMOVE_PART',partId:'BAT-01'}).state; expect(state.parts['BAT-01'].installed).toBe(false);
    let raw=''; saveProgress({setItem(_key,value){raw=value;}},state,partDefinitions); const restored=loadProgress({getItem(){return raw;}},partDefinitions); expect(restored.state).toEqual(state);
    state=rules.apply(restored.state!,{type:'UNDO'}).state; expect(state.parts['BAT-01'].installed).toBe(true); expect(state.parts).toEqual(parts);
    state=rules.apply(state,{type:'RESET'}).state; expect(Object.values(state.parts).filter(p=>p.installed)).toHaveLength(0); state=rules.apply(state,{type:'UNDO'}).state; expect(state.parts).toEqual(parts);
  });
});
