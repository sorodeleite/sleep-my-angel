(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.PooftieStickerCategories = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const CATEGORY_META = {
    pelucias: { emoji: '🧸', label: 'Pelúcias' },
    animais: { emoji: '🐾', label: 'Animais' },
    comidinhas: { emoji: '🍰', label: 'Comidinhas' },
    natureza: { emoji: '🌿', label: 'Natureza' },
    coracaozinhos: { emoji: '💗', label: 'Coraçõezinhos' },
    lacinhos: { emoji: '🎀', label: 'Lacinhos' },
    emoticons: { emoji: '😊', label: 'Emoticons' },
    agere: { emoji: '🍼', label: 'Agere' },
    'rendinhas-e-bordas': { emoji: '🧵', label: 'Rendas & Bordas' },
    random: { emoji: '✨', label: 'Random' }
  };

  const CATEGORY_ORDER = [
    'pelucias', 'animais', 'comidinhas', 'natureza', 'coracaozinhos',
    'lacinhos', 'emoticons', 'agere', 'rendinhas-e-bordas', 'random'
  ];

  const ROOT_CATEGORY = { key: 'soltinhos', emoji: '🎈', label: 'Soltinhos' };
  const CUSTOM_CATEGORY = { key: 'meus', emoji: '✂️', label: 'Meus' };
  const EXTRA_CATEGORY = { key: 'quartinho', emoji: '🏠', label: 'Do quartinho' };

  const MEDIA = [
    { key: 'all', emoji: '✨', label: 'tudo' },
    { key: 'photo', emoji: '🖼️', label: 'fotos' },
    { key: 'gif', emoji: '🎞️', label: 'gifs' },
    { key: 'video', emoji: '🎬', label: 'vídeos' }
  ];

  function prettifyFolder(slug) {
    const text = String(slug || '').replace(/[-_]+/g, ' ').trim();
    if (!text) return 'Adesivos';
    if (/^\d+$/.test(text)) return `Adesivos ${text}`;
    return text.replace(/(^|\s)(\S)/g, (_, space, letter) => space + letter.toUpperCase());
  }

  function describeFolder(slug) {
    const meta = CATEGORY_META[slug];
    return {
      key: slug,
      emoji: (meta && meta.emoji) || '✨',
      label: (meta && meta.label) || prettifyFolder(slug)
    };
  }

  function orderFolders(slugs) {
    const known = CATEGORY_ORDER.filter((slug) => slugs.includes(slug));
    const rest = slugs
      .filter((slug) => !CATEGORY_ORDER.includes(slug))
      .sort((a, b) => a.localeCompare(b, 'pt-BR'));
    return [...known, ...rest];
  }

  const MEDIA_KIND = (typeof globalThis !== 'undefined' && globalThis.PooftieMediaKind) || null;

  function toItems(paths, animated) {
    return paths.map((path) => ({
      src: path,
      animated: animated.has(path),
      video: isVideoSource(path)
    }));
  }

  function isAnimatedSource(src) {
    const text = String(src || '');
    return /\.gif(\?|$)/i.test(text) || /^data:image\/gif/i.test(text);
  }

  function isVideoSource(src) {
    if (MEDIA_KIND) return MEDIA_KIND.isVideoSource(src);
    const text = String(src || '');
    if (/^video:/i.test(text) || /^data:video\//i.test(text)) return true;
    return /\.(?:mp4|m4v|webm|ogv|mov|avi|mkv|3gp|3g2|mpeg|mpg)(?:\?|$)/i.test(text);
  }

  function buildCategories({
    folders,
    rootFiles = [],
    animated = new Set(),
    customItems = [],
    extraItems = []
  } = {}) {
    const map = folders instanceof Map ? folders : new Map(Object.entries(folders || {}));
    const animSet = animated instanceof Set ? animated : new Set(animated);
    const categories = [];

    for (const slug of orderFolders([...map.keys()])) {
      const items = toItems(map.get(slug) || [], animSet);
      if (items.length) categories.push({ ...describeFolder(slug), items });
    }

    if (rootFiles.length) {
      categories.push({ ...ROOT_CATEGORY, items: toItems(rootFiles, animSet) });
    }

    if (extraItems.length) {
      categories.push({ ...EXTRA_CATEGORY, items: toItems(extraItems, animSet) });
    }

    categories.push({
      ...CUSTOM_CATEGORY,
      custom: true,
      items: customItems.map((item) => {
        const src = typeof item === 'string' ? item : item.content;
        const video = typeof item === 'object' && item
          ? (item.mediaType === 'video' || item.video === true || isVideoSource(src))
          : isVideoSource(src);
        return { src, item, animated: !video && isAnimatedSource(src), video };
      })
    });

    return categories;
  }

  function filterByMedia(items, media) {
    if (media === 'video') return items.filter((item) => item.video);
    if (media === 'gif') return items.filter((item) => item.animated);
    if (media === 'photo') return items.filter((item) => !item.animated && !item.video);
    return items;
  }

  function countByMedia(items) {
    const video = items.filter((item) => item.video).length;
    const gif = items.filter((item) => item.animated).length;
    return { all: items.length, gif, video, photo: items.length - gif - video };
  }

  function findCategory(categories, key) {
    return categories.find((category) => category.key === key) || categories[0] || null;
  }

  return {
    CATEGORY_META,
    CATEGORY_ORDER,
    ROOT_CATEGORY,
    CUSTOM_CATEGORY,
    EXTRA_CATEGORY,
    MEDIA,
    prettifyFolder,
    describeFolder,
    orderFolders,
    toItems,
    isAnimatedSource,
    isVideoSource,
    buildCategories,
    filterByMedia,
    countByMedia,
    findCategory
  };
});
