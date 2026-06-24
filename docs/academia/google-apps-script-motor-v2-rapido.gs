/**
 * SKALA — Motor de simuladores ONLINE (RÁPIDO + CONCURRENTE)
 * =========================================================
 * Pega TODO esto en tu proyecto de Apps Script, guarda y redespliega
 * (Implementar → Administrar implementaciones → editar ✎ → Versión: Nueva → Implementar).
 * La URL /exec NO cambia.
 *
 * CÓMO FUNCIONA (rápido y para varios asesores a la vez)
 *  - POOL de copias de trabajo REUTILIZABLES por plantilla: se crean unas pocas
 *    (POOL_SIZE) UNA sola vez, en una carpeta dedicada, y se reusan. Cada cálculo
 *    toma una copia libre y trabaja SIN candado → varios asesores en PARALELO.
 *  - NO se acumulan archivos en tu Drive: el pool es fijo (POOL_SIZE por simulador)
 *    y vive en la carpeta "Skala Motor (temporal)". (Si hay un pico mayor al pool,
 *    se crea 1 copia temporal de respaldo que se borra al terminar.)
 *  - Las copias se LIMPIAN al crearse (rangos `clear`, ej. tablas de amortización
 *    que el cálculo no usa) → recálculo mucho más rápido.
 *  - Devuelve solo las celdas pedidas (`outputs`) → respuesta mínima.
 *  - Si editas la hoja original, el pool se rehace solo (detecta el cambio).
 *
 * COMPAT: sin `outputs` responde la grilla completa (para el inspector del admin).
 *
 * REQUEST: { templateId, inputs:[{sheet?,a1,value}], outputs:["C9",...], outputsSheet?, clear:["Hoja!A30:M214"] }
 *          o lotes: { templateId, batches:[{inputs,outputs,outputsSheet}], clear }
 * RESPONSE: { ok:true, cells:{ "C9":{value,display}, ... } }  |  { ok:true, results:[{cells},...] }
 */

var TOKEN = '';                                   // opcional: secreto compartido con Skala
var POOL_SIZE = 6;                                // copias reutilizables por simulador (sube si hay mucha concurrencia)
var FOLDER_NAME = 'Skala Motor (temporal)';       // carpeta donde viven las copias del pool
var STALE_MS = 90000;                             // si una copia quedó "ocupada" >90s (cálculo caído), se libera

function doPost(e) {
  try {
    var req = JSON.parse(e.postData.contents || '{}');
    if (TOKEN && req.token !== TOKEN) return _json({ error: 'No autorizado' });
    if (!req.templateId) return _json({ error: 'Falta templateId' });

    var fast = (req.outputs && req.outputs.length) || (req.batches && req.batches.length);
    if (!fast) return _fullCalc(req); // modo compatible (grilla completa)

    var got = _acquire(req.templateId, req.clear);
    var id = got.id, temp = got.temp;
    if (!id) { id = _makeClearedCopy(DriveApp.getFileById(req.templateId), req.clear); temp = true; } // overflow
    try {
      var ss = SpreadsheetApp.openById(id);
      if (req.batches && req.batches.length) {
        var results = req.batches.map(function (b) {
          return { cells: _applyAndRead(ss, b.inputs || [], b.outputs || [], b.outputsSheet || req.outputsSheet) };
        });
        return _json({ ok: true, results: results });
      }
      return _json({ ok: true, cells: _applyAndRead(ss, req.inputs || [], req.outputs, req.outputsSheet) });
    } finally {
      if (temp) { try { DriveApp.getFileById(id).setTrashed(true); } catch (e2) {} }
      else _release(req.templateId, id);
    }
  } catch (err) {
    return _json({ error: String(err) });
  }
}

function _folder() {
  var it = DriveApp.getFoldersByName(FOLDER_NAME);
  return it.hasNext() ? it.next() : DriveApp.createFolder(FOLDER_NAME);
}

/** Crea una copia (en la carpeta del pool) y limpia los rangos pesados. */
function _makeClearedCopy(tpl, clear) {
  var copy = tpl.makeCopy('skala-pool', _folder());
  if (clear && clear.length) {
    var ss = SpreadsheetApp.openById(copy.getId());
    clear.forEach(function (ref) {
      try {
        var p = String(ref).split('!');
        var sh = p.length > 1 ? ss.getSheetByName(p[0]) : ss.getSheets()[0];
        if (sh) sh.getRange(p.length > 1 ? p[1] : p[0]).clearContent();
      } catch (e) {}
    });
    SpreadsheetApp.flush();
  }
  return copy.getId();
}

/** Toma una copia libre del pool (candado corto SOLO para asignar, no para el cálculo). */
function _acquire(templateId, clear) {
  var props = PropertiesService.getScriptProperties();
  var tpl = DriveApp.getFileById(templateId);
  var updated = tpl.getLastUpdated().getTime();
  var clearSig = JSON.stringify(clear || []);
  var key = 'pool_' + templateId;
  var lock = LockService.getScriptLock();
  lock.waitLock(60000);
  try {
    var pool = null; try { pool = JSON.parse(props.getProperty(key) || 'null'); } catch (e) {}
    if (!pool || pool.updated !== updated || pool.clearSig !== clearSig) {
      if (pool && pool.copies) pool.copies.forEach(function (c) { try { DriveApp.getFileById(c.id).setTrashed(true); } catch (e) {} });
      var copies = [];
      for (var i = 0; i < POOL_SIZE; i++) copies.push({ id: _makeClearedCopy(tpl, clear), busy: false, since: 0 });
      pool = { copies: copies, updated: updated, clearSig: clearSig };
    }
    var now = new Date().getTime();
    var pick = null;
    for (var j = 0; j < pool.copies.length; j++) {
      var c = pool.copies[j];
      if (!c.busy || (now - c.since) > STALE_MS) { pick = c; break; }
    }
    if (!pick) return { id: null, temp: true }; // todas ocupadas → el caller hace copia temporal (fuera del candado)
    pick.busy = true; pick.since = now;
    props.setProperty(key, JSON.stringify(pool));
    return { id: pick.id, temp: false };
  } finally { try { lock.releaseLock(); } catch (e) {} }
}

/** Devuelve la copia al pool (marca libre). */
function _release(templateId, id) {
  var props = PropertiesService.getScriptProperties();
  var key = 'pool_' + templateId;
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
    var pool = JSON.parse(props.getProperty(key) || 'null');
    if (pool) {
      pool.copies.forEach(function (c) { if (c.id === id) c.busy = false; });
      props.setProperty(key, JSON.stringify(pool));
    }
  } catch (e) {} finally { try { lock.releaseLock(); } catch (e) {} }
}

/** Escribe entradas (quitando validaciones para no chocar con desplegables), recalcula
 * UNA vez y lee solo las salidas pedidas. No restaura: cada cálculo reescribe sus entradas. */
function _applyAndRead(ss, inputs, outputs, outputsSheet) {
  inputs.forEach(function (inp) {
    var sh = inp.sheet ? ss.getSheetByName(inp.sheet) : ss.getSheets()[0];
    if (!sh) return;
    var rng = sh.getRange(inp.a1);
    try { rng.clearDataValidations(); } catch (e) {} // evita "infringe reglas de validación"
    var v = inp.value;
    if (typeof v === 'string' && v.charAt(0) === '=') { rng.setFormula(v); }
    else {
      if (typeof v === 'string' && v.trim() !== '' && !isNaN(v.replace(/,/g, ''))) v = Number(v.replace(/,/g, ''));
      rng.setValue(v);
    }
  });
  SpreadsheetApp.flush(); // único recálculo
  var cells = {};
  outputs.forEach(function (o) {
    var sheetName = (typeof o === 'object' ? o.sheet : null) || outputsSheet;
    var a1 = (typeof o === 'object' ? o.a1 : o);
    var sh = sheetName ? ss.getSheetByName(sheetName) : ss.getSheets()[0];
    if (!sh) return;
    var rng = sh.getRange(a1);
    cells[a1] = { value: rng.getValue(), display: rng.getDisplayValue() };
  });
  return cells;
}

/** Compat: copia temporal + grilla completa (para el inspector del admin). */
function _fullCalc(req) {
  var copy = DriveApp.getFileById(req.templateId).makeCopy('skala-tmp-' + new Date().getTime(), _folder());
  var ssId = copy.getId();
  try {
    var ss = SpreadsheetApp.openById(ssId);
    (req.inputs || []).forEach(function (inp) {
      var sh = inp.sheet ? ss.getSheetByName(inp.sheet) : ss.getSheets()[0];
      if (!sh) return;
      var rng = sh.getRange(inp.a1);
      try { rng.clearDataValidations(); } catch (e) {}
      var v = inp.value;
      if (typeof v === 'string' && v.charAt(0) === '=') { rng.setFormula(v); return; }
      if (typeof v === 'string' && v.trim() !== '' && !isNaN(v.replace(/,/g, ''))) v = Number(v.replace(/,/g, ''));
      rng.setValue(v);
    });
    SpreadsheetApp.flush();
    var outName = req.outputsSheet || (req.inputs && req.inputs[0] && req.inputs[0].sheet);
    var outSheet = outName ? ss.getSheetByName(outName) : ss.getSheets()[0];
    var rng2 = outSheet.getDataRange();
    return _json({ ok: true, sheet: outSheet.getName(), display: rng2.getDisplayValues(), values: rng2.getValues(), formulas: rng2.getFormulas() });
  } finally {
    try { DriveApp.getFileById(ssId).setTrashed(true); } catch (err) {}
  }
}

function doGet() { return _json({ ok: true, service: 'skala-simulador-motor-pool', ts: new Date().toISOString() }); }
function _json(obj) { return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }
