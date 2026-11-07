(function (global) {
  'use strict';

  // Arquivos de meditação seguem o padrão "nome da meditação_pessoa".
  // Alguns nomes antigos usavam "-" e "_" no meio do título, então a lista de
  // pessoas conhecidas evita quebrar o título no lugar errado.
  const ARTISTS = [
    { name: 'Kyabgon Phakchok Rinpoche', aliases: ['Kyabgon Phakchok Rinpoche'] },
    { name: 'Tenzin Wangyal Rinpoche', aliases: ['Tenzin Wangyal Rinpoche'] },
    { name: 'Nisargadatta Maharaj', aliases: ['Nisargadatta Maharaj'] },
    { name: 'Jiddu Krishnamurti', aliases: ['Jiddu Krishnamurti'] },
    { name: 'Jack Kornfield', aliases: ['Jack Kornfield'] },
    { name: 'Thich Nhat Hanh', aliases: ['Thich Nhat Hanh'] },
    { name: 'Tarthang Tulku', aliases: ['Tarthang Tulku'] },
    { name: 'Pema Chodron', aliases: ['Pema Chodron'] },
    { name: 'Rupert Spira', aliases: ['Rupert Spira'] },
    { name: 'Mestre Eckhart', aliases: ['Mestre Eckhart'] },
    { name: 'Paul Brunton', aliases: ['Paul Brunton'] },
    { name: 'Lama Yeshe', aliases: ['Lama Yeshe'] },
    { name: 'Ajahn Chah', aliases: ['Ajahn Chah', 'Ajahn Chahr'] },
    { name: 'Adyashanti', aliases: ['Adyashanti'] },
    { name: 'Ram Dass', aliases: ['Ram Dass'] },
    { name: 'Mooji', aliases: ['Mooji'] }
  ];

  const TITLE_FIXES = {
    'Pare de Pensa': 'Pare de Pensar',
    'Concentre se na Consciência': 'Concentre-se na Consciência',
    'Observe se na Luz da Consciência': 'Observe-se na Luz da Consciência'
  };

  function clean(value) {
    return String(value == null ? '' : value)
      .replace(/\.(m4a|mp3|wav|ogg|flac|opus|aac)$/i, '')
      .replace(/_+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function tidyTitle(value) {
    const title = clean(value)
      .replace(/[\s\-–—]+$/, '')
      .trim();
    return TITLE_FIXES[title] || title;
  }

  function splitTrackName(value, category) {
    const base = String(value == null ? '' : value).replace(/\.(m4a|mp3|wav|ogg|flac|opus|aac)$/i, '');
    if (!base) return { title: '', artist: '' };

    if (category && category !== 'meditacao') {
      return { title: clean(base), artist: '' };
    }

    const flat = clean(base);
    const lower = flat.toLowerCase();
    let found = null;

    ARTISTS.forEach(function (entry) {
      entry.aliases.forEach(function (alias) {
        const variants = [alias, alias.replace(/\s+/g, '-'), alias.replace(/\s+/g, '_')];
        variants.forEach(function (variant) {
          const suffix = ' ' + variant.toLowerCase();
          if (!lower.endsWith(suffix)) return;
          const title = flat.slice(0, flat.length - suffix.length).trim();
          if (!title) return;
          if (!found || variant.length > found.variant.length) {
            found = { title: title, artist: entry.name, variant: variant };
          }
        });
      });
    });

    if (found) {
      return { title: tidyTitle(found.title), artist: found.artist };
    }

    const separator = base.lastIndexOf('_');
    if (separator > 0) {
      const title = base.slice(0, separator);
      const artist = base.slice(separator + 1);
      if (title.trim() && artist.trim()) {
        return { title: tidyTitle(title), artist: clean(artist) };
      }
    }

    return { title: tidyTitle(flat), artist: '' };
  }

  const api = {
    splitTrackName: splitTrackName,
    artists: ARTISTS
  };

  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (global) {
    global.SMA = global.SMA || {};
    global.SMA.splitTrackName = splitTrackName;
    global.SMA.trackArtists = ARTISTS;
  }
})(typeof window !== 'undefined' ? window : null);
