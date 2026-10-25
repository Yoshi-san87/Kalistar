import assert from 'node:assert/strict';
import test from 'node:test';
import { fitViewport, normalizeZoom, zoomAt } from '../src/viewport.mjs';
import { createProjection, WIDTH, HEIGHT } from '../src/projection.mjs';
import { ARENAS } from '../src/appearance.mjs';

const bounds = Object.freeze({ left: 0, top: 0, right: WIDTH, bottom: HEIGHT });
const focusBounds = Object.freeze({ left: 104, top: 140, right: 1442, bottom: 922 });
const widths = [360, 412, 915, 1440, 1920];
const sizes = widths.flatMap(width => [160, 412, 900, 1440, 2560].map(height => ({ width, height })));
sizes.push({ width: 1, height: 10000 }, { width: 10000, height: 1 });
const zooms = [0.85, 1, 1.01, 1.25, 1.7, 2, 2.2, 3];
const pans = [{ x: 0, y: 0 }, { x: 75.5, y: -92.25 },
  { x: 1e12, y: 1e12 }, { x: -1e12, y: -1e12 },
  { x: 1e12, y: -1e12 }, { x: -1e12, y: 1e12 }];
const epsilon = 1e-8;
const close = (actual, expected, message = '') => {
  assert.ok(Math.abs(actual - expected) <= epsilon, `${message}: ${actual} != ${expected}`);
};
const screen = (layout, point) => ({ x: point.x * layout.scale + layout.x, y: point.y * layout.scale + layout.y });
const world = (layout, point) => ({ x: (point.x - layout.x) / layout.scale, y: (point.y - layout.y) / layout.scale });
function finite(value) {
  for (const entry of Object.values(value)) {
    if (typeof entry === 'object') finite(entry);
    else assert.ok(Number.isFinite(entry), `nonfinite output: ${entry}`);
  }
}
function contained(layout, points, width, height) {
  for (const point of points) {
    const p = screen(layout, point);
    assert.ok(p.x >= -epsilon && p.x <= width + epsilon, `clipped x: ${p.x} / ${width}`);
    assert.ok(p.y >= -epsilon && p.y <= height + epsilon, `clipped y: ${p.y} / ${height}`);
  }
}
function artworkClamped(layout, width, height, art = bounds) {
  for (const [axis, size, start, end] of [['x', width, art.left, art.right], ['y', height, art.top, art.bottom]]) {
    const first = start * layout.scale + layout[axis], last = end * layout.scale + layout[axis];
    const limits = layout.limits[axis];
    assert.ok(layout.pan[axis] >= limits.min && layout.pan[axis] <= limits.max);
    close(layout[axis], size / 2 - layout.center[axis] * layout.scale + layout.pan[axis]);
    if ((end - start) * layout.scale <= size) {
      close(first, size - last, `equal ${axis} bars`);
      assert.ok(first >= -epsilon && last <= size + epsilon);
      assert.equal(limits.min, limits.max);
    } else {
      assert.ok(first <= epsilon && last >= size - epsilon, `blank ${axis} edge: ${first}, ${last}`);
      close(size / 2 - layout.center[axis] * layout.scale + limits.min + end * layout.scale, size);
      close(size / 2 - layout.center[axis] * layout.scale + limits.max + start * layout.scale, 0);
    }
  }
}

test('zoom normalization bounds finite numbers and defaults invalid values without coercion', () => {
  for (const zoom of [-Number.MAX_VALUE, -1, 0, 0.84]) assert.equal(normalizeZoom(zoom), 0.85);
  for (const zoom of [3.01, 100, Number.MAX_VALUE]) assert.equal(normalizeZoom(zoom), 3);
  for (const zoom of zooms) assert.equal(normalizeZoom(zoom), zoom);
  for (const zoom of [undefined, null, NaN, Infinity, -Infinity, '2', '', false, {}, [], Symbol('zoom')]) {
    assert.equal(normalizeZoom(zoom), 1);
    const input = { width: 412, height: 900, bounds, focusBounds, zoom };
    const layout = fitViewport(input);
    finite(layout);
    assert.deepEqual(layout, fitViewport({ ...input, zoom: 1 }));
    finite(zoomAt({ ...input, layout, point: { x: 100, y: 200 } }));
  }
});

for (const { width, height } of sizes) {
  test(`uniform camera, bounded pans and stable normalization at ${width}x${height}`, () => {
    for (const zoom of zooms) for (const pan of pans) {
      const input = { width, height, bounds, focusBounds, zoom, pan };
      const layout = fitViewport(input);
      finite(layout);
      close(layout.fitScale, 0.94 * Math.min(width / 1338, height / 782));
      close(layout.scale, layout.fitScale * zoom);
      assert.deepEqual(layout.center, { x: 773, y: 531 });
      const origin = screen(layout, { x: 0, y: 0 });
      close(screen(layout, { x: 100, y: 0 }).x - origin.x, 100 * layout.scale);
      close(screen(layout, { x: 0, y: 100 }).y - origin.y, 100 * layout.scale);
      artworkClamped(layout, width, height);
      assert.deepEqual(fitViewport({ ...input, pan: layout.pan }), layout, 'normalized pan is exactly idempotent');
    }
  });
}

test('overview contains every pitch corner and sprite headroom in both views and arenas', () => {
  for (const arena of ARENAS) for (const view of ['horizontal', 'isometric']) for (const level of [0, 25, 60, 100]) {
    const projection = createProjection(view, level, arena.ground);
    const corners = [projection.project(0, 0), projection.project(13, 0), projection.project(13, 7), projection.project(0, 7)];
    const focus = {
      left: Math.min(...corners.map(p => p.x)) - 24,
      top: Math.min(...corners.map(p => p.y)) - 150,
      right: Math.max(...corners.map(p => p.x)) + 24,
      bottom: Math.max(...corners.map(p => p.y)) + 20,
    };
    const focusCorners = [{ x: focus.left, y: focus.top }, { x: focus.right, y: focus.bottom }];
    for (const { width, height } of sizes) for (const zoom of [0.85, 1]) {
      const layout = fitViewport({ width, height, bounds, focusBounds: focus, zoom });
      contained(layout, [...corners, ...focusCorners], width, height);
      artworkClamped(layout, width, height);
    }
  }
});

test('offset artwork has asymmetric pan limits and centered bars, including negative coordinates', () => {
  const art = { left: -400, top: -250, right: 600, bottom: 750 };
  const focus = { left: -300, top: -150, right: -100, bottom: 50 };
  const input = { width: 400, height: 400, bounds: art, focusBounds: focus };
  const layout = fitViewport(input);
  assert.deepEqual(layout.center, { x: -200, y: -50 });
  assert.deepEqual(layout.pan, { x: 0, y: 0 });
  assert.notEqual(layout.limits.x.min, -layout.limits.x.max);
  for (const pan of pans) {
    const clamped = fitViewport({ ...input, pan });
    artworkClamped(clamped, 400, 400, art);
    if (Math.abs(pan.x) > 1e6) assert.equal(clamped.pan.x, pan.x > 0 ? clamped.limits.x.max : clamped.limits.x.min);
    if (Math.abs(pan.y) > 1e6) assert.equal(clamped.pan.y, pan.y > 0 ? clamped.limits.y.max : clamped.limits.y.min);
  }
  const bars = fitViewport({ width: 400, height: 4000, bounds: art, focusBounds: focus, pan: { x: 1e12, y: -1e12 } });
  artworkClamped(bars, 400, 4000, art);
  assert.notEqual(bars.pan.y, 0, 'stored pan includes artwork-centering correction');
});

test('unpanned focus near an artwork edge is clamped without losing overview visibility', () => {
  const art = { left: 0, top: 0, right: 1000, bottom: 1000 };
  const focus = { left: 0, top: 0, right: 200, bottom: 200 };
  const layout = fitViewport({ width: 400, height: 400, bounds: art, focusBounds: focus });
  close(layout.x, 0);
  close(layout.y, 0);
  assert.ok(layout.pan.x < 0 && layout.pan.y < 0);
  contained(layout, [{ x: 0, y: 0 }, { x: 200, y: 200 }], 400, 400);
});

test('exact artwork coverage locks both axes and omitted focus fits the artwork', () => {
  const art = { left: -50, top: 20, right: 50, bottom: 120 };
  const layout = fitViewport({ width: 100, height: 100, bounds: art, zoom: 1 / 0.94, pan: { x: 1e12, y: -1e12 } });
  close(layout.scale, 1);
  close(layout.x, 50);
  close(layout.y, -20);
  artworkClamped(layout, 100, 100, art);
  const overview = fitViewport({ width: 100, height: 100, bounds: art });
  close(overview.fitScale, 0.94);
  assert.deepEqual(overview.center, { x: 0, y: 70 });
});

test('zoom preserves cursor world coordinates away from clamps, including zoom-out and round trips', () => {
  const art = { left: -10000, top: -10000, right: 10000, bottom: 10000 };
  const focus = { left: -200, top: -150, right: 400, bottom: 250 };
  for (const width of widths) for (const from of zooms) for (const to of zooms) {
    const input = { width, height: 640, bounds: art, focusBounds: focus };
    const layout = fitViewport({ ...input, zoom: from, pan: { x: 43.5, y: -27.75 } });
    for (const point of [{ x: width / 2, y: 320 }, { x: 0, y: 0 }, { x: width * 0.83, y: 557 }]) {
      const anchor = world(layout, point);
      const next = zoomAt({ ...input, layout, zoom: to, point });
      close(next.scale, next.fitScale * to);
      close(screen(next, anchor).x, point.x);
      close(screen(next, anchor).y, point.y);
      assert.ok(next.pan.x > next.limits.x.min && next.pan.x < next.limits.x.max);
      assert.ok(next.pan.y > next.limits.y.min && next.pan.y < next.limits.y.max);
      const roundTrip = zoomAt({ ...input, layout: next, zoom: from, point });
      close(roundTrip.x, layout.x);
      close(roundTrip.y, layout.y);
      assert.deepEqual(fitViewport({ ...input, zoom: to, pan: next.pan }), next);
    }
  }
});

test('zoom prioritizes artwork limits on a blocked axis while preserving the other anchor axis', () => {
  const input = { width: 400, height: 400,
    bounds: { left: 0, top: -1000, right: 1000, bottom: 1000 },
    focusBounds: { left: 250, top: -200, right: 750, bottom: 200 } };
  const layout = fitViewport({ ...input, zoom: 2, pan: { x: 1e12, y: 0 } });
  const point = { x: 300, y: 170 }, anchor = world(layout, point);
  const next = zoomAt({ ...input, layout, zoom: 1, point });
  assert.equal(next.pan.x, next.limits.x.max);
  assert.ok(Math.abs(screen(next, anchor).x - point.x) > 1);
  close(screen(next, anchor).y, point.y);
  artworkClamped(next, input.width, input.height, input.bounds);
});

test('zooming to a smaller artwork keeps equal bars after arbitrarily large drags', () => {
  const input = { width: 1920, height: 900, bounds };
  const layout = fitViewport({ ...input, zoom: 3, pan: { x: -1e12, y: 1e12 } });
  const next = zoomAt({ ...input, layout, zoom: 0.85, point: { x: 0, y: 900 } });
  artworkClamped(next, input.width, input.height);
  assert.equal(next.limits.x.min, next.limits.x.max);
  assert.equal(next.limits.y.min, next.limits.y.max);
});

test('invalid pan components are normalized independently and inputs remain untouched', () => {
  const input = Object.freeze({ width: 915, height: 640, bounds, focusBounds, zoom: 2,
    pan: Object.freeze({ x: NaN, y: 50 }) });
  const layout = fitViewport(input);
  assert.deepEqual(layout, fitViewport({ ...input, pan: { x: 0, y: 50 } }));
  assert.ok(Number.isNaN(input.pan.x));
  assert.equal(input.pan.y, 50);
  for (const pan of [null, {}, { x: Infinity, y: -Infinity }, { x: '5', y: Symbol('pan') }]) {
    assert.deepEqual(fitViewport({ ...input, pan }), fitViewport({ ...input, pan: { x: 0, y: 0 } }));
  }
  const before = structuredClone(layout), point = Object.freeze({ x: 200, y: 300 });
  Object.freeze(layout.pan); Object.freeze(layout.center); Object.freeze(layout);
  finite(zoomAt({ ...input, layout, zoom: 3, point }));
  assert.deepEqual(layout, before);
  assert.deepEqual(point, { x: 200, y: 300 });
  assert.deepEqual(zoomAt({ ...input, layout, zoom: 3 }),
    zoomAt({ ...input, layout, zoom: 3, point: { x: input.width / 2, y: input.height / 2 } }));
});

test('invalid viewport geometry and source transforms fail explicitly', () => {
  const input = { width: 412, height: 900, bounds, focusBounds };
  for (const key of ['width', 'height']) for (const value of [0, -1, Infinity, NaN, undefined, '400']) {
    assert.throws(() => fitViewport({ ...input, [key]: value }), RangeError);
  }
  for (const key of ['bounds', 'focusBounds']) for (const value of [null, {}, { ...bounds, right: 0 },
    { ...bounds, bottom: -1 }, { ...bounds, left: NaN }, { ...bounds, top: Infinity }]) {
    assert.throws(() => fitViewport({ ...input, [key]: value }), RangeError);
  }
  const layout = fitViewport(input);
  for (const invalid of [null, {}, { ...layout, scale: 0 }, { ...layout, scale: Infinity }, { ...layout, x: NaN }]) {
    assert.throws(() => zoomAt({ ...input, layout: invalid, zoom: 2 }), RangeError);
  }
  assert.throws(() => zoomAt({ ...input, layout, zoom: 2, point: { x: Infinity, y: 100 } }), RangeError);
});
