// Optical foot/top anchors in the 512 x 768 exports, independent of game rules.
const art={
  "white": {
    "url": "assets/goals-v1/white.webp",
    "near": [
      190,
      675
    ],
    "far": [
      352.5,
      390
    ],
    "nearTop": [
      190,
      367.5
    ],
    "farTop": [
      352.5,
      107.5
    ]
  },
  "wood": {
    "url": "assets/goals-v1/wood.webp",
    "near": [
      177.5,
      692.5
    ],
    "far": [
      359,
      372.5
    ],
    "nearTop": [
      177.5,
      357.5
    ],
    "farTop": [
      359,
      52.5
    ]
  },
  "iron": {
    "url": "assets/goals-v1/iron.webp",
    "near": [
      170,
      710
    ],
    "far": [
      357.5,
      380
    ],
    "nearTop": [
      170,
      355
    ],
    "farTop": [
      357.5,
      27.5
    ]
  },
  "stone": {
    "url": "assets/goals-v1/stone.webp",
    "near": [
      160,
      710
    ],
    "far": [
      365,
      385
    ],
    "nearTop": [
      160,
      340
    ],
    "farTop": [
      365,
      37.5
    ]
  },
  "ivory": {
    "url": "assets/goals-v1/ivory.webp",
    "near": [
      165,
      705
    ],
    "far": [
      357.5,
      355
    ],
    "nearTop": [
      165,
      337.5
    ],
    "farTop": [
      357.5,
      40
    ]
  },
  "white-isometric": {
    "url": "assets/goals-v1/white-isometric.webp",
    "near": [
      105,
      665
    ],
    "far": [
      430,
      490
    ],
    "nearTop": [
      105,
      295
    ],
    "farTop": [
      430,
      107.5
    ]
  },
  "wood-isometric": {
    "url": "assets/goals-v1/wood-isometric.webp",
    "near": [
      97.5,
      665
    ],
    "far": [
      435,
      465
    ],
    "nearTop": [
      97.5,
      230
    ],
    "farTop": [
      435,
      57.5
    ]
  }
};
export const GOAL_ART=Object.freeze(Object.fromEntries(Object.entries(art).map(([id,value])=>
  [id,Object.freeze({...value,near:Object.freeze(value.near),far:Object.freeze(value.far),
    nearTop:Object.freeze(value.nearTop),farTop:Object.freeze(value.farTop)})])));
export function getGoalArt(arena,view='horizontal'){
  const material=arena.whiteLines?'white':arena.goalMaterial||'wood';
  const id=view==='isometric'?material+'-isometric':material;
  return {material,...(GOAL_ART[id]||GOAL_ART.wood)};
}
export function goalAssetUrls(arena){
  return [...new Set((arena.views||['horizontal','isometric']).map(view=>getGoalArt(arena,view).url))];
}
export function layoutGoal(camera,arena,team){
  const asset=getGoalArt(arena,camera.mode),x=team===0?.5:12.5;
  const far=camera.project(x,2),near=camera.project(x,5);
  const horizontal=camera.mode==='horizontal',direction=horizontal&&team===1?-1:1;
  const span=horizontal?near.y-far.y:Math.hypot(near.x-far.x,near.y-far.y);
  const sourceSpan=horizontal?asset.near[1]-asset.far[1]:
    Math.hypot(asset.near[0]-asset.far[0],asset.near[1]-asset.far[1]);
  const scale=span/sourceSpan,center={x:(near.x+far.x)/2,y:(near.y+far.y)/2};
  const pivot={x:(asset.near[0]+asset.far[0])/2,y:(asset.near[1]+asset.far[1])/2};
  const point=([px,py])=>({x:center.x+(px-pivot.x)*scale*direction,y:center.y+(py-pivot.y)*scale});
  return {team,url:asset.url,material:asset.material,center,pivot,scale,direction,
    posts:[asset.farTop,asset.far,asset.near,asset.nearTop].map(point),
    height:((asset.near[1]-asset.nearTop[1])+(asset.far[1]-asset.farTop[1]))/2*scale};
}
