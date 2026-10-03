import type { ExtensionId, ExtensionPorts } from '../contracts/extensions';
/** Empty by default. Registration alone does not connect devices or start a simulation. */
export function createExtensionRegistry() {
  const ports: Partial<ExtensionPorts> = {};
  return {
    register<K extends ExtensionId>(id: K, adapter: ExtensionPorts[K]): () => void {
      if (ports[id]) throw new Error(`EXTENSION_ALREADY_REGISTERED:${id}`);
      ports[id] = adapter;
      return () => { if (ports[id] === adapter) delete ports[id]; };
    },
    get<K extends ExtensionId>(id: K): ExtensionPorts[K] | undefined { return ports[id]; },
    available(): ExtensionId[] { return Object.keys(ports) as ExtensionId[]; },
  };
}
export const trainingExtensions = createExtensionRegistry();
