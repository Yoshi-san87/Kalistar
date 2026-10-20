(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const cards = JSON.parse($('gallery-data').textContent);
  const figures = [...document.querySelectorAll('.gallery > figure')];
  const dialog = $('viewer');
  const normal = text => text.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const visible = () => figures.filter(f => !f.hidden);
  let active, opener;
  function filter() {
    const term = normal($('search').value.trim()), game = $('group').value;
    for (const figure of figures) {
      figure.hidden = !normal(figure.dataset.search).includes(term) || Boolean(game && figure.dataset.game !== game);
    }
    $('count').textContent = `${visible().length} / ${cards.length} illustrations`;
    $('empty').hidden = visible().length > 0;
  }
  function show(number) {
    active = cards.find(c => c.number === Number(number));
    if (!active) return;
    $('full-art').src = active.file;
    $('full-art').alt = active.name + ' : ' + active.scene;
    $('viewer-title').textContent = active.name;
    $('viewer-group').textContent = active.game + ' · ' + active.job;
    $('viewer-subtitle').textContent = active.title;
    $('viewer-scene').textContent = active.scene;
    $('original').href = active.file;
    $('counter').textContent = String(active.number).padStart(2,'0') + ' / ' + cards.length;
    const list = visible(), index = list.findIndex(f => Number(f.dataset.number) === active.number);
    $('previous').disabled = index <= 0;
    $('next').disabled = index < 0 || index === list.length - 1;
    dialog.querySelector('aside').scrollTop = 0;
  }
  function step(direction) {
    const list = visible(), index = list.findIndex(f => Number(f.dataset.number) === active?.number);
    if (list[index + direction]) show(list[index + direction].dataset.number);
  }
  document.querySelector('.gallery').addEventListener('click', event => {
    const link = event.target.closest('.art');
    if (!link || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    opener = link;
    show(link.closest('figure').dataset.number);
    dialog.showModal();
    document.body.classList.add('has-dialog');
    $('close').focus();
  });
  $('close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => {
    document.body.classList.remove('has-dialog');
    opener?.focus({preventScroll:true});
  });
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const r = dialog.getBoundingClientRect();
    if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close();
  });
  dialog.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault(); step(event.key === 'ArrowLeft' ? -1 : 1);
    }
  });
  $('previous').addEventListener('click', () => step(-1));
  $('next').addEventListener('click', () => step(1));
  $('search').addEventListener('input', filter);
  $('group').addEventListener('change', filter);
  document.querySelector('form').addEventListener('submit', event => event.preventDefault());
  globalThis.lucide?.createIcons();
  filter();
})();
