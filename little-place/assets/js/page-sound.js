(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.PooftiePageSound = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const DURACAO_FRUFRU = 0.28;
  const VOLUME = 0.085;

  let proprioContexto = null;

  function pegarContexto() {
    const AudioCtx = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
    if (proprioContexto && proprioContexto.state === 'suspended') {
      try { proprioContexto.resume(); } catch (error) {   }
    }
    if (!AudioCtx) return proprioContexto;
    if (!proprioContexto) {
      try { proprioContexto = new AudioCtx(); } catch (error) { proprioContexto = null; }
    }
    return proprioContexto;
  }

  function usarContexto(contexto) {
    if (contexto) proprioContexto = contexto;
    return proprioContexto;
  }

  function criarRuido(contexto, segundos) {
    const tamanho = Math.max(1, Math.floor(contexto.sampleRate * segundos));
    const buffer = contexto.createBuffer(1, tamanho, contexto.sampleRate);
    const dados = buffer.getChannelData(0);
    for (let i = 0; i < tamanho; i++) dados[i] = Math.random() * 2 - 1;
    return buffer;
  }

  function tocar(opcoes = {}) {
    const volume = Number.isFinite(opcoes.volume) ? opcoes.volume : VOLUME;
    const direcao = Number(opcoes.direcao) < 0 ? -1 : 1;
    const contexto = pegarContexto();
    if (!contexto) return false;

    try {
      const agora = contexto.currentTime + 0.01;
      const saida = contexto.createGain();
      saida.gain.setValueAtTime(volume, agora);
      saida.connect(contexto.destination);

      const ruido = contexto.createBufferSource();
      ruido.buffer = criarRuido(contexto, DURACAO_FRUFRU);

      const filtro = contexto.createBiquadFilter();
      filtro.type = 'bandpass';
      filtro.Q.value = 0.8;
      filtro.frequency.setValueAtTime(direcao < 0 ? 2400 : 1500, agora);
      filtro.frequency.exponentialRampToValueAtTime(direcao < 0 ? 1400 : 2600, agora + DURACAO_FRUFRU * 0.75);

      const envelope = contexto.createGain();
      envelope.gain.setValueAtTime(0.0001, agora);
      envelope.gain.exponentialRampToValueAtTime(1, agora + 0.035);
      envelope.gain.exponentialRampToValueAtTime(0.22, agora + 0.17);
      envelope.gain.exponentialRampToValueAtTime(0.0001, agora + DURACAO_FRUFRU);

      ruido.connect(filtro);
      filtro.connect(envelope);
      envelope.connect(saida);
      ruido.start(agora);
      ruido.stop(agora + DURACAO_FRUFRU + 0.02);

      const toc = contexto.createOscillator();
      toc.type = 'sine';
      toc.frequency.setValueAtTime(190, agora + 0.16);
      toc.frequency.exponentialRampToValueAtTime(95, agora + 0.26);

      const tocGain = contexto.createGain();
      tocGain.gain.setValueAtTime(0.0001, agora + 0.16);
      tocGain.gain.exponentialRampToValueAtTime(0.5, agora + 0.185);
      tocGain.gain.exponentialRampToValueAtTime(0.0001, agora + 0.3);

      const tocFiltro = contexto.createBiquadFilter();
      tocFiltro.type = 'lowpass';
      tocFiltro.frequency.value = 700;

      toc.connect(tocFiltro);
      tocFiltro.connect(tocGain);
      tocGain.connect(saida);
      toc.start(agora + 0.16);
      toc.stop(agora + 0.32);

      return true;
    } catch (error) {
      console.warn('[crechezinha] não consegui fazer o barulhinho da página:', error.message);
      return false;
    }
  }

  return {
    DURACAO_FRUFRU,
    VOLUME,
    tocar,
    usarContexto,
    pegarContexto,
    criarRuido
  };
});
