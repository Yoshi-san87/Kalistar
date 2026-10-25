const FIT_PADDING = 0.94;
const MIN_ZOOM = 0.85;
const MAX_ZOOM = 3;

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const finiteOrZero = value => Number.isFinite(value) ? value : 0;

/** Clamp numeric zoom to [0.85, 3]; omitted, nonnumeric or nonfinite values use 1. */
export function normalizeZoom(zoom = 1) {
  return Number.isFinite(zoom) ? clamp(zoom, MIN_ZOOM, MAX_ZOOM) : 1;
}

function requirePositive(value, name) {
  if (!Number.isFinite(value) || value <= 0) throw new RangeError(`${name} must be positive and finite`);
}

function measure(bounds, name) {
  if (!bounds || !['left', 'top', 'right', 'bottom'].every(key => Number.isFinite(bounds[key]))) {
    throw new RangeError(`${name} must have finite left, top, right and bottom coordinates`);
  }
  const width = bounds.right - bounds.left, height = bounds.bottom - bounds.top;
  requirePositive(width, `${name} width`);
  requirePositive(height, `${name} height`);
  return { width, height, x: bounds.left + width / 2, y: bounds.top + height / 2 };
}

function fitAxis(size, start, end, center, scale, desiredPan) {
  const base = size / 2 - center * scale;
  let min, max;
  if ((end - start) * scale <= size) {
    min = max = (center - (start + (end - start) / 2)) * scale;
  } else {
    min = size - end * scale - base;
    max = -start * scale - base;
  }
  const pan = clamp(finiteOrZero(desiredPan), min, max);
  return { position: base + pan, pan, limits: { min, max } };
}

/**
 * Pure uniform camera: screen = world * scale + {x, y}.
 * width/height and pan use viewport pixels, NOT device/backing-store pixels.
 * bounds encloses the artwork; focusBounds encloses pitch plus sprite headroom
 * in the same world coordinates and defaults to bounds. Rectangles must have
 * positive finite extents; viewport dimensions must be positive and finite.
 *
 * fitScale = 0.94 * min(width / focusWidth, height / focusHeight).
 * center is the focus center in world coordinates. pan is the applied pixel
 * offset from {width/2 - center.x*scale, height/2 - center.y*scale}, not the
 * requested drag. Nonfinite/nonnumeric pan components use zero.
 * limits.x/y are inclusive {min, max} intervals in those same pan units.
 * Small artwork axes are centered with fixed, equal bars, never stretched;
 * their pan interval is a singleton (not necessarily zero for offset focus).
 * Reuse returned pan for the next drag/layout to discard overscroll.
 * No inputs are mutated. Invalid geometry throws RangeError.
 */
export function fitViewport({ width, height, bounds, focusBounds = bounds, zoom = 1, pan = { x: 0, y: 0 } }) {
  requirePositive(width, 'width');
  requirePositive(height, 'height');
  measure(bounds, 'bounds');
  const focus = measure(focusBounds, 'focusBounds');
  const fitScale = FIT_PADDING * Math.min(width / focus.width, height / focus.height);
  const scale = fitScale * normalizeZoom(zoom);
  requirePositive(scale, 'scale');
  const horizontal = fitAxis(width, bounds.left, bounds.right, focus.x, scale, pan?.x);
  const vertical = fitAxis(height, bounds.top, bounds.bottom, focus.y, scale, pan?.y);
  return {
    scale, x: horizontal.position, y: vertical.position,
    pan: { x: horizontal.pan, y: vertical.pan }, fitScale,
    limits: { x: horizontal.limits, y: vertical.limits },
    center: { x: focus.x, y: focus.y },
  };
}

/**
 * Return a fitViewport layout at an ABSOLUTE zoom, preserving the world point
 * under point (viewport-local pixels; defaults to viewport center).
 * layout is the previous transform. Artwork clamps take precedence over anchor
 * preservation on each axis independently. Store returned pan and normalized
 * zoom in the caller. No DOM, Pixi objects, events or input mutation are used.
 * Invalid source transform or anchor coordinates throw RangeError.
 */
export function zoomAt({ layout, width, height, bounds, focusBounds = bounds, zoom = 1,
  point = { x: width / 2, y: height / 2 } }) {
  requirePositive(layout?.scale, 'layout.scale');
  if (![layout.x, layout.y, point?.x, point?.y].every(Number.isFinite)) {
    throw new RangeError('layout position and point must be finite');
  }
  const next = fitViewport({ width, height, bounds, focusBounds, zoom });
  const world = { x: (point.x - layout.x) / layout.scale, y: (point.y - layout.y) / layout.scale };
  const pan = {
    x: point.x - width / 2 + (next.center.x - world.x) * next.scale,
    y: point.y - height / 2 + (next.center.y - world.y) * next.scale,
  };
  return fitViewport({ width, height, bounds, focusBounds, zoom, pan });
}
