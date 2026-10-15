const {fs,path,root,layout,W,H,output,raw,save,inside}=require('./common.cjs');
async function main(){
  const art=Buffer.alloc(W*H*4);
  for(let y=0;y<H;y++)for(let x=0;x<W;x++)if(inside(x+.5,y+.5,layout.artPolygon)){
    const i=(y*W+x)*4,odd=(Math.floor(x/70)+Math.floor(y/70))%2;
    art[i]=odd?45:81;art[i+1]=odd?113:149;art[i+2]=odd?112:148;art[i+3]=255;
  }
  await save('verification/art-registration.png',art);
  console.log('Illustration technique de controle creee.');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
