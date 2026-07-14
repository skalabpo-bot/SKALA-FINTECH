# Skala — La plataforma que le arregla la vida al gestor de crédito

> **Un paso adelante.** Skala es la plataforma integral que usan los gestores para originar, simular, radicar y hacer seguimiento de créditos de **libranza, hipotecario y vehicular** — de principio a fin, en un solo lugar.

---

## 1. Por qué nació Skala

Gestionar crédito por libranza (y también hipotecario y vehicular) es un trabajo lleno de fricción:

- **Cada entidad tiene su propio simulador en Excel**, con fórmulas distintas y reglas de capacidad por pagaduría que cambian seguido. El gestor termina con diez archivos, versiones desactualizadas y cálculos a mano que se equivocan.
- **Leer cédulas y desprendibles a mano** es lento y propenso a errores de digitación.
- **La radicación se hace por WhatsApp, correo o formularios sueltos**, sin trazabilidad ni estados claros. Nadie sabe en qué va cada solicitud.
- **Las comisiones son una caja negra**: el gestor no sabe cuánto va a ganar ni cuándo le pagan.
- **La capacitación no existe o vive en PDFs perdidos.**
- **No hay una sola fuente de verdad**: el asesor, el supervisor y el analista miran datos distintos.

Skala nació para **eliminar toda esa fricción**: un solo sistema donde el gestor simula con las fórmulas oficiales de cada entidad, radica con datos leídos por IA, sigue el estado en tiempo real, ve su comisión, aprende, y todo queda trazado. El resultado: **más créditos radicados, con menos errores y en menos tiempo.**

---

## 2. Para quién es (roles)

Skala se adapta a cada persona del proceso con permisos granulares:

| Rol | Qué hace en Skala |
|---|---|
| **Gestor** | Simula, radica y hace seguimiento de sus créditos; ve su billetera y comisiones; se capacita en la Academia. |
| **Supervisor** | Todo lo del gestor + ve y gestiona los créditos de **su zona/equipo**, puede radicar a nombre de sus asesores y aprueba nuevas cuentas de gestor. |
| **Analista** | Estudia y avanza las solicitudes asignadas (validación, preanálisis, estudio), devuelve con tareas de subsanación. |
| **Administrador** | Configura todo: entidades, simuladores, estados, usuarios, comisiones, automatizaciones, academia y reportes. |

Los permisos son finos (ver dashboard, ver créditos propios/de zona/todos, crear crédito, cambiar estado, gestionar retiros, ver academia, etc.), así cada quien ve **solo lo que le corresponde**.

---

## 3. Qué resuelve por tipo de crédito

### 🟠 Libranza (el corazón de Skala)
- **Simuladores oficiales por entidad** (COLTEFINANCIERA, CrediAlianza, Vantage…): el cálculo de monto/desembolso/cuota sale del **Excel real de la entidad**, ejecutado en línea — no de una fórmula aproximada.
- **Capacidad por pagaduría**: el sistema conoce las reglas de cupo por pagaduría (Colpensiones, CASUR, CREMIL, Fiduprevisora, FOPEP, Policía, Ejército, Magisterio, etc.) y distingue regímenes (Ley 1527 vs Ley 50).
- **Lectura de desprendible con IA** para calcular la capacidad de ley al instante.
- **Preaprobación externa (La Hipotecaria)**: viabilidad en línea por cédula + confirmación por **OTP al correo**, todo dentro de Skala, sin salir a otro portal.

### 🔵 Hipotecario
- Flujo de originación con formularios dinámicos por entidad, seguimiento de estados y toda la trazabilidad del crédito.

### 🟢 Vehicular
- Mismo motor de originación y seguimiento, adaptado al producto de vehículo.

En los tres, el gestor trabaja con **el mismo tablero, los mismos estados y la misma trazabilidad** — no tiene que aprender tres sistemas distintos.

---

## 4. Funcionalidades (y cómo le ayudan al gestor)

### 🧮 Simulador con motor real por entidad
Selecciona pagaduría → tipo de crédito → entidad, y Skala calcula las opciones **con la hoja de cálculo oficial de la entidad** (vía OnlyOffice/motor Excel). El gestor ve monto, desembolso, cuota, tasa y comisión estimada **sin abrir un solo Excel** ni arriesgarse a usar una versión vieja.

### 🤖 Lectura de documentos con IA
Sube la **cédula** y el **desprendible de pago** y la IA extrae los datos (nombre, documento, fechas, ingresos, deducciones) automáticamente. Menos digitación, menos errores, radicación más rápida.

### 📝 Radicación con trazabilidad total
Radica el crédito con los datos ya cargados. Cada solicitud tiene un **número de radicado** y avanza por estados claros:
`Radicado → Validación → Preanálisis → En estudio → Aprobado → Firma electrónica → En proceso pagaduría → Desembolsado` (o Devuelto / Negado / Desistido). El gestor **siempre sabe en qué va cada crédito.**

### 🔄 Devoluciones y subsanación guiada
Cuando un analista devuelve una solicitud, lo hace con **tareas concretas** (“corregir cédula”, “adjuntar desprendible”). El gestor ve exactamente qué falta, lo sube y reenvía — sin cadenas de correos.

### 💬 Comentarios e historial por crédito
Todo queda registrado: cambios de estado, comentarios del equipo, adjuntos. Una sola fuente de verdad para gestor, supervisor y analista.

### 💰 Billetera y comisiones transparentes
El gestor ve su **comisión estimada por crédito** y su **billetera acumulada**, solicita **retiros**, y sigue el estado del pago. Se acabó la incertidumbre de “¿cuánto y cuándo me pagan?”.

### 🎓 Academia
**Simuladores oficiales y políticas de cada entidad** embebidos en la plataforma (hojas de cálculo interactivas + PDFs de política comercial). El gestor se capacita y consulta las reglas **sin salir de Skala**.

### 🔔 Notificaciones en tiempo real
Avisos (incluidas **notificaciones push**) cuando un crédito cambia de estado, cuando se aprueba una cuenta, cuando hay una devolución, etc. El gestor reacciona a tiempo.

### 🛡️ Autorización de centrales de riesgo
Flujo de **autorización de consulta en centrales** con OTP y firma, para cumplir con el tratamiento de datos del cliente.

### 🔗 Automatizaciones y webhooks
Integración con **n8n**: cada evento del crédito (creación, cambio de estado, comentario, desembolso) puede disparar automatizaciones (notificar al cliente, al gestor, a la pagaduría, dispersión, etc.).

### 🌐 API externa e integraciones
Una **API REST** permite que plataformas aliadas creen, consulten y actualicen créditos, y reciban eventos por webhook. Skala se conecta con el ecosistema en vez de ser una isla. *(Ver `docs/api/MANUAL_INTEGRACION.md`.)*

### 📊 Reportes y gestión de equipo
Tableros con estadísticas, exportación a CSV, gestión de usuarios por zonas, asignación de analistas y actualización masiva de estados. El supervisor y el admin ven el rendimiento del equipo de un vistazo.

### 🧩 Configuración sin código
El admin gestiona entidades, **formularios dinámicos por entidad**, estados y transiciones, banners, noticias, reglas y comisiones — **desde la interfaz**, sin tocar código.

---

## 5. El día del gestor, de principio a fin

1. **Entra a Skala** y ve su dashboard: créditos en curso, notificaciones, billetera.
2. **Nuevo crédito** → elige tipo (libranza / hipotecario / vehicular) y pagaduría.
3. **Sube la cédula y el desprendible** → la IA extrae los datos.
4. **Simula** → Skala calcula con el motor oficial de la entidad y muestra las opciones reales.
5. **Radica** → el crédito nace con número de radicado y entra al flujo.
6. **Sigue el estado** en tiempo real; si lo devuelven, **subsana** las tareas indicadas.
7. **Ve su comisión** y, al desembolsar, **solicita el retiro** desde su billetera.
8. **Se capacita** en la Academia con los simuladores y políticas oficiales.

Todo en **una sola plataforma**, con todo trazado.

---

## 6. Cómo le arregla la vida al gestor (resumen)

| Antes (sin Skala) | Con Skala |
|---|---|
| Diez Excel distintos, versiones viejas, cálculos a mano | Un simulador con el **motor oficial de cada entidad** |
| Digitar cédula y desprendible a mano | **IA** que lee los documentos |
| Radicar por WhatsApp/correo, sin saber en qué va | **Estados claros y trazabilidad** total |
| Devoluciones confusas por chat | **Tareas de subsanación** concretas |
| “¿Cuánto y cuándo me pagan?” | **Billetera y comisiones** transparentes + retiros |
| Capacitación dispersa en PDFs | **Academia** con simuladores y políticas embebidas |
| Cada quien ve datos distintos | **Una sola fuente de verdad** |
| Procesos manuales y lentos | **Automatizaciones** que corren solas |

**El efecto neto:** el gestor **radica más créditos, con menos errores y en menos tiempo**, con visibilidad total de su cartera y de su plata.

---

## 7. Bajo el capó (stack)

- **Frontend:** React + TypeScript + Vite + Tailwind (web app + PWA instalable con notificaciones push).
- **Backend:** Supabase (base de datos, autenticación, almacenamiento) + Edge Functions (motor de cálculo, IA, integraciones, API).
- **IA:** análisis de cédula y desprendible, y análisis legal, del lado servidor (las llaves nunca se exponen al navegador).
- **Simuladores:** OnlyOffice Document Server para ejecutar las hojas de cálculo oficiales en línea.
- **Automatizaciones:** n8n vía webhooks.
- **Integraciones:** API REST propia + conectores (p. ej. La Hipotecaria para preaprobación externa).

---

*Skala convierte la gestión de crédito de un proceso manual, disperso y opaco en uno **guiado, automatizado y transparente** — para que el gestor haga lo que mejor sabe hacer: **cerrar créditos**.*
