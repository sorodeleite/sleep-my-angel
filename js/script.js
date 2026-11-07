(function () {
  const SMA = window.SMA;

  const DEFAULT_SCRIPT = `# meu script de sono & realidade desejada ‧°
*lei da suposição ‧ odette.exe*

### 1. como eu me sinto agora
- completamente em paz e protegida no meu quarto
- a sensação doce de que tudo que eu desejo já é meu fato consumado
- corpo relaxado, mente silenciosa e serena

### 2. afirmações da noite
- eu não preciso forçar a 3d. a imaginação é a única causa.
- ao fechar meus olhos hoje, eu acordo na versão perfeita da minha vida.
- eu sou grata pela harmonia, pelo descanso profundo e pelo meu futuro brilhante.

### 3. ritual de amanhã
- acordar no meu próprio ritmo
- tomar meu cafezinho com calma
- manter a suposição do meu desejo vivo o dia todo ✨
`;

  let editor = null;
  let meta = null;
  let saveButton = null;

  function countWords(text) {
    const trimmed = text.trim();
    if (!trimmed) return 0;
    return trimmed.split(/\s+/).length;
  }

  function updateMeta(label) {
    if (!meta || !editor) return;
    const words = countWords(editor.value);
    meta.textContent = words + (words === 1 ? ' palavra' : ' palavras') + (label ? ' ‧ ' + label : '');
  }

  function saveLocal(showFeedback) {
    const ok = SMA.writeText('offline_script', editor.value);
    if (!ok) {
      SMA.toast('não consegui salvar neste navegador');
      return;
    }
    updateMeta('salvo aqui');
    if (showFeedback) SMA.toast('script guardado ‧°');
  }

  async function persistFile() {
    if (!window.api) return true;
    try {
      await window.api.saveScriptFile({
        text: editor.value,
        updated: new Date().toISOString()
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  function download() {
    const blob = new Blob([editor.value], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'script-da-noite.md';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(function () {
      URL.revokeObjectURL(url);
    }, 1000);
  }

  async function init() {
    editor = SMA.select('#script-editor');
    meta = SMA.select('#script-meta');
    saveButton = SMA.select('#btn-save-script');
    if (!editor) return;

    let content = DEFAULT_SCRIPT;
    if (window.api) {
      try {
        const file = await window.api.getScriptFile();
        if (file && typeof file.text === 'string' && file.text.trim()) {
          content = file.text;
        }
      } catch (error) {
        void error;
      }
    }
    const local = SMA.readText('offline_script', '');
    const hasLocal = Boolean(local.trim());
    if (hasLocal) content = local;

    editor.value = content;
    updateMeta(hasLocal ? 'salvo aqui' : '');

    editor.addEventListener('input', SMA.debounce(function () {
      updateMeta('salvando...');
      saveLocal(false);
    }, 300));

    saveButton?.addEventListener('click', async function () {
      saveLocal(false);
      const persisted = await persistFile();
      if (!persisted) SMA.toast('salvo no navegador, mas não no arquivo local');
      saveButton.textContent = 'Salvo!';
      updateMeta('salvo');
      setTimeout(function () {
        saveButton.textContent = 'Salvar Offline';
      }, 1500);
    });

    SMA.select('#btn-download-script')?.addEventListener('click', download);

    window.addEventListener('beforeunload', function () {
      SMA.writeText('offline_script', editor.value);
    });
  }

  SMA.ScriptNotes = { init: init };
})();
