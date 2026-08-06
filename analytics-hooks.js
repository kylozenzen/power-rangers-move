(() => {
  function track(name, parameters = {}) {
    window.movedAnalytics?.track?.(name, parameters);
  }

  function analyticsLabel() {
    const api = window.movedAnalytics;
    if (!api?.enabled) return 'Analytics is not configured on this deployment';
    if (api.consent === 'granted') return 'Allowed · workout details are never included';
    if (api.consent === 'denied') return 'Declined · no analytics data is sent';
    return 'Optional · nothing is sent before you choose';
  }

  function enhanceSettings() {
    const body = document.getElementById('sheet-body');
    if (!body || body.querySelector('#moved-privacy-row')) return;

    const footer = [...body.querySelectorAll('p')].find(node => node.textContent.includes('MOVED'));
    const row = document.createElement('div');
    row.className = 'srow';
    row.id = 'moved-privacy-row';
    row.innerHTML = `<div class="lab">Privacy & analytics<small>${analyticsLabel()}</small></div><div style="display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end"><button class="btn btn-ghost btn-small" type="button" id="moved-analytics-choice-btn">Choices</button><button class="btn btn-ghost btn-small" type="button" id="moved-privacy-btn">Privacy</button></div>`;

    if (footer) footer.before(row); else body.appendChild(row);

    const choice = row.querySelector('#moved-analytics-choice-btn');
    choice.disabled = !window.movedAnalytics?.enabled;
    choice.addEventListener('click', () => window.movedAnalytics?.showPreferences?.());
    row.querySelector('#moved-privacy-btn').addEventListener('click', () => window.location.assign('/privacy'));
  }

  if (typeof window.openSettings === 'function') {
    const originalOpenSettings = window.openSettings;
    window.openSettings = function movedOpenSettingsWithPrivacy(...args) {
      const result = originalOpenSettings.apply(this, args);
      setTimeout(enhanceSettings, 0);
      return result;
    };
  }

  // Product telemetry is intentionally binary. These events answer whether a
  // core action worked without attaching the workout's type, duration,
  // exercises, weights, reps, notes, totals, or any other workout content.
  ['startBuiltWorkout','startEmptyStrength','startFromSession','startFromTemplate','startFromRoutine'].forEach(name => {
    const original = window[name];
    if (typeof original !== 'function') return;
    window[name] = function movedTrackedWorkoutStart(...args) {
      const hadActive = !!window.state?.active;
      const result = original.apply(this, args);
      if (!hadActive && window.state?.active && window.state.active.editingIndex === null) track('workout_started');
      return result;
    };
  });

  if (typeof window.finishWorkout === 'function') {
    const originalFinishWorkout = window.finishWorkout;
    window.finishWorkout = function movedTrackedWorkoutFinish(...args) {
      const beforeCount = Array.isArray(window.state?.workouts) ? window.state.workouts.length : 0;
      const wasEditing = window.state?.active?.editingIndex !== null;
      const result = originalFinishWorkout.apply(this, args);
      const afterCount = Array.isArray(window.state?.workouts) ? window.state.workouts.length : 0;
      if (!wasEditing && afterCount > beforeCount) track('workout_completed');
      return result;
    };
  }

  if (typeof window.exportData === 'function') {
    const originalExportData = window.exportData;
    window.exportData = function movedTrackedBackup(...args) {
      const result = originalExportData.apply(this, args);
      track('backup_exported');
      return result;
    };
  }

  if (window.MovedBeta?.verifyOffline) {
    const originalVerifyOffline = window.MovedBeta.verifyOffline;
    window.MovedBeta.verifyOffline = async function movedTrackedOfflineCheck(...args) {
      track('offline_check_started');
      return originalVerifyOffline.apply(this, args);
    };
    window.betaVerifyOffline = window.MovedBeta.verifyOffline;
  }

  const reportOpen = () => track('app_open', {
    app_surface: (window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone === true) ? 'installed' : 'browser'
  });

  if (window.movedAnalytics) reportOpen();
  else window.addEventListener('movedanalyticsready', reportOpen, { once: true });
})();
