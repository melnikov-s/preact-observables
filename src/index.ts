import { signal, effect, computed, batch, Signal } from "@preact/signals-core";
import {
  createGraph,
  getAdministration,
  getInternalNode,
  getObservable,
  getObservableClassInstance,
  getSource,
  setAdministrationType,
  ObjectAdministration,
} from "nu-observables";

export { isObservable } from "nu-observables";

class PreactObjectAdministration<
  T extends object
> extends ObjectAdministration<T> {
  static proxyTraps: ProxyHandler<object> = Object.assign(
    {},
    ObjectAdministration.proxyTraps,
    {
      get(target, prop, proxy) {
        if (
          !(prop in target) &&
          (typeof prop === "string" || typeof prop === "number") &&
          String(prop)[0] === "$"
        ) {
          return getSignal(proxy, prop.substring(1) as keyof typeof target);
        }

        return ObjectAdministration.proxyTraps.get?.apply(
          null,
          arguments as any
        );
      },
    } as ProxyHandler<object>
  );
}

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

setAdministrationType({ object: PreactObjectAdministration }, graph);

export type PreactObservable<T> = {
  [key in keyof T]: T[key] extends Function
    ? T[key]
    : T[key] extends object
    ? PreactObservable<T[key]>
    : T[key];
} & {
  readonly [key in keyof T as T[key] extends object
    ? never
    : `$${string & key}`]?: Signal<T[key]>;
};

export function observable<T>(
  obj: T
): T extends
  | ReadonlyArray<any>
  | ReadonlyMap<any, any>
  | ReadonlySet<any>
  | WeakMap<any, any>
  | WeakSet<any>
  ? T
  : PreactObservable<T> {
  return getObservable(obj, graph) as any;
}

export function source<T>(obj: PreactObservable<T> | T): T {
  return getSource(obj) as T;
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
          },
        },
      });

      signalMap.set(node, signal);
    }

    return signal!;
  }

  return node;
}
