(function () {
  const SMA = window.SMA;
  const KEY = 'sma_custom_reminders';
  const DAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
  let webTimer = null;
  let editingId = null;

  function readReminders() {
    const reminders = SMA.readJSON(KEY, []);
    return Array.isArray(reminders) ? reminders : [];
  }

  function saveReminders(reminders) {
    if (!SMA.writeJSON(KEY, reminders)) {
      SMA.toast('não consegui salvar esse lembrete', 'error');
      return false;
    }
    if (window.SleepReminders && typeof window.SleepReminders.save === 'function') {
      window.SleepReminders.save(JSON.stringify(reminders));
    }
    scheduleWebReminder();
    renderList();
    return true;
  }

  function escape(value) {
    return SMA.escapeHTML(value);
  }

  function modalMarkup() {
    return '<div class="reminders-backdrop" id="reminders-modal"><section class="reminders-box" role="dialog" aria-modal="true" aria-labelledby="reminders-title"><div class="reminders-heading"><div><span class="reminders-eyebrow">sleep my angel</span><h3 id="reminders-title">lembretes</h3></div><button type="button" class="reminders-close" id="reminders-close" aria-label="fechar">×</button></div><form id="reminder-form"><label class="reminder-field">nome do lembrete<input id="reminder-title" maxlength="48" required placeholder="hora de descansar"></label><label class="reminder-field">mensagem<input id="reminder-message" maxlength="120" placeholder="um momento só seu ♡"></label><div class="reminder-field"><label for="reminder-time">horário</label><input id="reminder-time" type="time" value="21:00" required></div><fieldset class="reminder-days"><legend>repetir em</legend><div class="reminder-day-options">' + DAYS.map(function (day, index) { return '<label><input type="checkbox" name="reminder-day" value="' + index + '" checked><span>' + day + '</span></label>'; }).join('') + '</div></fieldset><div class="reminder-form-actions"><button type="button" class="btn-secondary" id="reminder-cancel">cancelar</button><button type="submit" class="btn-primary" id="reminder-save">salvar lembrete</button></div></form><div class="reminders-list-wrap"><div class="reminders-list-heading"><strong>seus lembretes</strong><span id="reminder-count">0</span></div><div id="reminders-list"></div></div><button type="button" class="btn-secondary reminders-update-link" id="reminders-update-link">atualizar o app</button><p class="reminders-note" id="reminders-note"></p></section></div>';
  }

  function ensureModal() {
    if (!document.getElementById('reminders-modal')) {
      document.body.insertAdjacentHTML('beforeend', modalMarkup());
      document.getElementById('reminders-modal').addEventListener('click', function (event) {
        if (event.target.id === 'reminders-modal') closeModal();
      });
      document.getElementById('reminders-close').addEventListener('click', closeModal);
      document.getElementById('reminders-update-link').addEventListener('click', function () { closeModal(); if (SMA.Updater && typeof SMA.Updater.open === 'function') SMA.Updater.open(); });
      document.getElementById('reminder-cancel').addEventListener('click', resetForm);
      document.getElementById('reminder-form').addEventListener('submit', submitForm);
      document.getElementById('reminders-list').addEventListener('click', handleListClick);
    }
  }

  function openModal() {
    ensureModal();
    document.getElementById('reminders-modal').classList.add('open');
    renderList();
    document.getElementById('reminders-note').textContent = SMA.platform() === 'android'
      ? 'os lembretes do Android continuam funcionando mesmo com o app fechado.'
      : 'no navegador, os avisos aparecem enquanto o app estiver aberto.';
  }

  function closeModal() {
    const modal = document.getElementById('reminders-modal');
    if (modal) modal.classList.remove('open');
    resetForm();
  }

  function resetForm() {
    editingId = null;
    const form = document.getElementById('reminder-form');
    if (!form) return;
    form.reset();
    document.getElementById('reminder-time').value = '21:00';
    document.querySelectorAll('input[name="reminder-day"]').forEach(function (input) { input.checked = true; });
    document.getElementById('reminder-save').textContent = 'salvar lembrete';
    document.getElementById('reminder-cancel').hidden = true;
  }

  async function submitForm(event) {
    event.preventDefault();
    const title = document.getElementById('reminder-title').value.trim();
    const message = document.getElementById('reminder-message').value.trim();
    const time = document.getElementById('reminder-time').value;
    const days = Array.from(document.querySelectorAll('input[name="reminder-day"]:checked')).map(function (input) { return Number(input.value); });
    if (!title || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time) || !days.length) {
      SMA.toast('escolha um nome, horário e pelo menos um dia');
      return;
    }
    if (SMA.platform() !== 'android') await requestWebPermission();
    const reminders = readReminders();
    const item = {
      id: editingId || String(Date.now()) + String(Math.floor(Math.random() * 1000)),
      title: title,
      message: message,
      time: time,
      days: days,
      enabled: true
    };
    const index = reminders.findIndex(function (reminder) { return reminder.id === item.id; });
    if (index >= 0) reminders[index] = item;
    else reminders.push(item);
    if (saveReminders(reminders)) {
      resetForm();
      SMA.toast('lembrete salvo ♡');
    }
  }

  function renderList() {
    const list = document.getElementById('reminders-list');
    if (!list) return;
    const reminders = readReminders();
    document.getElementById('reminder-count').textContent = String(reminders.length);
    if (!reminders.length) {
      list.innerHTML = '<p class="reminders-empty">seus lembretes aparecerão aqui ♡</p>';
      return;
    }
    list.innerHTML = reminders.map(function (item) {
      const days = (item.days || []).slice().sort().map(function (day) { return ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'][day]; }).join(' · ');
      return '<article class="reminder-item' + (item.enabled ? '' : ' is-disabled') + '"><div class="reminder-item-copy"><strong>' + escape(item.title) + '</strong><span>' + escape(item.time) + ' · ' + escape(days) + '</span>' + (item.message ? '<small>' + escape(item.message) + '</small>' : '') + '</div><div class="reminder-item-actions"><button type="button" data-action="toggle" data-id="' + escape(item.id) + '" aria-label="' + (item.enabled ? 'pausar' : 'ativar') + '">' + (item.enabled ? 'Ⅱ' : '▶') + '</button><button type="button" data-action="edit" data-id="' + escape(item.id) + '" aria-label="editar">✎</button><button type="button" data-action="delete" data-id="' + escape(item.id) + '" aria-label="excluir">×</button></div></article>';
    }).join('');
  }

  function handleListClick(event) {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    const action = button.dataset.action;
    const id = button.dataset.id;
    const reminders = readReminders();
    const item = reminders.find(function (reminder) { return reminder.id === id; });
    if (!item) return;
    if (action === 'delete') {
      saveReminders(reminders.filter(function (reminder) { return reminder.id !== id; }));
      if (editingId === id) resetForm();
      return;
    }
    if (action === 'toggle') {
      item.enabled = !item.enabled;
      saveReminders(reminders);
      return;
    }
    if (action === 'edit') {
      editingId = id;
      document.getElementById('reminder-title').value = item.title;
      document.getElementById('reminder-message').value = item.message || '';
      document.getElementById('reminder-time').value = item.time;
      document.querySelectorAll('input[name="reminder-day"]').forEach(function (input) {
        input.checked = (item.days || []).indexOf(Number(input.value)) !== -1;
      });
      document.getElementById('reminder-save').textContent = 'atualizar lembrete';
      document.getElementById('reminder-cancel').hidden = false;
      document.getElementById('reminder-title').focus();
    }
  }

  async function requestWebPermission() {
    if (!('Notification' in window)) return false;
    if (Notification.permission === 'granted') return true;
    if (Notification.permission === 'denied') return false;
    return (await Notification.requestPermission()) === 'granted';
  }

  function scheduleWebReminder() {
    if (webTimer) clearTimeout(webTimer);
    webTimer = null;
    if (SMA.platform() === 'android') return;
    const reminders = readReminders().filter(function (item) { return item.enabled; });
    if (!reminders.length || !('Notification' in window) || Notification.permission !== 'granted') return;
    const now = new Date();
    let next = null;
    reminders.forEach(function (item) {
      (item.days || []).forEach(function (day) {
        const candidate = new Date(now);
        candidate.setHours(Number(item.time.slice(0, 2)), Number(item.time.slice(3, 5)), 0, 0);
        const offset = (day - now.getDay() + 7) % 7;
        candidate.setDate(now.getDate() + offset);
        if (candidate <= now) candidate.setDate(candidate.getDate() + 7);
        if (!next || candidate < next.date) next = { date: candidate, item: item };
      });
    });
    if (!next) return;
    webTimer = setTimeout(function () {
      if (document.visibilityState === 'visible') {
        new Notification(next.item.title, { body: next.item.message || 'um lembrete do sleep my angel ♡' });
      }
      scheduleWebReminder();
    }, Math.min(next.date.getTime() - Date.now(), 2147480000));
  }

  function init() {
    const profile = document.querySelector('.profile-info');
    if (!profile) return;
    let button = document.getElementById('btn-reminders-settings');
    if (!button) {
      button = document.createElement('button');
      button.type = 'button';
      button.id = 'btn-reminders-settings';
      button.className = 'reminders-settings-btn';
      button.setAttribute('aria-label', 'configurar lembretes');
      button.title = 'lembretes';
      button.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 8.2a3.8 3.8 0 1 0 0 7.6 3.8 3.8 0 0 0 0-7.6Z"></path><path d="m19.4 13.5 1.2.9-1.8 3.1-1.4-.6a7.8 7.8 0 0 1-1.5.9l-.2 1.5h-3.6l-.2-1.5a7.8 7.8 0 0 1-1.5-.9l-1.4.6-1.8-3.1 1.2-.9a7.1 7.1 0 0 1 0-1.8L7.2 10.8 9 7.7l1.4.6a7.8 7.8 0 0 1 1.5-.9l.2-1.5h3.6l.2 1.5a7.8 7.8 0 0 1 1.5.9l1.4-.6 1.8 3.1-1.2.9a7.1 7.1 0 0 1 0 1.8Z"></path></svg>';
      profile.appendChild(button);
    }
    button.addEventListener('click', openModal);
    ensureModal();
    if (window.SleepReminders && typeof window.SleepReminders.save === 'function') {
      window.SleepReminders.save(JSON.stringify(readReminders()));
    }
    scheduleWebReminder();
    document.addEventListener('visibilitychange', scheduleWebReminder);
  }

  SMA.Reminders = { init: init };
})();