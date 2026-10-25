export const GRID_COLUMNS = 13;
export const GRID_ROWS = 7;
export const GOAL_ROWS = Object.freeze([2, 3, 4]);

export const distance = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

export function isPitch(x, y) {
  return Number.isInteger(x) && Number.isInteger(y)
    && x >= 1 && x <= 11 && y >= 0 && y < GRID_ROWS;
}

export function canOccupy(unit, x, y) {
  return isPitch(x, y) && (unit.role !== 'pilier'
    || (unit.team === 0 ? x <= 3 : x >= 9));
}

export function inDefense(team, x, y) {
  return isPitch(x, y) && (team === 0 ? x <= 3 : x >= 9);
}

export function inOwnHalf(team, x, y) {
  return isPitch(x, y) && (team === 0 ? x < 6 : x > 6);
}

export function isOpponentGoal(team, x, y) {
  return x === (team === 0 ? 12 : 0) && GOAL_ROWS.includes(y);
}

/**
 * Conservative center-to-center supercover, including both endpoints.
 * At an exact corner: horizontal neighbor, vertical neighbor, then diagonal.
 * Thus even a corner-touch defender intercepts; x-first breaks equal-time ties.
 * Integer cross products avoid floating-point omissions at corners.
 */
export function supercover(from, to) {
  let { x, y } = from;
  const dx = Math.abs(to.x - x);
  const dy = Math.abs(to.y - y);
  const sx = Math.sign(to.x - x);
  const sy = Math.sign(to.y - y);
  let ix = 0;
  let iy = 0;
  const cells = [{ x, y }];
  while (ix < dx || iy < dy) {
    const cross = (1 + 2 * ix) * dy - (1 + 2 * iy) * dx;
    if (cross === 0) {
      cells.push({ x: x + sx, y }, { x, y: y + sy });
      x += sx;
      y += sy;
      ix += 1;
      iy += 1;
    } else if (cross < 0) {
      x += sx;
      ix += 1;
    } else {
      y += sy;
      iy += 1;
    }
    cells.push({ x, y });
  }
  return cells;
}
