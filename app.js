(function () {
  'use strict';

  var STORAGE_KEY = 'tandaan-data-v2';
  var LEGACY_KEY = 'bugaslist-data-v1';
  var data = loadData();
  var isListening = false;
  var voiceMode = 'capture';
  var voiceProcessing = null;
  var voiceFeatures = { echoCancellation: false, noiseSuppression: false, autoGainControl: false, webAudioFocus: false };

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
    installHint: document.getElementById('installHint'),
    voiceFocusBadge: document.getElementById('voiceFocusBadge')
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

  function toast(message) {
    els.toast.textContent = message;
    els.toast.classList.add('show');
    window.clearTimeout(toast._timer);
    toast._timer = window.setTimeout(function () { els.toast.classList.remove('show'); }, 2200);
  }

  // ---------- Local offline speech ----------
  var mediaStream = null;
  var mediaRecorder = null;
  var audioChunks = [];
  var levelContext = null;
  var analyser = null;
  var levelFrame = null;
  var recordingStartedAt = 0;
  var recordingTimer = null;
  var lastAudioUrl = '';
  var localWorker = null;
  var localWorkerReady = false;
  var workerLoading = false;
  var pendingTranscription = false;
  var MAX_RECORDING_SECONDS = 90;

  els.recordingPanel = document.getElementById('recordingPanel');
  els.stopVoiceButton = document.getElementById('stopVoiceButton');
  els.recordingLabel = document.getElementById('recordingLabel');
  els.recordingTimer = document.getElementById('recordingTimer');
  els.levelBar = document.getElementById('levelBar');
  els.voicePreview = document.getElementById('voicePreview');
  els.prepareVoiceButton = document.getElementById('prepareVoiceButton');
  els.voiceModelStatus = document.getElementById('voiceModelStatus');
  els.voiceProgress = document.getElementById('voiceProgress');
  els.voiceProgressWrap = document.getElementById('voiceProgressWrap');
  els.transcriptCard = document.getElementById('transcriptCard');
  els.transcriptText = document.getElementById('transcriptText');
  els.useTranscriptButton = document.getElementById('useTranscriptButton');
  els.dismissTranscriptButton = document.getElementById('dismissTranscriptButton');

  function setVoiceStatus(message, active) {
    if (!els.voiceStatus) return;
    els.voiceStatus.textContent = message;
    els.voiceStatus.classList.toggle('voice-active', !!active);
  }

  function setModelStatus(message, active) {
    if (!els.voiceModelStatus) return;
    els.voiceModelStatus.textContent = message;
    els.voiceModelStatus.classList.toggle('voice-active', !!active);
  }

  function resetVoiceButton() {
    els.voiceButton.classList.remove('listening');
    els.voiceButton.setAttribute('aria-pressed', 'false');
  }

  function formatTime(ms) {
    var total = Math.max(0, Math.floor(ms / 1000));
    var minutes = Math.floor(total / 60);
    var seconds = total % 60;
    return minutes + ':' + (seconds < 10 ? '0' : '') + seconds;
  }

  function getAudioSupport() {
    var supported = {};
    try {
      supported = navigator.mediaDevices && navigator.mediaDevices.getSupportedConstraints
        ? navigator.mediaDevices.getSupportedConstraints()
        : {};
    } catch (e) {}
    return supported || {};
  }

  function buildAudioConstraints() {
    var supported = getAudioSupport();
    var audio = {};
    if (supported.echoCancellation !== false) audio.echoCancellation = true;
    if (supported.noiseSuppression !== false) audio.noiseSuppression = true;
    if (supported.autoGainControl !== false) audio.autoGainControl = true;
    if (supported.channelCount) audio.channelCount = { ideal: 1 };
    return audio;
  }

  function updateRecordingTimer() {
    var elapsed = Date.now() - recordingStartedAt;
    els.recordingTimer.textContent = formatTime(elapsed);
    if (elapsed >= MAX_RECORDING_SECONDS * 1000 && mediaRecorder && mediaRecorder.state !== 'inactive') {
      stopRecording();
    }
  }

  function stopLevelMeter() {
    if (levelFrame) window.cancelAnimationFrame(levelFrame);
    levelFrame = null;
    if (levelContext) { try { levelContext.close(); } catch (e) {} }
    levelContext = null;
    analyser = null;
    if (els.levelBar) els.levelBar.style.width = '0%';
  }

  function startLevelMeter(stream) {
    var AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    try {
      levelContext = new AudioCtx();
      var source = levelContext.createMediaStreamSource(stream);
      analyser = levelContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      var dataArray = new Uint8Array(analyser.fftSize);
      function tick() {
        if (!analyser) return;
        analyser.getByteTimeDomainData(dataArray);
        var sum = 0;
        for (var i = 0; i < dataArray.length; i++) {
          var n = (dataArray[i] - 128) / 128;
          sum += n * n;
        }
        var rms = Math.sqrt(sum / dataArray.length);
        var pct = Math.min(100, Math.max(4, Math.round(rms * 220)));
        els.levelBar.style.width = pct + '%';
        levelFrame = window.requestAnimationFrame(tick);
      }
      tick();
    } catch (e) {
      stopLevelMeter();
    }
  }

  function chooseRecorderMimeType() {
    if (!window.MediaRecorder || !MediaRecorder.isTypeSupported) return '';
    var types = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm', 'audio/aac'];
    for (var i = 0; i < types.length; i++) {
      if (MediaRecorder.isTypeSupported(types[i])) return types[i];
    }
    return '';
  }

  function clearTranscriptCard() {
    if (els.transcriptCard) els.transcriptCard.hidden = true;
    if (els.transcriptText) els.transcriptText.textContent = '';
    pendingTranscription = false;
  }

  function showTranscript(text) {
    els.transcriptText.textContent = text;
    els.transcriptCard.hidden = false;
    els.quickInput.value = text;
    pendingTranscription = true;
    setVoiceStatus('Transcript ready. Review it, then tap Add.', false);
  }

  function initLocalWorker() {
    if (localWorker) return localWorker;
    if (!window.Worker) {
      setModelStatus('This browser does not support background workers.', false);
      return null;
    }
    try {
      localWorker = new Worker('./voice-worker.js?v=1', { type: 'module' });
      localWorker.onmessage = function (event) {
        var msg = event.data || {};
        if (msg.type === 'progress') {
          workerLoading = true;
          if (els.voiceProgressWrap) els.voiceProgressWrap.hidden = false;
          var pct = Math.max(0, Math.min(100, Number(msg.progress || 0)));
          if (els.voiceProgress) els.voiceProgress.value = pct;
          var suffix = msg.file ? ' — ' + msg.file : '';
          setModelStatus('Preparing offline voice ' + Math.round(pct) + '%' + suffix, true);
        } else if (msg.type === 'loading') {
          workerLoading = true;
          setModelStatus(msg.message || 'Preparing offline voice…', true);
        } else if (msg.type === 'ready') {
          localWorkerReady = true;
          workerLoading = false;
          if (els.voiceProgressWrap) els.voiceProgressWrap.hidden = true;
          if (els.prepareVoiceButton) {
            els.prepareVoiceButton.textContent = 'Offline voice ready';
            els.prepareVoiceButton.disabled = true;
          }
          setModelStatus('Offline voice ready. It can transcribe without Safari voice service.', true);
          toast('Offline voice is ready');
        } else if (msg.type === 'result') {
          pendingTranscription = false;
          localWorkerReady = true;
          var text = String(msg.text || '').trim();
          if (text) {
            showTranscript(text);
            toast('Transcription complete');
          } else {
            setVoiceStatus('I could not hear enough speech. Try again closer to the phone.', false);
          }
        } else if (msg.type === 'error') {
          workerLoading = false;
          pendingTranscription = false;
          setModelStatus('Voice model error: ' + (msg.message || 'Unknown error'), false);
          setVoiceStatus('Local transcription failed. The recording is still available below.', false);
          if (els.prepareVoiceButton) {
            els.prepareVoiceButton.disabled = false;
            els.prepareVoiceButton.textContent = 'Retry offline voice setup';
          }
        }
      };
      localWorker.onerror = function () {
        workerLoading = false;
        setModelStatus('Voice worker could not start. Refresh and try again.', false);
        if (els.prepareVoiceButton) els.prepareVoiceButton.disabled = false;
      };
      return localWorker;
    } catch (e) {
      setModelStatus('Could not start the local voice worker.', false);
      return null;
    }
  }

  function prepareOfflineVoice() {
    if (localWorkerReady || workerLoading) return;
    var worker = initLocalWorker();
    if (!worker) return;
    if (els.prepareVoiceButton) els.prepareVoiceButton.disabled = true;
    workerLoading = true;
    setModelStatus('Starting offline voice setup…', true);
    worker.postMessage({ type: 'load' });
  }

  function stopCaptureResources() {
    if (recordingTimer) window.clearInterval(recordingTimer);
    recordingTimer = null;
    stopLevelMeter();
    if (mediaStream) {
      mediaStream.getTracks().forEach(function (track) { try { track.stop(); } catch (e) {} });
    }
    mediaStream = null;
    resetVoiceButton();
    els.recordingPanel.hidden = true;
  }

  function audioBlobTo16kMono(blob) {
    return blob.arrayBuffer().then(function (buffer) {
      var AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) throw new Error('Web Audio is unavailable');
      var context = new AudioCtx();
      return context.decodeAudioData(buffer).then(function (decoded) {
        var targetRate = 16000;
        var frameCount = Math.max(1, Math.ceil(decoded.duration * targetRate));
        var OfflineCtx = window.OfflineAudioContext || window.webkitOfflineAudioContext;
        if (decoded.sampleRate === targetRate) {
          var channel = decoded.numberOfChannels ? decoded.getChannelData(0) : new Float32Array(0);
          var copy = new Float32Array(channel.length);
          copy.set(channel);
          try { context.close(); } catch (e) {}
          return copy;
        }
        if (!OfflineCtx) throw new Error('Offline audio resampling is unavailable');
        var offline = new OfflineCtx(1, frameCount, targetRate);
        var source = offline.createBufferSource();
        var monoBuffer = offline.createBuffer(1, decoded.length, decoded.sampleRate);
        var mono = monoBuffer.getChannelData(0);
        if (decoded.numberOfChannels === 1) {
          mono.set(decoded.getChannelData(0));
        } else {
          var channels = [];
          for (var c = 0; c < decoded.numberOfChannels; c++) channels.push(decoded.getChannelData(c));
          for (var i = 0; i < decoded.length; i++) {
            var total = 0;
            for (var c2 = 0; c2 < channels.length; c2++) total += channels[c2][i] || 0;
            mono[i] = total / channels.length;
          }
        }
        source.buffer = monoBuffer;
        source.connect(offline.destination);
        source.start(0);
        return offline.startRendering().then(function (rendered) {
          try { context.close(); } catch (e) {}
          var out = rendered.getChannelData(0);
          var copy2 = new Float32Array(out.length);
          copy2.set(out);
          return copy2;
        });
      });
    });
  }

  function transcribeBlob(blob) {
    if (!localWorkerReady) {
      setVoiceStatus('Prepare offline voice first. The first setup needs internet to download the model.', false);
      return;
    }
    var worker = initLocalWorker();
    if (!worker) return;
    pendingTranscription = true;
    setVoiceStatus('Preparing audio for local transcription…', true);
    audioBlobTo16kMono(blob).then(function (audio) {
      // Transfer the PCM buffer to the worker so the UI thread is not blocked by a large copy.
      worker.postMessage({ type: 'transcribe', audio: audio }, [audio.buffer]);
    }).catch(function (error) {
      pendingTranscription = false;
      setVoiceStatus('Could not prepare the recording for transcription: ' + (error.message || 'audio error'), false);
    });
  }

  function startRecording() {
    clearTranscriptCard();
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setVoiceStatus('Microphone access is unavailable in this browser.', false);
      return;
    }
    if (!window.MediaRecorder) {
      setVoiceStatus('Audio recording is unavailable in this browser.', false);
      return;
    }
    navigator.mediaDevices.getUserMedia({ audio: buildAudioConstraints() }).then(function (stream) {
      mediaStream = stream;
      audioChunks = [];
      var recordingStream = stream;
      var mimeType = chooseRecorderMimeType();
      try {
        mediaRecorder = mimeType ? new MediaRecorder(recordingStream, { mimeType: mimeType }) : new MediaRecorder(recordingStream);
      } catch (e) {
        mediaRecorder = new MediaRecorder(recordingStream);
      }
      mediaRecorder.ondataavailable = function (event) {
        if (event.data && event.data.size) audioChunks.push(event.data);
      };
      mediaRecorder.onerror = function () {
        stopCaptureResources();
        setVoiceStatus('Audio recording failed. Please try again.', false);
      };
      mediaRecorder.onstop = function () {
        var type = mediaRecorder.mimeType || mimeType || 'audio/mp4';
        var blob = new Blob(audioChunks, { type: type });
        if (lastAudioUrl) URL.revokeObjectURL(lastAudioUrl);
        lastAudioUrl = URL.createObjectURL(blob);
        els.voicePreview.src = lastAudioUrl;
        els.voicePreview.hidden = false;
        stopCaptureResources();
        transcribeBlob(blob);
      };
      mediaRecorder.start(250);
      recordingStartedAt = Date.now();
      els.recordingPanel.hidden = false;
      els.recordingLabel.textContent = 'Listening locally';
      els.recordingTimer.textContent = '0:00';
      els.voiceButton.classList.add('listening');
      els.voiceButton.setAttribute('aria-pressed', 'true');
      setVoiceStatus('Listening… speak naturally. Tap Stop when finished.', true);
      startLevelMeter(stream);
      recordingTimer = window.setInterval(updateRecordingTimer, 250);
    }).catch(function (error) {
      resetVoiceButton();
      var code = error && error.name ? error.name : 'unknown';
      if (code === 'NotAllowedError' || code === 'SecurityError') {
        setVoiceStatus('Microphone permission was denied or blocked. Allow Microphone for Tandaan, then try again.', false);
      } else {
        setVoiceStatus('Could not open the microphone: ' + code + '.', false);
      }
    });
  }

  function stopRecording() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
    }
  }

  els.prepareVoiceButton.addEventListener('click', prepareOfflineVoice);
  els.stopVoiceButton.addEventListener('click', stopRecording);
  els.voiceButton.addEventListener('click', function () {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      stopRecording();
      return;
    }
    if (!localWorkerReady) {
      prepareOfflineVoice();
      setVoiceStatus('Preparing the offline voice model. Tap Speak again after it says “Offline voice ready.”', false);
      return;
    }
    startRecording();
  });

  els.useTranscriptButton.addEventListener('click', function () {
    var value = els.transcriptText.textContent.trim();
    if (!value) return;
    els.quickInput.value = value;
    els.quickInput.focus();
    clearTranscriptCard();
    toast('Transcript placed in Quick Add');
  });

  els.dismissTranscriptButton.addEventListener('click', function () {
    clearTranscriptCard();
    els.quickInput.value = '';
    setVoiceStatus('Ready.', false);
  });

  if (els.prepareVoiceButton) {
    els.prepareVoiceButton.textContent = 'Prepare offline voice';
    els.prepareVoiceButton.disabled = false;
  }
  setModelStatus('First setup downloads a multilingual Whisper model (tens of MB). After it is cached, transcription runs on this device.', false);
  if (els.voiceProgressWrap) els.voiceProgressWrap.hidden = true;
  setVoiceStatus('Tap Prepare offline voice once, then use Speak.', false);
  updateVoiceFocusBadge();

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('./sw.js').catch(function () {});
    });
  }

  render();
})();
