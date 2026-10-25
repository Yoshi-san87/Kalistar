export const WIDTH = 1536, HEIGHT = 1024;
// Optical corners of the painted pitch; one transform serves drawing and picking.
const corners = [[610,244],[1442,508],[835,902],[116,477]];
export function project(x,y) {
  const u=x/13, v=y/7;
  return {x: (1-u)*(1-v)*corners[0][0]+u*(1-v)*corners[1][0]+u*v*corners[2][0]+(1-u)*v*corners[3][0],
    y: (1-u)*(1-v)*corners[0][1]+u*(1-v)*corners[1][1]+u*v*corners[2][1]+(1-u)*v*corners[3][1]};
}
export const center = (x,y) => project(x+.5,y+.5);
export const polygon = (x,y) => [project(x,y),project(x+1,y),project(x+1,y+1),project(x,y+1)];
export function contains(points, x, y) {
  let inside=false;
  for(let i=0,j=points.length-1;i<points.length;j=i++) {
    const a=points[i],b=points[j];
    if((a.y>y)!==(b.y>y) && x<(b.x-a.x)*(y-a.y)/(b.y-a.y)+a.x)inside=!inside;
  }
  return inside;
}
export function pick(x,y) {
  for(let row=0;row<7;row++)for(let col=0;col<13;col++)if(contains(polygon(col,row),x,y))return {x:col,y:row};
  return null;
}
