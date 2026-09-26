(function () {
  'use strict';

  var STORAGE_KEY = 'tandaan-data-v2';
  var LEGACY_KEY = 'bugaslist-data-v1';
  var data = loadData();
  var recognition = null;
  var isListening = false;

  var els = {
    quickInput: document.getElementById('quickInput'),
    addButton: document.getElementById('addButton'),
    voiceButton: document.getElementById('voiceButton'),
    voiceStatus: document.getElementById('voiceStatus'),
    voiceLang: document.getElementById('voiceLang'),
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
    return { tasks: [], shopping: [], purchases: [], notes: [] };
  }

  function normalizeData(parsed) {
    return {
      tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [],
      shopping: Array.isArray(parsed.shopping) ? parsed.shopping : [],
      purchases: Array.isArray(parsed.purchases) ? parsed.purchases : [],
      notes: Array.isArray(parsed.notes) ? parsed.notes : []
    };
  }

  function loadData() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        raw = localStorage.getItem(LEGACY_KEY);
        if (!raw) return defaultData();
      }
      return normalizeData(JSON.parse(raw));
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

  function cleanItemName(value) {
    return value
      .replace(/^\s*(?:ko|mo|nako|ako)\s+/i, '')
      .replace(/\s+/g, ' ')
      .replace(/[,.]+$/, '')
      .trim();
  }

  function normalizeLocalWords(text) {
    return text
      .replace(/\bmabakal\b/gi, 'buy')
      .replace(/\mbakal\b/gi, 'buy')
      .replace(/\bpalit(?:on)?\b/gi, 'buy')
      .replace(/\bpaliton\b/gi, 'buy')
      .replace(/\bnabakal\b/gi, 'bought')
      .replace(/\bnakabakal\b/gi, 'bought')
      .replace(/\bkag\b/gi, 'and')
      .replace(/\bnga\b/gi, 'that')
      .replace(/\bsang\b/gi, 'of')
      .replace(/\bbugas\b/gi, 'rice')
      .replace(/\bhumay\b/gi, 'rice')
      .replace(/\bitlog\b/gi, 'eggs')
      .replace(/\bkatong itlog\b/gi, 'eggs')
      .replace(/\blata\b/gi, 'cans')
      .replace(/\bka lata\b/gi, 'cans')
      .replace(/\bkilo\b/gi, 'kg')
      .replace(/\bkilos\b/gi, 'kg')
      .replace(/\btatlo\b/gi, '3')
      .replace(/\bduha\b/gi, '2')
      .replace(/\bisa\b/gi, '1')
      .replace(/\busa\b/gi, '1');
  }

  function parseAmount(str) {
    var m = String(str).match(/₱?\s*(\d+(?:,\d{3})*(?:\.\d+)?|\d+(?:\.\d+)?)/);
    return m ? Number(m[1].replace(/,/g, '')) : null;
  }

  function parseAndAdd(input) {
    var text = input.trim();
    if (!text) return;

    var converted = normalizeLocalWords(text);
    var normalized = converted.toLowerCase();

    // Multiple purchases in one typed/voice sentence separated by commas or semicolons.
    if (/[;,]/.test(text)) {
      var parts = text.split(/[;,]+/).map(function (p) { return p.trim(); }).filter(Boolean);
      var addedAny = false;
      parts.forEach(function (part) {
        var result = parsePurchase(part);
        if (result) { addPurchase(result, true); addedAny = true; }
      });
      if (addedAny) {
        saveData(); render(); toast('Purchases added');
        els.quickInput.value = '';
        return;
      }
    }

    var purchase = parsePurchase(text);
    if (purchase) {
      addPurchase(purchase);
      return;
    }

    var shopping = converted.match(/^(?:buy|to buy|need to buy|need|add to shopping list)[\s:,-]+(.+)$/i);
    if (shopping) {
      addShopping(cleanItemName(shopping[1]));
      return;
    }

    // Loose purchase: "rice 200 pesos", "eggs ₱120".
    var loosePurchase = text.match(/^(.+?)[\s,-]+₱?\s*(\d+(?:\.\d+)?)\s*(?:pesos?|php)$/i);
    if (loosePurchase) {
      addPurchase({ item: cleanItemName(loosePurchase[1]), quantity: 1, unit: '', amount: Number(loosePurchase[2]) });
      return;
    }

    // If local wording converted cleanly into a shopping command, use it.
    var localShopping = normalized.match(/^(?:buy)[\s:,-]+(.+)$/i);
    if (localShopping) {
      addShopping(cleanItemName(localShopping[1]));
      return;
    }

    addTask(text);
  }

  function parsePurchase(text) {
    var converted = normalizeLocalWords(text);
    var purchase = converted.match(/^(?:i\s+)?(?:bought|buy|purchased)[\s:,-]*(.+?)\s+(\d+(?:\.\d+)?)\s*(kg|kilos?|g|grams?|pcs?|pieces?|l|liters?|ml|cans?|bottles?)?\s*(?:for|at|=)?\s*₱?\s*(\d+(?:\.\d+)?)\s*(?:pesos?|php)?$/i);
    if (!purchase) return null;

    return {
      item: cleanItemName(purchase[1]),
      quantity: Number(purchase[2]),
      unit: purchase[3] || '',
      amount: Number(purchase[4])
    };
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

  function addPurchase(p, silent) {
    data.purchases.unshift({ id: uid(), item: p.item, quantity: p.quantity, unit: p.unit || '', amount: p.amount, createdAt: new Date().toISOString() });
    if (!silent) {
      saveData(); render(); toast('Purchase added');
      els.quickInput.value = '';
    }
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

  function setVoiceStatus(message, active) {
    if (!els.voiceStatus) return;
    els.voiceStatus.textContent = message;
    els.voiceStatus.classList.toggle('voice-active', !!active);
  }

  function setupRecognition() {
    var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setVoiceStatus('Voice recognition is not available in this browser. On iOS 12, use the keyboard microphone for now.', false);
      return null;
    }

    var r = new SpeechRecognition();
    r.continuous = false;
    r.interimResults = true;
    r.maxAlternatives = 1;
    r.lang = els.voiceLang ? els.voiceLang.value : 'en-US';

    r.onstart = function () {
      isListening = true;
      els.voiceButton.classList.add('listening');
      els.voiceButton.setAttribute('aria-pressed', 'true');
      setVoiceStatus('Listening… speak naturally.', true);
    };

    r.onresult = function (event) {
      var transcript = '';
      for (var i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      els.quickInput.value = transcript;
      if (event.results[event.results.length - 1].isFinal) {
        setVoiceStatus('Heard: ' + transcript, false);
        parseAndAdd(transcript);
      } else {
        setVoiceStatus('Hearing: ' + transcript, true);
      }
    };

    r.onerror = function (event) {
      isListening = false;
      els.voiceButton.classList.remove('listening');
      els.voiceButton.setAttribute('aria-pressed', 'false');
      var msg = event.error === 'not-allowed' ? 'Microphone permission was denied.' : 'Voice recognition stopped: ' + event.error + '.';
      setVoiceStatus(msg, false);
    };

    r.onend = function () {
      isListening = false;
      els.voiceButton.classList.remove('listening');
      els.voiceButton.setAttribute('aria-pressed', 'false');
      if (els.voiceStatus.textContent === 'Listening… speak naturally.') setVoiceStatus('Ready.', false);
    };

    return r;
  }

  els.voiceLang.addEventListener('change', function () {
    if (recognition) recognition.lang = els.voiceLang.value;
    setVoiceStatus('Voice language set to ' + els.voiceLang.options[els.voiceLang.selectedIndex].text + '.', false);
  });

  els.voiceButton.addEventListener('click', function () {
    if (!recognition) {
      setVoiceStatus('This iPhone browser does not expose speech recognition. Tap the text box and use the iPhone keyboard microphone.', false);
      els.quickInput.focus();
      toast('Use the iPhone keyboard microphone for now');
      return;
    }
    if (isListening) {
      recognition.stop();
      return;
    }
    recognition.lang = els.voiceLang.value;
    try {
      recognition.start();
    } catch (e) {
      setVoiceStatus('Voice could not start. Tap again and allow microphone access.', false);
    }
  });

  recognition = setupRecognition();

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('./sw.js').catch(function () { /* Offline cache is optional during local development. */ });
    });
  }

  render();
})();
