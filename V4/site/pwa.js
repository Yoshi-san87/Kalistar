(() => {
  'use strict';
  const button = document.querySelector('[data-pwa-install]');
  if (!button) return;
  let installEvent = null;
  const installed = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  if (installed()) return;
  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    installEvent = event;
    button.hidden = false;
  });
  button.addEventListener('click', async () => {
    if (!installEvent) return;
    const prompt = installEvent;
    installEvent = null;
    button.disabled = true;
    button.hidden = true;
    await prompt.prompt();
    await prompt.userChoice;
    button.disabled = false;
  });
  window.addEventListener('appinstalled', () => {
    installEvent = null;
    button.hidden = true;
  });
})();
