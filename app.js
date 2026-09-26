(function () {
  'use strict';

  var STORAGE_KEY = 'bugaslist-data-v1';
  var data = loadData();

  var els = {
    quickInput: document.getElementById('quickInput'),
    addButton: document.getElementById('addButton'),
    taskList: document.getElementById('taskList'),
    shoppingList: document.getElementById('shoppingList'),
    purchaseList: document.getElementById('purchaseList'),
    taskCount: document.getElementById('taskCount'),
    shoppingCount: document.getElementById('shoppingCount'),
    purchaseTotal: document.getElementById('purchaseTotal'),
    emptyTasks: document.getElementById('emptyTasks'),
    emptyShopping: document.getElementById('emptyShopping'),
    emptyPurchases: document.getElementById('emptyPurchases'),
    clearAll: document.getElementById('clearAll'),
    toast: document.getElementById('toast'),
    installHint: document.getElementById('installHint')
  };

  function defaultData() {
    return { tasks: [], shopping: [], purchases: [] };
  }

  function loadData() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultData();
      var parsed = JSON.parse(raw);
      return {
        tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [],
        shopping: Array.isArray(parsed.shopping) ? parsed.shopping : [],
        purchases: Array.isArray(parsed.purchases) ? parsed.purchases : []
      };
    } catch (e) {
      return defaultData();
    }
  }

  function saveData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  function uid() {
    return String(Date.now()) + '-' + String(Math.random()).slice(2);
  }

  function escapeHTML(value) {
    return String(value).replace(/[&<>'"]/g, function (ch) {
      return {'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch];
    });
  }

  function peso(value) {
    return '₱' + Number(value || 0).toFixed(2);
  }

  function parseAndAdd(input) {
    var text = input.trim();
    if (!text) return;

    var lower = text.toLowerCase();

    // Purchase pattern for the first foundation version.
    // Examples: "I bought rice 2 kg for 200 pesos", "rice 2kg 200"
    var purchase = text.match(/^(?:i\s+)?(?:bought|buy|purchased|nabakal(?:\s+ko)?|nakabakal(?:\s+ko)?)[\s:,-]*(.+?)\s+(\d+(?:\.\d+)?)\s*(kg|kilos?|g|grams?|pcs?|pieces?|l|liters?|ml|cans?|bottles?)?\s*(?:for|at|=)?\s*₱?\s*(\d+(?:\.\d+)?)\s*(?:pesos?|php)?$/i);
    if (purchase) {
      addPurchase({
        item: purchase[1],
        quantity: Number(purchase[2]),
        unit: purchase[3] || '',
        amount: Number(purchase[4])
      });
      return;
    }

    // Simple shopping phrases in English and common local wording.
    var shopping = text.match(/^(?:mabakal|bakal|palit(?:on)?|palit(?:on)?\s+ko|buy|to buy|need to buy|need)[\s:,-]+(.+)$/i);
    if (shopping) {
      addShopping(shopping[1]);
      return;
    }

    // Explicit purchase total style: "rice 200" / "eggs 120 pesos"
    var loosePurchase = text.match(/^(.+?)[\s,-]+₱?\s*(\d+(?:\.\d+)?)\s*(?:pesos?|php)$/i);
    if (loosePurchase) {
      addPurchase({ item: loosePurchase[1], quantity: 1, unit: '', amount: Number(loosePurchase[2]) });
      return;
    }

    addTask(text);
  }

  function addTask(title) {
    data.tasks.unshift({ id: uid(), title: title, done: false, createdAt: new Date().toISOString() });
    saveData(); render(); toast('Task added');
    els.quickInput.value = '';
  }

  function addShopping(item) {
    data.shopping.unshift({ id: uid(), item: item, done: false, createdAt: new Date().toISOString() });
    saveData(); render(); toast('Shopping item added');
    els.quickInput.value = '';
  }

  function addPurchase(p) {
    data.purchases.unshift({ id: uid(), item: p.item, quantity: p.quantity, unit: p.unit || '', amount: p.amount, createdAt: new Date().toISOString() });
    saveData(); render(); toast('Purchase added');
    els.quickInput.value = '';
  }

  function render() {
    renderTasks();
    renderShopping();
    renderPurchases();
  }

  function renderTasks() {
    els.taskCount.textContent = String(data.tasks.filter(function (t) { return !t.done; }).length);
    els.emptyTasks.style.display = data.tasks.length ? 'none' : 'block';
    els.taskList.innerHTML = data.tasks.map(function (t) {
      return '<li class="list-item ' + (t.done ? 'item-done' : '') + '" data-id="' + escapeHTML(t.id) + '">' +
        '<input class="checkbox" type="checkbox" ' + (t.done ? 'checked' : '') + ' aria-label="Complete task">' +
        '<div class="item-main"><div class="item-title">' + escapeHTML(t.title) + '</div></div>' +
        '<button class="delete-btn" type="button" aria-label="Delete">✕</button>' +
      '</li>';
    }).join('');
  }

  function renderShopping() {
    els.shoppingCount.textContent = String(data.shopping.filter(function (s) { return !s.done; }).length);
    els.emptyShopping.style.display = data.shopping.length ? 'none' : 'block';
    els.shoppingList.innerHTML = data.shopping.map(function (s) {
      return '<li class="list-item ' + (s.done ? 'item-done' : '') + '" data-id="' + escapeHTML(s.id) + '">' +
        '<input class="checkbox" type="checkbox" ' + (s.done ? 'checked' : '') + ' aria-label="Mark shopping item done">' +
        '<div class="item-main"><div class="item-title">' + escapeHTML(s.item) + '</div></div>' +
        '<button class="delete-btn" type="button" aria-label="Delete">✕</button>' +
      '</li>';
    }).join('');
  }

  function renderPurchases() {
    var total = data.purchases.reduce(function (sum, p) { return sum + Number(p.amount || 0); }, 0);
    els.purchaseTotal.textContent = peso(total);
    els.emptyPurchases.style.display = data.purchases.length ? 'none' : 'block';
    els.purchaseList.innerHTML = data.purchases.map(function (p) {
      var meta = p.quantity + (p.unit ? ' ' + p.unit : '');
      return '<li class="list-item" data-id="' + escapeHTML(p.id) + '">' +
        '<div class="item-main"><div class="item-title">' + escapeHTML(p.item) + '</div><div class="item-meta">' + escapeHTML(meta) + '</div></div>' +
        '<strong class="price">' + peso(p.amount) + '</strong>' +
        '<button class="delete-btn" type="button" aria-label="Delete">✕</button>' +
      '</li>';
    }).join('');
  }

  function findIndexById(arr, id) {
    for (var i = 0; i < arr.length; i++) if (arr[i].id === id) return i;
    return -1;
  }

  els.addButton.addEventListener('click', function () { parseAndAdd(els.quickInput.value); });
  els.quickInput.addEventListener('keydown', function (event) {
    if (event.key === 'Enter') parseAndAdd(els.quickInput.value);
  });

  els.taskList.addEventListener('change', function (event) {
    if (!event.target.classList.contains('checkbox')) return;
    var li = event.target.closest('.list-item');
    var index = findIndexById(data.tasks, li.getAttribute('data-id'));
    if (index >= 0) { data.tasks[index].done = event.target.checked; saveData(); render(); }
  });

  els.shoppingList.addEventListener('change', function (event) {
    if (!event.target.classList.contains('checkbox')) return;
    var li = event.target.closest('.list-item');
    var index = findIndexById(data.shopping, li.getAttribute('data-id'));
    if (index >= 0) { data.shopping[index].done = event.target.checked; saveData(); render(); }
  });

  function deleteFrom(container, arr, label) {
    container.addEventListener('click', function (event) {
      if (!event.target.classList.contains('delete-btn')) return;
      var li = event.target.closest('.list-item');
      var index = findIndexById(arr, li.getAttribute('data-id'));
      if (index >= 0) { arr.splice(index, 1); saveData(); render(); toast(label + ' deleted'); }
    });
  }
  deleteFrom(els.taskList, data.tasks, 'Task');
  deleteFrom(els.shoppingList, data.shopping, 'Shopping item');
  deleteFrom(els.purchaseList, data.purchases, 'Purchase');

  document.querySelectorAll('.example').forEach(function (button) {
    button.addEventListener('click', function () {
      els.quickInput.value = button.getAttribute('data-value');
      els.quickInput.focus();
    });
  });

  els.clearAll.addEventListener('click', function () {
    if (!window.confirm('Clear all local data on this device?')) return;
    data = defaultData();
    saveData(); render(); toast('All local data cleared');
  });

  els.installHint.addEventListener('click', function () {
    toast('In Safari: Share → Add to Home Screen');
  });

  function toast(message) {
    els.toast.textContent = message;
    els.toast.classList.add('show');
    window.clearTimeout(toast._timer);
    toast._timer = window.setTimeout(function () { els.toast.classList.remove('show'); }, 1800);
  }

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('./sw.js').catch(function () { /* Offline cache is optional during local development. */ });
    });
  }

  render();
})();
