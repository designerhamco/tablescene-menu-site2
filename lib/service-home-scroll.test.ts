import assert from "node:assert/strict";
import test from "node:test";
import { HOME_START_EVENT, scrollToHomeService, scrollToHomeStart } from "./service-home-scroll";

function environment(initialReady: boolean) {
  let nextFrame = 0, ready = initialReady, scrollY = 7000;
  const frames = new Map<number, FrameRequestCallback>();
  const listeners = new Map<string, Set<() => void>>();
  const moves: string[] = [];
  const behaviors: (ScrollBehavior | undefined)[] = [];
  const events: string[] = [];
  const observers: Observer[] = [];
  class Observer {
    constructor(readonly callback: () => void) { observers.push(this); }
    observe() {}
    disconnect() {}
  }
  const values = {
    window: {
      location: { pathname: "/" },
      get scrollY() { return scrollY; },
      dispatchEvent(event: Event) { events.push(event.type); },
      addEventListener(name: string, callback: () => void) { if (!listeners.has(name)) listeners.set(name, new Set()); listeners.get(name)!.add(callback); },
      removeEventListener(name: string, callback: () => void) { listeners.get(name)?.delete(callback); },
      scrollTo({ top, behavior }: ScrollToOptions) { scrollY = top!; moves.push("start"); behaviors.push(behavior); },
    },
    document: {
      body: {},
      fonts: { status: "loaded", ready: Promise.resolve() },
      querySelector(selector: string) { return selector === "[data-hero-motion]" ? { dataset: { reduced: "false" } } : {}; },
      querySelectorAll() { return Array.from({ length: 3 }, () => ({ dataset: { ready: String(ready) } })); },
      getElementById(id: string) { return { scrollIntoView({ behavior }: ScrollIntoViewOptions) { scrollY = 9000; moves.push(id); behaviors.push(behavior); } }; },
    },
    MutationObserver: Observer,
    requestAnimationFrame(callback: FrameRequestCallback) { frames.set(++nextFrame, callback); return nextFrame; },
    cancelAnimationFrame(id: number) { frames.delete(id); },
  };
  const saved = new Map(Object.keys(values).map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  for (const [key, value] of Object.entries(values)) Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
  return {
    moves,
    behaviors,
    events,
    get scrollY() { return scrollY; },
    set scrollY(value: number) { scrollY = value; },
    flush() { const pending = [...frames.values()]; frames.clear(); for (const callback of pending) callback(0); },
    ready() { ready = true; for (const observer of observers) observer.callback(); },
    input(name: string) { for (const callback of [...listeners.get(name) ?? []]) callback(); },
    restore() {
      for (const [key, descriptor] of saved) {
        if (descriptor) Object.defineProperty(globalThis, key, descriptor);
        else Reflect.deleteProperty(globalThis, key);
      }
    },
  };
}

test("brand navigation supersedes a queued service jump and resets the page start", () => {
  const env = environment(true);
  const serviceCleanup = scrollToHomeService("service-dining", "smooth");
  const cleanup = scrollToHomeStart();
  try {
    assert.equal(env.scrollY, 0);
    env.flush();
    assert.deepEqual(env.moves, ["start"]);
    assert.deepEqual(env.behaviors, ["instant"]);
    assert.deepEqual(env.events, [HOME_START_EVENT]);
  } finally { cleanup(); serviceCleanup(); env.restore(); }
});

test("service navigation never jumps again after a demo becomes ready", () => {
  const env = environment(false);
  const cleanup = scrollToHomeService("service-dining", "smooth");
  try {
    env.flush();
    env.scrollY = 9200;
    env.ready(); env.input("scroll"); env.flush();
    assert.equal(env.scrollY, 9200);
    assert.deepEqual(env.moves, ["service-dining"]);
  } finally { cleanup(); env.restore(); }
});

test("late programmatic scrolling cannot replace an explicit brand destination", () => {
  const env = environment(false);
  const serviceCleanup = scrollToHomeService("service-display", "instant");
  assert.deepEqual(env.moves, ["service-display"]);
  env.flush();
  const cleanup = scrollToHomeStart();
  try {
    env.flush();
    env.scrollY = 5000; // A late embedded preview takes focus before it is ready.
    env.input("scroll"); env.ready(); env.flush();
    assert.equal(env.scrollY, 0);
    assert.deepEqual(env.moves, ["service-display", "start", "start"]);
    assert.deepEqual(env.behaviors, ["instant", "instant", "instant"]);
    assert.deepEqual(env.events, [HOME_START_EVENT]);
  } finally { cleanup(); serviceCleanup(); env.restore(); }
});

test("new user input ends a pending home reset and a later service choice remains authoritative", () => {
  const env = environment(false);
  const cleanup = scrollToHomeStart();
  let serviceCleanup = () => {};
  try {
    env.flush();
    env.input("wheel"); env.scrollY = 300;
    env.ready(); env.flush();
    assert.equal(env.scrollY, 300);
    serviceCleanup = scrollToHomeService("service-basic", "smooth");
    env.flush();
    assert.equal(env.scrollY, 9000);
    assert.deepEqual(env.moves, ["start", "service-basic"]);
  } finally { cleanup(); serviceCleanup(); env.restore(); }
});


test("a ready demo cannot move the explicit home start, but the next user scroll can", () => {
  const env = environment(true);
  const cleanup = scrollToHomeStart();
  try {
    env.flush();
    env.scrollY = 1200; env.input("scroll"); env.flush();
    assert.equal(env.scrollY, 0);
    env.input("touchstart");
    env.scrollY = 300; env.input("scroll"); env.flush();
    assert.equal(env.scrollY, 300);
  } finally { cleanup(); env.restore(); }
});
