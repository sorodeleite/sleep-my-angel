(function () {
  const SMA = window.SMA;
  const DB_NAME = 'sleep-my-angel';
  const DB_VERSION = 3;
  const STORE_AUDIO = 'imported-audio';
  const STORE_BOOKS = 'imported-books';
  const STORE_DOCS = 'offline-docs';
  const STORE_MOOD_BOARDS = 'mood-boards';
  const STORE_MOOD_FOLDERS = 'mood-folders';
  const STORE_MOOD_PINS = 'mood-pins';
  const STORE_MOOD_IMAGES = 'mood-images';
  const ALL_STORES = [
    STORE_AUDIO,
    STORE_BOOKS,
    STORE_DOCS,
    STORE_MOOD_BOARDS,
    STORE_MOOD_FOLDERS,
    STORE_MOOD_PINS,
    STORE_MOOD_IMAGES
  ];
  const objectUrls = new Map();
  let databasePromise = null;

  function openDatabase() {
    if (!('indexedDB' in window)) return Promise.resolve(null);
    if (!databasePromise) {
      databasePromise = new Promise(function (resolve) {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = function () {
          const database = request.result;
          ALL_STORES.forEach(function (name) {
            if (!database.objectStoreNames.contains(name)) {
              database.createObjectStore(name, { keyPath: 'id' });
            }
          });
        };
        request.onsuccess = function () {
          resolve(request.result);
        };
        request.onerror = function () {
          resolve(null);
        };
      });
    }
    return databasePromise;
  }

  function transact(storeName, mode, action) {
    return openDatabase().then(function (database) {
      if (!database) return null;
      return new Promise(function (resolve) {
        const transaction = database.transaction(storeName, mode);
        const store = transaction.objectStore(storeName);
        let result = null;
        try {
          result = action(store);
        } catch (error) {
          resolve(null);
          return;
        }
        transaction.oncomplete = function () {
          resolve(result);
        };
        transaction.onerror = function () {
          resolve(null);
        };
        transaction.onabort = function () {
          resolve(null);
        };
      });
    });
  }

  function requestResult(request) {
    return new Promise(function (resolve) {
      request.onsuccess = function () {
        resolve(request.result);
      };
      request.onerror = function () {
        resolve(null);
      };
    });
  }

  function blobUrl(key, blob) {
    if (!blob) return '';
    if (!objectUrls.has(key)) {
      objectUrls.set(key, URL.createObjectURL(blob));
    }
    return objectUrls.get(key);
  }

  function releaseUrl(key) {
    const url = objectUrls.get(key);
    if (url) {
      URL.revokeObjectURL(url);
      objectUrls.delete(key);
    }
  }

  function uniqueId(prefix) {
    return prefix + '-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
  }

  SMA.audioStore = {
    put: function (file) {
      const id = uniqueId('import');
      return transact(STORE_AUDIO, 'readwrite', function (store) {
        store.put({
          id: id,
          name: file.name,
          type: file.type,
          size: file.size,
          added: Date.now(),
          blob: file
        });
        return id;
      });
    },

    all: function () {
      return transact(STORE_AUDIO, 'readonly', function (store) {
        return requestResult(store.getAll());
      }).then(function (records) {
        return records || [];
      });
    },

    get: function (id) {
      if (!id) return Promise.resolve(null);
      return transact(STORE_AUDIO, 'readonly', function (store) {
        return requestResult(store.get(id));
      });
    },

    remove: function (id) {
      releaseUrl('audio:' + id);
      return transact(STORE_AUDIO, 'readwrite', function (store) {
        store.delete(id);
        return true;
      });
    },

    url: function (id, blob) {
      return blobUrl('audio:' + id, blob);
    }
  };

  SMA.bookStore = {
    put: function (file, meta) {
      const id = uniqueId('book');
      return transact(STORE_BOOKS, 'readwrite', function (store) {
        store.put({
          id: id,
          name: file.name,
          type: file.type || (meta && meta.type) || '',
          size: file.size,
          added: Date.now(),
          blob: file
        });
        return id;
      });
    },

    all: function () {
      return transact(STORE_BOOKS, 'readonly', function (store) {
        return requestResult(store.getAll());
      }).then(function (records) {
        return records || [];
      });
    },

    get: function (id) {
      if (!id) return Promise.resolve(null);
      return transact(STORE_BOOKS, 'readonly', function (store) {
        return requestResult(store.get(id));
      });
    },

    remove: function (id) {
      releaseUrl('book:' + id);
      return transact(STORE_BOOKS, 'readwrite', function (store) {
        store.delete(id);
        return true;
      });
    },

    url: function (id, blob) {
      return blobUrl('book:' + id, blob);
    }
  };

  SMA.docStore = {
    put: function (doc) {
      return transact(STORE_DOCS, 'readwrite', function (store) {
        store.put(doc);
        return doc.id;
      });
    },

    all: function () {
      return transact(STORE_DOCS, 'readonly', function (store) {
        return requestResult(store.getAll());
      }).then(function (records) {
        return (records || []).sort(function (a, b) {
          return (b.updated || 0) - (a.updated || 0);
        });
      });
    },

    get: function (id) {
      if (!id) return Promise.resolve(null);
      return transact(STORE_DOCS, 'readonly', function (store) {
        return requestResult(store.get(id));
      });
    },

    remove: function (id) {
      return transact(STORE_DOCS, 'readwrite', function (store) {
        store.delete(id);
        return true;
      });
    }
  };

  function getAllFrom(storeName) {
    return transact(storeName, 'readonly', function (store) {
      return requestResult(store.getAll());
    }).then(function (records) {
      return records || [];
    });
  }

  SMA.moodStore = {
    boards: function () {
      return getAllFrom(STORE_MOOD_BOARDS);
    },

    folders: function () {
      return getAllFrom(STORE_MOOD_FOLDERS);
    },

    pins: function () {
      return getAllFrom(STORE_MOOD_PINS);
    },

    saveBoard: function (board) {
      return transact(STORE_MOOD_BOARDS, 'readwrite', function (store) {
        store.put(board);
        return board.id;
      });
    },

    removeBoard: function (id) {
      return transact(STORE_MOOD_BOARDS, 'readwrite', function (store) {
        store.delete(id);
        return true;
      });
    },

    saveFolder: function (folder) {
      return transact(STORE_MOOD_FOLDERS, 'readwrite', function (store) {
        store.put(folder);
        return folder.id;
      });
    },

    removeFolder: function (id) {
      return transact(STORE_MOOD_FOLDERS, 'readwrite', function (store) {
        store.delete(id);
        return true;
      });
    },

    savePin: function (pin) {
      return transact(STORE_MOOD_PINS, 'readwrite', function (store) {
        store.put(pin);
        return pin.id;
      });
    },

    removePin: function (id) {
      releaseUrl('mood:' + id);
      return transact(STORE_MOOD_PINS, 'readwrite', function (store) {
        store.delete(id);
        return true;
      });
    },

    putImage: function (pinId, blob) {
      return transact(STORE_MOOD_IMAGES, 'readwrite', function (store) {
        store.put({ id: pinId, blob: blob, added: Date.now() });
        return true;
      });
    },

    removeImage: function (pinId) {
      releaseUrl('mood:' + pinId);
      return transact(STORE_MOOD_IMAGES, 'readwrite', function (store) {
        store.delete(pinId);
        return true;
      });
    },

    getImage: function (pinId) {
      return transact(STORE_MOOD_IMAGES, 'readonly', function (store) {
        return requestResult(store.get(pinId));
      });
    },

    pinUrl: function (pin) {
      if (!pin) return Promise.resolve('');
      if (!pin.hasImage) return Promise.resolve(pin.remoteUrl || '');
      const cacheKey = 'mood:' + pin.id;
      if (objectUrls.has(cacheKey)) return Promise.resolve(objectUrls.get(cacheKey));
      return SMA.moodStore.getImage(pin.id).then(function (record) {
        if (!record || !record.blob) return pin.remoteUrl || '';
        return blobUrl(cacheKey, record.blob);
      });
    },

    removeMany: function (boardId) {
      return Promise.all([
        SMA.moodStore.pins().then(function (pins) {
          return Promise.all(pins.filter(function (pin) { return pin.boardId === boardId; }).map(function (pin) {
            return SMA.moodStore.removeImage(pin.id).then(function () {
              return SMA.moodStore.removePin(pin.id);
            });
          }));
        }),
        SMA.moodStore.folders().then(function (folders) {
          return Promise.all(folders.filter(function (folder) { return folder.boardId === boardId; }).map(function (folder) {
            return SMA.moodStore.removeFolder(folder.id);
          }));
        })
      ]).then(function () {
        return SMA.moodStore.removeBoard(boardId);
      });
    }
  };
})();
