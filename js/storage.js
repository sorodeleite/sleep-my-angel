(function () {
  const SMA = window.SMA;
  const DB_NAME = 'sleep-my-angel';
  const DB_VERSION = 2;
  const STORE_AUDIO = 'imported-audio';
  const STORE_BOOKS = 'imported-books';
  const STORE_DOCS = 'offline-docs';
  const objectUrls = new Map();
  let databasePromise = null;

  function openDatabase() {
    if (!('indexedDB' in window)) return Promise.resolve(null);
    if (!databasePromise) {
      databasePromise = new Promise(function (resolve) {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = function () {
          const database = request.result;
          if (!database.objectStoreNames.contains(STORE_AUDIO)) {
            database.createObjectStore(STORE_AUDIO, { keyPath: 'id' });
          }
          if (!database.objectStoreNames.contains(STORE_BOOKS)) {
            database.createObjectStore(STORE_BOOKS, { keyPath: 'id' });
          }
          if (!database.objectStoreNames.contains(STORE_DOCS)) {
            database.createObjectStore(STORE_DOCS, { keyPath: 'id' });
          }
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
})();
