(function () {
  const SMA = window.SMA;
  const DB_NAME = 'sleep-my-angel';
  const STORE_NAME = 'imported-audio';
  const objectUrls = new Map();
  let databasePromise = null;

  function openDatabase() {
    if (!('indexedDB' in window)) return Promise.resolve(null);
    if (!databasePromise) {
      databasePromise = new Promise(function (resolve) {
        const request = indexedDB.open(DB_NAME, 1);
        request.onupgradeneeded = function () {
          const database = request.result;
          if (!database.objectStoreNames.contains(STORE_NAME)) {
            database.createObjectStore(STORE_NAME, { keyPath: 'id' });
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

  function transact(mode, action) {
    return openDatabase().then(function (database) {
      if (!database) return null;
      return new Promise(function (resolve) {
        const transaction = database.transaction(STORE_NAME, mode);
        const store = transaction.objectStore(STORE_NAME);
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

  SMA.audioStore = {
    put: function (file) {
      const id = 'import-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
      return transact('readwrite', function (store) {
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
      return transact('readonly', function (store) {
        const request = store.getAll();
        return new Promise(function (resolve) {
          request.onsuccess = function () {
            resolve(request.result || []);
          };
          request.onerror = function () {
            resolve([]);
          };
        });
      }).then(function (records) {
        return records || [];
      });
    },

    remove: function (id) {
      const url = objectUrls.get(id);
      if (url) {
        URL.revokeObjectURL(url);
        objectUrls.delete(id);
      }
      return transact('readwrite', function (store) {
        store.delete(id);
        return true;
      });
    },

    url: function (id, blob) {
      if (!objectUrls.has(id)) {
        objectUrls.set(id, URL.createObjectURL(blob));
      }
      return objectUrls.get(id);
    }
  };
})();
