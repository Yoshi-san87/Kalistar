(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else { root.KalistarCardMedia = api; api.install(); }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const crop = { left: 50, top: 50, width: 797, height: 1388 };
  const artwork = { left: 218, top: 175, width: 460, height: 880 };
  const requests = new Map(), cache = new Map();
  function validateDimensions(width, height) {
    if (width !== 897 || height !== 1497) throw Error('Format de carte V4 invalide : 897 x 1497 requis.');
    return crop;
  }
  function image(card, kind = 'card') {
    if (!card?.pngUrl) throw Error('Visuel V4 indisponible.');
    const source = (globalThis.KalistarSite?.url(card.pngUrl) || card.pngUrl) + (kind === 'art' ? '#v4-art' : '#v4-card');
    requests.set(source, {kind,weapon:card.weapon});
    return cache.get(source)?.url || source;
  }
  function install() {
    document.addEventListener('load', async event => {
      const img = event.target, source = img?.getAttribute?.('src');
      if (!(img instanceof HTMLImageElement) || !requests.has(source)) return;
      try {
        validateDimensions(img.naturalWidth, img.naturalHeight);
        if (!cache.has(source)) {
          const result = {};
          const request=requests.get(source),rect=request.kind==='art'?artwork:crop;
          const canvas = document.createElement('canvas');
          canvas.width = rect.width; canvas.height = rect.height;
          canvas.getContext('2d').drawImage(img, rect.left, rect.top, rect.width, rect.height, 0, 0, rect.width, rect.height);
          result.promise = (async()=>{
            let blob;
            if(request.kind!=='art'&&globalThis.KalistarBaseWeapons){
              // A missing optional glyph must not prevent the original card from loading.
              try{
                const motif=await KalistarBaseWeapons.load(request.weapon);
                if(motif)blob=KalistarBaseWeapons.compose(canvas,rect,motif);
              }catch(error){console.warn('Arme classique : '+error.message);}
            }
            if(!blob)blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/webp',.95));
            if(!blob)throw Error('Recadrage de carte impossible.');
            result.url=URL.createObjectURL(blob);return result.url;
          })().catch(error=>{cache.delete(source);throw error;});
          cache.set(source, result);
        }
        const url = await cache.get(source).promise;
        if (img.getAttribute('src') === source) { img.src = url; img.dataset.v4Cropped = requests.get(source).kind; }
      } catch (error) {
        img.dataset.v4MediaError = error.message;
        document.dispatchEvent(new CustomEvent('kalistar:media-error', { detail: error.message }));
      }
    }, true);
  }
  return { image, crop, validateDimensions, install };
});
