import "@testing-library/jest-dom/vitest"

// jsdom has no Web Animations API: finish every animation instantly.
if (!Element.prototype.animate) {
  Element.prototype.animate = function animate() {
    return { finished: Promise.resolve(), cancel() {}, finish() {} } as unknown as Animation
  }
}
if (!window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener() {},
      removeEventListener() {},
      addListener() {},
      removeListener() {},
      dispatchEvent: () => false,
    }) as MediaQueryList
}
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver
