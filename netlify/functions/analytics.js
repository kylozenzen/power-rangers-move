exports.handler = async function handler() {
  const measurementId = String(process.env.GA_MEASUREMENT_ID || '').trim();
  const context = String(process.env.CONTEXT || 'production');
  const previewsEnabled = String(process.env.GA_ENABLE_PREVIEWS || '').toLowerCase() === 'true';
  const validId = /^G-[A-Z0-9]+$/i.test(measurementId);
  const enabled = validId && (context === 'production' || previewsEnabled);

  const body = `(() => {
    const MEASUREMENT_ID = ${JSON.stringify(enabled ? measurementId : '')};
    const CONSENT_KEY = 'moved_analytics_consent_v1';
    let tagLoaded = false;

    function safeStorageGet() {
      try { return localStorage.getItem(CONSENT_KEY); } catch (_) { return null; }
    }

    function safeStorageSet(value) {
      try { localStorage.setItem(CONSENT_KEY, value); } catch (_) {}
    }

    function defineGtag() {
      window.dataLayer = window.dataLayer || [];
      window.gtag = window.gtag || function gtag(){ window.dataLayer.push(arguments); };
    }

    function updateConsent(analyticsStorage) {
      if (!window.gtag) return;
      window.gtag('consent', 'update', {
        ad_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied',
        analytics_storage: analyticsStorage
      });
    }

    function loadTag() {
      if (!MEASUREMENT_ID || tagLoaded) return;
      tagLoaded = true;
      defineGtag();
      window.gtag('consent', 'default', {
        ad_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied',
        analytics_storage: 'denied'
      });
      updateConsent('granted');
      window.gtag('js', new Date());
      window.gtag('config', MEASUREMENT_ID, {
        send_page_view: true,
        debug_mode: new URLSearchParams(location.search).get('ga_debug') === '1'
      });

      const script = document.createElement('script');
      script.async = true;
      script.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(MEASUREMENT_ID);
      document.head.appendChild(script);
    }

    function track(name, parameters = {}) {
      if (!MEASUREMENT_ID || safeStorageGet() !== 'granted') return;
      loadTag();
      window.gtag('event', name, parameters);
    }

    function addStyles() {
      if (document.getElementById('moved-analytics-styles')) return;
      const style = document.createElement('style');
      style.id = 'moved-analytics-styles';
      style.textContent = '.moved-consent{position:fixed;left:16px;right:16px;bottom:16px;z-index:10000;max-width:760px;margin:auto;padding:17px 18px;border:1px solid rgba(168,85,247,.42);border-radius:17px;background:rgba(12,11,18,.98);color:#f7f3fb;box-shadow:0 22px 60px rgba(0,0,0,.55);font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.moved-consent[hidden]{display:none}.moved-consent-inner{display:flex;align-items:center;gap:18px}.moved-consent-copy{flex:1;min-width:0}.moved-consent strong{display:block;margin-bottom:4px;font-size:14px}.moved-consent p{margin:0;color:#aaa3b4;font-size:12.5px;line-height:1.45}.moved-consent a{color:#8de7ff}.moved-consent-actions{display:flex;gap:8px;flex:0 0 auto}.moved-consent button,.moved-analytics-choice{cursor:pointer;border-radius:10px;font:700 12px/1 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.moved-consent button{min-height:40px;padding:0 14px}.moved-consent-allow{border:0;color:#fff;background:linear-gradient(110deg,#ff3ca6,#a855f7)}.moved-consent-deny{border:1px solid #443e4d;color:#f7f3fb;background:transparent}.moved-analytics-choice{border:0;padding:0;color:#8f8999;background:transparent;text-decoration:underline;text-underline-offset:3px}.moved-analytics-choice:hover{color:#8de7ff}@media(max-width:640px){.moved-consent-inner{align-items:stretch;flex-direction:column}.moved-consent-actions{width:100%}.moved-consent-actions button{flex:1}}';
      document.head.appendChild(style);
    }

    function banner() {
      let node = document.getElementById('movedAnalyticsConsent');
      if (node) return node;
      addStyles();
      node = document.createElement('aside');
      node.className = 'moved-consent';
      node.id = 'movedAnalyticsConsent';
      node.setAttribute('aria-label', 'Analytics preferences');
      node.innerHTML = '<div class="moved-consent-inner"><div class="moved-consent-copy"><strong>Help improve MOVED?</strong><p>Allow optional Google Analytics so we can see whether installation and core features are working. Exercise names, weights, reps, notes, workout history, routines, and other workout details are not sent. <a href="/privacy">Privacy details</a>.</p></div><div class="moved-consent-actions"><button class="moved-consent-deny" type="button">No thanks</button><button class="moved-consent-allow" type="button">Allow analytics</button></div></div>';
      node.querySelector('.moved-consent-allow').addEventListener('click', () => {
        safeStorageSet('granted');
        loadTag();
        node.hidden = true;
      });
      node.querySelector('.moved-consent-deny').addEventListener('click', () => {
        safeStorageSet('denied');
        updateConsent('denied');
        node.hidden = true;
      });
      document.body.appendChild(node);
      return node;
    }

    function showPreferences() {
      if (!MEASUREMENT_ID) return;
      const node = banner();
      node.hidden = false;
    }

    function addPreferenceLink() {
      if (!MEASUREMENT_ID || document.querySelector('.moved-analytics-choice')) return;
      const host = document.querySelector('.landing-footer-inner,.privacy-footer-inner,footer');
      if (!host) return;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'moved-analytics-choice';
      button.textContent = 'Analytics choices';
      button.addEventListener('click', showPreferences);
      host.appendChild(button);
    }

    window.movedAnalytics = {
      enabled: Boolean(MEASUREMENT_ID),
      track,
      showPreferences,
      get consent(){ return safeStorageGet(); }
    };
    window.dispatchEvent(new Event('movedanalyticsready'));

    if (!MEASUREMENT_ID) return;
    const choice = safeStorageGet();
    if (choice === 'granted') loadTag();

    const boot = () => {
      if (!safeStorageGet()) banner();
      addPreferenceLink();
      window.addEventListener('appinstalled', () => track('pwa_install', { app_name: 'MOVED' }));
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once:true });
    else boot();
  })();`;

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff'
    },
    body
  };
};
