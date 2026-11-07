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
})();
