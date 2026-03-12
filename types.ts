
export enum UserRole {
  ADMIN = 'ADMIN',
  GESTOR = 'GESTOR',
  ASISTENTE_OPERATIVO = 'ASISTENTE_OPERATIVO',
  ANALISTA = 'ANALISTA',
  TESORERIA = 'TESORERIA',
  SUPERVISOR_ASIGNADO = 'SUPERVISOR_ASIGNADO',
  ANALISTA_ENTIDAD = 'ANALISTA_ENTIDAD'
}

export type Permission =
  | 'VIEW_DASHBOARD'
  | 'CREATE_CREDIT'
  | 'VIEW_OWN_CREDITS'
  | 'VIEW_ALL_CREDITS'
  | 'VIEW_ASSIGNED_CREDITS'
  | 'EDIT_CREDIT_INFO'
  | 'CHANGE_CREDIT_STATUS'
  | 'ADD_COMMENT'
  | 'MANAGE_USERS'
  | 'MANAGE_NEWS'
  | 'CONFIGURE_SYSTEM'
  | 'VIEW_REPORTS'
  | 'EXPORT_DATA'
  | 'MANAGE_AUTOMATIONS'
  | 'ASSIGN_ANALYST_MANUAL'
  | 'VIEW_ZONE_CREDITS'
  | 'MARK_COMMISSION_PAID'
  | 'REQUEST_WITHDRAWAL'
  | 'MANAGE_WITHDRAWALS';

export const ALL_PERMISSIONS: Permission[] = [
  'VIEW_DASHBOARD', 'CREATE_CREDIT', 'VIEW_OWN_CREDITS', 'VIEW_ALL_CREDITS',
  'VIEW_ASSIGNED_CREDITS', 'EDIT_CREDIT_INFO', 'CHANGE_CREDIT_STATUS', 'ADD_COMMENT',
  'MANAGE_USERS', 'MANAGE_NEWS', 'CONFIGURE_SYSTEM', 'VIEW_REPORTS', 'EXPORT_DATA',
  'MANAGE_AUTOMATIONS', 'ASSIGN_ANALYST_MANUAL', 'VIEW_ZONE_CREDITS',
  'MARK_COMMISSION_PAID', 'REQUEST_WITHDRAWAL', 'MANAGE_WITHDRAWALS'
];

export interface Zone {
  id: string;
  name: string;
  cities: string[];
}

export interface RateConfig {
    rate: number;
    commission: number;
}

export interface AlliedEntity {
  id: string;
  name: string;
  rates: RateConfig[];
}

export interface UserDocument {
  name: string;
  url: string;
  type: 'CEDULA' | 'RUT' | 'CERTIFICACION_BANCARIA';
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  roleDisplayName?: string;
  avatar: string;
  phone?: string;
  cedula?: string;
  status: 'ACTIVE' | 'PENDING' | 'REJECTED';
  documents?: UserDocument[];
  permissions?: Permission[];
  zoneId?: string;
  zonaId?: string;
  city?: string;
  banco?: string;
  tipoCuenta?: 'AHORROS' | 'CORRIENTE';
  numeroCuenta?: string;
  assignedEntities?: string[];
}

export interface NewsItem {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  createdAt: Date;
}

export interface CreditState {
  id: string;
  name: string;
  color: string;
  order: number;
  roleResponsible: UserRole;
  isFinal?: boolean;
}

export interface Comment {
  id: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  text: string;
  timestamp: Date;
  attachmentName?: string;
  attachmentUrl?: string;
  isSystem?: boolean;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  isRead: boolean;
  createdAt: Date;
  creditId?: string;
}

export interface CreditDocument {
  id: string;
  type: string;
  name: string;
  url: string;
  uploadedAt: Date;
}

export interface CreditHistoryItem {
  id: string;
  date: Date;
  action: string;
  description: string;
  userId: string;
  userName: string;
  userRole: UserRole;
}

export interface Credit {
  id: string;
  solicitudNumber?: number;
  createdAt: Date;
  updatedAt: Date;
  assignedGestorId: string;
  gestorName?: string;
  gestorZoneName?: string;
  assignedAnalystId?: string;
  analystName?: string;
  statusId: string;

  // --- CAMPOS OBLIGATORIOS SOLICITADOS ---
  nombres: string;
  apellidos: string;
  nombreCompleto: string;
  tipoDocumento: string;
  numeroDocumento: string;
  fechaNacimiento: string;
  ciudadNacimiento: string;
  sexo: string;
  ciudadExpedicion: string;
  fechaExpedicion: string;
  correo: string;
  telefonoCelular: string;
  telefonoFijo: string;
  direccionCompleta: string;
  barrio: string;
  ciudadResidencia: string;
  estadoCivil: string;
  
  pagaduria: string;
  clavePagaduria: string;
  resolucionPension?: string;
  fechaPension?: string;
  antiguedadPension?: string;
  
  gastosMensuales: number;
  activos: number;
  pasivos: number;
  patrimonio: number;
  
  // Referencias (Dual)
  ref1Nombre: string;
  ref1Cedula?: string;
  ref1FechaExpedicion?: string;
  ref1FechaNacimiento?: string;
  ref1Telefono: string;
  ref1Direccion: string;
  ref1Ciudad: string;
  ref1Barrio: string;
  ref1Parentesco: string;

  ref2Nombre: string;
  ref2Cedula?: string;
  ref2FechaExpedicion?: string;
  ref2FechaNacimiento?: string;
  ref2Telefono: string;
  ref2Direccion: string;
  ref2Ciudad: string;
  ref2Barrio: string;
  ref2Parentesco: string;

  tipoDesembolso: string;
  banco?: string;
  tipoCuenta?: string;
  numeroCuenta?: string;
  
  lineaCredito?: string;
  monto: number;
  montoDesembolso?: number;
  plazo: number;
  tasa?: number;
  entidadAliada?: string;
  commissionPercentage?: number;
  estimatedCommission?: number;

  // Beneficiario (Si aplica)
  beneficiarioNombre?: string;
  beneficiarioCedula?: string;
  beneficiarioFechaExpedicion?: string;
  beneficiarioFechaNacimiento?: string;
  beneficiarioTelefono?: string;
  beneficiarioDireccion?: string;
  beneficiarioCiudad?: string;
  beneficiarioBarrio?: string;
  beneficiarioParentesco?: string;

  subsanacionHabilitada?: boolean;
  carteraItems?: { entity: string; amount: number }[];
  cuotaDisponible?: number;
  comisionPagada?: boolean;
  fechaPagoComision?: string;
  observaciones?: string;

  comments: Comment[];
  documents: CreditDocument[];
  history: CreditHistoryItem[];
}

export interface WithdrawalRequest {
  id: string;
  gestorId: string;
  gestorName?: string;
  gestorPhone?: string;
  estado: 'PENDIENTE' | 'PROCESADO' | 'RECHAZADO';
  montoTotal: number;
  creditIds: string[];
  createdAt: Date;
  processedAt?: Date;
  processedBy?: string;
  notas?: string;
}

export interface DashboardStats {
  totalCredits: number;
  disbursedCredits: number;
  pendingCredits: number;
  returnedCredits: number;
  totalAmountSolicited: number;
  totalAmountDisbursed: number;
  totalCommissionEarned: number;
  totalCommissionPending: number;  // desembolsados, comision_pagada=false
  totalCommissionPaid: number;     // desembolsados, comision_pagada=true
  byStatus: Record<string, number>;
}

export interface ReportFilters {
  startDate: string;
  endDate: string;
  statusId: string;
  entity: string;
  comisionPagada: '' | 'pagada' | 'pendiente';
}

export interface AuthorizationToken {
  id: string;
  credit_id: string;
  token: string;
  otp_code?: string;
  otp_expires_at?: string;
  status: 'pending' | 'signed' | 'expired';
  expires_at: string;
  client_name: string;
  client_document: string;
  client_phone: string;
  client_email?: string;
  client_ip?: string;
  validation_url?: string;
  signed_at?: string;
  pdf_url?: string;
  created_at: string;
  created_by?: string;
}

export type AutomationEvent =
    | 'credit_status_change'
    | 'credit_created'
    | 'credit_edited'
    | 'credit_deleted'
    | 'comment_added'
    | 'document_uploaded'
    | 'user_registered'
    | 'user_approved'
    | 'user_rejected'
    | 'user_deleted'
    | 'user_updated'
    | 'withdrawal_requested'
    | 'user_batch_imported'
    | 'state_action_executed'
    | 'authorization_request_sent'
    | 'authorization_otp_requested'
    | 'authorization_signed'
    | 'all';

export const AUTOMATION_EVENTS: { value: AutomationEvent; label: string; description: string; category: string }[] = [
    // Créditos
    { value: 'credit_status_change', label: 'Cambio de estado de crédito', description: 'Datos del crédito, cliente, gestor, nuevo estado, motivo', category: 'Créditos' },
    { value: 'credit_created', label: 'Crédito radicado', description: 'Datos del nuevo crédito, cliente, gestor, monto, entidad, tasa', category: 'Créditos' },
    { value: 'credit_edited', label: 'Crédito editado', description: 'Datos actualizados del crédito y cliente', category: 'Créditos' },
    { value: 'credit_deleted', label: 'Crédito eliminado', description: 'ID del crédito eliminado y quién lo eliminó', category: 'Créditos' },
    // Comunicación
    { value: 'comment_added', label: 'Nuevo comentario en crédito', description: 'Texto del comentario, autor, crédito asociado', category: 'Comunicación' },
    { value: 'document_uploaded', label: 'Documento cargado', description: 'Nombre y URL del documento, crédito asociado', category: 'Documentos' },
    // Usuarios
    { value: 'user_registered', label: 'Nuevo usuario registrado', description: 'Datos del usuario (nombre, email, teléfono, cédula, ciudad)', category: 'Usuarios' },
    { value: 'user_approved', label: 'Usuario aprobado', description: 'Datos del usuario aprobado', category: 'Usuarios' },
    { value: 'user_rejected', label: 'Usuario rechazado', description: 'Datos del usuario rechazado', category: 'Usuarios' },
    { value: 'user_deleted', label: 'Usuario eliminado', description: 'ID y datos del usuario eliminado', category: 'Usuarios' },
    { value: 'user_updated', label: 'Perfil de usuario actualizado', description: 'Datos actualizados del perfil', category: 'Usuarios' },
    { value: 'withdrawal_requested', label: 'Solicitud de retiro de fondos', description: 'Gestor, monto total, créditos incluidos', category: 'Comisiones' },
    { value: 'user_batch_imported', label: 'Usuario creado por importación masiva', description: 'Nombre, email, cédula, teléfono, ciudad, rol, contraseña temporal', category: 'Usuarios' },
    { value: 'state_action_executed', label: 'Acción rápida ejecutada', description: 'Nombre de la acción, gestor, cliente y datos del crédito', category: 'Créditos' },
    // Autorización de consulta y validación de identidad
    { value: 'authorization_request_sent', label: 'Autorización de consulta y validación enviada', description: 'Link de autorización, datos del cliente, crédito asociado', category: 'Legal' },
    { value: 'authorization_otp_requested', label: 'OTP de autorización solicitado', description: 'Código OTP, teléfono del cliente, crédito asociado', category: 'Legal' },
    { value: 'authorization_signed', label: 'Autorización de consulta y validación firmada', description: 'Datos del cliente, crédito, fecha de firma, PDF generado', category: 'Legal' },
];

export type AutomationType = 'webhook' | 'whatsapp' | 'email' | 'notificacion';
export type AutomationRecipient = 'GESTOR' | 'ANALISTA' | 'CLIENTE' | 'ADMIN' | 'SUPERVISOR_ASIGNADO' | 'TESORERIA';

export const AUTOMATION_TYPES: { value: AutomationType; label: string; icon: string }[] = [
    { value: 'whatsapp', label: 'WhatsApp', icon: '💬' },
    { value: 'email', label: 'Email', icon: '📧' },
    { value: 'notificacion', label: 'Notificación in-app', icon: '🔔' },
    { value: 'webhook', label: 'Webhook genérico', icon: '🔗' },
];

export const AUTOMATION_RECIPIENTS: { value: AutomationRecipient; label: string }[] = [
    { value: 'GESTOR', label: 'Gestor' },
    { value: 'ANALISTA', label: 'Analista' },
    { value: 'CLIENTE', label: 'Cliente' },
    { value: 'ADMIN', label: 'Administrador' },
    { value: 'SUPERVISOR_ASIGNADO', label: 'Supervisor Asignado' },
    { value: 'TESORERIA', label: 'Tesorería' },
];

export interface AutomationRule {
    id: string;
    name: string;
    description: string;
    webhookUrl: string;
    active: boolean;
    eventTypes: AutomationEvent[];
    automationType: AutomationType;
    recipients: string[];
    statusFilter?: string[];
}

export interface N8nConfig {
    apiKey: string;
    automations: AutomationRule[];
}
