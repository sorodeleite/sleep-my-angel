(function () {
  const SMA = window.SMA;
  const APP_VERSION = '1.9.0';
  const CHECK_KEY = 'sma_last_update_check';
  const REPO_RELEASES = 'https://github.com/sorodeleite/sleep-my-angel/releases';
  const CHECK_INTERVAL = 12 * 60 * 60 * 1000;

  let native = null;
  let listenerBound = false;
  const state = {
    checking: false,
    current: APP_VERSION,
    latest: '',
    hasUpdate: false,
    apkUrl: '',
    releaseUrl: REPO_RELEASES,
    notes: '',
    downloaded: false,
    downloadedVersion: '',
    canInstall: true,
    downloading: false,
    installing: false,
    progress: 0,
    error: ''
  };

  function plugin() {
    if (SMA.platform() !== 'android') return null;
    try {
      return (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.AppUpdater) || null;
    } catch (error) {
      return null;
    }
  }

  function el(id) {
    return document.getElementById(id);
  }

  function show(element, visible) {
    if (element) element.hidden = !visible;
  }

  function setStatus(text, tone) {
    const box = el('update-status');
    if (!box) return;
    box.textContent = text;
    box.classList.toggle('error', tone === 'error');
    box.classList.toggle('ready', tone === 'ready');
  }

  function shortNotes(value) {
    const text = String(value || '').replace(/\r/g, '').trim();
    if (!text) return '';
    const clean = text
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/^#{1,6}\s*/gm, '')
      .replace(/^\s*[-*]\s+/gm, '• ')
      .replace(/`([^`]+)`/g, '$1');
    return clean.length > 1600 ? clean.slice(0, 1600).trim() + '…' : clean;
  }

  function paintChip() {
    const chip = el('btn-update-app');
    const label = el('update-chip-label');
    if (!chip) return;
    chip.hidden = !native;
    chip.classList.toggle('available', Boolean(state.hasUpdate));
    if (label) {
      label.textContent = state.hasUpdate
        ? 'nova versão ‧ atualizar'
        : 'atualizar app';
    }
    chip.title = state.hasUpdate
      ? 'nova versão v' + state.latest + ' disponível'
      : 'verificar se existe uma versão nova';
  }

  function paintVersions() {
    const current = el('update-current-version');
    if (current) current.textContent = 'v' + (state.current || APP_VERSION);
    const latest = el('update-latest-version');
    if (latest) latest.textContent = state.latest ? 'v' + state.latest : '—';
    show(el('update-latest-pill'), Boolean(state.latest && state.hasUpdate));
  }

  function paintNotes() {
    const box = el('update-notes');
    if (!box) return;
    const notes = shortNotes(state.notes);
    box.textContent = notes;
    show(box, Boolean(notes) && state.hasUpdate);
  }

  function paintActions() {
    const hasUpdate = Boolean(state.hasUpdate);
    const downloaded = Boolean(state.downloaded && state.downloadedVersion && state.downloadedVersion === state.latest);
    const canDownload = hasUpdate && state.apkUrl && !downloaded;
    show(el('update-download'), canDownload && !state.checking && !state.downloading);
    show(el('update-install'), downloaded && !state.checking && !state.downloading);
    show(el('update-open-releases'), !state.checking && !state.downloading && (hasUpdate || state.error));
    const progress = el('update-progress');
    show(progress, state.progress > 0 && state.progress < 100);
    const fill = el('update-progress-fill');
    if (fill) fill.style.width = Math.max(0, Math.min(100, state.progress)) + '%';
  }

  function paint() {
    paintChip();
    paintVersions();
    paintNotes();
    paintActions();
    if (state.checking) {
      setStatus('procurando uma versão nova no github…');
    } else if (state.error) {
      setStatus(state.error, 'error');
    } else if (state.hasUpdate) {
      setStatus(downloadedForLatest()
        ? 'v' + state.latest + ' baixada e pronta pra instalar. é só tocar em instalar agora.'
        : 'nova versão v' + state.latest + ' disponível. o app atualiza por cima, sem desinstalar.', 'ready');
    } else if (state.latest) {
      setStatus('você já está na versão mais nova (v' + state.current + ') ‧°', 'ready');
    } else {
      setStatus('toque em verificar pra procurar uma versão nova.');
    }
  }

  function downloadedForLatest() {
    return Boolean(state.downloaded && state.downloadedVersion && state.downloadedVersion === state.latest);
  }

  async function refreshInfo() {
    if (!native) return;
    try {
      const info = await native.info();
      if (info && info.version) state.current = info.version;
      if (info) {
        state.downloaded = Boolean(info.downloaded);
        state.downloadedVersion = info.downloadedVersion || state.downloadedVersion;
        state.canInstall = info.canInstall !== false;
      }
    } catch (error) {
    }
    paintVersions();
  }

  async function check(options) {
    if (!native) return state;
    const silent = Boolean(options && options.silent);
    if (state.checking || state.downloading || state.installing) return state;
    state.checking = true;
    state.error = '';
    let aborted = false;
    if (!silent) setStatus('procurando uma versão nova no github…');
    paintActions();
    try {
      const result = await native.check();
      if (state.downloading || state.installing) {
        aborted = true;
        return state;
      }
      state.latest = result.latestVersion || '';
      state.hasUpdate = Boolean(result.hasUpdate);
      state.apkUrl = result.apkUrl || '';
      state.releaseUrl = result.releaseUrl || REPO_RELEASES;
      state.notes = result.notes || '';
      state.canInstall = result.canInstall !== false;
      if (result.currentVersion) state.current = result.currentVersion;
      state.progress = 0;
      localStorage.setItem(CHECK_KEY, String(Date.now()));
      if (state.hasUpdate && result.downloaded) {
        state.downloaded = true;
        state.downloadedVersion = state.latest;
      }
      paint();
      if (state.hasUpdate) {
        SMA.toast('nova versão v' + state.latest + ' ‧ toque em atualizar');
      }
    } catch (error) {
      const code = error && error.code;
      const message = String((error && (error.message || error.error || error)) || '');
      if (code === 'PRIVATE_REPO' || message.indexOf('404') !== -1 || message.indexOf('privado') !== -1) {
        state.error = 'o repositório do app está privado, então o app não consegue checar sozinho. toque em "ver no github" pra abrir a página de releases, baixar o sleep-my-angel.apk e instalar por cima — suas notas, playlists e áudios continuam guardados.';
      } else {
        state.error = 'não consegui verificar agora: ' + message + ' ‧ tente de novo em um minutinho ou abra o github.';
      }
      paint();
    } finally {
      state.checking = false;
      if (!aborted) paint();
    }
    return state;
  }

  async function startDownload() {
    if (!native || !state.apkUrl || state.checking || state.downloading) return;
    state.error = '';
    state.downloading = true;
    state.progress = 1;
    paintActions();
    setStatus('baixando a atualização…');
    try {
      await native.download({ url: state.apkUrl, version: state.latest });
      state.downloaded = true;
      state.downloadedVersion = state.latest;
      state.progress = 100;
      setStatus('download concluído. toque em instalar agora. o android pode pedir pra liberar a instalação.', 'ready');
    } catch (error) {
      state.progress = 0;
      state.error = 'o download falhou: ' + (error && (error.message || error.error || error));
      paint();
    } finally {
      state.downloading = false;
    }
    paint();
  }

  async function install() {
    if (!native || state.installing) return;
    state.installing = true;
    try {
      const info = await native.info();
      state.canInstall = info.canInstall !== false;
    } catch (error) {
    }
    if (!state.canInstall) {
      state.installing = false;
      setStatus('falta liberar a instalação: toque em permitir, ative "instalar apps desconhecidos" pro sleep my angel e volte pra tocar em instalar de novo.', 'error');
      try {
        await native.openInstallSettings();
      } catch (error) {
        SMA.toast('não consegui abrir as permissões do android');
      }
      return;
    }
    try {
      const result = await native.install();
      if (result && result.needsPermission) {
        state.canInstall = false;
        setStatus('falta liberar a instalação: ative "instalar apps desconhecidos" pro sleep my angel e volte pra tocar em instalar de novo.', 'error');
        await native.openInstallSettings();
        return;
      }
      setStatus('instalador aberto. confirma a atualização e pronto, seus dados continuam aqui.', 'ready');
    } catch (error) {
      const message = String((error && (error.message || error.error || error)) || '');
      state.error = message.indexOf('not downloaded') !== -1 || message.indexOf('baixado') !== -1
        ? 'a atualização ainda não foi baixada. toque em baixar de novo.'
        : 'não consegui abrir o instalador: ' + message + ' ‧ se o android reclamar de assinatura, desinstale essa versão uma vez e instale a nova.';
      paint();
    } finally {
      state.installing = false;
    }
  }

  async function openReleases() {
    const url = state.releaseUrl || REPO_RELEASES;
    if (native) {
      try {
        await native.openUrl({ url: url });
        return;
      } catch (error) {
      }
    }
    window.open(url, '_blank', 'noopener');
  }

  function openModal() {
    el('modal-update')?.classList.add('open');
    paint();
    if (!state.latest && !state.checking) check({ silent: false });
  }

  function bind() {
    el('btn-update-app')?.addEventListener('click', openModal);
    el('modal-cancel-update')?.addEventListener('click', function () {
      el('modal-update')?.classList.remove('open');
    });
    el('update-check-again')?.addEventListener('click', function () {
      check({ silent: false });
    });
    el('update-download')?.addEventListener('click', startDownload);
    el('update-install')?.addEventListener('click', install);
    el('update-open-releases')?.addEventListener('click', openReleases);
  }

  async function init() {
    native = plugin();
    const chip = el('btn-update-app');
    if (!native) {
      if (chip) chip.hidden = true;
      return;
    }
    bind();
    if (!listenerBound) {
      listenerBound = true;
      try {
        native.addListener('downloadProgress', function (event) {
          if (!event) return;
          if (typeof event.progress === 'number') {
            state.progress = event.progress;
          }
          paintActions();
          setStatus('baixando a atualização… ' + Math.round(state.progress) + '%');
          const fill = el('update-progress-fill');
          if (fill) fill.style.width = Math.max(0, Math.min(100, state.progress)) + '%';
        });
      } catch (error) {
        listenerBound = false;
      }
    }
    await refreshInfo();
    paint();
    const last = Number(localStorage.getItem(CHECK_KEY) || 0);
    if (Date.now() - last > CHECK_INTERVAL) {
      const scheduledAt = Date.now();
      setTimeout(function () {
        if (Number(localStorage.getItem(CHECK_KEY) || 0) >= scheduledAt) return;
        if (document.getElementById('modal-update')?.classList.contains('open')) return;
        check({ silent: true });
      }, 2600);
    }
  }

  SMA.Updater = {
    init: init,
    check: check,
    state: state
  };
})();
