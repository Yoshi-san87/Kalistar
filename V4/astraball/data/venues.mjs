// Ground bounds follow each painted surface without warping its architecture.
const GROUNDS={
  'durane-street':[460,810],'durane-official':[490,755],
  'woodland-street':[425,755],'woodland-official':[470,720],
  'kalistopolis-street':[450,760],'kalistopolis-official':[465,790],
  'arborium-street':[385,800],'arborium-official':[420,680],
  'velane-street':[410,780],'velane-official':[440,760],
  'vulkar-street':[480,810],'vulkar-official':[440,730],
  'cryptown-street':[375,700],'cryptown-official':[460,725],
  'thalassea-street':[460,680],'thalassea-official':[465,740],
  'zarok-street':[315,760],'zarok-official':[315,760],astrium:[325,700],
};
const FLAG_CITIES=new Set(['durane','woodland','arborium','vulkar','cryptown','thalassea','zarok']);
export const PIXEL_ARENAS=Object.freeze([
  {
    id:'durane-street',cityId:'durane',city:'Durane',kind:'street',
    name:'Cour des ateliers',region:'Rebord du grand crat\u00e8re',
    surface:'Terre battue',goalMaterial:'wood',goalColor:0x95633e,
  },
  {
    id:'durane-official',cityId:'durane',city:'Durane',kind:'official',
    name:'Stade de l\u2019Ob\u00e9lisque',region:'Rebord du grand crat\u00e8re',
    surface:'Pierre grise',goalMaterial:'iron',goalColor:0x89949d,
  },
  {
    id:'woodland-street',cityId:'woodland',city:'WoodLand',kind:'street',
    name:'Cour des passerelles',region:'Terre des Cerelf',
    surface:'Terre et herbe rase',goalMaterial:'wood',goalColor:0x95633e,
  },
  {
    id:'woodland-official',cityId:'woodland',city:'WoodLand',kind:'official',
    name:'Stade des deux bois',region:'Terre des Cerelf',
    surface:'Gazon court',goalMaterial:'ivory',goalColor:0xeee2c6,
  },
  {
    id:'kalistopolis-street',cityId:'kalistopolis',city:'Kalistopolis',kind:'street',
    name:'Cour des hauteurs',region:'\u00cele centrale',
    surface:'Pierre claire',goalMaterial:'stone',goalColor:0xa7aaa4,
  },
  {
    id:'kalistopolis-official',cityId:'kalistopolis',city:'Kalistopolis',kind:'official',
    name:'Stade du sanctuaire',region:'\u00cele centrale',
    surface:'Dalles claires',goalMaterial:'bronze',goalColor:0xbd8847,
  },
  {
    id:'arborium-street',cityId:'arborium',city:'Arborium',kind:'street',
    name:'Cour des serres',region:'Grande for\u00eat occidentale',
    surface:'Sol min\u00e9ral',goalMaterial:'wood',goalColor:0x95633e,
  },
  {
    id:'arborium-official',cityId:'arborium',city:'Arborium',kind:'official',
    name:'Stade du d\u00f4me',region:'Grande for\u00eat occidentale',
    surface:'Pierre verte',goalMaterial:'bronze',goalColor:0xbd8847,
  },
  {
    id:'velane-street',cityId:'velane',city:'Velane',kind:'street',
    name:'Clairi\u00e8re des cabanes',region:'Lisi\u00e8re nord-ouest',
    surface:'Terre battue',goalMaterial:'wood',goalColor:0x95633e,
  },
  {
    id:'velane-official',cityId:'velane',city:'Velane',kind:'official',
    name:'Stade de la lisi\u00e8re',region:'Lisi\u00e8re nord-ouest',
    surface:'Terre battue',goalMaterial:'wood',goalColor:0x95633e,
  },
  {
    id:'vulkar-street',cityId:'vulkar',city:'Vulkar',kind:'street',
    name:'Cour du basalte',region:'Plateau du feu',
    surface:'Basalte mat',goalMaterial:'iron',goalColor:0x89949d,
  },
  {
    id:'vulkar-official',cityId:'vulkar',city:'Vulkar',kind:'official',
    name:'Stade du crat\u00e8re',region:'Plateau du feu',
    surface:'Dalles de basalte',goalMaterial:'iron',goalColor:0x89949d,
  },
  {
    id:'cryptown-street',cityId:'cryptown',city:'Cryptown',kind:'street',
    name:'Cour des caveaux',region:'\u00cele au gouffre',
    surface:'Pierre us\u00e9e',goalMaterial:'stone',goalColor:0xa7aaa4,
  },
  {
    id:'cryptown-official',cityId:'cryptown',city:'Cryptown',kind:'official',
    name:'Stade du gouffre',region:'\u00cele au gouffre',
    surface:'Dalles grises',goalMaterial:'stone',goalColor:0xa7aaa4,
  },
  {
    id:'thalassea-street',cityId:'thalassea',city:'Thalassea',kind:'street',
    name:'Cour des nacres',region:'Bulle sous-marine',
    surface:'Pierre nacr\u00e9e',goalMaterial:'ivory',goalColor:0xeee2c6,
  },
  {
    id:'thalassea-official',cityId:'thalassea',city:'Thalassea',kind:'official',
    name:'Stade de la bulle',region:'Bulle sous-marine',
    surface:'Pierre marine mate',goalMaterial:'white',goalColor:0xffffff,
  },
  {
    id:'zarok-street',cityId:'zarok',city:'Zarok',kind:'street',
    name:'Cour des cordages',region:'Village Rhinoz',
    surface:'Sable compact',goalMaterial:'wood',goalColor:0x95633e,
  },
  {
    id:'zarok-official',cityId:'zarok',city:'Zarok',kind:'official',
    name:'Stade de Zarok',region:'Village Rhinoz',
    surface:'Sable compact',goalMaterial:'bronze',goalColor:0xbd8847,
  },
  {
    id:'astrium',cityId:'kalistopolis',city:'Kalistopolis',kind:'legendary',
    name:'Astrium',region:'\u00cele centrale',
    surface:'Pierre claire mate',goalMaterial:'white',goalColor:0xffffff,
  },
].map(arena=>Object.freeze({
  ...arena,
  pixel:true,
  views:Object.freeze(['horizontal']),
  preview:'assets/arenas-pixel-v1/'+arena.id+'-small.webp',
  horizontal:'assets/arenas-pixel-v1/'+arena.id+'.webp',
  // Pixel backgrounds are authored for HD-2D; classics retain isometric mode.
  isometric:'assets/arenas-pixel-v1/'+arena.id+'.webp',
  ground:Object.freeze(GROUNDS[arena.id]),
  inset:210,
  nearInset:150,
  flag:FLAG_CITIES.has(arena.cityId)?'assets/arena-flags-v1/'+arena.cityId+'.png':null,
  whiteLines:arena.kind!=='street',
  goalMaterial:arena.kind==='street'?arena.goalMaterial:'white',
  goalColor:arena.kind==='street'?arena.goalColor:0xffffff,
  lines:arena.kind==='street'?0xf2eee2:0xffffff,
})));
