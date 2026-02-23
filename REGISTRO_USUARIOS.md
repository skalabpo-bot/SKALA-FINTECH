# Guía de Registro de Usuarios - SKALA Platform

## 📋 Resumen

Esta guía explica cómo funciona el sistema de registro de usuarios (gestores) en la plataforma SKALA y cómo diagnosticar problemas.

---

## 🚀 Inicio Rápido

### 1. Verificar que la app esté corriendo

```bash
npm run dev
```

Deberías ver: `Local: http://localhost:5173/`

### 2. Probar la Conexión a Supabase

Abre en tu navegador: `http://localhost:5173/test-supabase.html`

Este archivo de prueba te ayudará a:
- ✅ Verificar conexión a Supabase
- ✅ Probar registro de usuarios
- ✅ Probar login
- ✅ Probar subida de archivos

Si todos los tests pasan, tu configuración está correcta.

---

## 📝 Proceso de Registro Normal

### Paso 1: Llenar el Formulario

El formulario de registro requiere:

**Información Personal:**
- Nombre y Apellido (obligatorio)
- Correo Personal/Corporativo (obligatorio)
- Contraseña (obligatorio, mínimo 6 caracteres)
- Cédula (obligatorio)
- Celular (obligatorio)
- Ciudad de Operación (obligatorio)

**Información Bancaria:**
- Banco Destino (obligatorio)
- Tipo de Cuenta (AHORROS o CORRIENTE)
- Número de Cuenta (obligatorio)

**Documentos Obligatorios (4):**
1. Cédula Frontal
2. Cédula Posterior
3. RUT
4. Certificación Bancaria

⚠️ **IMPORTANTE:** Debes subir los 4 documentos antes de poder enviar la solicitud.

### Paso 2: Sistema de Validaciones

El formulario ahora tiene validaciones que verifican:
- ✅ Todos los campos obligatorios están llenos
- ✅ Los 4 documentos han sido subidos
- ✅ El formato del email es válido
- ✅ La contraseña cumple los requisitos

Si falta algo, verás un mensaje de error específico.

### Paso 3: ¿Qué Pasa Después del Registro?

1. **Usuario queda en estado PENDING**
   - No puede iniciar sesión hasta ser aprobado
   - Sus datos quedan guardados en la base de datos

2. **Los administradores reciben notificación**
   - Se crea automáticamente una notificación para cada admin
   - Aparece un badge rojo en el menú "Usuarios"

3. **Administrador Aprueba/Rechaza**
   - Puede revisar todos los documentos
   - Decide aprobar o rechazar
   - Al aprobar, el usuario puede iniciar sesión

---

## 🔧 Configuración Técnica

### Variables de Entorno

Archivo `.env` en la raíz del proyecto:

```env
VITE_SUPABASE_URL=https://yfosumpmtmcomfpbspaz.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_GEMINI_API_KEY=PLACEHOLDER_API_KEY
```

**Importante:** En Vite se usan variables con prefijo `VITE_`, no `REACT_APP_`.

### Reiniciar Servidor

Cada vez que cambies el `.env`, DEBES reiniciar Vite:

```bash
# Ctrl+C para detener
npm run dev  # Para iniciar de nuevo
```

---

## 🛠️ Solución de Problemas

### Problema 1: "Error al enviar solicitud"

**Posibles causas:**
1. Falta llenar campos obligatorios
2. Faltan documentos por subir
3. Email ya registrado
4. Problemas de conexión con Supabase

**Solución:**
1. Revisa la **consola del navegador** (F12)
2. El error ahora muestra el mensaje específico
3. Sigue las instrucciones del mensaje

### Problema 2: Documentos no se suben

**Síntomas:**
- El botón "SUBIR" no responde
- Aparece loading infinito

**Solución:**
1. Verifica que el bucket `skala-bucket` existe en Supabase
2. Verifica que es público
3. Ejecuta el test: `http://localhost:5173/test-supabase.html`

### Problema 3: Usuario no puede iniciar sesión después de registrarse

**Esto es NORMAL:**
- Los usuarios quedan en estado PENDING
- No pueden iniciar sesión hasta que un admin los apruebe

**Para aprobar un usuario:**
1. Inicia sesión como administrador
2. Ve a "Usuarios" en el menú
3. Pestaña "Solicitudes"
4. Haz clic en "Aprobar"

### Problema 4: No hay administradores

**Solución 1: Crear Admin desde SQL**

Ejecuta el script `create-admin-user.sql` en Supabase SQL Editor.

**Solución 2: Convertir Usuario Existente**

```sql
UPDATE public.profiles
SET role = 'ADMIN', status = 'ACTIVE'
WHERE email = 'TU_EMAIL@ejemplo.com';
```

---

## 📊 Flujo Completo de Registro

```
┌─────────────────┐
│ Usuario llena   │
│ formulario con  │
│ 4 documentos    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Validaciones    │
│ del formulario  │
└────────┬────────┘
         │ ✅ Todo OK
         ▼
┌─────────────────┐
│ Supabase crea   │
│ usuario en      │
│ auth.users      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Trigger crea    │
│ perfil en       │
│ public.profiles │
│ (status:PENDING)│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Se notifica a   │
│ todos los       │
│ administradores │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Admin revisa y  │
│ aprueba/rechaza │
└────────┬────────┘
         │ ✅ Aprobado
         ▼
┌─────────────────┐
│ Usuario puede   │
│ iniciar sesión  │
└─────────────────┘
```

---

## 🧪 Testing y Diagnóstico

### Herramienta de Diagnóstico

Usa: `test-supabase.html`

```bash
# Sirve el archivo
npm run dev

# Abre en navegador
http://localhost:5173/test-supabase.html
```

Esta herramienta prueba:
1. ✅ Conexión a base de datos
2. ✅ Registro de usuario
3. ✅ Login de usuario
4. ✅ Subida de archivos

### Revisar Logs de Supabase

1. Ve a: https://supabase.com/dashboard/project/yfosumpmtmcomfpbspaz
2. Click en "Logs" en el menú lateral
3. Selecciona "API" o "Auth"
4. Busca errores recientes

---

## 📚 Archivos de Referencia

- `TROUBLESHOOTING_REGISTRO.md` - Guía detallada de resolución de problemas
- `create-admin-user.sql` - Script para crear usuarios admin
- `test-supabase.html` - Herramienta de diagnóstico
- `BACKEND_CONTEXT.md` - Estructura de base de datos completa

---

## ❓ Preguntas Frecuentes

**P: ¿Por qué no puedo iniciar sesión después de registrarme?**
R: Los usuarios nuevos quedan en estado PENDING. Un administrador debe aprobarlos primero.

**P: ¿Cómo creo el primer administrador?**
R: Usa el script `create-admin-user.sql` o convierte un usuario existente con SQL.

**P: ¿Los documentos son realmente obligatorios?**
R: Sí, el sistema ahora valida que se suban los 4 documentos antes de permitir el registro.

**P: ¿Puedo probar sin subir documentos?**
R: No desde el formulario. Pero puedes crear usuarios directamente desde Supabase Dashboard.

**P: El formulario no muestra errores específicos**
R: Abre la consola del navegador (F12). Los errores se muestran ahí con detalles.

---

## 📞 Soporte

Si después de seguir esta guía sigues teniendo problemas:

1. Ejecuta `test-supabase.html` y captura los resultados
2. Revisa la consola del navegador y copia los errores exactos
3. Verifica los logs de Supabase Dashboard
4. Comparte esta información para obtener ayuda específica
