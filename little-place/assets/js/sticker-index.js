(function () {
  'use strict';

  const index = {
    ready: false,
    all: [],
    set: new Set(),
    byName: new Map(),
    animatedSet: new Set(),
    folders: new Map(),
    rootFiles: [],
    has(path) {
      return this.set.has(path);
    },
    find(name) {
      return this.byName.get(name) || [];
    },
    isAnimated(path) {
      return this.animatedSet.has(path);
    },
    folderSlugs() {
      return [...this.folders.keys()];
    },
    resolve(path) {
      if (!this.ready) return path;
      if (this.set.has(path)) return path;

      const swapExtension = (candidate) =>
        candidate.replace(/\.(png|jpe?g|gif)$/i, '.webp');
      const swapped = swapExtension(path);
      if (swapped !== path && this.set.has(swapped)) return swapped;

      const name = decodeURIComponent(String(path).split('/').pop() || '');
      const byName = this.byName.get(name) || [];
      if (byName.length === 1) return byName[0];
      if (byName.length > 1) {
        const root = byName.find((candidate) => candidate.split('/').length === 3);
        return root || byName[0];
      }

      const nameBase = swapExtension(name);
      const bySwappedName = this.byName.get(nameBase) || [];
      if (bySwappedName.length >= 1) {
        const root = bySwappedName.find((candidate) => candidate.split('/').length === 3);
        return root || bySwappedName[0];
      }

      return null;
    }
  };

  window.PooftieStickerIndex = index;

  function add(path) {
    if (!path || index.set.has(path)) return;
    index.set.add(path);
    index.all.push(path);
    const name = decodeURIComponent(String(path).split('/').pop() || '');
    if (!name) return;
    const list = index.byName.get(name) || [];
    list.push(path);
    index.byName.set(name, list);

    const parts = String(path).split('/');
    if (parts[0] !== 'assets' || parts[1] !== 'stickers') return;
    if (parts.length === 3) {
      index.rootFiles.push(path);
      return;
    }
    if (parts.length >= 4) {
      const folder = index.folders.get(parts[2]) || [];
      folder.push(path);
      index.folders.set(parts[2], folder);
    }
  }

  async function load() {
    try {
      const response = await fetch('assets/stickers/manifest.json', { cache: 'no-cache' });
      if (!response.ok) throw new Error(`manifest ${response.status}`);
      const data = await response.json();
      for (const path of data.animated || []) index.animatedSet.add(path);
      for (const path of data.stickers || []) add(path);
      for (const path of data.images || []) add(path);
      index.ready = true;
      console.info(
        `[crechezinha] índice de stickers: ${index.all.length} arquivos em ` +
        `${index.folders.size} pasta(s), ${index.animatedSet.size} animado(s)`
      );
    } catch (error) {
      console.warn('[crechezinha] não carreguei assets/stickers/manifest.json:', error.message);
    }
    return index;
  }

  index.readyPromise = load();
})();
