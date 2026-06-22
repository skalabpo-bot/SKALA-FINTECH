# Motor de simuladores ONLINE (Google Sheets) — Configuración

Objetivo: que los simuladores Excel reales de las entidades **se calculen online** dentro
de Skala, con fidelidad total (tablas, PMT, VLOOKUP…), **gratis** y funcionando para TODOS
los formatos. El cálculo lo hace Google Sheets del lado servidor.

Arquitectura:
```
Navegador (Skala) → Edge Function "simulador-calc" → Apps Script Web App → Google Sheets
```

## Pasos (una sola vez, gratis, sin tarjeta)

### 1. Convertir los .xlsb a .xlsx
Google Sheets no lee `.xlsb`. Abre `SIMULADOR VANTAGE.xlsb` en Excel/LibreOffice →
**Guardar como → .xlsx**. (COLTE ya es .xlsx; CrediAlianza .xlsm sirve, pero por
consistencia puedes guardarlo como .xlsx también.)

### 2. Crear un Google Sheet por simulador
Por cada archivo: Google Drive → Nuevo → "Subir archivo" → sube el `.xlsx` → ábrelo →
**Archivo → Guardar como Hojas de cálculo de Google** (lo convierte a Sheet nativo).
Copia el **ID** del Sheet (está en la URL):
`docs.google.com/spreadsheets/d/`**`ESTE_ES_EL_ID`**`/edit`

> ⚠️ Al convertir, revisa que los resultados de cada Sheet coincidan con el Excel
> (sobre todo Vantage por sus tablas). Si Google resolvió bien las tablas, listo.

### 3. Desplegar el Apps Script (motor)
1. https://script.google.com → **Nuevo proyecto**.
2. Pega el contenido de [`google-apps-script-motor.gs`](./google-apps-script-motor.gs). Guarda.
3. (Opcional) pon un `TOKEN` secreto arriba del script.
4. **Implementar → Nueva implementación → Aplicación web**:
   - Ejecutar como: **Yo**
   - Quién tiene acceso: **Cualquier usuario**
5. Autoriza los permisos que pida. Copia la **URL `/exec`** que te entrega.

### 4. Configurar Skala (secrets de la Edge Function)
En Supabase → Edge Functions → Secrets:
- `APPS_SCRIPT_URL` = la URL `/exec` del paso 3
- `APPS_SCRIPT_TOKEN` = el token (si pusiste uno)

Y desplegar la función: `supabase functions deploy simulador-calc`

### 5. Registrar cada simulador en Skala
En el admin de Academia, por cada entidad se guarda el **ID del Google Sheet** (paso 2)
y la **hoja principal** (ej. `SimuladorV11`, `Simulador`, `FORMULARIO ASESOR`).

## Validación (la haré yo en cuanto me pases la URL y los IDs)
Con la URL `/exec` y los IDs de los 3 Sheets, corro una prueba servidor-a-servidor que
manda entradas de ejemplo y verifica que Google devuelve los resultados correctos para
los 3 (incluido Vantage). Si pasa, construyo toda la UI de Academia sobre este motor.

## Costos / límites
- Apps Script y Google Sheets API: **gratis**. Límite generoso (cientos de cálculos/día
  sin problema). Cada cálculo crea y borra una copia temporal para aislar usuarios.
