# 🚀 Configuración para Producción - Rate Limits y Escalabilidad

## 📊 Situación Actual vs Producción

### En Desarrollo (Ahora)
- ❌ 1 IP (la tuya) → Muchos intentos → Rate limit
- ❌ Free tier: 4 registros/hora por IP
- ❌ Te bloqueas tú mismo al probar

### En Producción (Lanzamiento)
- ✅ Múltiples IPs (usuarios reales) → Rate limit no es problema
- ✅ Cada usuario tiene su propio límite
- ✅ El rate limit protege contra abuse/bots

---

## ✅ Soluciones para Ambos Escenarios

### 1. Para DESARROLLO (Ahora)

#### Opción A: Crear usuarios manualmente (No cuenta contra rate limit)
```
Dashboard > Authentication > Users > Add User
```

#### Opción B: Cambiar IP para seguir probando
- Usar VPN
- Usar teléfono con datos móviles
- Usar modo incógnito + proxy

#### Opción C: Esperar 1 hora
- El rate limit se resetea automáticamente

---

### 2. Para PRODUCCIÓN (Lanzamiento)

#### ✅ Opción 1: Upgrade a Supabase Pro (RECOMENDADO)

**Plan Pro ($25/mes):**
- Rate limits más altos
- Mejor performance
- Soporte prioritario
- Backups automáticos
- Sin límite de usuarios

**Cómo upgradearlo:**
1. Dashboard > Settings > Billing
2. Selecciona "Pro"
3. Agrega método de pago

**ROI:**
- Si tienes 10+ gestores pagando comisiones → Se paga solo
- Plataforma más estable y rápida
- Vale la pena para lanzamiento

---

#### ✅ Opción 2: Implementar CAPTCHA (Anti-Bots)

Agregar Google reCAPTCHA v3:

**Beneficios:**
- Bloquea bots y abuse
- No afecta rate limit de usuarios reales
- Invisible para usuarios legítimos

**Implementación:**

```typescript
// 1. Instalar
npm install react-google-recaptcha-v3

// 2. En App.tsx (envolver la app)
import { GoogleReCaptchaProvider } from 'react-google-recaptcha-v3';

<GoogleReCaptchaProvider reCaptchaKey="TU_SITE_KEY">
  <App />
</GoogleReCaptchaProvider>

// 3. En el formulario de registro
import { useGoogleReCaptcha } from 'react-google-recaptcha-v3';

const { executeRecaptcha } = useGoogleReCaptcha();

const handleRegister = async (e) => {
  // Obtener token
  const token = await executeRecaptcha('registro');

  // Verificar en backend (Supabase Edge Function)
  // antes de crear el usuario
}
```

**Costo:** Gratis hasta 1M requests/mes

---

#### ✅ Opción 3: Configurar Rate Limits Personalizados

Si te quedas en Free tier, puedes:

**A. Ajustar en la UI de Supabase:**
- Dashboard > Authentication > Rate Limits
- Aumentar límites (si está disponible)

**B. Implementar Rate Limiting propio:**
```typescript
// Usando localStorage/sessionStorage
const REGISTRO_COOLDOWN = 60000; // 1 minuto

const handleRegister = async () => {
  const lastAttempt = localStorage.getItem('last_signup_attempt');
  const now = Date.now();

  if (lastAttempt && (now - parseInt(lastAttempt)) < REGISTRO_COOLDOWN) {
    dispatchAlert('Por favor espera 1 minuto antes de intentar de nuevo.', 'info');
    return;
  }

  localStorage.setItem('last_signup_attempt', now.toString());

  // Continuar con registro...
}
```

---

#### ✅ Opción 4: Queue System para Registros Masivos

Si esperas 100+ registros simultáneos en lanzamiento:

**Implementación con n8n o Zapier:**
1. Usuario llena formulario → Se guarda en tabla `pending_registrations`
2. Worker procesa registros en batch (5-10 por minuto)
3. Usuario recibe email cuando su cuenta está lista

**Beneficios:**
- No sobrecarga el sistema
- Experiencia controlada
- Menos errores

---

## 📋 Plan Recomendado para Lanzamiento

### Fase 1: Pre-Lanzamiento (Ahora - 1 mes antes)
- [ ] Upgrade a Supabase Pro
- [ ] Implementar CAPTCHA básico
- [ ] Crear 5-10 usuarios de prueba manualmente
- [ ] Probar flujo completo

### Fase 2: Soft Launch (1-2 semanas)
- [ ] Invitar 20-30 gestores beta
- [ ] Monitorear rate limits en Dashboard
- [ ] Ajustar configuraciones según uso real

### Fase 3: Lanzamiento Completo
- [ ] Abrir registro público
- [ ] Monitorear logs en Supabase > Logs
- [ ] Escalar según demanda

---

## 🔍 Monitoreo de Rate Limits

### En Supabase Dashboard:
1. **Logs > Auth Logs**
   - Ver todos los intentos de signup
   - Identificar patrones de abuse

2. **Monitoring > Usage**
   - Ver cuántos usuarios se registran por hora
   - Detectar picos

3. **Alerts (Pro plan)**
   - Configurar alertas si rate limit se excede X veces

---

## 💰 Comparación de Costos

| Opción | Costo Mensual | Rate Limit | Mejor Para |
|--------|---------------|------------|------------|
| **Free Tier** | $0 | 4/hora/IP | Desarrollo, MVP |
| **Pro Plan** | $25 | 100+/hora/IP | Producción, lanzamiento |
| **Pro + CAPTCHA** | $25 | Ilimitado* | Alta demanda |
| **Enterprise** | Custom | Ilimitado | 1000+ usuarios |

*Con CAPTCHA, el rate limit real es mucho más alto porque bloqueas bots

---

## 🎯 Recomendación Final

**Para tu caso (Plataforma Fintech):**

1. **AHORA (Desarrollo):**
   - Crea usuarios manualmente desde Dashboard
   - Usa diferentes emails para pruebas
   - No te preocupes por el rate limit

2. **PRE-LANZAMIENTO (1-2 semanas antes):**
   - ✅ Upgrade a Pro ($25/mes) - ESENCIAL
   - ✅ Implementa CAPTCHA - 1-2 horas de trabajo
   - ✅ Prueba con 10-20 registros reales

3. **LANZAMIENTO:**
   - Monitorea los primeros días
   - Ajusta según comportamiento real
   - Escala si es necesario

**Inversión:** $25/mes + 2 horas implementación
**ROI:** Con 2-3 gestores activos ya se paga solo

---

## ❓ Preguntas Frecuentes

**P: ¿Cuántos usuarios pueden registrarse simultáneamente?**
R: Con Pro plan + CAPTCHA: ~100-200 usuarios/hora sin problemas

**P: ¿Qué pasa si tengo un pico de 500 registros en 1 día?**
R: Con Pro está cubierto. El rate limit es por hora, no por día.

**P: ¿Necesito CAPTCHA si tengo pocos usuarios?**
R: No es obligatorio, pero protege contra bots y reduce costos de abuse.

**P: ¿Puedo quedarme en Free tier para siempre?**
R: Solo si tienes <50 usuarios activos y <100 registros/mes. Para fintech, Pro es recomendado.

---

## 🚨 Red Flags a Monitorear

Si ves esto en producción, tienes un problema:

1. **Muchos registros fallidos desde misma IP**
   → Posible bot attack → Implementa CAPTCHA

2. **Rate limit excedido frecuentemente**
   → Upgrade plan o revisa si hay abuse

3. **Usuarios reportan "no puedo registrarme"**
   → Revisa logs inmediatamente → Puede ser configuración

---

## 📞 Soporte

Si tienes problemas de rate limiting en producción:
1. Supabase Support (Pro): support@supabase.io
2. Community Discord: https://discord.supabase.com
3. Stack Overflow: tag [supabase]

---

**Siguiente paso:** ¿Quieres que te ayude a implementar CAPTCHA o prefieres el upgrade a Pro primero?
