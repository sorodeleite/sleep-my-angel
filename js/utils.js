(function () {
  const SMA = (window.SMA = window.SMA || {});

  SMA.select = function (selector, scope) {
    return (scope || document).querySelector(selector);
  };

  SMA.selectAll = function (selector, scope) {
    return Array.prototype.slice.call((scope || document).querySelectorAll(selector));
  };

  SMA.clamp = function (value, min, max) {
    return Math.min(max, Math.max(min, value));
  };

  SMA.debounce = function (fn, delay) {
    let timer = null;
    return function () {
      const args = arguments;
      clearTimeout(timer);
      timer = setTimeout(function () {
        fn.apply(null, args);
      }, delay);
    };
  };

  SMA.formatTime = function (seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
    const total = Math.floor(seconds);
    const minutes = Math.floor(total / 60);
    const rest = total % 60;
    return minutes + ':' + (rest < 10 ? '0' : '') + rest;
  };

  SMA.hash = function (value) {
    let hash = 0;
    const text = String(value);
    for (let i = 0; i < text.length; i += 1) {
      hash = (hash << 5) - hash + text.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  };

  SMA.escapeHTML = function (value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };

  SMA.readJSON = function (key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch (error) {
      return fallback;
    }
  };

  SMA.writeJSON = function (key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      return false;
    }
  };

  SMA.readText = function (key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? fallback : raw;
    } catch (error) {
      return fallback;
    }
  };

  SMA.writeText = function (key, value) {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (error) {
      return false;
    }
  };

  SMA.todayLabel = function () {
    const formatted = new Intl.DateTimeFormat('pt-BR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    }).format(new Date());
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  };

  SMA.platform = function () {
    if (window.api && typeof window.api.getAudios === 'function') return 'desktop';
    if (window.Capacitor && typeof window.Capacitor.isNativePlatform === 'function' && window.Capacitor.isNativePlatform()) {
      return 'android';
    }
    return 'web';
  };

  SMA.toast = function (message, tone) {
    let region = document.getElementById('toast-region');
    if (!region) {
      region = document.createElement('div');
      region.id = 'toast-region';
      region.className = 'toast-region';
      region.setAttribute('aria-live', 'polite');
      document.body.appendChild(region);
    }
    const item = document.createElement('div');
    item.className = 'toast' + (tone ? ' toast-' + tone : '');
    item.textContent = message;
    region.appendChild(item);
    requestAnimationFrame(function () {
      item.classList.add('visible');
    });
    setTimeout(function () {
      item.classList.remove('visible');
      setTimeout(function () {
        item.remove();
      }, 260);
    }, 3200);
  };

  SMA.trigger = function (element, name, detail) {
    element.dispatchEvent(new CustomEvent(name, { detail: detail, bubbles: true }));
  };

  SMA.readImageFile = function (file, maxSize, quality) {
    return new Promise(function (resolve, reject) {
      if (!file || !file.type || file.type.indexOf('image/') !== 0) {
        reject(new Error('não é uma imagem'));
        return;
      }
      const url = URL.createObjectURL(file);
      const image = new Image();
      image.onload = function () {
        const limit = maxSize || 640;
        const scale = Math.min(1, limit / Math.max(image.width, image.height));
        const width = Math.max(1, Math.round(image.width * scale));
        const height = Math.max(1, Math.round(image.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext('2d');
        context.drawImage(image, 0, 0, width, height);
        URL.revokeObjectURL(url);
        try {
          resolve(canvas.toDataURL('image/jpeg', quality || 0.84));
        } catch (error) {
          reject(error);
        }
      };
      image.onerror = function () {
        URL.revokeObjectURL(url);
        reject(new Error('não consegui abrir essa imagem'));
      };
      image.src = url;
    });
  };

  SMA.downloadBlob = function (content, fileName, type) {
    const blob = content instanceof Blob ? content : new Blob([content], { type: type || 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(function () {
      URL.revokeObjectURL(url);
    }, 1200);
  };

  SMA.fileNameTitle = function (name) {
    return String(name || '')
      .replace(/\.[^.]+$/, '')
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  };

  SMA.decodeEntities = function (value) {
    return String(value)
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#0?39;|&apos;/g, "'")
      .replace(/&#x([0-9a-f]+);/gi, function (_, hex) {
        return String.fromCodePoint(parseInt(hex, 16));
      })
      .replace(/&#(\d+);/g, function (_, number) {
        return String.fromCodePoint(parseInt(number, 10));
      });
  };

  SMA.normalizePath = function (value) {
    let path = String(value || '');
    try {
      path = decodeURIComponent(path);
    } catch (error) {
      path = path;
    }
    return path.replace(/\\/g, '/').replace(/^\.\//, '').replace(/^\/+/, '').replace(/\s+/g, ' ');
  };

  SMA.baseName = function (value) {
    const parts = SMA.normalizePath(value).split('/');
    return parts[parts.length - 1];
  };

  SMA.dirName = function (value) {
    const parts = SMA.normalizePath(value).split('/');
    parts.pop();
    return parts.join('/');
  };

  SMA.cleanImageRef = function (value) {
    let ref = String(value || '').trim();
    if (!ref) return '';
    if (ref.charAt(0) === '<' && ref.charAt(ref.length - 1) === '>') {
      ref = ref.slice(1, -1).trim();
    }
    const titled = ref.match(/^([\s\S]*?)\s+(?:"[^"]*"|'[^']*')\s*$/);
    if (titled) ref = titled[1].trim();
    return SMA.decodeEntities(ref).trim();
  };

  SMA.collectImageRefs = function (text) {
    const refs = [];
    const seen = new Set();
    const push = function (value) {
      const ref = SMA.cleanImageRef(value);
      if (!ref || seen.has(ref)) return;
      seen.add(ref);
      refs.push(ref);
    };
    const source = String(text || '');
    const markdown = /!\[[^\]]*\]\(([^)]+)\)/g;
    let match = markdown.exec(source);
    while (match) {
      push(match[1]);
      match = markdown.exec(source);
    }
    const html = /<img\b[^>]*\bsrc\s*=\s*["']([^"']+)["'][^>]*>/gi;
    match = html.exec(source);
    while (match) {
      push(match[1]);
      match = html.exec(source);
    }
    return refs;
  };

  SMA.blobToDataUrl = function (blob) {
    return new Promise(function (resolve) {
      const reader = new FileReader();
      reader.onload = function () { resolve(String(reader.result || '')); };
      reader.onerror = function () { resolve(''); };
      reader.readAsDataURL(blob);
    });
  };

  SMA.canvasHasAlpha = function (canvas) {
    try {
      const context = canvas.getContext('2d');
      const data = context.getImageData(0, 0, canvas.width, canvas.height).data;
      for (let index = 3; index < data.length; index += 4 * 37) {
        if (data[index] < 250) return true;
      }
    } catch (error) {
      return true;
    }
    return false;
  };

  SMA.imageToDataUrl = async function (blob, limit) {
    const max = limit || 1400;
    try {
      if (blob.size < 260 * 1024) return await SMA.blobToDataUrl(blob);
      const bitmap = await createImageBitmap(blob);
      const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
      const width = Math.max(1, Math.round(bitmap.width * scale));
      const height = Math.max(1, Math.round(bitmap.height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d');
      context.drawImage(bitmap, 0, 0, width, height);
      if (typeof bitmap.close === 'function') bitmap.close();
      const type = /png|gif|webp/i.test(blob.type) && SMA.canvasHasAlpha(canvas) ? 'image/png' : 'image/jpeg';
      return canvas.toDataURL(type, 0.84);
    } catch (error) {
      return SMA.blobToDataUrl(blob);
    }
  };

  const remoteImageCache = new Map();

  SMA.fetchRemoteImage = async function (url) {
    const key = String(url || '');
    if (!key || /^data:/i.test(key)) return '';
    if (remoteImageCache.has(key)) return remoteImageCache.get(key);
    const load = async function () {
      try {
        const controller = typeof AbortController === 'function' ? new AbortController() : null;
        const timer = controller ? setTimeout(function () { controller.abort(); }, 15000) : null;
        const response = await fetch(key, {
          mode: 'cors',
          credentials: 'omit',
          cache: 'force-cache',
          signal: controller ? controller.signal : undefined
        });
        if (timer) clearTimeout(timer);
        if (!response.ok) return '';
        const blob = await response.blob();
        if (!blob || !blob.size || blob.size > 14 * 1024 * 1024) return '';
        return (await SMA.imageToDataUrl(blob, 1400)) || '';
      } catch (error) {
        return '';
      }
    };
    const result = await load();
    remoteImageCache.set(key, result);
    return result;
  };
})();
