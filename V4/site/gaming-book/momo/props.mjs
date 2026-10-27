export function searchSiteLayout(config,site,image){
  const x=config.route[site.routeKey]+site.offsetX;
  const y=config.world.groundY-site.depth-image.height;
  return {id:site.id,x,y,width:image.width,height:image.height,
    flute:site.id==='flute'?{x:x+27,y:y+4}:null};
}

export function stairLandingLayout(config){
  const x=config.route.stairsX+config.stairs.width-config.stairs.overlap;
  return {x,y:config.world.groundY-config.stairs.height,width:Math.max(0,config.world.width-x),height:config.stairs.height};
}
