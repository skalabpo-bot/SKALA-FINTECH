/**
 * SKALA — Motor de simuladores online (Google Apps Script Web App)
 * ================================================================
 * Calcula los simuladores Excel reales de las entidades usando el motor de
 * Google Sheets (fidelidad total: tablas, PMT, VLOOKUP, etc.), del lado servidor.
 *
 * CÓMO FUNCIONA
 *  - Skala envía POST { templateId, inputs:[{sheet,a1,value}], outputsSheet }.
 *  - El script COPIA la hoja plantilla (aislamiento entre usuarios), escribe las
 *    entradas, deja que Google recalcule, lee TODA la hoja de resultados y la
 *    devuelve como JSON. Luego borra la copia.
 *  - Generic: no hay que mapear celdas; Skala renderiza la grilla que regrese.
 *
 * DESPLIEGUE (una sola vez, gratis, sin tarjeta)
 *  1. Ve a https://script.google.com  → Nuevo proyecto.
 *  2. Pega TODO este archivo. Guarda.
 *  3. Implementar → Nueva implementación → Tipo: "Aplicación web".
 *       - Ejecutar como: Yo
 *       - Quién tiene acceso: Cualquier usuario  (o "Cualquiera con el enlace")
 *  4. Copia la URL /exec que te da y pégala en Skala (config del simulador).
 *  5. Cada simulador = un Google Sheet (importa el .xlsx; el .xlsb conviértelo a
 *     .xlsx antes con Excel/LibreOffice "Guardar como"). El templateId es el ID que
 *     aparece en la URL del Sheet: docs.google.com/spreadsheets/d/<ESTE_ID>/edit
 *  6. Comparte cada Sheet con tu propia cuenta (ya eres dueño) — el script corre
 *     "como tú", así que tiene acceso.
 *
 * SEGURIDAD: opcionalmente define un TOKEN secreto abajo y mándalo desde Skala
 * en el campo "token" para que nadie más use tu web app.
 */

var TOKEN = ''; // opcional: pon un secreto y envíalo desde Skala en {token}

function doPost(e) {
  try {
    var req = JSON.parse(e.postData.contents || '{}');
    if (TOKEN && req.token !== TOKEN) return _json({ error: 'No autorizado' });
    if (!req.templateId) return _json({ error: 'Falta templateId' });

    // 1) Copia temporal de la plantilla (aísla a cada usuario/cálculo)
    var copy = DriveApp.getFileById(req.templateId).makeCopy('skala-tmp-' + Date.now());
    var ssId = copy.getId();
    try {
      var ss = SpreadsheetApp.openById(ssId);

      // 2) Escribir entradas
      (req.inputs || []).forEach(function (inp) {
        var sh = inp.sheet ? ss.getSheetByName(inp.sheet) : ss.getSheets()[0];
        if (!sh) return;
        var rng = sh.getRange(inp.a1);
        var v = inp.value;
        // numérico si parece número
        if (typeof v === 'string' && v.trim() !== '' && !isNaN(v.replace(/,/g, ''))) v = Number(v.replace(/,/g, ''));
        rng.setValue(v);
      });

      SpreadsheetApp.flush(); // fuerza recálculo

      // 3) Leer la hoja de resultados completa (valores ya calculados)
      var outSheetName = req.outputsSheet || (req.inputs && req.inputs[0] && req.inputs[0].sheet);
      var outSheet = outSheetName ? ss.getSheetByName(outSheetName) : ss.getSheets()[0];
      var rng = outSheet.getDataRange();
      var values = rng.getDisplayValues(); // texto formateado (moneda/%)
      var raw = rng.getValues();           // valores crudos
      var formulas = rng.getFormulas();    // fórmula por celda ('' si no tiene) → el runner sabe qué es editable

      // Validaciones (desplegables / casillas) — solo celdas que tengan, mapa "r,c" → {type, options}
      var validations = {};
      try {
        var dvs = rng.getDataValidations();
        for (var r = 0; r < dvs.length; r++) {
          for (var c = 0; c < dvs[r].length; c++) {
            var dv = dvs[r][c];
            if (!dv) continue;
            var t = String(dv.getCriteriaType());
            if (t === 'VALUE_IN_LIST') {
              validations[r + ',' + c] = { type: 'list', options: (dv.getCriteriaValues()[0] || []) };
            } else if (t === 'VALUE_IN_RANGE') {
              var src = dv.getCriteriaValues()[0];
              var opts = [];
              try { opts = src.getValues().reduce(function (a, row) { return a.concat(row); }, []).filter(function (x) { return x !== '' && x != null; }); } catch (e2) {}
              validations[r + ',' + c] = { type: 'list', options: opts };
            } else if (t === 'CHECKBOX') {
              validations[r + ',' + c] = { type: 'bool' };
            }
          }
        }
      } catch (eDV) {}

      return _json({ ok: true, sheet: outSheet.getName(), display: values, values: raw, formulas: formulas, validations: validations });
    } finally {
      // 4) Borrar la copia temporal
      try { DriveApp.getFileById(ssId).setTrashed(true); } catch (err) {}
    }
  } catch (err) {
    return _json({ error: String(err) });
  }
}

function doGet() {
  return _json({ ok: true, service: 'skala-simulador-motor', ts: new Date().toISOString() });
}

function _json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
