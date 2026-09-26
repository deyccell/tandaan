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
    dueModal: document.getElementById('dueModal'),
    dueTaskName: document.getElementById('dueTaskName'),
    quickSetDueDateTime: document.getElementById('quickSetDueDateTime'),
    quickNoSpecificTime: document.getElementById('quickNoSpecificTime'),
    dueTodayButton: document.getElementById('dueTodayButton'),
    dueTomorrowButton: document.getElementById('dueTomorrowButton'),
    dueNoDateButton: document.getElementById('dueNoDateButton'),
    closeDueButton: document.getElementById('closeDueButton'),
    cancelDueButton: document.getElementById('cancelDueButton'),
    saveDueButton: document.getElementById('saveDueButton'),
    editorModal: document.getElementById('editorModal'),
    editorTitle: document.getElementById('editorTitle'),
    editorForm: document.getElementById('editorForm'),
    editId: document.getElementById('editId'),
    editType: document.getElementById('editType'),
    editTitle: document.getElementById('editTitle'),
    editTitleLabel: document.getElementById('editTitleLabel'),
    editPurchaseFields: document.getElementById('editPurchaseFields'),
    editQuantity: document.getElementById('editQuantity'),
    editUnit: document.getElementById('editUnit'),
    editAmount: document.getElementById('editAmount'),
    editTaskFields: document.getElementById('editTaskFields'),
    editDueDateTime: document.getElementById('editDueDateTime'),
    editNoSpecificTime: document.getElementById('editNoSpecificTime'),
    removeTaskDueButton: document.getElementById('removeTaskDueButton'),
    closeEditorButton: document.getElementById('closeEditorButton'),
    cancelEditButton: document.getElementById('cancelEditButton')
  };

  function defaultData() {
    return { tasks: [], shopping: [], purchases: [], notes: [] };
  }

  function normalizeData(parsed) {
    var tasks = Array.isArray(parsed.tasks) ? parsed.tasks.map(function (t) {
      return { id: t.id || uid(), title: String(t.title || ''), done: !!t.done, createdAt: t.createdAt || new Date().toISOString(), updatedAt: t.updatedAt || '', dueDate: t.dueDate || '', dueTime: t.dueTime || '' };
    }) : [];
    var shopping = Array.isArray(parsed.shopping) ? parsed.shopping.map(function (s) {
      return { id: s.id || uid(), item: String(s.item || ''), done: !!s.done, createdAt: s.createdAt || new Date().toISOString(), updatedAt: s.updatedAt || '' };
    }) : [];
    var purchases = Array.isArray(parsed.purchases) ? parsed.purchases.map(function (p) {
      return { id: p.id || uid(), item: String(p.item || ''), quantity: Number(p.quantity || 1), unit: String(p.unit || ''), amount: Number(p.amount || 0), createdAt: p.createdAt || new Date().toISOString(), updatedAt: p.updatedAt || '' };
    }) : [];
    return { tasks: tasks, shopping: shopping, purchases: purchases, notes: Array.isArray(parsed.notes) ? parsed.notes : [] };
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
    var m = String(str).trim().toLowerCase().replace(/[\-]+/g, ' ');
    var small = { zero:0, one:1, two:2, three:3, four:4, five:5, six:6, seven:7, eight:8, nine:9, ten:10,
      eleven:11, twelve:12, thirteen:13, fourteen:14, fifteen:15, sixteen:16, seventeen:17, eighteen:18, nineteen:19,
      isa:1, usa:1, duha:2, tatlo:3, upat:4, lima:5, unom:6, pito:7, walo:8, siyam:9, napulo:10 };
    var tens = { twenty:20, thirty:30, forty:40, fifty:50, sixty:60, seventy:70, eighty:80, ninety:90 };
    if (Object.prototype.hasOwnProperty.call(small, m)) return small[m];
    if (Object.prototype.hasOwnProperty.call(tens, m)) return tens[m];
    if (/^\d+(?:\.\d+)?$/.test(m)) return Number(m);
    var parts = m.split(/\s+/).filter(function (part) { return part && part !== 'and' && part !== 'nga'; });
    if (!parts.length) return null;
    var total = 0, current = 0, seen = false;
    for (var i = 0; i < parts.length; i++) {
      var part = parts[i];
      if (Object.prototype.hasOwnProperty.call(small, part)) { current += small[part]; seen = true; continue; }
      if (Object.prototype.hasOwnProperty.call(tens, part)) { current += tens[part]; seen = true; continue; }
      if (/^\d+(?:\.\d+)?$/.test(part)) { current += Number(part); seen = true; continue; }
      if (part === 'hundred') { current = (current || 1) * 100; seen = true; continue; }
      if (part === 'thousand') { total += (current || 1) * 1000; current = 0; seen = true; continue; }
      return null;
    }
    return seen ? total + current : null;
  }

  function parseAmount(str) {
    var m = String(str).match(/(?:₱\s*)?(\d+(?:,\d{3})*(?:\.\d+)?|\d+(?:\.\d+)?)/);
    if (m) return Number(m[1].replace(/,/g, ''));
    return wordsToNumber(str);
  }

  function extractTrailingAmount(text) {
    var s = String(text).trim();
    var numeric = s.match(/(?:₱\s*)?(\d+(?:,\d{3})*(?:\.\d+)?|\d+(?:\.\d+)?)\s*(?:pesos?|php)?\s*$/i);
    if (numeric) {
      return { amount: Number(numeric[1].replace(/,/g, '')), text: s.slice(0, numeric.index).trim() };
    }
    var wordMatch = s.match(/((?:zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|and|isa|usa|duha|tatlo|upat|lima|unom|pito|walo|siyam|napulo)(?:\s+(?:zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|and|isa|usa|duha|tatlo|upat|lima|unom|pito|walo|siyam|napulo)){0,5})\s*(?:pesos?|php)?\s*$/i);
    if (wordMatch) {
      var amount = wordsToNumber(wordMatch[1]);
      if (amount !== null) return { amount: amount, text: s.slice(0, wordMatch.index).trim() };
    }
    return null;
  }

  function splitListItems(text) {
    var normalized = normalizeLocalWords(text)
      .replace(/\s+and\s+/gi, ',')
      .replace(/\s+&\s+/g, ',');
    return normalized.split(/[;,]+/).map(function (p) { return p.trim(); }).filter(Boolean);
  }

  function isFutureTask(text) {
    var t = String(text || '').toLowerCase();
    return /\b(?:i['’]?ll|i\s+will|i\s*am\s+going\s+to|i['’]?m\s+going\s+to|i\s+need\s+to|i\s+have\s+to|need\s+to|have\s+to|gonna|tomorrow|later|bukas|ugma|muhimo|buhaton|paliton\s+pa)\b/i.test(t);
  }

  function isPastPurchase(text) {
    var t = String(text || '').toLowerCase();
    return /\b(?:i\s+)?(?:bought|purchased|paid\s+for|got)\b/i.test(t) || /\b(?:nabakal|nakabakal|nakapalit|nabili|binili|ginbakal|ginpalit|napalit)\b/i.test(t);
  }

  function parseListPurchasePart(part) {
    var s = part.trim();
    var extracted = extractTrailingAmount(s);
    if (!extracted) return null;
    var money = extracted.amount;
    s = extracted.text;

    var qty = 1;
    var unit = '';
    var units = 'kg|kilo|kilos|g|gram|grams|pcs|pc|piece|pieces|tray|trays|dozen|dozens|dz|l|liter|liters|ml|can|cans|bottle|bottles|pack|packs|box|boxes|bag|bags|bote|ka\s+lata';
    var qtyPattern = '(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|isa|usa|duha|tatlo|upat|lima|unom|pito|walo|siyam|napulo|\\d+(?:\\.\\d+)?)';
    var qtyMatch = s.match(new RegExp('(?:^|\\s)(' + qtyPattern + ')\\s*(' + units + ')?\\b', 'i'));
    if (qtyMatch) {
      qty = wordsToNumber(qtyMatch[1]);
      unit = normalizeUnit(qtyMatch[2] || '');
      s = (s.slice(0, qtyMatch.index) + ' ' + s.slice(qtyMatch.index + qtyMatch[0].length)).replace(/\s+/g, ' ').trim();
    }
    var item = cleanItemName(s);
    if (!item || !/[A-Za-zÀ-ÿ]/.test(item)) return null;
    return { item: item, quantity: Number(qty || 1), unit: unit, amount: money };
  }

  function parsePurchase(text) {
    var original = String(text || '').replace(/\s+/g, ' ').trim();
    var converted = normalizeLocalWords(original).replace(/\s+/g, ' ').trim();
    var extracted = extractTrailingAmount(converted);
    if (!extracted) return null;
    var body = extracted.text;

    // Purchase records require past/confirmed purchase wording. This prevents
    // future tasks like "I'll buy egg 200" from becoming purchases.
    if (!isPastPurchase(original) && !/^bought\b/i.test(body)) return null;

    body = body.replace(/^(?:i\s+)?(?:bought|purchased)\s+(?:ko\s+)?/i, '');
    body = body.replace(/^(?:ko\s+|nako\s+|ak[oó]\s+)+/i, '');

    var qty = 1, unit = '';
    var units = 'kg|kilo|kilos|g|gram|grams|pcs|pc|piece|pieces|tray|trays|dozen|dozens|dz|l|liter|liters|ml|can|cans|bottle|bottles|pack|packs|box|boxes|bag|bags|bote|ka\s+lata';
    var qtyPattern = '(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|isa|usa|duha|tatlo|upat|lima|unom|pito|walo|siyam|napulo|\\d+(?:\\.\\d+)?)';
    var qMatch = body.match(new RegExp('(?:^|\\s)(' + qtyPattern + ')\\s*(' + units + ')?\\b', 'i'));
    if (qMatch) {
      qty = wordsToNumber(qMatch[1]);
      unit = normalizeUnit(qMatch[2] || '');
      body = (body.slice(0, qMatch.index) + ' ' + body.slice(qMatch.index + qMatch[0].length)).replace(/\s+/g, ' ').trim();
    }
    var item = cleanItemName(body.replace(/\b(?:for|at|=)\s*$/i, ''));
    if (!item || !/[A-Za-zÀ-ÿ]/.test(item)) return null;
    return { item: item, quantity: Number(qty || 1), unit: unit, amount: extracted.amount };
  }

  function normalizeUnit(unit) {
    return String(unit || '').toLowerCase()
      .replace(/^kilo(?:s)?$/, 'kg')
      .replace(/^gram(?:s)?$/, 'g')
      .replace(/^pcs?$/, 'pcs')
      .replace(/^pieces?$/, 'pcs')
      .replace(/^trays?$/, 'tray')
      .replace(/^dozens?$/, 'dozen')
      .replace(/^dz$/, 'dozen')
      .replace(/^cans?$/, 'can')
      .replace(/^bottles?$/, 'bottle')
      .replace(/^packs?$/, 'pack')
      .replace(/^boxes?$/, 'box')
      .replace(/^bags?$/, 'bag');
  }

  function parseShoppingItems(text) {
    var converted = normalizeLocalWords(text).replace(/^\s*(?:buy|to buy|need to buy|need|add to shopping list)\s*/i, '');
    var pieces = splitListItems(converted);
    return pieces.map(function (p) { return cleanItemName(p); }).filter(Boolean);
  }


  function isoDateFromOffset(days) {
    var d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + Number(days || 0));
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  }

  function isoDateForWeekday(targetIndex) {
    var d = new Date();
    d.setHours(0, 0, 0, 0);
    var delta = (Number(targetIndex) - d.getDay() + 7) % 7;
    if (delta === 0) delta = 7;
    d.setDate(d.getDate() + delta);
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  }

  function parseTimeFromText(text) {
    var s = String(text || '').toLowerCase();
    var match = s.match(/\b(?:at|around|by)?\s*(\d{1,2})(?:[:.]([0-5]\d))?\s*(a\.?m\.?|p\.?m\.?)\b/i);
    if (match) {
      var h = Number(match[1]);
      var min = Number(match[2] || 0);
      var ap = match[3].replace(/\./g, '').toLowerCase();
      if (h === 12) h = 0;
      if (ap === 'pm') h += 12;
      return { time: pad2(h) + ':' + pad2(min), phrase: match[0].trim() };
    }
    var wordTime = s.match(/\b(?:alas|at)\s+([a-záéíóúñ]+)(?:\s+(?:sa\s+)?(?:gab[ie]|gabi|hapon|evening|night))?\b/i);
    if (wordTime) {
      var raw = wordTime[1];
      var n = wordsToNumber(raw);
      var evening = /(?:gabi|hapon|gab[ie]|evening|night)/i.test(wordTime[0]);
      if (raw === 'sais') n = 6;
      if (n !== null && n >= 0 && n <= 23) {
        var hh = Number(n);
        if (evening && hh < 12) hh += 12;
        return { time: pad2(hh) + ':00', phrase: wordTime[0].trim() };
      }
    }
    return null;
  }

  function parseNaturalDue(text) {
    var original = String(text || '').replace(/\s+/g, ' ').trim();
    var lower = original.toLowerCase();
    var dueDate = '';
    var dueTime = '';
    var datePhrase = '';
    var dateMatch = null;

    if (/\b(?:tomorrow|bukas|ugma)\b/i.test(original)) {
      dueDate = isoDateFromOffset(1);
      dateMatch = original.match(/\b(?:tomorrow|bukas|ugma)\b/i);
      datePhrase = dateMatch ? dateMatch[0] : '';
    } else if (/\b(?:today|karon|karong adlaw|this day)\b/i.test(original)) {
      dueDate = isoDateFromOffset(0);
      dateMatch = original.match(/\b(?:today|karon|karong adlaw|this day)\b/i);
      datePhrase = dateMatch ? dateMatch[0] : '';
    } else if (/\b(?:tonight|mamayang gabi|karong gabi[eí]|karong gab-i)\b/i.test(original)) {
      dueDate = isoDateFromOffset(0);
      dateMatch = original.match(/\b(?:tonight|mamayang gabi|karong gabi[eí]|karong gab-i)\b/i);
      datePhrase = dateMatch ? dateMatch[0] : '';
      if (!parseTimeFromText(original)) dueTime = '18:00';
    }

    var months = { january:0, february:1, march:2, april:3, may:4, june:5, july:6, august:7, september:8, october:9, november:10, december:11,
      jan:0, feb:1, mar:2, apr:3, jun:5, jul:6, aug:7, sep:8, sept:8, oct:9, nov:10, dec:11 };
    var explicit = lower.match(/\b(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec)\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s+(20\d{2}))?\b/i);
    if (explicit) {
      var year = Number(explicit[3] || new Date().getFullYear());
      var month = months[explicit[1].toLowerCase()];
      var day = Number(explicit[2]);
      var candidate = new Date(year, month, day);
      if (!isNaN(candidate.getTime())) {
        if (!explicit[3]) {
          var today = new Date(); today.setHours(0,0,0,0);
          if (candidate < today) candidate.setFullYear(candidate.getFullYear() + 1);
        }
        dueDate = candidate.getFullYear() + '-' + pad2(candidate.getMonth()+1) + '-' + pad2(candidate.getDate());
        dateMatch = original.match(new RegExp(explicit[0], 'i'));
        datePhrase = dateMatch ? dateMatch[0] : explicit[0];
      }
    }

    var numericDate = lower.match(/\b(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](20\d{2}))?\b/);
    if (numericDate && !datePhrase) {
      var y = Number(numericDate[3] || new Date().getFullYear());
      var dt = new Date(y, Number(numericDate[1]) - 1, Number(numericDate[2]));
      if (!numericDate[3]) {
        var now = new Date(); now.setHours(0,0,0,0);
        if (dt < now) dt.setFullYear(dt.getFullYear() + 1);
      }
      if (!isNaN(dt.getTime())) {
        dueDate = dt.getFullYear() + '-' + pad2(dt.getMonth()+1) + '-' + pad2(dt.getDate());
        dateMatch = original.match(new RegExp(numericDate[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'));
        datePhrase = dateMatch ? dateMatch[0] : numericDate[0];
      }
    }

    var weekdays = { sunday:0, monday:1, tuesday:2, wednesday:3, thursday:4, friday:5, saturday:6, domingo:0, lunes:1, martes:2, miyerkules:3, miércoles:3, huwebes:4, jueves:4, biyernes:5, sabado:6 };
    var weekdayMatch = lower.match(/\b(?:next\s+|sa\s+)?(sunday|monday|tuesday|wednesday|thursday|friday|saturday|domingo|lunes|martes|miyerkules|miércoles|huwebes|jueves|biyernes|sabado)\b/i);
    if (weekdayMatch && !datePhrase) {
      dueDate = isoDateForWeekday(weekdays[weekdayMatch[1].toLowerCase()]);
      datePhrase = weekdayMatch[0];
    }

    var time = parseTimeFromText(original);
    if (time) dueTime = time.time;
    if (!dueDate && time) {
      var todayDate = new Date();
      var candidateTime = new Date(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDate(), Number(dueTime.slice(0,2)), Number(dueTime.slice(3,5)), 0, 0);
      if (candidateTime.getTime() <= Date.now()) dueDate = isoDateFromOffset(1);
      else dueDate = isoDateFromOffset(0);
    }

    if (!dueDate) return { title: original, dueDate: '', dueTime: '' };

    var title = original;
    var fragments = [];
    if (datePhrase) fragments.push(datePhrase);
    if (time) fragments.push(time.phrase);
    fragments.forEach(function (fragment) {
      if (!fragment) return;
      title = title.replace(new RegExp('(?:\\b(?:due|by|on)\\s+)?' + fragment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'), ' ');
    });
    title = title.replace(/\b(?:due|by|on|at)\s*$/i, '').replace(/\s{2,}/g, ' ').replace(/[,:;\-]+\s*$/, '').trim();
    return { title: title || original, dueDate: dueDate, dueTime: dueTime };
  }

  function parseAndAdd(input) {
    var text = String(input || '').trim();
    if (!text) return;

    // Future intent always wins over price-shaped text.
    // Example: "I'll buy egg 200 pesos" is a task, not a completed purchase.
    if (isFutureTask(text)) {
      addTask(text);
      return;
    }

    // Long purchase list. A trailing number can be the price even when the
    // speaker never says "pesos". Example: "egg 1 tray 400".
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

    var converted = normalizeLocalWords(text);
    var lower = converted.toLowerCase();
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

    // A price-bearing item with no shopping/purchase verb is treated as a
    // purchase record. This supports: "egg 1 tray 400" / "rice 2 kg 200".
    var barePurchase = parseListPurchasePart(text);
    if (barePurchase) {
      addPurchase(barePurchase);
      return;
    }

    addTask(text);
  }

  function buildTask(title, dueDate, dueTime) {
    return { id: uid(), title: title, done: false, createdAt: new Date().toISOString(), updatedAt: '', dueDate: dueDate || '', dueTime: dueTime || '' };
  }

  function dateTimeLocalValue(task) {
    if (!task || !task.dueDate) return '';
    return task.dueDate + 'T' + (task.dueTime || '00:00');
  }

  function scheduleFromDateTimeInput(value, dateOnly) {
    var raw = String(value || '').trim();
    if (!raw) return { dueDate: '', dueTime: '' };
    var parts = raw.split('T');
    var dueDate = parts[0] || '';
    var dueTime = (!dateOnly && parts[1]) ? parts[1].slice(0, 5) : '';
    return { dueDate: dueDate, dueTime: dueTime };
  }

  function addTask(title, schedule, options) {
    var parsed = schedule || parseNaturalDue(title);
    options = options || {};
    if (!options.skipPrompt && !parsed.dueDate) {
      openNewTaskDuePrompt(parsed.title);
      return;
    }
    data.tasks.unshift(buildTask(parsed.title, parsed.dueDate, parsed.dueTime));
    saveData(); render(); toast(parsed.dueDate ? (parsed.dueTime ? 'Task added with due date and time' : 'Task added with due date') : 'Task added');
    els.quickInput.value = '';
  }

  function formatDue(task) {
    if (!task || !task.dueDate) return '';
    var value = task.dueDate + (task.dueTime ? 'T' + task.dueTime : 'T23:59');
    var d = new Date(value);
    if (isNaN(d.getTime())) return '';
    return 'Due ' + d.toLocaleString([], { year: 'numeric', month: 'short', day: 'numeric' }) + (task.dueTime ? ' at ' + d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '');
  }

  function taskDueTimestamp(task) {
    if (!task || !task.dueDate) return 0;
    var d = new Date(task.dueDate + 'T' + (task.dueTime || '23:59'));
    return d.getTime();
  }

  function isOverdue(task) {
    var ts = taskDueTimestamp(task);
    return !!ts && !task.done && ts < Date.now();
  }

  function addShopping(item) {
    data.shopping.unshift({ id: uid(), item: item, done: false, createdAt: new Date().toISOString(), updatedAt: '' });
    saveData(); render(); toast('Shopping item added');
  }

  function addPurchase(p, silent) {
    data.purchases.unshift({ id: uid(), item: p.item, quantity: p.quantity, unit: p.unit || '', amount: p.amount, createdAt: new Date().toISOString(), updatedAt: '' });
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
      var due = formatDue(t);
      var overdue = isOverdue(t);
      return '<li class="list-item ' + (t.done ? 'item-done' : '') + '" data-id="' + escapeHTML(t.id) + '">' +
        '<input class="checkbox" type="checkbox" ' + (t.done ? 'checked' : '') + ' aria-label="Complete task">' +
        '<div class="item-main"><div class="item-title">' + escapeHTML(t.title) + '</div>' + (due ? '<div class="item-due ' + (overdue ? 'item-overdue' : '') + '">' + escapeHTML(due) + '</div>' : '') + '</div>' +
        '<div class="item-actions">' + (t.dueDate ? '<button class="calendar-btn" type="button" aria-label="Create calendar reminder" title="Create Calendar reminder">📅</button>' : '<button class="set-due-btn" type="button" aria-label="Set task due date" title="Set due date">＋📅</button>') +
        '<button class="edit-btn" type="button" aria-label="Edit task" title="Edit">✎</button>' +
        '<button class="delete-btn" type="button" aria-label="Delete task" title="Delete">✕</button></div>' +
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
        '<div class="item-actions"><button class="edit-btn" type="button" aria-label="Edit shopping item" title="Edit">✎</button><button class="delete-btn" type="button" aria-label="Delete shopping item" title="Delete">✕</button></div>' +
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
        '<div class="item-actions"><button class="edit-btn" type="button" aria-label="Edit purchase" title="Edit">✎</button><button class="delete-btn" type="button" aria-label="Delete purchase" title="Delete">✕</button></div>' +
      '</li>';
    }).join('');
  }

  function findIndexById(arr, id) {
    for (var i = 0; i < arr.length; i++) if (arr[i].id === id) return i;
    return -1;
  }

  function openEditor(type, item) {
    els.editType.value = type;
    els.editId.value = item.id;
    els.editorTitle.textContent = type === 'task' ? 'Edit task' : (type === 'shopping' ? 'Edit shopping item' : 'Edit purchase');
    els.editTitleLabel.firstChild.textContent = type === 'task' ? 'Task title' : (type === 'shopping' ? 'Shopping item' : 'Purchase item');
    els.editTitle.value = type === 'task' ? item.title : item.item;
    els.editPurchaseFields.hidden = type !== 'purchase';
    els.editTaskFields.hidden = type !== 'task';
    if (type === 'purchase') { els.editQuantity.value = item.quantity || 1; els.editUnit.value = item.unit || ''; els.editAmount.value = item.amount || 0; }
    if (type === 'task') { els.editDueDateTime.value = dateTimeLocalValue(item); els.editNoSpecificTime.checked = !!item.dueDate && !item.dueTime; }
    els.editorModal.hidden = false; els.editorModal.setAttribute('aria-hidden', 'false');
    setTimeout(function () { els.editTitle.focus(); }, 0);
  }

  function closeEditor() { els.editorModal.hidden = true; els.editorModal.setAttribute('aria-hidden', 'true'); }

  function saveEditor() {
    var type = els.editType.value, id = els.editId.value;
    var arr = type === 'task' ? data.tasks : (type === 'shopping' ? data.shopping : data.purchases);
    var index = findIndexById(arr, id);
    if (index < 0) return;
    var now = new Date().toISOString();
    if (type === 'task') {
      var title = els.editTitle.value.trim();
      if (!title) { toast('Task title is required'); return; }
      var schedule = scheduleFromDateTimeInput(els.editDueDateTime.value, els.editNoSpecificTime.checked);
      arr[index].title = title; arr[index].dueDate = schedule.dueDate; arr[index].dueTime = schedule.dueTime;
    } else if (type === 'shopping') {
      var item = els.editTitle.value.trim();
      if (!item) { toast('Shopping item is required'); return; }
      arr[index].item = item;
    } else {
      var purchaseItem = els.editTitle.value.trim();
      if (!purchaseItem) { toast('Purchase item is required'); return; }
      arr[index].item = purchaseItem; arr[index].quantity = Number(els.editQuantity.value || 1); arr[index].unit = els.editUnit.value.trim(); arr[index].amount = Number(els.editAmount.value || 0);
    }
    arr[index].updatedAt = now; saveData(); render(); closeEditor(); toast('Changes saved');
  }

  function deleteWithConfirm(arr, id, label) {
    var index = findIndexById(arr, id); if (index < 0) return;
    if (!window.confirm('Delete this ' + label + '?')) return;
    arr.splice(index, 1); saveData(); render(); toast(label.charAt(0).toUpperCase() + label.slice(1) + ' deleted');
  }

  function pad2(n) { return n < 10 ? '0' + n : String(n); }
  function calendarDateTime(task) {
    if (!task || !task.dueDate) return null;
    var d = new Date(task.dueDate + 'T' + (task.dueTime || '23:59'));
    return isNaN(d.getTime()) ? null : d;
  }
  function toICSLocal(d) { return d.getFullYear() + pad2(d.getMonth()+1) + pad2(d.getDate()) + 'T' + pad2(d.getHours()) + pad2(d.getMinutes()) + pad2(d.getSeconds()); }
  function icsEscape(value) { return String(value).replace(/\\/g, '\\\\').replace(/([;,])/g, '\\$1').replace(/\r?\n/g, '\\n'); }
  function createCalendarReminder(task) {
    var start = calendarDateTime(task);
    if (!start) { toast('Set a due date first'); return; }
    var end = new Date(start.getTime() + 30 * 60 * 1000);
    var now = new Date();
    var lines = [
      'BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Tandaan//Task Reminder//EN','BEGIN:VEVENT',
      'UID:' + icsEscape(task.id) + '@tandaan.local','DTSTAMP:' + toICSLocal(now),'DTSTART:' + toICSLocal(start),'DTEND:' + toICSLocal(end),
      'SUMMARY:' + icsEscape(task.title),'BEGIN:VALARM','ACTION:DISPLAY','DESCRIPTION:' + icsEscape('Tandaan reminder: ' + task.title),'TRIGGER:-P1D','END:VALARM','END:VEVENT','END:VCALENDAR'
    ];
    var blob = new Blob([lines.join('\r\n') + '\r\n'], {type:'text/calendar;charset=utf-8'});
    var url = URL.createObjectURL(blob); var a = document.createElement('a'); a.href = url; a.download = 'Tandaan-reminder.ics'; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function(){ URL.revokeObjectURL(url); }, 3000);
    toast('Calendar reminder file created — add it to Apple Calendar');
  }

  els.addButton.addEventListener('click', function () { parseAndAdd(els.quickInput.value); });
  els.quickInput.addEventListener('keydown', function (event) {
    if (event.key === 'Enter') parseAndAdd(els.quickInput.value);
  });

  els.taskList.addEventListener('change', function (event) {
    if (!event.target.classList.contains('checkbox')) return;
    var li = event.target.closest('.list-item'); var index = findIndexById(data.tasks, li.getAttribute('data-id'));
    if (index >= 0) { data.tasks[index].done = event.target.checked; data.tasks[index].updatedAt = new Date().toISOString(); saveData(); render(); }
  });
  els.shoppingList.addEventListener('change', function (event) {
    if (!event.target.classList.contains('checkbox')) return;
    var li = event.target.closest('.list-item'); var index = findIndexById(data.shopping, li.getAttribute('data-id'));
    if (index >= 0) { data.shopping[index].done = event.target.checked; data.shopping[index].updatedAt = new Date().toISOString(); saveData(); render(); }
  });
  els.taskList.addEventListener('click', function (event) {
    var li = event.target.closest('.list-item'); if (!li) return; var id = li.getAttribute('data-id'); var index = findIndexById(data.tasks, id); if (index < 0) return;
    if (event.target.classList.contains('edit-btn')) openEditor('task', data.tasks[index]);
    if (event.target.classList.contains('delete-btn')) deleteWithConfirm(data.tasks, id, 'task');
    if (event.target.classList.contains('calendar-btn')) createCalendarReminder(data.tasks[index]);
    if (event.target.classList.contains('set-due-btn')) openDueModal(data.tasks[index]);
  });
  els.shoppingList.addEventListener('click', function (event) {
    var li = event.target.closest('.list-item'); if (!li) return; var id = li.getAttribute('data-id'); var index = findIndexById(data.shopping, id); if (index < 0) return;
    if (event.target.classList.contains('edit-btn')) openEditor('shopping', data.shopping[index]);
    if (event.target.classList.contains('delete-btn')) deleteWithConfirm(data.shopping, id, 'shopping item');
  });
  els.purchaseList.addEventListener('click', function (event) {
    var li = event.target.closest('.list-item'); if (!li) return; var id = li.getAttribute('data-id'); var index = findIndexById(data.purchases, id); if (index < 0) return;
    if (event.target.classList.contains('edit-btn')) openEditor('purchase', data.purchases[index]);
    if (event.target.classList.contains('delete-btn')) deleteWithConfirm(data.purchases, id, 'purchase');
  });
  els.editorForm.addEventListener('submit', function (event) { event.preventDefault(); saveEditor(); });
  els.closeEditorButton.addEventListener('click', closeEditor);
  els.cancelEditButton.addEventListener('click', closeEditor);
  els.editorModal.addEventListener('click', function (event) { if (event.target.getAttribute('data-close-editor') === 'true') closeEditor(); });
  els.removeTaskDueButton.addEventListener('click', function () {
    if (els.editType.value !== 'task') return;
    els.editDueDateTime.value = '';
    els.editNoSpecificTime.checked = false;
    toast('Due date removed');
  });
  document.addEventListener('keydown', function (event) { if (event.key !== 'Escape') return; if (!els.editorModal.hidden) closeEditor(); if (!els.dueModal.hidden) closeDueModal(); });

  document.querySelectorAll('.example').forEach(function (button) {
    button.addEventListener('click', function () {
      els.quickInput.value = button.getAttribute('data-value');
      els.quickInput.focus();
    });
  });

  function checkLocalReminders() {
    var now = Date.now();
    var dueSoon = data.tasks.filter(function (task) {
      if (task.done || !task.dueDate) return false;
      var ts = taskDueTimestamp(task); return ts && ts > now && ts - now <= 24 * 60 * 60 * 1000;
    });
    if (dueSoon.length) {
      setTimeout(function () { toast('Upcoming: ' + dueSoon[0].title + (dueSoon.length > 1 ? ' +' + (dueSoon.length - 1) + ' more' : '')); }, 500);
    }
  }
  document.addEventListener('visibilitychange', function () { if (!document.hidden) { render(); checkLocalReminders(); } });


  var dueTaskId = '';
  var pendingNewTaskTitle = '';

  function openNewTaskDuePrompt(title) {
    dueTaskId = '';
    pendingNewTaskTitle = title;
    els.dueModal.hidden = false;
    els.dueModal.setAttribute('aria-hidden', 'false');
    els.dueTaskName.textContent = title;
    els.quickSetDueDateTime.value = '';
    els.quickNoSpecificTime.checked = true;
    els.dueModal.querySelector('#dueModalTitle').textContent = 'When is this due?';
  }

  function openDueModal(task) {
    dueTaskId = task.id;
    pendingNewTaskTitle = '';
    els.dueTaskName.textContent = task.title;
    els.quickSetDueDateTime.value = dateTimeLocalValue(task);
    els.quickNoSpecificTime.checked = !!task.dueDate && !task.dueTime;
    els.dueModal.querySelector('#dueModalTitle').textContent = 'Set due date';
    els.dueModal.hidden = false;
    els.dueModal.setAttribute('aria-hidden', 'false');
    setTimeout(function () { if (els.quickSetDueDateTime) els.quickSetDueDateTime.focus(); }, 0);
  }

  function closeDueModal() {
    els.dueModal.hidden = true;
    els.dueModal.setAttribute('aria-hidden', 'true');
    dueTaskId = '';
    pendingNewTaskTitle = '';
  }

  function finishNewTask(schedule) {
    var title = pendingNewTaskTitle;
    if (!title) return;
    pendingNewTaskTitle = '';
    dueTaskId = '';
    data.tasks.unshift(buildTask(title, schedule.dueDate, schedule.dueTime));
    saveData(); render(); els.quickInput.value = '';
    toast(schedule.dueDate ? (schedule.dueTime ? 'Task added with due date and time' : 'Task added with due date') : 'Task added');
    closeDueModal();
  }

  function saveQuickDue() {
    var schedule = scheduleFromDateTimeInput(els.quickSetDueDateTime.value, els.quickNoSpecificTime.checked);
    if (!schedule.dueDate) { toast('Choose a date, or use No due date'); return; }

    if (pendingNewTaskTitle) {
      finishNewTask(schedule);
      return;
    }

    var index = findIndexById(data.tasks, dueTaskId);
    if (index < 0) return;
    data.tasks[index].dueDate = schedule.dueDate;
    data.tasks[index].dueTime = schedule.dueTime;
    data.tasks[index].updatedAt = new Date().toISOString();
    saveData(); render(); closeDueModal(); toast(schedule.dueTime ? 'Due date and time saved' : 'Due date saved');
  }

  function saveNoDueDate() {
    if (pendingNewTaskTitle) {
      finishNewTask({ dueDate: '', dueTime: '' });
      return;
    }
    var index = findIndexById(data.tasks, dueTaskId);
    if (index < 0) return;
    data.tasks[index].dueDate = '';
    data.tasks[index].dueTime = '';
    data.tasks[index].updatedAt = new Date().toISOString();
    saveData(); render(); closeDueModal(); toast('Due date removed');
  }

  function quickSetDue(days) {
    if (pendingNewTaskTitle) {
      var d = isoDateFromOffset(days);
      finishNewTask({ dueDate: d, dueTime: '' });
      return;
    }
    var index = findIndexById(data.tasks, dueTaskId);
    if (index < 0) return;
    data.tasks[index].dueDate = isoDateFromOffset(days);
    data.tasks[index].dueTime = '';
    data.tasks[index].updatedAt = new Date().toISOString();
    saveData(); render(); closeDueModal(); toast(days === 0 ? 'Due today' : 'Due tomorrow');
  }

  els.closeDueButton.addEventListener('click', closeDueModal);
  els.cancelDueButton.addEventListener('click', closeDueModal);
  els.saveDueButton.addEventListener('click', saveQuickDue);
  els.dueTodayButton.addEventListener('click', function () { quickSetDue(0); });
  els.dueTomorrowButton.addEventListener('click', function () { quickSetDue(1); });
  els.dueNoDateButton.addEventListener('click', saveNoDueDate);
  els.dueModal.addEventListener('click', function (event) { if (event.target.getAttribute('data-close-due') === 'true') closeDueModal(); });

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
  var pendingAudioBlob = null;
  var MAX_RECORDING_SECONDS = 90;

  els.recordingPanel = document.getElementById('recordingPanel');
  els.stopVoiceButton = document.getElementById('stopVoiceButton');
  els.recordingLabel = document.getElementById('recordingLabel');
  els.recordingTimer = document.getElementById('recordingTimer');
  els.levelBar = document.getElementById('levelBar');
  els.voicePreview = document.getElementById('voicePreview');
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
    // Model preparation happens silently in the background.
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
      localWorker = new Worker('./voice-worker.js?v=5', { type: 'module' });
      localWorker.onmessage = function (event) {
        var msg = event.data || {};
        if (msg.type === 'progress') {
          workerLoading = true;
          var pct = Math.max(0, Math.min(100, Number(msg.progress || 0)));
          var suffix = msg.file ? ' — ' + msg.file : '';
        } else if (msg.type === 'loading') {
          workerLoading = true;
        } else if (msg.type === 'ready') {
          localWorkerReady = true;
          workerLoading = false;
          try { localStorage.setItem('tandaan-voice-ready-v1', '1'); } catch (e) {}
          setModelStatus('Voice ready on this device.', true);
          if (pendingAudioBlob) {
            var queuedBlob = pendingAudioBlob;
            pendingAudioBlob = null;
            transcribeBlob(queuedBlob);
          }
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
          pendingTranscription = !!pendingAudioBlob;
          setModelStatus('', false);
          setVoiceStatus(pendingAudioBlob ? 'Recording saved. Voice processing will continue when available.' : 'Voice processing is unavailable right now. Try again while online.', false);
        }
      };
      localWorker.onerror = function () {
        workerLoading = false;
        localWorker = null;
        setVoiceStatus('Voice processing is not available right now. Reopen Tandaan while online.', false);
      };
      return localWorker;
    } catch (e) {
      setVoiceStatus('Voice processing could not start. Try again.', false);
      return null;
    }
  }

  function prepareOfflineVoice() {
    if (localWorkerReady || workerLoading) return;
    var worker = initLocalWorker();
    if (!worker) return;
    workerLoading = true;
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
      pendingAudioBlob = blob;
      pendingTranscription = true;
      prepareOfflineVoice();
      setVoiceStatus('Recording saved. Processing your speech locally…', false);
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
      // Kick off the local speech model silently on the first recording. The user does not need
      // to press a separate preparation button, and no download progress is shown.
      prepareOfflineVoice();
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

  els.stopVoiceButton.addEventListener('click', stopRecording);
  els.voiceButton.addEventListener('click', function () {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      stopRecording();
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
  setVoiceStatus('Tap Speak and talk naturally.', false);

  // Voice is lazy-loaded. Tandaan does NOT download the speech model just by opening the app.
  // The first tap of Speak starts the model load in the background while recording begins.
  // Subsequent uses can reuse the browser cache.

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('./sw.js').catch(function () {});
    });
  }

  render();
  checkLocalReminders();
})();
