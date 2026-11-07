(function () {
  const SMA = window.SMA;

  const requests = new Map();
  let running = false;
  let lastTitle = '';
  let stopTimer = null;

  function bridge() {
    const native = window.SleepPlayback;
    if (!native || typeof native.start !== 'function' || typeof native.stop !== 'function') return null;
    return native;
  }

  function currentTitle() {
    let title = 'sleep my angel';
    requests.forEach(function (value) {
      if (value) title = value;
    });
    return title;
  }

  function sync() {
    const native = bridge();
    if (!native) return;
    clearTimeout(stopTimer);
    stopTimer = null;
    if (requests.size > 0) {
      const title = currentTitle();
      if (running && title === lastTitle) return;
      try {
        native.start(title);
        running = true;
        lastTitle = title;
      } catch (error) {
        running = false;
      }
      return;
    }
    stopTimer = setTimeout(function () {
      try {
        native.stop();
      } catch (error) {
        running = false;
      }
      running = false;
      lastTitle = '';
    }, 2400);
  }

  SMA.keepAlive = {
    set: function (key, active, title) {
      if (active) {
        requests.set(key, title || 'sleep my angel');
      } else {
        requests.delete(key);
      }
      sync();
    },
    clear: function (key) {
      requests.delete(key);
      sync();
    }
  };
})();
