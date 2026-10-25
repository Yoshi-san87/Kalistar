import { VIEWS, cameraHeight } from './projection.mjs';
import { PIXEL_ARENAS } from '../data/venues.mjs';

export const BALLS=Object.freeze([
  {id:'founders',name:'Les Fondateurs',material:'Cuir, bronze et lumi\u00e8re astrale',color:0x93cfff},
  {id:'orbital',name:'Noyau orbital',material:'Cristal stellaire et anneaux d\u2019or',color:0xc3b2ff},
  {id:'celestial',name:'Tissage c\u00e9leste',material:'Ivoire grav\u00e9 et fibres c\u00e9lestes',color:0xffe5af},
  {id:'rhinoz',name:'Rempart Rhinoz',material:'Cuir renforc\u00e9 et bronze de Durane',color:0xe7be83},
  {id:'cerelf',name:'Harmonie Cerelf',material:'\u00c9corce d\u2019ivoire et c\u0153ur lumineux',color:0xa2efb8},
  {id:'league',name:'\u00c9dition Ligue',material:'Armature claire et \u00e9nergie bleue',color:0x85d7ff},
].map(ball=>Object.freeze({...ball,url:'assets/balls-v1/'+ball.id+'.webp'})));
export const getBall=id=>BALLS.find(ball=>ball.id===id)||BALLS[0];
export const ARENAS=Object.freeze([
  ...PIXEL_ARENAS,
  {id:'resonances',name:'Cour des r\u00e9sonances',region:'Les hauts d\u2019Astralia',surface:'Pierre et mousse',horizontal:'assets/arena-horizontal-v1.webp',isometric:'assets/arena-v1.webp',lines:0xffe6ac,whiteLines:false},
  {id:'rhinoz',name:'Terrain de Zarok',region:'Village Rhinoz',surface:'Sable compact \u00b7 lignes blanches',horizontal:'assets/rhinoz-horizontal-v2.webp',isometric:'assets/rhinoz-isometric-v2.webp',lines:0xffffff,whiteLines:true,ground:Object.freeze([310,775])},
].map(arena=>Object.freeze(arena)));
export const getArena=id=>ARENAS.find(arena=>arena.id===id)||ARENAS.find(arena=>arena.id==='kalistopolis-official');
export function normalizeAppearance(value={}) {
  const arena=getArena(value?.arena),views=arena.views||VIEWS;
  return {view:views.includes(value?.view)?value.view:'horizontal',height:cameraHeight(value?.height??60),ball:getBall(value?.ball).id,arena:arena.id};
}
