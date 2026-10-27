export const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
export function duration(timing) { return Object.values(timing).reduce((sum, n) => sum + n, 0); }

// Body, instrument, sound events and magic all sample this same simulation clock.
export function sampleSequence(ms, timing, reduced = false) {
  let t = Math.max(0, ms);
  const phases = Object.entries(timing);
  let phase = 'done', local = 0, progress = 1;
  for (const [name, length] of phases) {
    if (t < length) { phase = name; local = t; progress = t / length; break; }
    t -= length;
  }
  let frame = 0, intensity = 0;
  if (phase === 'lift') frame = [100, 101, 54][Math.min(2, Math.floor(progress * 3))];
  if (phase === 'inhale') { frame = 55; intensity = progress * 0.35; }
  if (phase === 'sustain') {
    frame = reduced ? 55 : [55, 58, 55, 56, 55, 58][Math.floor(local / 400) % 6];
    intensity = 0.65 + 0.35 * Math.sin(Math.PI * progress);
  }
  if (phase === 'lower') { frame = [59, 101, 100][Math.min(2, Math.floor(progress * 3))]; intensity = (1 - progress) * 0.3; }
  if (phase === 'tail' || phase === 'done') intensity = 0;
  return { phase, local, progress, frame, intensity, emitting: phase === 'sustain' || phase === 'inhale', complete: phase === 'done' };
}

export function instrumentPose(config, frame, actor) {
  const socket = config.sockets[String(frame)] || config.sockets['0'];
  const anchor = socket.mouth || socket.support || socket.hold;
  const pivot = socket.mouth || socket.support ? config.flute.mouth : config.flute.grip;
  const cos = Math.cos(socket.angle), sin = Math.sin(socket.angle);
  const point = ([x, y]) => {
    const dx = x - pivot[0], dy = y - pivot[1];
    return {
      x: actor.x + actor.facing * (anchor[0] - config.sprite.root[0] + cos * dx - sin * dy),
      y: actor.y + anchor[1] - config.sprite.root[1] + sin * dx + cos * dy,
    };
  };
  return { socket, anchor, pivot, emitter: point(config.flute.emitter), mouth: point(config.flute.mouth), point };
}
