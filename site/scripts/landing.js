(() => {
  let deferredPrompt = null;

  function track(name, parameters = {}) {
    window.movedAnalytics?.track?.(name, parameters);
  }

  function isStandalone() {
    return !!(window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone === true);
  }

  function platform() {
    const ua = navigator.userAgent || '';
    const ios = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    if (ios) return 'ios';
    if (/Android/i.test(ua)) return 'android';
    return 'desktop';
  }

  const installButton = document.getElementById('installButton');
  const heroInstall = document.getElementById('heroInstall');
  const installStatus = document.getElementById('installStatus');
  const installCards = [...document.querySelectorAll('[data-install-platform]')];

  function highlightInstallCard(kind, scroll = false) {
    installCards.forEach(card => card.classList.toggle('is-recommended', card.dataset.installPlatform === kind));
    const selected = installCards.find(card => card.dataset.installPlatform === kind);
    if (scroll && selected) {
      selected.classList.add('flash');
      selected.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => selected.classList.remove('flash'), 900);
    }
  }

  function setStatus(message) {
    if (installStatus) installStatus.textContent = message;
  }

  function updateInstallUI() {
    const kind = platform();
    highlightInstallCard(kind);

    if (isStandalone()) {
      if (installButton) { installButton.textContent = 'Already installed'; installButton.disabled = true; }
      if (heroInstall) { heroInstall.textContent = 'Already installed'; heroInstall.disabled = true; }
      setStatus('MOVED is already running as an installed app on this device.');
      return;
    }

    if (deferredPrompt) {
      if (installButton) installButton.textContent = 'Install MOVED';
      if (heroInstall) heroInstall.textContent = 'Install MOVED';
      setStatus('Your browser can install MOVED directly from this page.');
      return;
    }

    const label = kind === 'ios' ? 'Show iPhone steps' : 'Show install steps';
    if (installButton) installButton.textContent = label;
    if (heroInstall) heroInstall.textContent = label;
    setStatus(kind === 'ios'
      ? "On iPhone or iPad, install MOVED through Safari's Share menu."
      : 'Use the install prompt when available, or follow the highlighted steps for your device.');
  }

  async function requestInstall(source) {
    if (isStandalone()) return;
    const kind = platform();

    if (deferredPrompt) {
      track('pwa_install_prompt', { install_platform: kind, install_source: source });
      deferredPrompt.prompt();
      try {
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === 'accepted') {
          setStatus('Installation requested. MOVED is becoming a regular-looking app with irregular opinions about streaks.');
          track('pwa_install_accept', { install_platform: kind, install_source: source });
        } else {
          setStatus('No problem. MOVED works in the browser too.');
          track('pwa_install_dismiss', { install_platform: kind, install_source: source });
        }
      } catch (_) {}
      deferredPrompt = null;
      updateInstallUI();
      return;
    }

    track('pwa_install_instructions', { install_platform: kind, install_source: source });
    highlightInstallCard(kind, true);
  }

  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    deferredPrompt = event;
    updateInstallUI();
    track('pwa_install_available', { install_platform: platform() });
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    updateInstallUI();
  });

  installButton?.addEventListener('click', () => requestInstall('install_section'));
  heroInstall?.addEventListener('click', () => {
    document.getElementById('install')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    requestInstall('hero');
  });

  document.querySelectorAll('[data-cta]').forEach(link => {
    link.addEventListener('click', () => track('select_content', {
      content_type: 'app_entry',
      content_id: `moved_${link.dataset.cta}`
    }));
  });

  updateInstallUI();

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' });
        registration.update().catch(() => {});
      } catch (_) {}
    }, { once: true });
  }
})();
