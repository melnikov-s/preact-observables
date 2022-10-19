import { useComputed } from "@preact/signals";
import { createElement, render } from "preact";
import { setupRerender } from "preact/test-utils";
import { getSignal, observable } from "../src";

const sleep = (ms?: number) => new Promise((r) => setTimeout(r, ms));

describe("preact-observables", () => {
  let scratch: HTMLDivElement;
  let rerender: () => void;

  beforeEach(() => {
    scratch = document.createElement("div");
    rerender = setupRerender();
  });

  afterEach(() => {
    render(null, scratch);
  });

  describe("getSignal", () => {
    it("should render Signals as Text with getSignal", () => {
      const o = observable({ value: "test" });
      const signal = getSignal(o, "value");
      render(<span>{getSignal(o, "value")}</span>, scratch);
      const span = scratch.firstChild;
      expect(span).to.have.property("firstChild").that.is.an.instanceOf(Text);
      const text = span?.firstChild;
      expect(text).to.have.property("data", "test");
      o.value = "newValue";
      expect(text).to.have.property("data", "newValue");
      expect(o.value).toBe("newValue");
      o.value = "newValue2";
      expect(text).to.have.property("data", "newValue2");
      expect(signal.value).toBe("newValue2");
    });

  it("should render Signals as Text with the $ syntax", () => {
      const o = observable({ value: "test"});
      const signal = o.$value;
      render(<span>{o.$value}</span>, scratch);
      const span = scratch.firstChild;
      expect(span).to.have.property("firstChild").that.is.an.instanceOf(Text);
      const text = span?.firstChild;
      expect(text).to.have.property("data", "test");
      o.value = "newValue";
      expect(text).to.have.property("data", "newValue");
      expect(signal.value).toBe("newValue");
      o.value = "newValue2";
      expect(text).to.have.property("data", "newValue2");
      expect(signal.value).toBe("newValue2");
    });

  it("should render Computed as Text with the $ syntax", () => {
      const o = observable({ value: 1, get double() {return o.value * 2}});
      const computed = o.$double;
      render(<span>{o.$double}</span>, scratch);
      const span = scratch.firstChild;
      expect(span).to.have.property("firstChild").that.is.an.instanceOf(Text);
      const text = span?.firstChild;
      expect(text).to.have.property("data", "2");
      o.value = 2;
      expect(text).to.have.property("data", "4");
      expect(o.$double.value).toBe(4);
      o.value = 3;
      expect(text).to.have.property("data", "6");
      expect(computed.value).toBe(6);
    });

    it("signal returned form getSignal reflects value on object", () => {
      const o = observable({value: "test"});
      const signal = getSignal(o, "value");
      expect(signal.value).toBe("test");
      o.value = "newValue";
      expect(signal.value).toBe("newValue");
      signal.value = "newValue2";
      expect(o.value).toBe("newValue2");
      expect(signal.value).toBe("newValue2");
    });

    it("signal returned from getSignal works with peek()", () => {
      const o = observable({value: "test"});
      const signal = getSignal(o, "value");
      expect(signal.peek()).toBe("test");
      o.value = "newValue";
      expect(signal.peek()).toBe("newValue");
    });
  });

  describe("Text bindings", () => {
    it("should render Signals as Text", () => {
      const o = observable({ value: "test" });
      render(<span>{getSignal(o, "value")}</span>, scratch);
      const span = scratch.firstChild;
      expect(span).to.have.property("firstChild").that.is.an.instanceOf(Text);
      const text = span?.firstChild;
      expect(text).to.have.property("data", "test");
    });

    it("should support swapping Signals in Text positions", async () => {
      const o = observable({ value: "test" });
      const spy = vi.fn();
      function App({ x }: { x: typeof o }) {
        spy();
        return <span>{getSignal(x, "value")}</span>;
      }
      render(<App x={o} />, scratch);
      spy.mockReset();

      const text = scratch.firstChild!.firstChild!;
      expect(text).to.have.property("data", "test");

      const o2 = observable({ value: "different" });
      render(<App x={o2} />, scratch);
      expect(spy).to.toHaveBeenCalled();
      spy.mockReset();

      // should not remount/replace Text
      expect(scratch.firstChild!.firstChild!).to.equal(text);
      // should update the text in-place
      expect(text).to.have.property("data", "different");

      await sleep();
      expect(spy).not.toHaveBeenCalled();

      o.value = "changed old signal";

      await sleep();
      expect(spy).not.toHaveBeenCalled();
      // the text should _not_ have changed:
      expect(text).to.have.property("data", "different");

      o2.value = "changed";

      expect(scratch.firstChild!.firstChild!).to.equal(text);
      expect(text).to.have.property("data", "changed");

      await sleep();
      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe("Component bindings", () => {
    it("should subscribe to signals", () => {
      const o = observable({ value: "foo" });

      function App() {
        const value = o.value;
        return <p>{value}</p>;
      }

      render(<App />, scratch);
      expect(scratch.textContent).to.equal("foo");

      o.value = "bar";
      rerender();
      expect(scratch.textContent).to.equal("bar");
    });

    it("should activate signal accessed in render", () => {
      const o = observable({ value: null });

      function App() {
        const arr = useComputed(() => {
          // trigger read
          o.value;

          return [];
        });

        const str = arr.value.join(", ");
        return <p>{str}</p>;
      }

      const fn = () => render(<App />, scratch);
      expect(fn).not.to.throw;
    });

    it("should not subscribe to child signals", () => {
      const o = observable({ value: "foo" });

      function Child() {
        const value = o.value;
        return <p>{value}</p>;
      }

      const spy = vi.fn();
      function App() {
        spy();
        return <Child />;
      }

      render(<App />, scratch);
      expect(scratch.textContent).to.equal("foo");

      o.value = "bar";
      rerender();
      expect(spy).to.toHaveBeenCalledOnce();
    });

    it("should not subscribe to unrelated property changes", () => {
      const o = observable([
        { value: 1 },
        { value: 2 },
        { value: 3, unrelated: 0 },
      ]);

      const spy = vi.fn();
      function App() {
        spy();
        return <span>{o.map(({ value }) => value).join(" ")}</span>;
      }

      render(<App />, scratch);
      expect(scratch.textContent).to.equal("1 2 3");

      expect(spy).to.toHaveBeenCalledOnce();
      spy.mockReset();

      o[2].unrelated = 1;
      rerender();

      expect(spy).not.to.toHaveBeenCalled();
      o[2].value = 4;
      rerender();

      expect(spy).to.toHaveBeenCalledOnce();
      expect(scratch.textContent).to.equal("1 2 4");
    });

    it("should update with useComputed", () => {
      const o = observable([{ value: 1 }, { value: 2 }, { value: 3 }]);

      const spy = vi.fn();
      function App() {
        spy();
        const arr = useComputed(() => {
          return o.map(({ value }) => value).join(" ");
        });
        return <span>{arr}</span>;
      }

      render(<App />, scratch);
      expect(scratch.textContent).to.equal("1 2 3");

      expect(spy).to.toHaveBeenCalledOnce();
      spy.mockReset();

      expect(spy).not.to.toHaveBeenCalled();
      o[2].value = 4;

      expect(spy).not.to.toHaveBeenCalled();
      expect(scratch.textContent).to.equal("1 2 4");
    });
  });

  describe("prop bindings", () => {
    it("should set the initial value of the checked property", () => {
      const o = observable({ value: true });
      // @ts-ignore
      render(<input checked={getSignal(o, "value")} />, scratch);

      expect(scratch.firstChild).to.have.property("checked", true);
      expect(o.value).to.equal(true);
    });

    it("should update the checked property on change", () => {
      const o = observable({ value: true });
      // @ts-ignore
      render(<input checked={getSignal(o, "value")} />, scratch);

      expect(scratch.firstChild).to.have.property("checked", true);

      o.value = false;

      expect(scratch.firstChild).to.have.property("checked", false);
    });

    it("should update props without re-rendering", async () => {
      const o = observable({ value: "initial" });
      const spy = vi.fn();
      function Wrap() {
        spy();
        // @ts-ignore
        return <input value={getSignal(o, "value")} />;
      }
      render(<Wrap />, scratch);
      spy.mockReset();

      expect(scratch.firstChild).to.have.property("value", "initial");

      o.value = "updated";

      expect(scratch.firstChild).to.have.property("value", "updated");

      // ensure the component was never re-rendered: (even after a tick)
      await sleep();
      expect(spy).not.toHaveBeenCalled();

      o.value = "second update";

      expect(scratch.firstChild).to.have.property("value", "second update");

      // ensure the component was never re-rendered: (even after a tick)
      await sleep();
      expect(spy).not.toHaveBeenCalled();
    });

    it("should set and update string style property", async () => {
      const style = observable({ value: "left: 10px" });
      const spy = vi.fn();
      function Wrap() {
        spy();
        // @ts-ignore
        return <div style={getSignal(style, "value")} />;
      }
      render(<Wrap />, scratch);
      spy.mockReset();

      const div = scratch.firstChild as HTMLDivElement;

      expect(div.style).to.have.property("left", "10px");

      // ensure the component was never re-rendered: (even after a tick)
      await sleep();
      expect(spy).not.toHaveBeenCalled();

      style.value = "left: 20px;";

      expect(div.style).to.have.property("left", "20px");

      // ensure the component was never re-rendered: (even after a tick)
      await sleep();
      expect(spy).not.toHaveBeenCalled();
    });
  });
});
