import { STAT_TITLES } from '../data/athletes.mjs';
import { measurementsFor } from '../data/athlete-measurements.mjs';
export { measurementsFor } from '../data/athlete-measurements.mjs';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const roleNames={meneur:'Meneur',scoreur:'Scoreur',middle:'Middle',sentry:'Sentry',pilier:'Pilier'};
const roleIcons={meneur:'route',scoreur:'crosshair',middle:'diamond',sentry:'wind',pilier:'shield'};
const measureNotes={
  'popola-nier':'Taille avec bottes. Masse du corps andro\u00efde.',
  '9s-nier':'Taille avec bottes. Masse du corps andro\u00efde.',
  '2b-nier':'Taille avec talons. Masse du corps andro\u00efde.',
  'a2-nier':'Taille avec talons. Masse du corps andro\u00efde.',
  'lulu-ff10':'Taille sans talons ni coiffure.',
  'alcina-dimitrescu-re':'Chapeau et talons inclus. Forme humaine.',
  'tony-tony-chopper-op':'Forme hybride habituelle.',
  'dhalsim-street-fighter':'Dimensions variables ; valeurs de r\u00e9f\u00e9rence du profil.',
  'e-honda-street-fighter':'Taille incluant le chignon.',
};
export function renderMeasurements(athlete){
  const m=measurementsFor(athlete),estimated=m.status==='estimated',adapted=m.heightStatus==='adapted';
  const amount=(v,unit,approximate=estimated)=>v===null?'Non renseign\u00e9':(approximate?'\u2248 ':'')+esc(v)+' '+unit;
  const note=adapted?m.heightNote:estimated?m.note:m.status==='unknown'?'Ces mensurations ne sont pas encore confirm\u00e9es.':m.continuity+'. '+(measureNotes[athlete.id]||'');
  const sources=(m.sources||[]).filter(s=>/^https:\/\//.test(s.url)).map(s=>'<a href="'+esc(s.url)+'" target="_blank" rel="noopener noreferrer">'+esc(s.title)+(s.type==='secondary'?' (source secondaire)':'')+'</a>');
  return '<div class="athlete-measures"><span><i data-lucide="ruler"></i>'+(m.heightKind==='length'?'Longueur':'Taille')+' <b>'+amount(m.heightCm,'cm',estimated||adapted)+'</b></span><span><i data-lucide="weight"></i>Masse <b>'+amount(m.weightKg,'kg')+'</b></span></div><details class="athlete-sources"><summary>'+(adapted?'Taille d\u2019adaptation Kalistar':estimated?'Estimations visuelles':m.status==='sourced'?'R\u00e9f\u00e9rences':'Mensurations non confirm\u00e9es')+'</summary><p>'+esc(note)+'</p>'+sources.join('')+'</details>';
}
export function renderAthlete(character){
  const a=character.athlete;
  return '<div class="athlete-heading"><strong>'+esc(character.name)+'</strong><span>'+esc(a.style)+'</span></div><div class="athlete-positions"><span title="Poste unique"><i data-lucide="'+roleIcons[a.position]+'"></i>'+roleNames[a.position]+'</span></div>'+renderMeasurements(a)+'<div class="athlete-ratings">'+Object.entries(a.stats).map(([k,v])=>'<div title="'+esc(STAT_TITLES[k])+'"><span>'+STAT_TITLES[k]+'</span><b>'+v+'</b><meter min="0" max="'+(k==='MOB'?4:9)+'" value="'+v+'" aria-label="'+STAT_TITLES[k]+'">'+v+'</meter></div>').join('')+'</div>';
}
