/*
 * pdf-text.js — tira texto de um pdf usando o pdf.js e remonta parágrafos.
 *
 * o modo texto do leitor usa isso: em vez de mostrar a página como imagem, o texto
 * vira parágrafo de verdade — aí a letra muda de tamanho, o modo escuro pega e dá
 * pra marcar trechos.
 *
 * funciona no navegador (window.SMA.pdfText) e no node (module.exports), pra poder
 * testar fora do app.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  } else {
    root.SMA = root.SMA || {};
    root.SMA.pdfText = api;
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // agrupa os pedacinhos de texto que o pdf.js devolve em linhas
  function linesFromItems(items) {
    const lines = [];
    (items || []).forEach(function (item) {
      const text = String(item.str || '');
      if (!text.trim()) return;
      const transform = item.transform || [1, 0, 0, 1, 0, 0];
      const x = Number(transform[4]) || 0;
      const y = Number(transform[5]) || 0;
      const size = Math.abs(Number(item.height) || Number(transform[3]) || 10) || 10;
      let line = null;
      for (let index = 0; index < lines.length; index += 1) {
        const candidate = lines[index];
        const tolerance = Math.max(2, Math.min(candidate.size, size) * 0.5);
        if (Math.abs(candidate.y - y) <= tolerance) {
          line = candidate;
          break;
        }
      }
      if (!line) {
        line = { y: y, size: size, parts: [] };
        lines.push(line);
      }
      line.size = Math.max(line.size, size);
      line.parts.push({ text: text, x: x, width: Math.abs(Number(item.width) || 0) });
    });

    lines.sort(function (a, b) { return b.y - a.y; });
    return lines.map(function (line) {
      line.parts.sort(function (a, b) { return a.x - b.x; });
      let text = '';
      let endX = null;
      line.parts.forEach(function (part) {
        if (endX === null) {
          text = part.text;
        } else {
          const gap = part.x - endX;
          text += gap > Math.max(1, line.size * 0.18) ? ' ' + part.text : part.text;
        }
        endX = part.x + part.width;
      });
      const last = line.parts[line.parts.length - 1];
      return {
        text: text.replace(/\s+/g, ' ').trim(),
        y: line.y,
        size: line.size,
        left: line.parts[0].x,
        right: last.x + last.width
      };
    }).filter(function (line) { return line.text; });
  }

  // junta as linhas de uma página em parágrafos: linha recuada ou com espaço extra
  // em cima começa parágrafo novo
  function pageParagraphs(lines, pageHeight) {
    const body = lines.filter(function (line) {
      if (/^[-–—\s]*\d{1,4}[-–—\s]*$/.test(line.text)) return false;
      if (pageHeight) {
        if (line.y > pageHeight * 0.955 && line.text.length < 70) return false;
        if (line.y < pageHeight * 0.045 && line.text.length < 70) return false;
      }
      return true;
    });
    if (!body.length) return [];

    const sizes = body.map(function (line) { return line.size; }).sort(function (a, b) { return a - b; });
    const base = sizes[Math.floor(sizes.length / 2)] || 10;
    const left = Math.min.apply(null, body.map(function (line) { return line.left; }));
    const gaps = [];
    for (let index = 1; index < body.length; index += 1) {
      gaps.push(body[index - 1].y - body[index].y);
    }
    gaps.sort(function (a, b) { return a - b; });
    const typical = gaps.length ? gaps[Math.floor(gaps.length / 2)] : base * 1.2;

    const paragraphs = [];
    let current = '';
    body.forEach(function (line, index) {
      const previous = body[index - 1];
      const indented = line.left - left > base * 0.7;
      const gap = previous ? previous.y - line.y : 0;
      const startsNew = !current || (index > 0 && (indented || gap > typical * 1.35));
      if (startsNew) {
        if (current) paragraphs.push(current);
        current = line.text;
        return;
      }
      if (/-$/.test(current) && /^[a-záàâãéêíóôõúüç]/.test(line.text)) {
        current = current.slice(0, -1) + line.text;
      } else {
        current += ' ' + line.text;
      }
    });
    if (current) paragraphs.push(current);
    return paragraphs;
  }

  // pdf de scanner não tem camada de texto: aqui a gente confere antes de oferecer o modo texto
  async function hasSelectableText(pdf, maxPages) {
    const limit = Math.min(Number(maxPages) || 3, pdf.numPages || 1);
    let chars = 0;
    for (let index = 1; index <= limit; index += 1) {
      try {
        const page = await pdf.getPage(index);
        const content = await page.getTextContent();
        (content.items || []).forEach(function (item) {
          chars += String(item.str || '').trim().length;
        });
      } catch (error) {}
      if (chars > 200) return true;
    }
    return chars > 200;
  }

  async function paragraphs(pdf, onProgress) {
    const pages = [];
    for (let index = 1; index <= pdf.numPages; index += 1) {
      try {
        const page = await pdf.getPage(index);
        const viewport = page.getViewport({ scale: 1 });
        const content = await page.getTextContent();
        pages.push(pageParagraphs(linesFromItems(content.items), viewport.height));
      } catch (error) {
        pages.push([]);
      }
      if (onProgress) onProgress(index, pdf.numPages);
      if (index % 4 === 0 && typeof setTimeout === 'function') {
        await new Promise(function (resolve) { setTimeout(resolve, 0); });
      }
    }

    const result = [];
    pages.forEach(function (pageItems) {
      pageItems.forEach(function (text) {
        const clean = String(text).replace(/\s+([,.;:!?])/g, '$1').replace(/\s{2,}/g, ' ').trim();
        if (!clean) return;
        const previous = result[result.length - 1];
        const continues = previous && !/[.!?…]["')\]]?$/.test(previous) && /^[a-záàâãéêíóôõúüç]/.test(clean);
        if (continues) {
          result[result.length - 1] = /-$/.test(previous)
            ? previous.slice(0, -1) + clean
            : previous + ' ' + clean;
          return;
        }
        result.push(clean);
      });
    });
    return result;
  }

  return {
    linesFromItems: linesFromItems,
    pageParagraphs: pageParagraphs,
    hasSelectableText: hasSelectableText,
    paragraphs: paragraphs
  };
});
