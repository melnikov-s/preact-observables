import { signal, effect, computed, batch, Signal } from "@preact/signals-core";
import {
  createGraph,
  getAdministration,
  getInternalNode,
  getObservable,
  getObservableClassInstance,
  getSource,
} from "nu-observables";

export const graph = createGraph({
  batch,
  effect,
  createComputed(fn, context) {
    const c = computed(fn.bind(context));
    return {
      node: c,
      get() {
        return c.value;
      },
    };
  },
  createAtom() {
    let value = 0;
    const s = signal(value);

    return {
      node: s,
      reportChanged() {
        s.value = ++value;
        return value;
      },
      reportObserved() {
        return s.value;
      },
    };
  },
});

export function observable<T>(obj: T): T {
  return getObservable(obj, graph);
}

export function source<T>(obj: T): T {
  return getSource(obj);
}

export class Observable {
  constructor() {
    return getObservableClassInstance(this, graph);
  }
}

export function reportChanged<T extends object>(obj: T): T {
  const adm = getAdministration(obj);
  adm.reportChanged();

  return obj;
}

export function reportObserved<T extends object>(
  obj: T,
  opts?: { deep?: boolean }
): T {
  const adm = getAdministration(obj);

  adm.reportObserved(opts?.deep);

  return obj;
}

const signalMap: WeakMap<Signal, Signal> = new WeakMap();

export function getSignal<T extends object>(
  obj: T,
  key: keyof T
): Signal<T[keyof T]> {
  const node = getInternalNode(obj, key);

  if (node instanceof Signal) {
    let signal = signalMap.get(node);
    if (!signal) {
      signal = new Signal();
      Object.defineProperties(signal, {
        value: {
          get() {
            return obj[key];
          },
          set(v) {
            return (obj[key] = v);
          },
        },
        peek: {
          value() {
            return source(obj)[key];
          }
        }
      });

      signalMap.set(node, signal);
    }

    return signal!;
  }

  return node;
}
