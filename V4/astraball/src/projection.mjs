import { GRID_COLUMNS, GRID_ROWS, canOccupy } from './core/geometry.mjs';

export const WIDTH = 1536, HEIGHT = 1024;
export const VIEWS = Object.freeze(['horizontal', 'isometric']);
export const cameraHeight = value => Number.isFinite(Number(value)) ? Math.max(0,Math.min(100,Number(value))) : 60;
// These limits come from the rule engine, not optical offsets in the artwork.
export const DEFENSE_ZONES = Object.freeze([0,1].map(team=>{
  const columns=Array.from({length:GRID_COLUMNS},(_,x)=>x).filter(x=>canOccupy({role:'pilier',team},x,0));
  return Object.freeze({team,left:columns[0],right:columns.at(-1)+1});
}));

export function contains(points, x, y) {
  let inside=false;
  for(let i=0,j=points.length-1;i<points.length;j=i++) {
    const a=points[i],b=points[j];
    if((a.y>y)!==(b.y>y) && x<(b.x-a.x)*(y-a.y)/(b.y-a.y)+a.x)inside=!inside;
  }
  return inside;
}

export function createProjection(view='isometric',height=60,ground=[356,812],art={}) {
  const mode=VIEWS.includes(view)?view:'horizontal',level=cameraHeight(height);
  const [top,bottom]=ground,centerY=(top+bottom)/2;
  const verticalScale=mode==='horizontal'&&!art.pixel?.64+level*.006:1;
  const groundY=y=>centerY+(y-centerY)*verticalScale;
  const inset=art.inset??104,nearInset=art.nearInset??inset;
  const corners=mode==='horizontal'
    ?[[inset,groundY(top)],[WIDTH-inset,groundY(top)],[WIDTH-nearInset,groundY(bottom)],[nearInset,groundY(bottom)]]
    :[[610,244],[1442,508],[835,902],[116,477]];
  function project(x,y) {
    const u=x/GRID_COLUMNS,v=y/GRID_ROWS;
    return {x:(1-u)*(1-v)*corners[0][0]+u*(1-v)*corners[1][0]+u*v*corners[2][0]+(1-u)*v*corners[3][0],
      y:(1-u)*(1-v)*corners[0][1]+u*(1-v)*corners[1][1]+u*v*corners[2][1]+(1-u)*v*corners[3][1]};
  }
  const center=(x,y)=>project(x+.5,y+.5);
  const polygon=(x,y)=>[project(x,y),project(x+1,y),project(x+1,y+1),project(x,y+1)];
  function pick(x,y) {
    for(let row=0;row<GRID_ROWS;row++)for(let col=0;col<GRID_COLUMNS;col++)
      if(contains(polygon(col,row),x,y))return {x:col,y:row};
    return null;
  }
  return Object.freeze({mode,height:level,verticalScale,groundY,top,bottom,centerY,project,center,polygon,pick});
}
// Preserve the original projection for older callers and saved-coordinate proofs.
export const {project,center,polygon,pick}=createProjection('isometric');
