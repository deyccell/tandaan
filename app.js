(function () {
  'use strict';

  var STORAGE_KEY = 'tandaan-data-v2';
  var LEGACY_KEY = 'bugaslist-data-v1';
  var data = loadData();
  var recognition = null;
  var isListening = false;
  var voiceMode = 'fallback';

  var els = {
    quickInput: document.getElementById('quickInput'),
    addButton: document.getElementById('addButton'),
    voiceButton: document.getElementById('voiceButton'),
    voiceStatus: document.getElementById('voiceStatus'),
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
    return String(value)
      .replace(/^\s*(?:(?:ko|mo|nako|ako)\s+)+(?:of|that)?\s*/i, '')
      .replace(/^\s*(?:of|that)\s+/i, '')
      .replace(/\b(?:please|palihug)\b/gi, '')
      .replace(/\s+/g, ' ')
      .replace(/^[\s,.-]+|[\s,.-]+$/g, '')
      .trim();
  }

  function normalizeLocalWords(text) {
    return String(text)
      .replace(/\b(?:mabakal|mabuy)\b/gi, 'buy')
      .replace(/\bbakal(?:on)?\b/gi, 'buy')
      .replace(/\bpalit(?:on)?\b/gi, 'buy')
      .replace(/\bpalita\b/gi, 'buy')
      .replace(/\b(?:nabakal|nakabakal|nakapalit|nabili|binili)\b/gi, 'bought')
      .replace(/\bkag\b/gi, 'and')
      .replace(/\bug\b/gi, 'and')
      .replace(/\bat\b/gi, 'and')
      .replace(/\bsang\b/gi, 'of')
      .replace(/\bnga\b/gi, 'that')
      .replace(/\bng\b/gi, 'of')
      .replace(/\bbugas\b/gi, 'rice')
      .replace(/\bhumay\b/gi, 'rice')
      .replace(/\bitlog\b/gi, 'eggs')
      .replace(/\bkatong itlog\b/gi, 'eggs')
      .replace(/\blata\b/gi, 'cans')
      .replace(/\bka lata\b/gi, 'cans')
      .replace(/\bbote\b/gi, 'bottle')
      .replace(/\bkilo(?:s)?\b/gi, 'kg')
      .replace(/\bgramo(?:s)?\b/gi, 'g')
      .replace(/\btatlo\b/gi, '3')
      .replace(/\bduha\b/gi, '2')
      .replace(/\bduha ka\b/gi, '2')
      .replace(/\busa\b/gi, '1')
      .replace(/\bisa\b/gi, '1')
      .replace(/\bnapulo\b/gi, '10')
      .replace(/\bnapulo kag duha\b/gi, '12');
  }

  function detectLanguage(text) {
    var t = ' ' + String(text).toLowerCase().replace(/[^a-záéíóúñ0-9]+/gi, ' ') + ' ';
    var scores = { English: 0, 'Tagalog / Filipino': 0, 'Hiligaynon / Ilonggo': 0, 'Cebuano / Bisaya': 0 };
    var english = [' buy ', ' bought ', ' purchase ', ' purchased ', ' need ', ' shopping ', ' rice ', ' eggs ', ' pesos ', ' please '];
    var tagalog = [' bumili ', ' bilhin ', ' nabili ', ' binili ', ' kailangan ', ' pambili ', ' ako ', ' para sa ', ' magkano '];
    var hiligaynon = [' mabakal ', ' sang ', ' kag ', ' gid ', ' indi ', ' ara ', ' bugas ', ' bakal '];
    var cebuano = [' palit ', ' paliton ', ' nabakal ', ' ug ', ' kay ', ' naa ', ' kinahanglan ', ' bisaya '];
    english.forEach(function (w) { if (t.indexOf(w) >= 0) scores.English++; });
    tagalog.forEach(function (w) { if (t.indexOf(w) >= 0) scores['Tagalog / Filipino']++; });
    hiligaynon.forEach(function (w) { if (t.indexOf(w) >= 0) scores['Hiligaynon / Ilonggo']++; });
    cebuano.forEach(function (w) { if (t.indexOf(w) >= 0) scores['Cebuano / Bisaya']++; });

    var ranked = Object.keys(scores).sort(function (a, b) { return scores[b] - scores[a]; });
    var top = ranked[0];
    var second = ranked[1];
    if (scores[top] === 0) return 'Undetermined';
    if (scores[top] === scores[second] && scores[top] > 0) return 'Mixed / Multilingual';
    if (scores[top] >= 2 && scores[second] >= 1) return 'Mixed / Multilingual';
    return top;
  }

  function wordsToNumber(str) {
    var m = String(str).trim().toLowerCase();
    var map = { one:1, two:2, three:3, four:4, five:5, six:6, seven:7, eight:8, nine:9, ten:10, eleven:11, twelve:12, isa:1, usa:1, duha:2, tatlo:3, upat:4, lima:5, unom:6, pito:7, walo:8, siyam:9, napulo:10 };
    return Object.prototype.hasOwnProperty.call(map, m) ? map[m] : Number(m);
  }

  function parseAmount(str) {
    var m = String(str).match(/(?:₱\s*)?(\d+(?:,\d{3})*(?:\.\d+)?|\d+(?:\.\d+)?)/);
    return m ? Number(m[1].replace(/,/g, '')) : null;
  }

  function splitListItems(text) {
    var normalized = normalizeLocalWords(text)
      .replace(/\s+and\s+/gi, ',')
      .replace(/\s+&\s+/g, ',');
    return normalized.split(/[;,]+/).map(function (p) { return p.trim(); }).filter(Boolean);
  }

  function parseListPurchasePart(part) {
    var s = part.trim();
    var money = null;
    var amountMatch = s.match(/(?:₱\s*)?(\d+(?:,\d{3})*(?:\.\d+)?)\s*(?:pesos?|php)?\s*$/i);
    if (amountMatch) {
      money = Number(amountMatch[1].replace(/,/g, ''));
      s = s.slice(0, amountMatch.index).trim();
    }
    if (money === null) return null;

    var qty = 1;
    var unit = '';
    var qtyMatch = s.match(/(?:^|\s)(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|isa|usa|duha|tatlo|upat|lima|unom|pito|walo|siyam|napulo)\s*(kg|kilo|kilos|g|gram|grams|pcs|pc|piece|pieces|l|liter|liters|ml|can|cans|bottle|bottles|ka\s+lata)?/i);
    var digitQtyMatch = s.match(/(?:^|\s)(\d+(?:\.\d+)?)\s*(kg|kilo|kilos|g|gram|grams|pcs|pc|piece|pieces|l|liter|liters|ml|can|cans|bottle|bottles|ka\s+lata)?/i);
    var qMatch = qtyMatch || digitQtyMatch;
    if (qMatch) {
      qty = wordsToNumber(qMatch[1]);
      unit = qMatch[2] || '';
      unit = unit.replace(/^kilos?$/i, 'kg').replace(/^grams?$/i, 'g').replace(/^pcs?$/i, 'pcs').replace(/^pieces?$/i, 'pcs').replace(/^cans?$/i, 'can').replace(/^bottles?$/i, 'bottle');
      s = (s.slice(0, qMatch.index) + ' ' + s.slice(qMatch.index + qMatch[0].length)).replace(/\s+/g, ' ').trim();
    }
    var item = cleanItemName(s);
    if (!item) return null;
    return { item: item, quantity: Number(qty || 1), unit: unit, amount: money };
  }

  function parsePurchase(text) {
    var converted = normalizeLocalWords(text).replace(/\s+/g, ' ').trim();
    var explicit = converted.match(/^(?:i\s+)?(?:bought|purchased)\s+(?:ko\s+)?(.+?)\s+(\d+(?:\.\d+)?)\s*(kg|kilo|kilos|g|gram|grams|pcs|pc|piece|pieces|l|liter|liters|ml|can|cans|bottle|bottles)?\s*(?:for|at|=)?\s*₱?\s*(\d+(?:\.\d+)?)\s*(?:pesos?|php)?$/i);
    if (explicit) {
      return { item: cleanItemName(explicit[1]), quantity: Number(explicit[2]), unit: normalizeUnit(explicit[3] || ''), amount: Number(explicit[4]) };
    }

    var convertedBuy = converted.match(/^buy\s+(.+?)\s+(\d+(?:\.\d+)?)\s*(kg|kilo|kilos|g|gram|grams|pcs|pc|piece|pieces|l|liter|liters|ml|can|cans|bottle|bottles)?\s*(?:for|at|=)?\s*₱?\s*(\d+(?:\.\d+)?)\s*(?:pesos?|php)?$/i);
    if (convertedBuy) {
      return { item: cleanItemName(convertedBuy[1]), quantity: Number(convertedBuy[2]), unit: normalizeUnit(convertedBuy[3] || ''), amount: Number(convertedBuy[4]) };
    }

    return null;
  }

  function normalizeUnit(unit) {
    return String(unit || '').toLowerCase().replace(/^kilo(?:s)?$/, 'kg').replace(/^gram(?:s)?$/, 'g').replace(/^pcs?$/, 'pcs').replace(/^pieces?$/, 'pcs').replace(/^cans?$/, 'can').replace(/^bottles?$/, 'bottle');
  }

  function parseShoppingItems(text) {
    var converted = normalizeLocalWords(text).replace(/^\s*(?:buy|to buy|need to buy|need|add to shopping list)\s*/i, '');
    var pieces = splitListItems(converted);
    return pieces.map(function (p) { return cleanItemName(p); }).filter(Boolean);
  }

  function parseAndAdd(input) {
    var text = String(input || '').trim();
    if (!text) return;


    var converted = normalizeLocalWords(text);
    var lower = converted.toLowerCase();

    // Long purchase list: "Rice 2 kg 200, eggs 12 120, sardines 3 cans 75"
    if (/[;,]/.test(text)) {
      var rawParts = text.split(/[;,]+/).map(function (p) { return p.trim(); }).filter(Boolean);
      var purchases = rawParts.map(parseListPurchasePart).filter(Boolean);
      if (purchases.length === rawParts.length && purchases.length) {
        purchases.forEach(function (p) { addPurchase(p, true); });
        saveData(); render(); toast(purchases.length + ' purchases added');
        els.quickInput.value = '';
        return;
      }
    }

    var purchase = parsePurchase(text);
    if (purchase) {
      addPurchase(purchase);
      return;
    }

    var loosePurchase = text.match(/^(.+?)[\s,-]+₱?\s*(\d+(?:\.\d+)?)\s*(?:pesos?|php)$/i);
    if (loosePurchase) {
      addPurchase({ item: cleanItemName(loosePurchase[1]), quantity: 1, unit: '', amount: Number(loosePurchase[2]) });
      return;
    }

    var shoppingTrigger = /^(?:buy|to buy|need to buy|need|add to shopping list)\b/i.test(lower);
    var localShoppingTrigger = /\b(?:mabakal|bakal|palit|paliton)\b/i.test(text);
    if (shoppingTrigger || localShoppingTrigger) {
      var items = parseShoppingItems(text);
      if (items.length) {
        items.forEach(addShopping);
        els.quickInput.value = '';
        return;
      }
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

  function isStandalone() {
    return !!(window.navigator.standalone || (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches));
  }

  function resetVoiceButton() {
    isListening = false;
    els.voiceButton.classList.remove('listening');
    els.voiceButton.setAttribute('aria-pressed', 'false');
  }

  function setupRecognition() {
    var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return null;

    var r = new SpeechRecognition();
    r.continuous = false;
    r.interimResults = true;
    r.maxAlternatives = 3;

    r.onstart = function () {
      isListening = true;
      voiceMode = 'browser';
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
      resetVoiceButton();
      if (event.error === 'service-not-allowed') {
        voiceMode = 'fallback';
        setVoiceStatus('Use the iPhone keyboard microphone to speak.', false);
        els.quickInput.focus();
        return;
      }
      if (event.error === 'not-allowed') {
        setVoiceStatus('Microphone or speech permission was denied. Check Settings, then try again.', false);
        return;
      }
      setVoiceStatus('Voice recognition stopped: ' + event.error + '.', false);
    };

    r.onend = function () {
      resetVoiceButton();
      if (els.voiceStatus.textContent.indexOf('Listening…') === 0) setVoiceStatus('Ready.', false);
    };

    return r;
  }

  els.voiceButton.addEventListener('click', function () {
    if (isListening && recognition) {
      recognition.stop();
      return;
    }

    if (isStandalone()) {
      // Home Screen PWA speech recognition is still not consistently available on iOS.
      // Give the user the most reliable path on the same screen.
      voiceMode = 'fallback';
      els.quickInput.focus();
      setVoiceStatus('Use the iPhone keyboard microphone to speak.', false);
      toast('Use the iPhone keyboard microphone');
      return;
    }

    if (!recognition) {
      els.quickInput.focus();
      setVoiceStatus('Use the iPhone keyboard microphone to dictate.', false);
      toast('Use the iPhone keyboard microphone');
      return;
    }

    try {
      recognition.start();
    } catch (e) {
      resetVoiceButton();
      els.quickInput.focus();
      setVoiceStatus('Voice could not start. Use the keyboard microphone instead.', false);
    }
  });

  function toast(message) {
    els.toast.textContent = message;
    els.toast.classList.add('show');
    window.clearTimeout(toast._timer);
    toast._timer = window.setTimeout(function () { els.toast.classList.remove('show'); }, 2200);
  }

  recognition = setupRecognition();
  if (!recognition && !isStandalone()) {
    setVoiceStatus('Use the iPhone keyboard microphone to dictate.', false);
  }

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('./sw.js').catch(function () { /* Offline cache is optional during local development. */ });
    });
  }

  render();
})();
