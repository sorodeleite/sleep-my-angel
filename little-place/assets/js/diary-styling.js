(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.PooftieDiaryStyling = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
  const DOTS = ['none', 'small', 'medium', 'large'];
  const STORE_VERSION = 1;

  function normalizeColor(value) {
    const text = String(value == null ? '' : value).trim();
    return HEX.test(text) ? (text.length === 4 ? expandShortHex(text) : text.toLowerCase()) : null;
  }

  function expandShortHex(short) {
    return ('#' + short[1] + short[1] + short[2] + short[2] + short[3] + short[3]).toLowerCase();
  }

  function normalizeRange(text, start, end) {
    const length = String(text || '').length;
    let from = Math.max(0, Math.min(Number(start) || 0, length));
    let to = Math.max(0, Math.min(Number(end) || 0, length));
    if (to < from) [from, to] = [to, from];
    return { start: from, end: to };
  }

  function hasRange(text, start, end) {
    const range = normalizeRange(text, start, end);
    return range.end > range.start;
  }

  function makeDiaryStyle(input = {}) {
    return {
      paperColor: normalizeColor(input.paperColor) || '#ffffff',
      dotColor: normalizeColor(input.dotColor) || '#ac9e9a',
      dots: DOTS.includes(input.dots) ? input.dots : 'none'
    };
  }

  function sanitizeDiaryStyle(input) {
    if (!input || typeof input !== 'object') return null;
    const color = normalizeColor(input.paperColor);
    const dotColor = normalizeColor(input.dotColor);
    const dots = DOTS.includes(input.dots) ? input.dots : null;
    if (!color && !dotColor && !dots) return null;
    return makeDiaryStyle({
      paperColor: color || '#ffffff',
      dotColor: dotColor || '#ac9e9a',
      dots: dots || 'none'
    });
  }

  function customizarDiaryStyle(base, patch) {
    const combinado = { ...(base || {}), ...(patch || {}) };
    const limpo = sanitizeDiaryStyle(combinado);
    return limpo ? { ...limpo } : null;
  }

  function diaryStyleDaPagina(pagina, padrao) {
    return sanitizeDiaryStyle(pagina && pagina.diaryStyle) || sanitizeDiaryStyle(padrao);
  }

  function paginaTemCorPropria(pagina) {
    return Boolean(sanitizeDiaryStyle(pagina && pagina.diaryStyle));
  }

  function dotSpacing(size) {
    return { none: 0, small: 26, medium: 20, large: 14 }[size] || 0;
  }

  function makeTextDecoration(input = {}) {
    const outlineColor = normalizeColor(input.outlineColor);
    return {
      color: normalizeColor(input.color),
      outline: Boolean(input.outline),
      outlineColor: outlineColor || '#ffffff'
    };
  }

  function sanitizeTextDecoration(input) {
    if (!input || typeof input !== 'object') return null;
    const decoration = makeTextDecoration(input);
    if (!decoration.color && !input.outline) return null;
    return decoration;
  }

  function sanitizeTextStyle(input) {
    if (!input || typeof input !== 'object') return null;
    const decoration = makeTextDecoration(input);
    const escolheu = Boolean(decoration.color)
      || input.outline !== undefined
      || input.outlineColor !== undefined;
    if (!escolheu) return null;
    return decoration;
  }

  function customizarTextStyle(base, patch) {
    const combinado = { ...(base || {}), ...(patch || {}) };
    const limpo = sanitizeTextStyle(combinado);
    return limpo ? { ...limpo } : null;
  }

  function textStyleDaPagina(pagina, padrao) {
    return sanitizeTextStyle(pagina && pagina.textStyle) || makeTextDecoration(padrao || {});
  }

  function paginaTemLetraPropria(pagina) {
    return Boolean(sanitizeTextStyle(pagina && pagina.textStyle));
  }

  function decorationToCss(decoration, options = {}) {
    if (!decoration) return '';
    const width = options.outlineWidth || 2;
    const parts = [];
    const color = normalizeColor(decoration.color);
    if (color) parts.push(`color: ${color}`);
    if (decoration.outline) {
      const outlineColor = normalizeColor(decoration.outlineColor) || '#ffffff';
      parts.push(`-webkit-text-stroke: ${width}px ${outlineColor}`);
      parts.push('paint-order: stroke fill');
    }
    return parts.join('; ');
  }

  function escapeHtml(text) {
    return String(text == null ? '' : text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function parseTextSpans(text, items = []) {
    const length = String(text == null ? '' : text).length;
    const usados = [];
    const candidatos = (items || [])
      .map((item) => ({
        decoration: makeTextDecoration(item && item.decoration),
        ...normalizeRange(text, item && item.start, item && item.end)
      }))
      .filter((item) => item.end > item.start)
      .sort((a, b) => a.start - b.start || a.end - b.end);

    for (const item of candidatos) {
      const anterior = usados[usados.length - 1];
      const inicio = anterior ? Math.max(item.start, anterior.end) : item.start;
      if (inicio >= length) continue;
      const fim = Math.min(item.end, length);
      if (fim <= inicio) continue;
      usados.push({ start: inicio, end: fim, decoration: item.decoration });
    }
    return usados;
  }

  function buildExportHtml(container, text, items = []) {
    const tag = String(container || 'div').replace(/[^a-z0-9-]/gi, '') || 'div';
    const source = String(text == null ? '' : text);
    const spans = parseTextSpans(source, items);
    let cursor = 0;
    const content = [];

    while (cursor < source.length) {
      while (spans.length && spans[0].end <= cursor) spans.shift();
      const span = spans[0] || null;
      const lineEnd = source.indexOf('\n', cursor);
      const stop = lineEnd === -1 ? source.length : lineEnd;

      if (span && span.start <= stop) {
        const from = Math.max(span.start, cursor);
        const end = Math.min(span.end, stop);
        if (from > cursor) content.push(escapeHtml(source.slice(cursor, from)));
        const styled = source.slice(from, end);
        const css = decorationToCss(span.decoration);
        if (styled) content.push(css ? `<span style="${css}">${escapeHtml(styled)}</span>` : escapeHtml(styled));
        cursor = end > from ? end : stop;
      } else {
        content.push(escapeHtml(source.slice(cursor, stop)));
        cursor = stop;
      }

      if (cursor < source.length && source[cursor] === '\n') {
        content.push('<br>');
        cursor += 1;
      }
    }

    return `<${tag}>${content.join('')}</${tag}>`;
  }

  function isFavorite(favorites, src) {
    if (!src) return false;
    const list = favorites instanceof Set ? favorites : new Set(favorites || []);
    return list.has(String(src));
  }

  function toggleFavorite(favorites, src) {
    const list = new Set(favorites || []);
    const key = String(src || '');
    if (!key) return [...list];
    if (list.has(key)) list.delete(key);
    else list.add(key);
    return [...list];
  }

  function outlineStyle(decoration, width) {
    const sanitized = sanitizeTextDecoration(decoration);
    return sanitized ? decorationToCss(sanitized, { outlineWidth: width }) : '';
  }

  return {
    STORE_VERSION,
    DOTS,
    normalizeColor,
    normalizeRange,
    hasRange,
    makeDiaryStyle,
    sanitizeDiaryStyle,
    customizarDiaryStyle,
    diaryStyleDaPagina,
    paginaTemCorPropria,
    dotSpacing,
    makeTextDecoration,
    sanitizeTextDecoration,
    sanitizeTextStyle,
    customizarTextStyle,
    textStyleDaPagina,
    paginaTemLetraPropria,
    decorationToCss,
    outlineStyle,
    parseTextSpans,
    buildExportHtml,
    escapeHtml,
    isFavorite,
    toggleFavorite
  };
});
