# Plan: Skala en Android y iPhone

Documento de decisión y ejecución para llevar Skala a las tiendas de aplicaciones.
Elaborado el 3 de septiembre de 2026.

---

## 1. Punto de partida (verificado, no supuesto)

Skala **ya es una aplicación móvil instalable**. No partimos de cero:

| Pieza | Estado |
|---|---|
| `manifest.json` | Existe, en modo `standalone` con ícono y color de marca |
| Service worker (`sw.js`) | Existe y registrado |
| Notificaciones push | **565 suscripciones activas de 281 usuarios** |
| Banner de instalación | En producción (corregido el 25 ago 2026) |

De los ~407 usuarios del sistema, **281 (69%) ya reciben notificaciones push en su teléfono**. La PWA no es un experimento: está en uso.

**Stack:** React 18 + TypeScript + Vite 5 + Tailwind · Supabase (BD, Auth, Storage, Edge Functions) · Netlify.

**Flujos críticos que deben funcionar en móvil:**
- OCR de cédula y desprendible (cámara + Edge Function `analyze-document`)
- Simulador con motor Excel (Edge Function → Apps Script → Google Sheets, ~4 s por cálculo)
- Panel de preaprobación de La Hipotecaria (robot server-side)
- Subida de documentos a Supabase Storage
- Bandeja, chat operativo y notificaciones

---

## 2. Decisión: Capacitor

**Recomendación: envolver la aplicación web actual con Capacitor.** No reescribir.

### Por qué no React Native (ni Flutter)

Sería rehacer la aplicación entera: bandeja, simulador, radicación, panel de La Hipotecaria, academia. Meses de trabajo y, peor, **dos bases de código que mantener para siempre**. Cada corrección habría que hacerla dos veces. Con el ritmo de cambios que lleva Skala, eso es insostenible.

### Por qué no quedarnos solo con la PWA

Funciona, pero tiene tres límites reales:

1. **Instalación:** hay que explicarle a cada asesor cómo agregarla desde el menú del navegador. Con 400 personas, eso es fricción permanente.
2. **Cámara:** la del navegador da menos calidad y control que la nativa. Esto **no es cosmético**: el incidente del disponible errado se rastreó a fotos de baja resolución que el OCR leyó mal. Mejor cámara es mejor dato.
3. **iPhone:** el push en PWA exige que el usuario la haya instalado correctamente en la pantalla de inicio. Muchos no lo hacen.

### Por qué Capacitor encaja aquí

Todo Skala es web: no hay nada que dependa de APIs de escritorio. Capacitor toma el mismo `dist/` que ya genera Vite y lo empaqueta como aplicación nativa para ambas plataformas. **Se reutiliza prácticamente el 100% del código.**

---

## 3. Fases

### Fase 0 — Preparar la web para móvil (1 semana)

Antes de empaquetar nada. Es trabajo que sirve igual aunque el proyecto se detenga aquí.

- Revisar cada pantalla en pantalla de teléfono real, no en el simulador del navegador.
- Priorizar lo que usa un asesor en la calle: radicación, bandeja, detalle de crédito, chat.
- Áreas de toque adecuadas y formularios usables con una mano.
- Indicadores de progreso donde hay esperas largas (el simulador tarda ~4 s por producto; en móvil, sin aviso, parece que se colgó).

### Fase 1 — Proyecto Capacitor (1 semana)

- Instalar Capacitor y generar los proyectos de Android e iOS.
- Configurar identificador de aplicación, nombre, íconos y pantalla de carga.
- Primera compilación en emulador y en dispositivo físico.
- Verificar que Supabase Auth funciona dentro del contenedor (ver riesgos).

### Fase 2 — Lo nativo donde aporta (1–2 semanas)

Solo lo que justifica la app:

- **Cámara nativa** para cédula y desprendible, con control de resolución.
- **Push nativo** (FCM en Android, APNs en iOS).
- **Biometría** para entrar sin escribir la contraseña.
- **Enlaces profundos**: que una notificación abra directamente el crédito.

### Fase 3 — Publicación (2–4 semanas, la mayoría esperando)

- Cuenta de desarrollador de Apple y de Google Play.
- Fichas de tienda: descripción, capturas, política de privacidad (obligatoria; ya existe `PoliticaDatos`).
- Primera revisión de Apple: entre 1 y 3 días, con posibilidad de rechazo y correcciones.
- Distribución interna primero (TestFlight y canal cerrado de Play) antes de abrir.

### Fase 4 — Actualizaciones sin pasar por tienda

Ver sección 5. **Esta fase no es opcional**: define si el proyecto es sostenible.

---

## 4. Puntos específicos de Skala que hay que resolver

Cosas que en otro proyecto no aparecerían, pero aquí sí:

**Sesión y renovación de token.** Ya tuvimos cierres de sesión por la rotación de tokens de refresco (ajustado a 30 s el 25 ago). En un contenedor nativo el almacenamiento de sesión cambia; hay que verificar que la renovación funciona igual y que la app no expulsa a nadie al volver del segundo plano.

**Migración de las notificaciones push.** Hoy son web push con VAPID y viven en `push_subscriptions` (565 registros). El push nativo usa otro mecanismo. Hay que soportar **ambos a la vez** durante la transición: quienes sigan en la web no pueden quedarse sin avisos.

**Calidad de foto para el OCR.** Es la razón técnica más fuerte del proyecto. Conviene fijar resolución mínima y validar el resultado antes de enviarlo a analizar, en vez de aceptar cualquier imagen.

**Documentos.** Subidas y descargas desde Storage deben probarse en ambas plataformas; iOS es especialmente restrictivo al abrir y guardar archivos.

**Panel de La Hipotecaria.** Corre contra un robot server-side y no cambia, pero su formulario es largo: hay que revisarlo en pantalla pequeña, sección por sección.

---

## 5. El costo real: la cadencia de publicación

**Esto es lo más importante del documento.**

Hoy Skala se corrige y se despliega el mismo día. Solo en la sesión de trabajo del 13 de agosto al 3 de septiembre se desplegaron más de veinte cambios: se detectaba un problema, se corregía y se verificaba en minutos.

Con una aplicación de tienda eso desaparece: **cada cambio pasa por revisión de Apple, de uno a tres días.**

Un ejemplo real: el 26 de agosto, un selector de línea de crédito que no se renderizaba dejó a varios asesores sin poder radicar en La Hipotecaria. Se detectó y corrigió en una hora. **Con una app nativa sin plan de actualizaciones, ese bloqueo habría durado tres días.**

### Cómo se resuelve

Capacitor permite que el contenido web se actualice sin pasar por la tienda. Los cambios de interfaz y de lógica llegan igual de rápido que hoy; solo las funciones nativas (cámara, push, biometría) requieren nueva versión.

**Hay que montarlo desde el principio, no después.** Y conviene conocer las reglas de Apple al respecto: permiten actualizar contenido web, pero no cambiar la naturaleza de la aplicación.

---

## 6. Costos

| Concepto | Costo |
|---|---|
| Cuenta Apple Developer | 99 USD al año |
| Cuenta Google Play | 25 USD, pago único |
| Servicio de actualizaciones en vivo | Variable; hay opciones gratuitas y de pago |
| Desarrollo | 4 a 6 semanas de trabajo |
| Mantenimiento | Publicaciones periódicas y adaptación a cambios de sistema operativo |

El gasto en dinero es menor. **El gasto real es de tiempo y de proceso.**

---

## 7. Riesgos

| Riesgo | Mitigación |
|---|---|
| Rechazo de Apple en la primera revisión | Es común. Presupuestar dos o tres intentos |
| La sesión se comporta distinto en nativo | Probar exhaustivamente antes de publicar; ya hubo incidentes de sesión en web |
| Quedar con dos canales que se desincronizan | Mantener una sola base de código; la web sigue siendo la fuente |
| Que el equipo asuma que "ya está" y baje el ritmo de correcciones | Definir desde el día uno qué se corrige por web y qué exige nueva versión |

---

## 8. Recomendación

**Ir a Capacitor, manteniendo la web como canal principal.**

La aplicación de tienda para que instalar sea fácil y la cámara sea buena. La web para seguir corrigiendo el mismo día.

**Antes de comprometer las 4 a 6 semanas, hacer la Fase 0.** Es una semana, no depende de ninguna decisión, y puede que revele que la mayor mejora para los asesores en calle está en la experiencia móvil actual y no en estar en la tienda.

---

## 9. Decisiones pendientes

1. ¿Se hace la Fase 0 primero, o se aprueba el proyecto completo de una vez?
2. ¿Quién gestiona las cuentas de Apple y Google? Requiere datos de la empresa y renovación anual.
3. ¿La aplicación es para uso interno (solo asesores) o de cara al público? Cambia la ficha de tienda y el proceso de revisión.
4. ¿Se publica en ambas tiendas a la vez, o primero Android —más rápido y sin revisión estricta— para validar?

---

## Anexo — Estado verificado el 3 sep 2026

- Usuarios activos: ~407 · con push: 281
- Créditos en el sistema: ~2.000
- Entidades activas: CrediAlianza, Coltefinanciera, Vantage, La Hipotecaria
- Entorno de capacitación: rol CAPACITADOR y dos entidades de práctica (creados el 31 ago)
