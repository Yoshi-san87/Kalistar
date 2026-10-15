'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const {createRequire} = require('node:module');
const {pathToFileURL} = require('node:url');
const vm = require('node:vm');

const sources = Object.freeze([
  {id:'regles', file:'REGLES_JEU.md', title:'Les r\u00e8gles du jeu', category:'Le duel', icon:'scroll-text', description:'Attaquer, d\u00e9fendre, aider ses alli\u00e9s et remporter la rencontre.'},
  {id:'composition', file:'COMPOSITION_EQUIPE.md', title:'Composition d\u2019\u00e9quipe', category:'Le commandement', icon:'users-round', description:'Dix personnages, cinq titulaires et un capitaine. Les liens qui font une \u00e9quipe.'},
  {id:'initiative', file:'INITIATIVE_ABBA.md', title:'Tours et rounds', category:'Le rythme du combat', icon:'dices', description:'Qui commence, qui joue ensuite et comment anticiper les prochaines actions.'},
  {id:'equipements', file:'EQUIPEMENTS_460.md', title:'Armes, protections et reliques', category:'L\u2019arsenal', icon:'swords', description:'Choisir ses objets et comprendre quand leurs effets interviennent.'},
  {id:'reliques', file:'RELIQUES_ULTIMES.md', title:'Les reliques ultimes', category:'Les dons singuliers', icon:'gem', description:'Les 35 reliques : conditions, dons, ripostes et encha\u00eenements \u00e0 usage unique.'},
  {id:'performance', file:'INDICE_PERFORMANCE.md', title:'Bilan et r\u00e9compenses', category:'Les hauts faits', icon:'award', description:'Comprendre les performances, le MVP, les troph\u00e9es et les m\u00e9dailles.'}
]);
const digest = value => crypto.createHash('sha256').update(value).digest('hex');
const escape = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const slug = value => value.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'') || 'section';

async function loadMarked() {
  let filename;
  try { filename = require.resolve('marked'); }
  catch {
    const directory = process.env.KALISTAR_NODE_MODULES || path.resolve(path.dirname(process.execPath),'../node_modules');
    filename = createRequire(path.join(directory,'__kalistar_library__.cjs')).resolve('marked');
  }
  return import(pathToFileURL(filename).href);
}

function textOf(tokens) {
  return tokens.map(token => {
    if (token.type === 'table') return textOf(token.header.flatMap(cell => cell.tokens)) + ' ' + token.rows.map(row => textOf(row.flatMap(cell => cell.tokens))).join(' ');
    if (token.items) return token.items.map(item => textOf(item.tokens)).join(' ');
    if (token.tokens) return textOf(token.tokens);
    return token.text || '';
  }).join(' ');
}

function linkTarget(href, documentId) {
  if (!href || /[\u0000-\u0020\u007f]/.test(href) || href.startsWith('//')) return null;
  const source = sources.find(item => item.id === documentId);
  let url;
  try { url = new URL(href, 'https://library.invalid/V4/docs/' + (source?.file || 'REGLES_JEU.md')); }
  catch { return null; }
  if (!['http:','https:'].includes(url.protocol) || url.username || url.password) return null;
  if (url.origin !== 'https://library.invalid') return null;
  const target = sources.find(item => url.pathname === '/V4/docs/' + item.file);
  if (!target || url.search) return null;
  let fragment;
  try { fragment = url.hash ? slug(decodeURIComponent(url.hash.slice(1))) : ''; }
  catch { return null; }
  return {documentId:target.id, sectionId:fragment ? 'library-' + target.id + '-' + fragment : ''};
}

async function renderDocument(markdown, source, markedModule) {
  const {Marked} = markedModule || await loadMarked();
  const sections = [], seen = new Map();
  const parser = new Marked({gfm:true, async:false});
  parser.use({renderer:{
    html({text}) { return escape(text); },
    heading({tokens, depth}) {
      const title = textOf(tokens).trim(), base = slug(title);
      const count = (seen.get(base) || 0) + 1; seen.set(base,count);
      const id = 'library-' + source.id + '-' + base + (count > 1 ? '-' + count : '');
      sections.push({id,title,depth});
      return `<h${depth} id="${id}" tabindex="-1">${this.parser.parseInline(tokens)}</h${depth}>\n`;
    },
    link({href, title, tokens}) {
      const label = this.parser.parseInline(tokens), target = linkTarget(href,source.id);
      if (!target) return label;
      const hint = title ? ` title="${escape(title)}"` : '';
      return `<a href="#${target.sectionId || 'library-document-' + target.documentId}" data-library-document="${target.documentId}"${target.sectionId ? ` data-library-section="${target.sectionId}"` : ''}${hint}>${label}</a>`;
    },
    image({text}) { return escape(text); },
    code({text}) { return `<pre tabindex="0" aria-label="Extrait du document"><code>${escape(text)}</code></pre>\n`; },
    table(token) { return `<div class="library-table" role="region" tabindex="0" aria-label="Tableau du document">${Object.getPrototypeOf(this).table.call(this,token)}</div>\n`; }
  }});
  const tokens = parser.lexer(markdown);
  const html = parser.parser(tokens);
  const words = textOf(tokens).trim().split(/\s+/u).filter(Boolean).length;
  const bytes = Buffer.from(markdown,'utf8');
  return {...source, source:{path:'V4/docs/joueurs/' + source.file, sha256:digest(bytes), bytes:bytes.length}, wordCount:words, readingMinutes:Math.max(1,Math.ceil(words/200)), sections, html};
}

async function buildDocuments({docsDirectory = path.resolve(__dirname,'../docs')} = {}) {
  const marked = await loadMarked(), documents = [];
  for (const source of sources) {
    const bytes = await fs.readFile(path.join(docsDirectory,'joueurs',source.file));
    const rules = await fs.readFile(path.join(docsDirectory,source.file));
    const document = await renderDocument(bytes.toString('utf8'),source,marked);
    // Hash the original file bytes, including its preserved line endings.
    document.source = {path:'V4/docs/joueurs/' + source.file,sha256:digest(bytes),bytes:bytes.length};
    document.rulesSource = {path:'V4/docs/' + source.file,sha256:digest(rules),bytes:rules.length};
    documents.push(document);
  }
  const manifestHash = digest(JSON.stringify(documents.map(item => [item.source,item.rulesSource])));
  return {schema:2,audience:'players',renderer:'marked',manifestHash,documents};
}

function browserSource(bundle) {
  const json = JSON.stringify(bundle,null,2).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');
  return `// Generated by rules-documents.cjs. Do not edit the rendered documents.\n(() => {\n  'use strict';\n  const bundle = ${json};\n  function freeze(value) {\n    if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }\n    return value;\n  }\n  window.KalistarRulesDocuments = freeze(bundle);\n})();\n`;
}

async function generate({output = path.join(__dirname,'rules-documents.js'), ...options} = {}) {
  const source = browserSource(await buildDocuments(options));
  await fs.writeFile(output,source,'utf8');
  return output;
}

async function validateSources({docsDirectory=path.resolve(__dirname,'../docs'),bundlePath=path.join(__dirname,'rules-documents.js')}={}){
  const scope={window:{}};
  vm.runInNewContext(await fs.readFile(bundlePath,'utf8'),scope,{timeout:1000});
  const bundle=scope.window.KalistarRulesDocuments,documents=bundle?.documents;
  if(bundle?.audience!=='players'||bundle?.schema!==2)throw Error('Library: player manuscripts required.');
  if(!Array.isArray(documents)||documents.length!==sources.length)throw Error('Library: generated rules bundle missing.');
  for(const source of sources){
    const rendered=documents.find(d=>d.id===source.id),bytes=await fs.readFile(path.join(docsDirectory,'joueurs',source.file));
    const rules=await fs.readFile(path.join(docsDirectory,source.file));
    if(rendered?.source.sha256!==digest(bytes)||rendered?.rulesSource.sha256!==digest(rules))throw Error('Library: '+source.file+' changed; review the player manuscript and run node V4/site/rules-documents.cjs before publication.');
  }
  return true;
}

module.exports = {sources,buildDocuments,browserSource,generate,renderDocument,linkTarget,validateSources};
if (require.main === module) generate().then(output => console.log('Generated ' + output)).catch(error => {console.error(error);process.exitCode = 1;});
