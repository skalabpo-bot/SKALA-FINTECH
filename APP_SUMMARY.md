
# SKALA PLATFORM - RESUMEN DE MODELO DE NEGOCIO

## 1. Registro de Gestores (Onboarding Aliados)
- **Campos Solicitados**: Nombre, Email, Clave, Cédula, Ciudad, Celular.
- **Bancarios (Obligatorios)**: Banco, Tipo de Cuenta, Número de Cuenta.
- **Documentos (Obligatorios)**: Cédula Frontal, Cédula Posterior, RUT, Certificación Bancaria.
- **Estado Inicial**: `PENDING`. No puede loguearse hasta ser aprobado por un `ADMIN`.

## 2. Onboarding de Crédito (Originación)
- **Flujo**: 6 pasos.
- **Campos Cliente**: Información Personal, Contacto, Ubicación, Datos Laborales/Pagaduría, Datos Financieros (Ingresos, Gastos, Activos, Pasivos), Referencias Personales (Ref 1 y 2), Datos de Beneficiarios.
- **Campos Préstamo**: Monto, Plazo, Línea, Entidad Aliada, Tasa, Comisión.
- **Documentos Radicación**: Cédula (F/P), Desprendibles de pago (1 y 2).

## 3. Roles y Permisos
- **GESTOR**: Solo ve sus créditos, crea nuevos, usa el chat y ve dashboard propio.
- **ANALISTA / ASISTENTE**: Ven todos los créditos, cambian estados, suben documentos operativos.
- **ADMIN**: Control total + Edición de cualquier campo del cliente en cualquier etapa.
- **TESORERÍA**: Foco en estados de desembolso y reportes financieros.

## 4. Trazabilidad y Operación
- **Credit History**: Cada acción (Radicación, Cambio Estado, Edición) se guarda en la tabla `credit_history`.
- **Chat Operativo**: Mensajería en tiempo real por expediente con soporte de adjuntos.
- **Grounding**: Integración futura con Google Search/Maps para validación de direcciones y noticias.

## 5. SQL Master Structure
- `profiles`: Usuarios y sus docs de registro.
- `credits`: Maestro de solicitudes y `client_data` (JSONB).
- `credit_history`: Log de auditoría.
- `comments`: Mensajes del chat.
- `documents`: Expediente digital.
- `news`: Tablón de novedades para gestores.
