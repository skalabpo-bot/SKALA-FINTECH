import { supabase, supabaseAdmin } from './supabaseClient';
import {
    Credit, User, UserRole, AlliedEntity, Notification, Permission, Comment,
    CreditDocument, CreditState, Zone, DashboardStats, ReportFilters, NewsItem, CreditHistoryItem,
    WithdrawalRequest
} from '../types';

// Ciudades y Bancos de Colombia (datos semilla / fallback si las tablas no existen)
export const COLOMBIAN_CITIES = [
    "BOGOTA D.C.", "MEDELLIN", "CALI", "BARRANQUILLA", "CARTAGENA", "SOLEDAD", "CUCUTA", "IBAGUE", "SOACHA", "BUCARAMANGA", "VILLAVICENCIO", "SANTA MARTA", "VALLEDUPAR", "BELLO", "PEREIRA", "MONTERIA", "PASTO", "BUENAVENTURA", "MANIZALES", "NEIVA", "PALMIRA", "RIOHACHA", "SINCELEJO", "ARMENIA", "ITAGUI", "FLORENCIA", "POPAYAN", "ENVIGADO", "TULUA", "DOSQUEBRADAS", "APARTADO", "TURBO", "TUNJA", "GIRARDOT", "CHIA", "FACATATIVA", "FUSAGASUGA", "ZIPAQUIRA", "MAICAO", "URIBIA", "MAGANGUE", "LORICA", "SAHAGUN", "QUIBDO", "SOGAMOSO", "DUITAMA", "AGUACHICA", "GIRON", "PIEDECUESTA", "FLORIDABLANCA", "BARRANCABERMEJA", "YOPAL", "PITALITO", "CHINCHINA", "LA DORADA", "VILLA DEL ROSARIO", "PIENDAMO", "JAMUNDI", "SANTANDER DE QUILICHAO", "PUERTO ASIS", "SAN ANDRES", "TUMACO", "CAUCASIA", "MONTELIBANO", "PLANETA RICA", "CERETE", "PUERTO TEJADA", "MIRANDA", "CALOTO", "CORINTO", "CAJICA", "MADRID", "MOSQUERA", "FUNZA", "VILLAMARIA", "VITERBO", "ANSERMA", "RIOSUCIO", "SUPIA", "AGUADAS", "PACORA", "SALAMINA", "ARANZAZU", "NEIRA", "MANZANARES", "PENSILVANIA", "MARQUETALIA", "SAMANA", "VICTORIA", "NORCASIA", "LA MERCED", "MARULANDA", "BELALCAZAR", "SAN JOSE", "RISARALDA", "PALESTINA", "SANTUARIO", "LA VIRGINIA", "MARSELLA", "SANTA ROSA DE CABAL", "BELEN DE UMBRIA", "GUATICA", "MISTRATO", "PUEBLO RICO", "QUINCHIA", "APIA", "BALBOA", "LA CELIA", "CIRCASIA", "FILANDIA", "SALENTO", "QUIMBAYA", "MONTENEGRO", "CALARCA", "TEBAIDA", "BUENAVISTA", "PIJAO", "CORDOBA", "GENOVA", "GUAMO", "ESPINAL", "CHAPARRAL", "LIBANO", "MARIQUITA", "HONDA", "MELGAR", "CARMEN DE APICALA", "FALAN", "PALOCABILDO", "CASABIANCA", "HERVEO", "VILLAHERMOSA", "MURILLO", "SANTA ISABEL", "VENADILLO", "ALVARADO", "PIEDRAS", "COELLO", "VALLE DE SAN JUAN", "SAN LUIS", "ROVIRA", "RONCESVALLES", "ANZOATEGUI", "AMBALEMA", "LERIDA", "ARMERO GUAYABAL", "FRESNO", "SABANALARGA", "BARANOA", "PUERTO COLOMBIA", "MALAMBO", "GALAPA", "SABANAGRANDE", "PALMAR DE VARELA", "SANTO TOMAS", "PONEDERA", "CANDELARIA", "CAMPO DE LA CRUZ", "SANTA LUCIA", "SUAN", "REPELON", "LURUACO", "PIJO", "USIACURI", "POLONUEVO"
].sort();

export const COLOMBIAN_BANKS = [
    "BANCOLOMBIA", "BANCO DE BOGOTA", "DAVIVIENDA", "BBVA COLOMBIA", "BANCO DE OCCIDENTE",
    "BANCO POPULAR", "BANCO AV VILLAS", "BANCO CAJA SOCIAL", "SCOTIABANK COLPATRIA",
    "BANCO AGRARIO", "ITAU", "BANCO PICHINCHA", "BANCOOMEVA", "BANCO FALABELLA",
    "BANCO FINANDINA", "BANCO SANTANDER", "CITIBANK", "LULO BANK", "NU BANK", "NEQUI", "DAVIPLATA"
].sort();

export const INITIAL_STATES: CreditState[] = [
  { id: '1', name: 'RADICADO / PENDIENTE REVISIÓN', color: 'bg-gray-500', order: 1, roleResponsible: UserRole.ASISTENTE_OPERATIVO },
  { id: '2', name: 'EN ESTUDIO - ANALISTA', color: 'bg-blue-500', order: 2, roleResponsible: UserRole.ANALISTA },
  { id: '3', name: 'APROBADO - PENDIENTE FIRMA', color: 'bg-indigo-500', order: 3, roleResponsible: UserRole.GESTOR },
  { id: '4.5', name: 'PENDIENTE FIRMA ELECTRÓNICA', color: 'bg-pink-500', order: 4, roleResponsible: UserRole.GESTOR },
  { id: '8', name: 'DESEMBOLSADO', color: 'bg-orange-600', order: 9, roleResponsible: UserRole.GESTOR, isFinal: true },
  { id: '9', name: 'DEVUELTO', color: 'bg-red-500', order: 10, roleResponsible: UserRole.GESTOR, isFinal: true },
];

export const ROLE_DEFAULT_PERMISSIONS: Record<UserRole, Permission[]> = {
    [UserRole.ADMIN]: ['VIEW_DASHBOARD', 'CREATE_CREDIT', 'VIEW_OWN_CREDITS', 'VIEW_ALL_CREDITS', 'VIEW_ASSIGNED_CREDITS', 'EDIT_CREDIT_INFO', 'CHANGE_CREDIT_STATUS', 'ADD_COMMENT', 'MANAGE_USERS', 'MANAGE_NEWS', 'CONFIGURE_SYSTEM', 'VIEW_REPORTS', 'EXPORT_DATA', 'MANAGE_AUTOMATIONS', 'ASSIGN_ANALYST_MANUAL', 'MARK_COMMISSION_PAID', 'MANAGE_WITHDRAWALS'],
    [UserRole.GESTOR]: ['VIEW_DASHBOARD', 'CREATE_CREDIT', 'VIEW_OWN_CREDITS', 'ADD_COMMENT', 'VIEW_REPORTS', 'EXPORT_DATA', 'REQUEST_WITHDRAWAL'],
    [UserRole.ASISTENTE_OPERATIVO]: ['VIEW_DASHBOARD', 'VIEW_ALL_CREDITS', 'VIEW_ASSIGNED_CREDITS', 'CHANGE_CREDIT_STATUS', 'ADD_COMMENT', 'EDIT_CREDIT_INFO'],
    [UserRole.ANALISTA]: ['VIEW_DASHBOARD', 'VIEW_ASSIGNED_CREDITS', 'CHANGE_CREDIT_STATUS', 'ADD_COMMENT', 'EDIT_CREDIT_INFO', 'VIEW_REPORTS', 'EXPORT_DATA', 'MARK_COMMISSION_PAID'],
    [UserRole.TESORERIA]: ['VIEW_DASHBOARD', 'VIEW_ALL_CREDITS', 'CHANGE_CREDIT_STATUS', 'ADD_COMMENT', 'EXPORT_DATA', 'MARK_COMMISSION_PAID', 'MANAGE_WITHDRAWALS'],
    [UserRole.SUPERVISOR_ASIGNADO]: ['VIEW_DASHBOARD', 'VIEW_ZONE_CREDITS', 'ADD_COMMENT', 'VIEW_REPORTS', 'EXPORT_DATA']
};

const mapCreditFromDB = (c: any): Credit => {
    const clientData = c.client_data || {};
    return {
        id: c.id,
        solicitudNumber: c.solicitud_number,
        createdAt: new Date(c.created_at),
        updatedAt: new Date(c.updated_at),
        assignedGestorId: c.assigned_gestor_id,
        gestorName: c.gestor_profile?.full_name || c.profiles?.full_name || 'Sin asignar',
        assignedAnalystId: c.assigned_analyst_id || undefined,
        analystName: c.analyst_profile?.full_name || undefined,
        statusId: c.status_id,
        ...clientData,
        monto: Number(c.amount || 0),
        montoDesembolso: Number(c.disbursement_amount || 0),
        plazo: Number(c.term || 0),
        entidadAliada: c.entity_name,
        tasa: Number(c.interest_rate || 0),
        commissionPercentage: Number(c.commission_percent || 0),
        estimatedCommission: Number(c.commission_est || 0),
        comisionPagada: c.comision_pagada || false,
        fechaPagoComision: c.fecha_pago_comision || undefined,
        comments: [],
        documents: [],
        history: []
    };
};

const mapUserFromDB = (p: any): User => ({
    id: p.id,
    name: p.full_name || 'Usuario',
    email: p.email,
    role: (p.role as UserRole) || UserRole.GESTOR,
    avatar: p.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.full_name || 'U')}&background=EA580C&color=fff`,
    status: p.status || 'PENDING',
    phone: p.phone,
    cedula: p.cedula,
    city: p.city,
    zoneId: p.zone_id,
    banco: p.bank_details?.banco,
    tipoCuenta: p.bank_details?.tipoCuenta,
    numeroCuenta: p.bank_details?.numeroCuenta,
    permissions: p.permissions || [],
    documents: p.registration_docs || []
});

export const ProductionService = {
    hasPermission: (user: User | null, permission: string): boolean => {
        if (!user) return false;
        if (user.role === 'ADMIN') return true;
        // Permisos ya están cargados en el usuario desde login (dinámicos o hardcoded)
        const perms = user.permissions?.length ? user.permissions : ROLE_DEFAULT_PERMISSIONS[user.role as UserRole] || [];
        return perms.includes(permission as any);
    },

    login: async (email: string, password?: string) => {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password: password || '' });
        if (error || !data.user) throw new Error("Credenciales inválidas.");
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', data.user.id).single();
        if (!profile || profile.status === 'REJECTED') throw new Error("Acceso denegado.");
        if (profile.status === 'PENDING') return null;
        const user = mapUserFromDB(profile);
        // Cargar permisos y displayName del rol desde la tabla roles
        try {
            const { data: roleData } = await supabase.from('roles').select('display_name, default_permissions').eq('name', user.role).single();
            if (roleData) {
                user.roleDisplayName = roleData.display_name || user.role.replace(/_/g, ' ');
                if (!user.permissions || user.permissions.length === 0) {
                    user.permissions = roleData.default_permissions || [];
                }
            }
        } catch (e) { /* fallback a hardcoded */ }
        // Fallback: si aún no hay permisos, usar hardcoded
        if (!user.permissions || user.permissions.length === 0) {
            user.permissions = ROLE_DEFAULT_PERMISSIONS[user.role as UserRole] || [];
        }
        if (!user.roleDisplayName) {
            user.roleDisplayName = user.role.replace(/_/g, ' ');
        }
        // Asegurar que SUPERVISOR_ASIGNADO siempre tenga VIEW_ZONE_CREDITS
        if (user.role === 'SUPERVISOR_ASIGNADO' && user.permissions && !user.permissions.includes('VIEW_ZONE_CREDITS' as Permission)) {
            user.permissions.push('VIEW_ZONE_CREDITS' as Permission);
        }
        return user;
    },

    resetPassword: async (email: string) => {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin,
        });
        if (error) throw new Error("Error al enviar el correo de recuperación.");
        return true;
    },

    registerGestor: async (userData: any) => {
        const { email, password, name, phone, cedula, city, zonaId, banco, tipoCuenta, numeroCuenta, registration_docs } = userData;
        
        // 1. Crear Usuario en Auth
        const { data, error } = await supabase.auth.signUp({
            email, password,
            options: { 
                data: {
                    full_name: name,
                    phone,
                    cedula,
                    city,
                    zone_id: zonaId || null,
                    bank_details: { banco, tipoCuenta, numeroCuenta },
                    registration_docs: registration_docs || [],
                    role: 'GESTOR',
                    status: 'PENDING'
                }
            }
        });
        
        if (error) throw error;
        
        // 2. Respaldo manual: Intentar crear perfil si el Trigger falló o fue lento
        if (data.user) {
           // Esperamos 1s para dar tiempo al trigger
           await new Promise(r => setTimeout(r, 1000));

           const { data: existing } = await supabase.from('profiles').select('id').eq('id', data.user.id).single();
           
           if (!existing) {
               // Si no existe, lo insertamos manualmente
               const { error: profileError } = await supabase.from('profiles').insert({
                   id: data.user.id,
                   full_name: name,
                   email: email,
                   role: 'GESTOR',
                   status: 'PENDING',
                   phone,
                   cedula,
                   city,
                   zone_id: zonaId || null,
                   bank_details: { banco, tipoCuenta, numeroCuenta },
                   registration_docs: registration_docs || []
               });
               // Si falla por permisos RLS (común en registro anónimo), solo logueamos
               if (profileError) console.warn("Aviso: Creación manual de perfil falló (posiblemente por RLS), esperando que el Trigger haya funcionado.", profileError);
           }

           // 3. Notificar a los admins
           try {
               await ProductionService.notifyAdminsNewGestor(data.user.id, name);
           } catch (err) {
               console.error('Error al enviar notificaciones a admins:', err);
           }

           // 4. Disparar webhooks
           ProductionService.triggerWebhooks('user_registered', {
               usuario: {
                   id: data.user.id,
                   nombre: name,
                   email,
                   telefono: phone || '',
                   cedula: cedula || '',
                   ciudad: city || '',
                   rol: 'GESTOR',
                   estado: 'PENDING'
               }
           });
        }

        return data.user;
    },

    createCredit: async (formData: any, currentUser: User) => {
        const { monto, montoDesembolso, plazo, entidadAliada, tasa, documents, ...rest } = formData;
        const [entities, states] = await Promise.all([ProductionService.getEntities(), ProductionService.getStates()]);
        const entity = entities.find(e => e.name === entidadAliada);
        const rateConfig = entity?.rates.find((r: any) => r.rate === Number(tasa));
        const commPercent = rateConfig?.commission || 5;
        const commEst = (Number(monto) * commPercent) / 100;

        // Obtener el primer estado del flujo (orden más bajo)
        const initialState = states.sort((a, b) => a.order - b.order)[0];
        if (!initialState) throw new Error('No hay estados configurados en el sistema.');

        // Validar cédula duplicada: bloquear si ya existe un crédito activo con la misma cédula
        const cedula = (rest.numeroDocumento || '').toString().trim();
        if (cedula) {
            const { data: existingCredits } = await supabase
                .from('credits')
                .select('id, status_id, client_data')
                .filter('client_data->>numeroDocumento', 'eq', cedula);

            if (existingCredits && existingCredits.length > 0) {
                const finalStateIds = states.filter(s => s.isFinal).map(s => s.id);
                const activeCredit = existingCredits.find((c: any) => !finalStateIds.includes(c.status_id));
                if (activeCredit) {
                    const activeStateName = states.find(s => s.id === activeCredit.status_id)?.name || 'en trámite';
                    throw new Error(
                        `Ya existe un crédito activo para la cédula ${cedula} (estado: ${activeStateName}). ` +
                        `Debes finalizar ese trámite antes de radicar uno nuevo.`
                    );
                }
            }
        }

        const { data, error } = await supabase.from('credits').insert({
            assigned_gestor_id: currentUser.id,
            status_id: initialState.id,
            amount: Number(monto),
            disbursement_amount: Number(montoDesembolso || monto || 0),
            term: Number(plazo),
            entity_name: entidadAliada,
            interest_rate: Number(tasa),
            commission_percent: commPercent,
            commission_est: commEst,
            client_data: { ...rest, nombreCompleto: `${rest.nombres} ${rest.apellidos}` }
        }).select().single();

        if (error) throw error;

        await supabase.from('credit_history').insert({ 
            credit_id: data.id, 
            user_id: currentUser.id, 
            action: 'RADICACIÓN', 
            description: 'Expediente radicado por el gestor.' 
        });

        if (documents?.length > 0) {
            const docsToInsert = documents.map((d: any) => ({
                credit_id: data.id,
                name: d.name,
                url: d.url,
                type: d.type
            }));
            await supabase.from('documents').insert(docsToInsert);
        }

        // Notificar al gestor que su solicitud fue radicada
        await supabase.from('notifications').insert({
            user_id: currentUser.id,
            title: 'Solicitud Radicada',
            message: `Tu solicitud para ${rest.nombres} ${rest.apellidos} (CC: ${rest.numeroDocumento}) ha sido radicada exitosamente y está en revisión.`,
            type: 'success',
            is_read: false,
            credit_id: data.id
        });

        // --- DISPARAR WEBHOOKS ---
        ProductionService.triggerWebhooks('credit_created', {
            credit_id: data.id,
            estado_inicial: initialState.name,
            gestor: {
                id: currentUser.id,
                nombre: currentUser.name,
                telefono: currentUser.phone || '',
                email: currentUser.email
            },
            cliente: {
                nombre: `${rest.nombres} ${rest.apellidos}`,
                documento: rest.numeroDocumento || '',
                celular: rest.telefonoCelular || '',
                correo: rest.correo || ''
            },
            credito: {
                monto: Number(monto),
                plazo: Number(plazo),
                entidad: entidadAliada,
                tasa: Number(tasa),
                comision_estimada: commEst
            }
        });

        return data;
    },

    updateCreditData: async (creditId: string, newData: any, userId: string) => {
        // Separar campos de la tabla credits vs client_data
        const {
            monto, plazo, entidadAliada, tasa, montoDesembolso,
            // Excluir campos que no van en client_data
            id, createdAt, updatedAt, assignedGestorId, gestorName, gestorPhone, statusId,
            estimatedCommission, commissionPercentage, comments, documents, history,
            solicitudNumber, analystName, assignedAnalystId,
            ...clientFields
        } = newData;

        // Recalcular comisión basada en entidad y tasa
        const entities = await ProductionService.getEntities();
        const entity = entities.find((e: any) => e.name === entidadAliada);
        const rateConfig = entity?.rates?.find((r: any) => r.rate === Number(tasa));
        const commPercent = rateConfig?.commission || 5;
        const commEst = (Number(monto) * commPercent) / 100;

        const updatePayload: any = {
            amount: Number(monto) || 0,
            term: Number(plazo) || 0,
            entity_name: entidadAliada || '',
            interest_rate: Number(tasa) || 0,
            disbursement_amount: Number(montoDesembolso) || 0,
            commission_percent: commPercent,
            commission_est: commEst,
            client_data: { ...clientFields, nombreCompleto: `${clientFields.nombres || ''} ${clientFields.apellidos || ''}`.trim() },
            updated_at: new Date().toISOString()
        };

        const { error } = await supabase.from('credits').update(updatePayload).eq('id', creditId);
        if (error) throw error;

        await supabase.from('credit_history').insert({
            credit_id: creditId,
            user_id: userId,
            action: 'EDICIÓN',
            description: 'Actualización de campos maestros del expediente.'
        });

        // Webhook: crédito editado
        let gestorW: any = null, analistaW: any = null, cd: any = clientFields;
        try {
            const { data: creditInfo } = await supabase.from('credits').select('assigned_gestor_id, assigned_analyst_id, client_data').eq('id', creditId).single();
            if (creditInfo?.assigned_gestor_id) {
                const { data: g } = await supabase.from('profiles').select('full_name, phone, email').eq('id', creditInfo.assigned_gestor_id).single();
                gestorW = { id: creditInfo.assigned_gestor_id, nombre: g?.full_name || '', telefono: g?.phone || '', email: g?.email || '' };
            }
            if (creditInfo?.assigned_analyst_id) {
                const { data: a } = await supabase.from('profiles').select('full_name, phone, email').eq('id', creditInfo.assigned_analyst_id).single();
                analistaW = { id: creditInfo.assigned_analyst_id, nombre: a?.full_name || '', telefono: a?.phone || '', email: a?.email || '' };
            }
            if (creditInfo?.client_data) cd = creditInfo.client_data;
        } catch { /* usar datos base si falla el fetch */ }
        ProductionService.triggerWebhooks('credit_edited', {
            credit_id: creditId,
            editado_por: userId,
            gestor: gestorW,
            analista: analistaW,
            cliente: {
                nombre: cd.nombreCompleto || `${cd.nombres || ''} ${cd.apellidos || ''}`.trim(),
                documento: cd.numeroDocumento || '',
                celular: cd.telefonoCelular || '',
                correo: cd.correo || ''
            },
            datos_actualizados: {
                monto: Number(monto) || 0,
                plazo: Number(plazo) || 0,
                entidad: entidadAliada || '',
                tasa: Number(tasa) || 0
            }
        });
    },

    toggleSubsanacion: async (creditId: string, enable: boolean, user: User) => {
        // Leer client_data actual para no sobreescribir otros campos
        const { data: row, error: readErr } = await supabase
            .from('credits')
            .select('client_data')
            .eq('id', creditId)
            .single();
        if (readErr) throw readErr;

        const newClientData = { ...(row?.client_data || {}), subsanacionHabilitada: enable };
        const { error } = await supabase
            .from('credits')
            .update({ client_data: newClientData, updated_at: new Date().toISOString() })
            .eq('id', creditId);
        if (error) throw error;

        // Registrar en trazabilidad con acción específica
        await supabase.from('credit_history').insert({
            credit_id: creditId,
            user_id: user.id,
            action: enable ? 'SUBSANACIÓN HABILITADA' : 'SUBSANACIÓN BLOQUEADA',
            description: enable
                ? `${user.name} habilitó la edición al gestor para subsanar el expediente. El gestor podrá corregir los datos del cliente una sola vez. Las condiciones del crédito (monto, plazo, tasa, entidad) permanecen bloqueadas.`
                : `${user.name} revocó el permiso de edición al gestor. El expediente queda bloqueado nuevamente.`
        });
    },

    completeDevolucionTask: async (creditId: string, taskId: string, user: User, docUrl?: string, docName?: string, completionText?: string) => {
        const { data: row, error: readErr } = await supabase.from('credits').select('client_data').eq('id', creditId).single();
        if (readErr) throw readErr;

        const clientData = row?.client_data || {};
        const tasks: any[] = clientData.devolucionTasks || [];
        const task = tasks.find((t: any) => t.id === taskId);
        if (!task) throw new Error('Tarea no encontrada');

        const updatedTasks = tasks.map((t: any) =>
            t.id === taskId
                ? {
                    ...t,
                    completed: true,
                    completedAt: new Date().toISOString(),
                    completedBy: user.name,
                    ...(docUrl ? { docUrl, docName } : {}),
                    ...(completionText ? { completionText } : {}),
                }
                : t
        );
        const { error } = await supabase.from('credits')
            .update({ client_data: { ...clientData, devolucionTasks: updatedTasks }, updated_at: new Date().toISOString() })
            .eq('id', creditId);
        if (error) throw error;

        // Guardar el adjunto también en el repositorio de documentos del crédito
        if (docUrl && docName) {
            try {
                await supabase.from('documents').insert({
                    credit_id: creditId,
                    name: docName,
                    url: docUrl,
                    type: `SUBSANACIÓN — ${task.title}`.substring(0, 80),
                });
            } catch (e) {
                console.warn('No se pudo registrar en repositorio de documentos:', e);
            }
        }

        const descParts = [`${user.name} completó la tarea: "${task.title}".`];
        if (docName) descParts.push(`Documento adjunto: ${docName}`);
        if (completionText) descParts.push(`Respuesta: "${completionText}"`);

        try {
            await supabase.from('credit_history').insert({
                credit_id: creditId,
                user_id: user.id,
                action: 'TAREA COMPLETADA',
                description: descParts.join(' ')
            });
        } catch { /* ignorar si falla el log */ }
    },

    autoArchiveExpiredDevuelto: async () => {
        try {
            const states = await ProductionService.getStates();
            const devueltoIds = states.filter(s => s.name.toUpperCase().includes('DEVUELTO')).map(s => s.id);
            if (devueltoIds.length === 0) return;

            // Créditos en DEVUELTO con updated_at hace más de 4 meses
            const cutoff = new Date();
            cutoff.setMonth(cutoff.getMonth() - 4);

            const { data: expired } = await supabase
                .from('credits')
                .select('id')
                .in('status_id', devueltoIds)
                .lt('updated_at', cutoff.toISOString());

            if (!expired || expired.length === 0) return;

            // Estado final destino: buscar RECHAZADO/CANCELADO/VENCIDO, o el primer final disponible
            const finalState =
                states.find(s => s.isFinal && /RECHAZADO|CANCELADO|VENCIDO/.test(s.name.toUpperCase())) ||
                states.find(s => s.isFinal);
            if (!finalState) return;

            const now = new Date().toISOString();
            for (const credit of expired) {
                await supabase.from('credits')
                    .update({ status_id: finalState.id, updated_at: now })
                    .eq('id', credit.id);
                // Registrar en trazabilidad
                try {
                    await supabase.from('credit_history').insert({
                        credit_id: credit.id,
                        action: 'ARCHIVO AUTOMÁTICO',
                        description: `Expediente archivado automáticamente por haber permanecido en estado DEVUELTO por más de 4 meses sin ser subsanado. Nuevo estado: ${finalState.name}.`
                    });
                } catch { /* ignorar si user_id es NOT NULL en el esquema */ }
            }
            console.log(`[Auto-archive] ${expired.length} crédito(s) DEVUELTO archivados → ${finalState.name}`);
        } catch (e) {
            console.warn('[Auto-archive] Error en verificación automática:', e);
        }
    },

    getCredits: async (user: User) => {
        // Verificar y archivar créditos DEVUELTO vencidos (fire & forget)
        ProductionService.autoArchiveExpiredDevuelto().catch(() => {});
        // Intentar con join de analista; si la columna no existe, fallback sin ella
        let selectStr = '*, gestor_profile:assigned_gestor_id(full_name, phone), analyst_profile:assigned_analyst_id(full_name, phone)';
        let query = supabase.from('credits').select(selectStr).order('created_at', { ascending: false });
        const canViewAll = ProductionService.hasPermission(user, 'VIEW_ALL_CREDITS');
        const canViewZone = ProductionService.hasPermission(user, 'VIEW_ZONE_CREDITS') || user.role === 'SUPERVISOR_ASIGNADO';

        if (!canViewAll) {
            if (canViewZone && user.zoneId) {
                // SUPERVISOR_ASIGNADO: obtener todos los gestores de su zona y filtrar créditos
                const { data: zoneProfiles } = await supabase
                    .from('profiles')
                    .select('id')
                    .eq('zone_id', user.zoneId);
                const zoneGestorIds = (zoneProfiles || []).map((p: any) => p.id);
                if (zoneGestorIds.length > 0) {
                    query = query.in('assigned_gestor_id', zoneGestorIds);
                } else {
                    return [];
                }
            } else if (user.role === 'ANALISTA') {
                query = query.or(`assigned_gestor_id.eq.${user.id},assigned_analyst_id.eq.${user.id}`);
            } else {
                query = query.eq('assigned_gestor_id', user.id);
            }
        }
        let { data, error } = await query;
        // Fallback: si falla (columna analyst no existe), reintentar sin el join de analista
        if (error) {
            console.warn('getCredits fallback (sin analyst join):', error.message);
            let fallbackQuery = supabase.from('credits').select('*, profiles:assigned_gestor_id(full_name, phone)').order('created_at', { ascending: false });
            if (!canViewAll) {
                if (canViewZone && user.zoneId) {
                    const { data: zoneProfiles } = await supabase.from('profiles').select('id').eq('zone_id', user.zoneId);
                    const zoneGestorIds = (zoneProfiles || []).map((p: any) => p.id);
                    if (zoneGestorIds.length > 0) {
                        fallbackQuery = fallbackQuery.in('assigned_gestor_id', zoneGestorIds);
                    } else {
                        return [];
                    }
                } else {
                    fallbackQuery = fallbackQuery.eq('assigned_gestor_id', user.id);
                }
            }
            const fallback = await fallbackQuery;
            data = fallback.data;
            if (fallback.error) throw fallback.error;
        }
        return (data || []).map(mapCreditFromDB);
    },

    getCreditById: async (id: string) => {
      // Intentar con join de analista; fallback sin ella
      let { data: c } = await supabase.from('credits').select('*, gestor_profile:assigned_gestor_id(full_name, phone), analyst_profile:assigned_analyst_id(full_name, phone)').eq('id', id).single();
      if (!c) {
          // Fallback sin analyst join
          const fallback = await supabase.from('credits').select('*, profiles:assigned_gestor_id(full_name, phone)').eq('id', id).single();
          c = fallback.data;
      }
      if (!c) return undefined;
      const credit = mapCreditFromDB(c);
      
      const { data: coms } = await supabase.from('comments').select(`*, profiles(full_name, role)`).eq('credit_id', id).order('created_at', { ascending: true });
      credit.comments = (coms || []).map(com => ({ id: com.id, userId: com.user_id, userName: com.profiles?.full_name || 'Sistema', userRole: com.profiles?.role as UserRole, text: com.text, timestamp: new Date(com.created_at), attachmentName: com.attachment_name, attachmentUrl: com.attachment_url, isSystem: com.is_system }));
      
      const { data: docs } = await supabase.from('documents').select('*').eq('credit_id', id).order('uploaded_at', { ascending: false });
      credit.documents = (docs || []).map(d => ({ id: d.id, type: d.type as any, name: d.name, url: d.url, uploadedAt: new Date(d.uploaded_at) }));
      
      const { data: hist } = await supabase.from('credit_history').select('*, profiles(full_name, role)').eq('credit_id', id).order('created_at', { ascending: false });
      credit.history = (hist || []).map(h => ({ id: h.id, date: new Date(h.created_at), action: h.action, description: h.description, userId: h.user_id, userName: h.profiles?.full_name, userRole: h.profiles?.role }));

      return credit;
    },

    getCreditHistory: async (creditId: string) => {
        const { data: hist } = await supabase
            .from('credit_history')
            .select('*, profiles(full_name, role)')
            .eq('credit_id', creditId)
            .order('created_at', { ascending: false });
        return (hist || []).map((h: any) => {
            let statusName = h.action || '';
            // Extraer nombre del estado de la descripción si es un cambio de estado
            const match = (h.description || '').match(/Estado cambiado a ([^.]+)/);
            if (match) statusName = match[1].trim();
            else if (h.description) statusName = h.description.split('.')[0];
            return {
                changedBy: h.profiles?.full_name || 'Sistema',
                statusName,
                changedAt: new Date(h.created_at)
            };
        });
    },

    updateCreditStatus: async (creditId: string, statusId: string, user: User, comment: string, devolucionTasks?: any[]) => {
        const states = await ProductionService.getStates();
        const newState = states.find(s => s.id === statusId);
        const stateName = newState?.name || 'N/A';

        const updatePayload: any = { status_id: statusId, updated_at: new Date().toISOString() };

        // Si se pasan tareas de devolución, guardarlas en client_data (también resetea subsanacionHabilitada)
        if (devolucionTasks !== undefined) {
            try {
                const { data: currentRow } = await supabase.from('credits').select('client_data').eq('id', creditId).single();
                updatePayload.client_data = {
                    ...(currentRow?.client_data || {}),
                    devolucionTasks,
                    subsanacionHabilitada: false,
                };
            } catch (e) {
                console.warn('No se pudieron guardar las tareas de devolución:', e);
            }
        }

        // Auto-asignar analista si el nuevo estado es responsabilidad de ANALISTA y no hay uno asignado
        let assignedAnalyst: any = null;
        if (newState?.roleResponsible === UserRole.ANALISTA) {
            try {
                const { data: currentCredit } = await supabase.from('credits').select('assigned_analyst_id').eq('id', creditId).single();
                if (!currentCredit?.assigned_analyst_id) {
                    assignedAnalyst = await ProductionService.autoAssignAnalyst(creditId);
                    if (assignedAnalyst) {
                        updatePayload.assigned_analyst_id = assignedAnalyst.id;
                    }
                }
            } catch (e) {
                console.warn('Auto-asignación de analista no disponible (columna puede no existir):', e);
            }
        }

        const { error: updateError } = await supabase.from('credits').update(updatePayload).eq('id', creditId);
        // Si falla por assigned_analyst_id, reintentar sin ese campo
        if (updateError && updatePayload.assigned_analyst_id) {
            delete updatePayload.assigned_analyst_id;
            assignedAnalyst = null;
            await supabase.from('credits').update(updatePayload).eq('id', creditId);
        }

        const tasksList = devolucionTasks && devolucionTasks.length > 0
            ? `\nTareas requeridas:\n${devolucionTasks.map((t: any, i: number) => `${i + 1}. ${t.title}${t.requiresDoc ? ' (requiere adjunto)' : ''}`).join('\n')}`
            : '';
        const historyDesc = assignedAnalyst
            ? `Estado cambiado a ${stateName}. Motivo: ${comment}. Analista asignado: ${assignedAnalyst.name}${tasksList}`
            : `Estado cambiado a ${stateName}. Motivo: ${comment}${tasksList}`;

        await supabase.from('credit_history').insert({
            credit_id: creditId,
            user_id: user.id,
            action: devolucionTasks && devolucionTasks.length > 0 ? 'DEVOLUCIÓN CON TAREAS' : 'CAMBIO ESTADO',
            description: historyDesc
        });

        await supabase.from('comments').insert({
            credit_id: creditId,
            user_id: user.id,
            text: `Nuevo Estado: ${stateName}.`,
            is_system: true
        });

        // Obtener crédito actualizado - con fallback si analyst join falla
        let credit: any = null;
        const { data: creditFull } = await supabase.from('credits').select('*, gestor_profile:assigned_gestor_id(full_name, phone, email)').eq('id', creditId).single();
        credit = creditFull;
        // Intentar obtener analista por separado
        let analystProfile: any = null;
        if (credit?.assigned_analyst_id) {
            try {
                const { data: ap } = await supabase.from('profiles').select('full_name, phone, email').eq('id', credit.assigned_analyst_id).single();
                analystProfile = ap;
            } catch (e) { /* analyst column may not exist */ }
        }

        const clientName = credit?.client_data?.nombreCompleto || 'Cliente';

        if (credit?.assigned_gestor_id && credit.assigned_gestor_id !== user.id) {
            const isNegative = stateName.includes('DEVUELTO') || stateName.includes('RECHAZADO');
            await supabase.from('notifications').insert({
                user_id: credit.assigned_gestor_id,
                title: 'Cambio de Estado en tu Crédito',
                message: `El crédito de ${clientName} fue actualizado a: ${stateName}. Motivo: ${comment}`,
                type: isNegative ? 'warning' : 'info',
                is_read: false,
                credit_id: creditId
            });
        }

        // Notificar al analista asignado si hay uno y no es quien hizo el cambio
        if (credit?.assigned_analyst_id && credit.assigned_analyst_id !== user.id) {
            try {
                await supabase.from('notifications').insert({
                    user_id: credit.assigned_analyst_id,
                    title: assignedAnalyst ? 'Crédito Asignado' : 'Cambio de Estado en Crédito Asignado',
                    message: assignedAnalyst
                        ? `Se te ha asignado el crédito de ${clientName}. Estado actual: ${stateName}.`
                        : `El crédito de ${clientName} fue actualizado a: ${stateName}. Motivo: ${comment}`,
                    type: 'info',
                    is_read: false,
                    credit_id: creditId
                });
            } catch (e) { console.warn('No se pudo notificar al analista:', e); }
        }

        // --- DISPARAR WEBHOOKS (n8n / Make / WhatsApp) ---
        const clientData = credit?.client_data || {};
        const gestorProfile = credit?.gestor_profile || {};
        ProductionService.triggerWebhooks('credit_status_change', {
            credit_id: creditId,
            solicitud_number: credit?.solicitud_number,
            nuevo_estado: stateName,
            motivo: comment,
            cambio_por: { nombre: user.name, rol: user.role },
            gestor: {
                id: credit?.assigned_gestor_id,
                nombre: gestorProfile.full_name || 'N/A',
                telefono: gestorProfile.phone || '',
                email: gestorProfile.email || ''
            },
            analista: analystProfile ? {
                id: credit?.assigned_analyst_id,
                nombre: analystProfile.full_name || 'N/A',
                telefono: analystProfile.phone || '',
                email: analystProfile.email || ''
            } : null,
            cliente: {
                nombre: clientData.nombreCompleto || '',
                documento: clientData.numeroDocumento || '',
                celular: clientData.telefonoCelular || '',
                correo: clientData.correo || ''
            },
            credito: {
                monto: credit?.amount,
                plazo: credit?.term,
                entidad: credit?.entity_name,
                tasa: credit?.interest_rate
            }
        });
    },

    // Auto-asignar analista con menor carga (round-robin por cantidad de créditos activos)
    autoAssignAnalyst: async (creditId: string): Promise<{ id: string; name: string } | null> => {
        try {
            // Obtener todos los analistas activos
            const { data: analysts } = await supabase
                .from('profiles')
                .select('id, full_name')
                .eq('role', 'ANALISTA')
                .eq('status', 'ACTIVE');

            if (!analysts || analysts.length === 0) return null;

            // Obtener estados no finales para contar solo créditos activos
            const states = await ProductionService.getStates();
            const finalStateIds = states.filter(s => s.isFinal).map(s => s.id);

            // Contar créditos activos asignados a cada analista
            const counts = await Promise.all(analysts.map(async (a) => {
                let query = supabase
                    .from('credits')
                    .select('id', { count: 'exact', head: true })
                    .eq('assigned_analyst_id', a.id);
                if (finalStateIds.length > 0) {
                    query = query.not('status_id', 'in', `(${finalStateIds.join(',')})`);
                }
                const { count } = await query;
                return { ...a, activeCount: count || 0 };
            }));

            // Seleccionar el analista con menor carga
            counts.sort((a, b) => a.activeCount - b.activeCount);
            const selected = counts[0];
            return { id: selected.id, name: selected.full_name };
        } catch (e) {
            console.error('Error en auto-asignación de analista:', e);
            return null;
        }
    },

    // Asignar analista manualmente a un crédito
    assignAnalyst: async (creditId: string, analystId: string, assignedBy: User) => {
        const { data: analyst } = await supabase.from('profiles').select('full_name').eq('id', analystId).single();
        await supabase.from('credits').update({
            assigned_analyst_id: analystId,
            updated_at: new Date().toISOString()
        }).eq('id', creditId);

        await supabase.from('credit_history').insert({
            credit_id: creditId,
            user_id: assignedBy.id,
            action: 'ASIGNACIÓN ANALISTA',
            description: `Analista asignado manualmente: ${analyst?.full_name || 'N/A'}`
        });

        // Notificar al analista
        const { data: credit } = await supabase.from('credits').select('client_data').eq('id', creditId).single();
        const clientName = credit?.client_data?.nombreCompleto || 'Cliente';
        await supabase.from('notifications').insert({
            user_id: analystId,
            title: 'Crédito Asignado',
            message: `Se te ha asignado el crédito de ${clientName} por ${assignedBy.name}.`,
            type: 'info',
            is_read: false,
            credit_id: creditId
        });
    },

    // Obtener lista de analistas activos (para selector manual)
    getAnalysts: async (): Promise<{ id: string; name: string }[]> => {
        const { data } = await supabase
            .from('profiles')
            .select('id, full_name')
            .eq('role', 'ANALISTA')
            .eq('status', 'ACTIVE')
            .order('full_name');
        return (data || []).map((a: any) => ({ id: a.id, name: a.full_name }));
    },

    addComment: async (creditId: string, text: string, user: User, file?: File) => {
        let url = null;
        if (file) url = await ProductionService.uploadImage(file);

        await supabase.from('comments').insert({
            credit_id: creditId,
            user_id: user.id,
            text,
            attachment_name: file?.name,
            attachment_url: url
        });

        // Obtener datos de gestor, analista y cliente para webhooks de este crédito
        let gestorInfo: any = null;
        let analystInfo: any = null;
        let clienteInfo: any = null;
        try {
            const { data: creditInfo } = await supabase.from('credits').select('assigned_gestor_id, assigned_analyst_id, client_data').eq('id', creditId).single();
            if (creditInfo?.assigned_gestor_id) {
                const { data: g } = await supabase.from('profiles').select('full_name, phone, email').eq('id', creditInfo.assigned_gestor_id).single();
                gestorInfo = { id: creditInfo.assigned_gestor_id, nombre: g?.full_name || '', telefono: g?.phone || '', email: g?.email || '' };
            }
            if (creditInfo?.assigned_analyst_id) {
                const { data: a } = await supabase.from('profiles').select('full_name, phone, email').eq('id', creditInfo.assigned_analyst_id).single();
                analystInfo = { id: creditInfo.assigned_analyst_id, nombre: a?.full_name || '', telefono: a?.phone || '', email: a?.email || '' };
            }
            const cd = creditInfo?.client_data || {};
            clienteInfo = { nombre: cd.nombreCompleto || '', documento: cd.numeroDocumento || '', celular: cd.telefonoCelular || '', correo: cd.correo || '' };
        } catch (e) { /* silently continue */ }

        if (url && file) {
            await supabase.from('documents').insert({
                credit_id: creditId,
                name: file.name,
                url: url,
                type: 'ADJUNTO_CHAT'
            });
            ProductionService.triggerWebhooks('document_uploaded', {
                credit_id: creditId,
                documento: { nombre: file.name, url, tipo: 'ADJUNTO_CHAT' },
                subido_por: { id: user.id, nombre: user.name, rol: user.role },
                gestor: gestorInfo,
                analista: analystInfo,
                cliente: clienteInfo
            });
        }

        // Webhook: nuevo comentario
        ProductionService.triggerWebhooks('comment_added', {
            credit_id: creditId,
            comentario: text,
            tiene_adjunto: !!file,
            autor: { id: user.id, nombre: user.name, rol: user.role },
            gestor: gestorInfo,
            analista: analystInfo,
            cliente: clienteInfo
        });
    },

    uploadImage: async (file: File) => {
        const safeName = file.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9._-]/g, '_');
        const fileName = `${Date.now()}_${safeName}`;
        const { error } = await supabase.storage.from('skala-bucket').upload(fileName, file);
        if (error) throw error;
        const { data: { publicUrl } } = supabase.storage.from('skala-bucket').getPublicUrl(fileName);
        return publicUrl;
    },

    getUsers: async () => {
        const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
        return (data || []).map(mapUserFromDB);
    },
    
    createUser: async (userData: Partial<User>) => {
      // 1. Crear usuario en auth de Supabase
      const password = (userData as any).password || 'Skala2026!';
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: userData.email!,
        password: password,
        options: {
          data: {
            full_name: userData.name,
            role: userData.role || 'GESTOR'
          }
        }
      });
      if (authError) throw authError;
      if (!authData.user) throw new Error('No se pudo crear el usuario de autenticación');

      // 2. Actualizar el perfil con los datos completos
      const { data, error } = await supabase.from('profiles').upsert({
        id: authData.user.id,
        full_name: userData.name,
        email: userData.email,
        role: userData.role || 'GESTOR',
        status: userData.status || 'ACTIVE',
        phone: userData.phone,
        cedula: userData.cedula,
        city: userData.city,
        zone_id: userData.zoneId || null,
        permissions: userData.permissions || [],
        bank_details: { banco: userData.banco, tipoCuenta: userData.tipoCuenta, numeroCuenta: userData.numeroCuenta }
      }).select().single();
      if (error) throw error;
      return mapUserFromDB(data);
    },

    getEntities: async () => {
        const { data } = await supabase.from('allied_entities').select('*');
        return data || [];
    },

    getNews: async () => {
        const { data } = await supabase.from('news').select('*').order('created_at', { ascending: false });
        return (data || []).map(n => ({
            ...n,
            imageUrl: n.image_url,
            createdAt: new Date(n.created_at)
        }));
    },

    getNotifications: async (userId: string) => {
        const { data } = await supabase.from('notifications').select('*').eq('user_id', userId).order('created_at', { ascending: false });
        // Mapear snake_case a camelCase
        return (data || []).map(n => ({
            ...n,
            isRead: n.is_read,
            userId: n.user_id,
            creditId: n.credit_id,
            createdAt: new Date(n.created_at)
        }));
    },

    getStats: async (user: User): Promise<DashboardStats> => {
        const [credits, states] = await Promise.all([ProductionService.getCredits(user), ProductionService.getStates()]);
        const finalStates = states.filter(s => s.isFinal).map(s => s.id);
        const disbursedStates = states.filter(s => s.name.includes('DESEMBOLSADO')).map(s => s.id);
        const returnedStates = states.filter(s => s.name.includes('DEVUELTO') || s.name.includes('RECHAZADO')).map(s => s.id);

        const stats: DashboardStats = {
            totalCredits: credits.length,
            disbursedCredits: credits.filter(c => disbursedStates.includes(c.statusId)).length,
            pendingCredits: credits.filter(c => !finalStates.includes(c.statusId)).length,
            returnedCredits: credits.filter(c => returnedStates.includes(c.statusId)).length,
            totalAmountSolicited: credits.reduce((acc, c) => acc + (c.monto || 0), 0),
            totalAmountDisbursed: credits.filter(c => disbursedStates.includes(c.statusId)).reduce((acc, c) => acc + (c.monto || 0), 0),
            totalCommissionEarned: credits.filter(c => disbursedStates.includes(c.statusId)).reduce((acc, c) => acc + (c.estimatedCommission || 0), 0),
            totalCommissionPending: credits.filter(c => disbursedStates.includes(c.statusId) && !c.comisionPagada).reduce((acc, c) => acc + (c.estimatedCommission || 0), 0),
            totalCommissionPaid: credits.filter(c => disbursedStates.includes(c.statusId) && c.comisionPagada).reduce((acc, c) => acc + (c.estimatedCommission || 0), 0),
            byStatus: {}
        };
        credits.forEach(c => {
            const statusName = states.find(s => s.id === c.statusId)?.name || 'Otros';
            stats.byStatus[statusName] = (stats.byStatus[statusName] || 0) + 1;
        });
        return stats;
    },

    getPagadurias: async () => {
        try {
            const { data, error } = await supabase.from('pagadurias').select('name').order('name');
            if (!error && data && data.length > 0) return data.map((p: any) => p.name);
        } catch (e) { /* fallback */ }
        return ["COLPENSIONES", "CREMIL", "CASUR", "FIDUPREVISORA", "GOBIERNO", "PRIVADA"];
    },

    getPagaduriaItems: async (): Promise<{ name: string; tipo: string }[]> => {
        // Mapa estático: palabras clave → tipo. Cubre variaciones de nombre.
        const inferTipo = (name: string): string => {
            const n = name.toUpperCase();
            if (/POLICIA|POLICÍA|EJÉRCITO|EJERCITO|ACTIVO|ACTIVA|FUERZAS MILITARES ACTIV/.test(n))
                return '👮 Fuerza Pública Activa';
            if (/CREMIL|CASUR|CAGEN|TEGEN|MINDEFENSA|PENSIONADO.*MILITAR|RETIRO.*FUERZA|FUERZA.*RETIRO/.test(n))
                return '🪖 Fuerza Pública Pensionados / Retiros';
            if (/COLPENSIONES|FOPEP|FIDUPREVISORA|ESTATAL|GOBERNA|ALCALD|MUNICIPIO|DEPARTAMENTO|UNIVERSIDAD.*PUBLICA|PÚBLICA/.test(n))
                return '🏛️ Entidades Públicas / Estatales';
            if (/POSITIVA|MAPFRE|PORVENIR|BBVA SEGURO|PROTECCIÓN|PROTECCION|ASULADO|SURA|ALFA|COLFONDOS|BOLÍVAR|BOLIVAR|ANDINA|RENTA|ARL|VITALI/.test(n))
                return '🛡️ Aseguradoras – Rentas Vitalicias / ARL';
            return 'Otras';
        };
        try {
            const { data, error } = await supabase.from('pagadurias').select('name, tipo').order('name');
            if (!error && data && data.length > 0) {
                const items = data.map((p: any) => ({
                    name: p.name.toUpperCase().trim(),
                    tipo: p.tipo && p.tipo !== 'Sin clasificar' ? p.tipo : inferTipo(p.name),
                }));
                // Deduplicar por nombre normalizado (elimina duplicados por diferencia de mayúsculas)
                const seen = new Set<string>();
                const deduped = items.filter((item: any) => {
                    if (seen.has(item.name)) return false;
                    seen.add(item.name);
                    return true;
                });
                return deduped.sort((a: any, b: any) => a.tipo.localeCompare(b.tipo) || a.name.localeCompare(b.name));
            }
        } catch (e) { /* fallback */ }
        // Fallback completo con la lista de Credialianza
        return [
            { name: 'POLICÍA NACIONAL', tipo: '👮 Fuerza Pública Activa' },
            { name: 'EJÉRCITO NACIONAL', tipo: '👮 Fuerza Pública Activa' },
            { name: 'PENSIONADO MINDEFENSA', tipo: '🪖 Fuerza Pública Pensionados / Retiros' },
            { name: 'CREMIL', tipo: '🪖 Fuerza Pública Pensionados / Retiros' },
            { name: 'CASUR', tipo: '🪖 Fuerza Pública Pensionados / Retiros' },
            { name: 'CAGEN – TEGEN', tipo: '🪖 Fuerza Pública Pensionados / Retiros' },
            { name: 'COLPENSIONES', tipo: '🏛️ Entidades Públicas / Estatales' },
            { name: 'FOPEP', tipo: '🏛️ Entidades Públicas / Estatales' },
            { name: 'FIDUPREVISORA', tipo: '🏛️ Entidades Públicas / Estatales' },
            { name: 'POSITIVA', tipo: '🛡️ Aseguradoras – Rentas Vitalicias / ARL' },
            { name: 'MAPFRE', tipo: '🛡️ Aseguradoras – Rentas Vitalicias / ARL' },
            { name: 'PORVENIR', tipo: '🛡️ Aseguradoras – Rentas Vitalicias / ARL' },
            { name: 'BBVA SEGUROS', tipo: '🛡️ Aseguradoras – Rentas Vitalicias / ARL' },
            { name: 'PROTECCIÓN', tipo: '🛡️ Aseguradoras – Rentas Vitalicias / ARL' },
            { name: 'RENTAS ASULADO', tipo: '🛡️ Aseguradoras – Rentas Vitalicias / ARL' },
            { name: 'SURA', tipo: '🛡️ Aseguradoras – Rentas Vitalicias / ARL' },
            { name: 'SEGUROS ALFA', tipo: '🛡️ Aseguradoras – Rentas Vitalicias / ARL' },
            { name: 'COLFONDOS', tipo: '🛡️ Aseguradoras – Rentas Vitalicias / ARL' },
            { name: 'SEGUROS BOLÍVAR', tipo: '🛡️ Aseguradoras – Rentas Vitalicias / ARL' },
            { name: 'ANDINA VIDA', tipo: '🛡️ Aseguradoras – Rentas Vitalicias / ARL' },
        ];
    },

    addPagaduriaWithTipo: async (name: string, tipo: string) => {
        const { error } = await supabase.from('pagadurias').insert({ name: name.toUpperCase().trim(), tipo: tipo.trim() });
        if (error) throw error;
    },

    getStateActions: async (stateId?: string): Promise<any[]> => {
        try {
            let q = supabase.from('state_actions').select('*').order('order_index');
            if (stateId) q = (q as any).eq('state_id', stateId);
            const { data, error } = await q;
            if (error) return [];
            return data || [];
        } catch { return []; }
    },

    saveStateAction: async (action: { id?: string; state_id: string; label: string; roles: string[]; order_index?: number; result_action?: string; result_state_id?: string | null }): Promise<void> => {
        const fullPayload: any = {
            state_id: action.state_id,
            label: action.label.trim(),
            roles: action.roles,
            order_index: action.order_index ?? 0,
            result_action: action.result_action ?? 'none',
            result_state_id: action.result_state_id ?? null,
        };
        const basePayload: any = {
            state_id: action.state_id,
            label: action.label.trim(),
            roles: action.roles,
            order_index: action.order_index ?? 0,
        };

        const run = async (payload: any) => {
            if (action.id) {
                const { error } = await supabase.from('state_actions').update(payload).eq('id', action.id);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('state_actions').insert(payload);
                if (error) throw error;
            }
        };

        try {
            await run(fullPayload);
        } catch {
            // Fallback: columnas result_action/result_state_id aún no existen en BD
            await run(basePayload);
        }
    },

    deleteStateAction: async (id: string): Promise<void> => {
        await supabase.from('state_actions').delete().eq('id', id);
    },

    logStateAction: async (creditId: string, label: string, user: any): Promise<void> => {
        await supabase.from('credit_history').insert({
            credit_id: creditId,
            user_id: user.id,
            action: 'ACCIÓN',
            description: `✓ ${label} — confirmado por ${user.name}`,
        });

        // Disparar webhook de automatización
        try {
            const { data: credit } = await supabase
                .from('credits')
                .select('*, gestor_profile:assigned_gestor_id(full_name, phone, email)')
                .eq('id', creditId)
                .single();

            let analystProfile: any = null;
            if (credit?.assigned_analyst_id) {
                const { data: ap } = await supabase
                    .from('profiles')
                    .select('full_name, phone, email')
                    .eq('id', credit.assigned_analyst_id)
                    .single();
                analystProfile = ap;
            }

            const clientData = credit?.client_data || {};
            const gestorProfile = credit?.gestor_profile || {};

            ProductionService.triggerWebhooks('state_action_executed', {
                credit_id: creditId,
                solicitud_number: credit?.solicitud_number,
                accion: label,
                ejecutado_por: { nombre: user.name, rol: user.role },
                gestor: {
                    id: credit?.assigned_gestor_id,
                    nombre: gestorProfile.full_name || 'N/A',
                    telefono: gestorProfile.phone || '',
                    email: gestorProfile.email || '',
                },
                analista: analystProfile ? {
                    id: credit?.assigned_analyst_id,
                    nombre: analystProfile.full_name || 'N/A',
                    telefono: analystProfile.phone || '',
                    email: analystProfile.email || '',
                } : null,
                cliente: {
                    nombre: clientData.nombreCompleto || '',
                    documento: clientData.numeroDocumento || '',
                    celular: clientData.telefonoCelular || '',
                    correo: clientData.correo || '',
                },
                credito: {
                    monto: credit?.amount,
                    plazo: credit?.term,
                    entidad: credit?.entity_name,
                    tasa: credit?.interest_rate,
                },
            });
        } catch (e) {
            console.warn('No se pudo disparar webhook de acción rápida:', e);
        }
    },

    getBilleteraEnabled: async (): Promise<boolean> => {
        try {
            const { data } = await supabase.from('system_config').select('value').eq('key', 'billetera_enabled').single();
            if (data?.value === 'false') return false;
        } catch { /* sin registro = habilitado por defecto */ }
        return true;
    },

    setBilleteraEnabled: async (enabled: boolean): Promise<void> => {
        await supabase.from('system_config').upsert(
            { key: 'billetera_enabled', value: enabled ? 'true' : 'false' },
            { onConflict: 'key' }
        );
    },

    getPensionTypes: async (): Promise<string[]> => {
        try {
            const { data, error } = await supabase.from('pension_types').select('name').order('id');
            if (!error && data && data.length > 0) return data.map((t: any) => t.name);
        } catch (e) { /* fallback */ }
        return ['VEJEZ', 'SUSTITUCIÓN', 'INVALIDEZ', 'ACTIVO'];
    },
    getZones: async () => { const { data } = await supabase.from('zones').select('*'); return data || []; },
    updateUserProfile: async (id: string, d: any) => {
        const updateData: any = {
            full_name: d.name,
            phone: d.phone,
            cedula: d.cedula,
            city: d.city,
            bank_details: { banco: d.banco, tipoCuenta: d.tipoCuenta, numeroCuenta: d.numeroCuenta }
        };
        if (d.role) updateData.role = d.role;
        if (d.email) updateData.email = d.email;
        if (d.status) updateData.status = d.status;
        if (d.zoneId !== undefined) updateData.zone_id = d.zoneId || null;
        if (d.permissions !== undefined) updateData.permissions = d.permissions || [];
        const { error } = await supabase.from('profiles').update(updateData).eq('id', id);
        if (error) throw error;

        // Cambiar contraseña via Admin API si se proporcionó una nueva
        if (d.password && d.password.trim()) {
            if (supabaseAdmin) {
                const { error: pwError } = await supabaseAdmin.auth.admin.updateUserById(id, { password: d.password.trim() });
                if (pwError) throw new Error(`Perfil actualizado, pero error al cambiar contraseña: ${pwError.message}`);
            } else {
                throw new Error('Para cambiar contraseñas configure VITE_SUPABASE_SERVICE_KEY en las variables de entorno.');
            }
        }

        ProductionService.triggerWebhooks('user_updated', {
            usuario: { id, nombre: d.name, email: d.email, telefono: d.phone || '', rol: d.role || '', ciudad: d.city || '' }
        });
        return { ...d, id };
    },
    approveUser: async (id: string) => {
        const { data: profile } = await supabase.from('profiles').select('full_name, email, phone, role').eq('id', id).single();
        await supabase.from('profiles').update({ status: 'ACTIVE' }).eq('id', id);
        ProductionService.triggerWebhooks('user_approved', {
            usuario: { id, nombre: profile?.full_name || '', email: profile?.email || '', telefono: profile?.phone || '', rol: profile?.role || '' }
        });
    },
    rejectUser: async (id: string) => {
        const { data: profile } = await supabase.from('profiles').select('full_name, email, phone, role').eq('id', id).single();
        await supabase.from('profiles').update({ status: 'REJECTED' }).eq('id', id);
        ProductionService.triggerWebhooks('user_rejected', {
            usuario: { id, nombre: profile?.full_name || '', email: profile?.email || '', telefono: profile?.phone || '', rol: profile?.role || '' }
        });
    },
    deleteUser: async (id: string) => {
        const { data: profile } = await supabase.from('profiles').select('full_name, email, phone, role').eq('id', id).single();
        // Desvincular créditos del usuario (no se borran, quedan sin gestor/analista)
        await supabase.from('credits').update({ assigned_gestor_id: null }).eq('assigned_gestor_id', id);
        try { await supabase.from('credits').update({ assigned_analyst_id: null }).eq('assigned_analyst_id', id); } catch (e) { /* columna puede no existir */ }
        // Eliminar notificaciones del usuario
        await supabase.from('notifications').delete().eq('user_id', id);
        // Eliminar el perfil
        const { error } = await supabase.from('profiles').delete().eq('id', id);
        if (error) throw error;
        // Eliminar usuario de auth.users via función SQL (requiere la migración delete_auth_user)
        try {
            await supabase.rpc('delete_auth_user', { user_id: id });
        } catch (e) {
            console.warn('No se pudo eliminar auth user (puede requerir migración):', e);
        }
        ProductionService.triggerWebhooks('user_deleted', {
            usuario: { id, nombre: profile?.full_name || '', email: profile?.email || '', telefono: profile?.phone || '', rol: profile?.role || '' }
        });
    },
    deleteCredit: async (id: string, deletedBy?: User) => {
        // Obtener datos antes de eliminar para el webhook
        const { data: credit } = await supabase.from('credits').select('solicitud_number, client_data, amount, assigned_gestor_id, assigned_analyst_id').eq('id', id).single();
        let gestorW: any = null, analistaW: any = null;
        if (credit?.assigned_gestor_id) {
            const { data: g } = await supabase.from('profiles').select('full_name, phone, email').eq('id', credit.assigned_gestor_id).single();
            gestorW = { id: credit.assigned_gestor_id, nombre: g?.full_name || '', telefono: g?.phone || '', email: g?.email || '' };
        }
        if (credit?.assigned_analyst_id) {
            const { data: a } = await supabase.from('profiles').select('full_name, phone, email').eq('id', credit.assigned_analyst_id).single();
            analistaW = { id: credit.assigned_analyst_id, nombre: a?.full_name || '', telefono: a?.phone || '', email: a?.email || '' };
        }
        const cd = credit?.client_data || {};
        await supabase.from('credits').delete().eq('id', id);
        ProductionService.triggerWebhooks('credit_deleted', {
            credit_id: id,
            solicitud_number: credit?.solicitud_number,
            gestor: gestorW,
            analista: analistaW,
            cliente: {
                nombre: cd.nombreCompleto || '',
                documento: cd.numeroDocumento || '',
                celular: cd.telefonoCelular || '',
                correo: cd.correo || ''
            },
            monto: credit?.amount,
            eliminado_por: deletedBy ? { id: deletedBy.id, nombre: deletedBy.name, rol: deletedBy.role } : null
        });
    },
    markNotificationAsRead: async (id: string) => {
        await supabase.from('notifications').delete().eq('id', id);
        window.dispatchEvent(new CustomEvent('notifications-updated'));
    },
    markAllNotificationsAsRead: async (uid: string) => {
        await supabase.from('notifications').delete().eq('user_id', uid);
        window.dispatchEvent(new CustomEvent('notifications-updated'));
    },
    getCreditLines: async (): Promise<string[]> => {
        const { data } = await supabase.from('credit_lines').select('name').eq('is_active', true).order('sort_order');
        if (data && data.length > 0) return data.map((r: any) => r.name);
        return ['LIBRE INVERSION', 'COMPRA DE CARTERA', 'RETANQUEO', 'LIBRE + SANEAMIENTO', 'COMPRA + SANEAMIENTO'];
    },

    notifyAdminsNewGestor: async (gestorId: string, gestorName: string) => {
        try {
            const { data: admins } = await supabase
                .from('profiles')
                .select('id')
                .eq('role', 'ADMIN')
                .eq('status', 'ACTIVE');

            if (!admins || admins.length === 0) {
                console.warn('No hay admins activos para notificar');
                return;
            }

            const notifications = admins.map(admin => ({
                user_id: admin.id,
                title: 'Nueva Solicitud de Gestor',
                message: `${gestorName} ha solicitado acceso como Gestor Aliado. Revisa y aprueba su solicitud.`,
                type: 'info',
                is_read: false,
                credit_id: null
            }));

            await supabase.from('notifications').insert(notifications);
            console.log(`✅ Notificaciones enviadas a ${admins.length} admins`);
        } catch (error) {
            console.error('Error al enviar notificaciones:', error);
        }
    },

    getStates: async (): Promise<CreditState[]> => {
        try {
            const { data, error } = await supabase.from('credit_states_config').select('*').order('order_index');
            if (!error && data && data.length > 0) {
                return data.map((s: any) => ({
                    id: s.id,
                    name: s.name,
                    color: s.color || 'bg-gray-500',
                    order: s.order_index,
                    roleResponsible: s.role_responsible as UserRole,
                    isFinal: s.is_final || false
                }));
            }
        } catch (e) { /* fallback */ }
        return [...INITIAL_STATES];
    },
    getRoleDefaults: async (role: string) => {
        try {
            const { data } = await supabase.from('roles').select('default_permissions').eq('name', role).single();
            if (data?.default_permissions) return data.default_permissions;
        } catch (e) { /* fallback */ }
        return ROLE_DEFAULT_PERMISSIONS[role as UserRole] || [];
    },
    getCities: async () => {
        try {
            const { data, error } = await supabase.from('cities').select('name').order('name');
            if (!error && data && data.length > 0) return data.map((c: any) => c.name);
        } catch (e) { /* fallback */ }
        return [...COLOMBIAN_CITIES];
    },
    getBanks: async () => {
        try {
            const { data, error } = await supabase.from('banks').select('name').order('name');
            if (!error && data && data.length > 0) return data.map((b: any) => b.name);
        } catch (e) { /* fallback */ }
        return [...COLOMBIAN_BANKS];
    },
    addCity: async (name: string) => {
        const { error } = await supabase.from('cities').insert({ name: name.toUpperCase().trim() });
        if (error) throw error;
    },
    deleteCity: async (name: string) => {
        const { error } = await supabase.from('cities').delete().eq('name', name);
        if (error) throw error;
    },
    addBank: async (name: string) => {
        const { error } = await supabase.from('banks').insert({ name: name.toUpperCase().trim() });
        if (error) throw error;
    },
    deleteBank: async (name: string) => {
        const { error } = await supabase.from('banks').delete().eq('name', name);
        if (error) throw error;
    },
    addPagaduria: async (name: string) => {
        const { error } = await supabase.from('pagadurias').insert({ name: name.toUpperCase().trim() });
        if (error) throw error;
    },
    deletePagaduria: async (name: string) => {
        const { error } = await supabase.from('pagadurias').delete().eq('name', name);
        if (error) throw error;
    },
    getN8nConfig: async () => {
        try {
            const { data: rules } = await supabase.from('automation_rules').select('*').order('created_at');
            const { data: configRow } = await supabase.from('system_config').select('value').eq('key', 'n8n_api_key').single();
            return {
                apiKey: configRow?.value || '',
                automations: (rules || []).map((a: any) => {
                    // Backward compat: event_type puede ser string simple o JSON array
                    let eventTypes: string[] = ['all'];
                    try {
                        const parsed = JSON.parse(a.event_type);
                        if (Array.isArray(parsed)) eventTypes = parsed;
                        else eventTypes = [parsed];
                    } catch {
                        eventTypes = a.event_type ? [a.event_type] : ['all'];
                    }
                    let recipients: string[] = [];
                    try {
                        const parsedR = typeof a.recipients === 'string' ? JSON.parse(a.recipients) : a.recipients;
                        if (Array.isArray(parsedR)) recipients = parsedR;
                    } catch { recipients = []; }
                    let statusFilter: string[] = [];
                    try {
                        const parsedS = typeof a.status_filter === 'string' ? JSON.parse(a.status_filter) : a.status_filter;
                        if (Array.isArray(parsedS)) statusFilter = parsedS;
                    } catch { statusFilter = []; }
                    return {
                        id: a.id,
                        name: a.name,
                        description: a.description || '',
                        webhookUrl: a.webhook_url,
                        active: a.active,
                        eventTypes,
                        automationType: a.automation_type || 'webhook',
                        recipients,
                        statusFilter
                    };
                })
            };
        } catch (e) {
            return { apiKey: '', automations: [] };
        }
    },
    updateN8nConfig: async (config: any) => {
        // Guardar API key
        const { error: configErr } = await supabase.from('system_config').upsert(
            { key: 'n8n_api_key', value: config.apiKey || '' },
            { onConflict: 'key' }
        );
        if (configErr) console.warn('Error guardando API key:', configErr.message);

        // Eliminar reglas existentes
        const { data: existing, error: fetchErr } = await supabase.from('automation_rules').select('id');
        if (fetchErr) {
            console.error('Error obteniendo reglas existentes:', fetchErr.message);
            throw new Error('No se pudieron obtener las reglas existentes: ' + fetchErr.message);
        }
        if (existing && existing.length > 0) {
            const { error: delErr } = await supabase.from('automation_rules').delete().in('id', existing.map((r: any) => r.id));
            if (delErr) {
                console.error('Error eliminando reglas:', delErr.message);
                throw new Error('No se pudieron eliminar las reglas anteriores: ' + delErr.message);
            }
        }

        // Insertar nuevas reglas
        if (config.automations && config.automations.length > 0) {
            const rows = config.automations.map((a: any) => ({
                name: a.name,
                description: a.description || '',
                webhook_url: a.webhookUrl,
                active: a.active !== false,
                event_type: JSON.stringify(a.eventTypes || ['all']),
                automation_type: a.automationType || 'webhook',
                recipients: JSON.stringify(a.recipients || []),
                status_filter: JSON.stringify(a.statusFilter || [])
            }));
            let { error: insertErr } = await supabase.from('automation_rules').insert(rows);
            if (insertErr) {
                // Fallback: columnas nuevas pueden no existir aún
                console.warn('Error insertando con campos nuevos, intentando fallback:', insertErr.message);
                const rowsBasic = config.automations.map((a: any) => ({
                    name: a.name,
                    description: a.description || '',
                    webhook_url: a.webhookUrl,
                    active: a.active !== false,
                    event_type: JSON.stringify(a.eventTypes || ['all'])
                }));
                const { error: retryErr } = await supabase.from('automation_rules').insert(rowsBasic);
                if (retryErr) {
                    console.error('Error insertando reglas (fallback):', retryErr.message);
                    throw new Error('No se pudieron guardar las reglas: ' + retryErr.message);
                }
            }
        }
    },
    testAutomation: async (webhookUrl: string) => {
        try {
            const response = await fetch(webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    event: 'test_ping',
                    timestamp: new Date().toISOString(),
                    source: 'skala_platform',
                    message: 'Prueba de conexión desde Skala Fintech'
                })
            });
            return response.ok;
        } catch (err) {
            console.error('Error testing webhook:', err);
            return false;
        }
    },
    // --- DISPARADOR DE WEBHOOKS ---
    resolveDestinatarios: async (recipients: string[], payload: any) => {
        const destinatarios: any[] = [];
        const roles = Array.isArray(recipients) ? recipients : [];

        // Resolver GESTOR
        if (roles.includes('GESTOR') && payload.gestor) {
            destinatarios.push({ nombre: payload.gestor.nombre || '', telefono: payload.gestor.telefono || '', email: payload.gestor.email || '', rol: 'GESTOR' });
        }

        // Resolver ANALISTA
        if (roles.includes('ANALISTA') && payload.analista) {
            destinatarios.push({ nombre: payload.analista.nombre || '', telefono: payload.analista.telefono || '', email: payload.analista.email || '', rol: 'ANALISTA' });
        }

        // Resolver CLIENTE
        if (roles.includes('CLIENTE') && payload.cliente) {
            destinatarios.push({ nombre: payload.cliente.nombre || '', telefono: payload.cliente.celular || payload.cliente.telefono || '', email: payload.cliente.correo || payload.cliente.email || '', rol: 'CLIENTE' });
        }

        // Resolver ADMIN - obtener todos los admins activos
        if (roles.includes('ADMIN')) {
            try {
                const { data: admins } = await supabase.from('profiles').select('full_name, phone, email').eq('role', 'ADMIN').eq('status', 'ACTIVE');
                (admins || []).forEach((a: any) => {
                    destinatarios.push({ nombre: a.full_name || '', telefono: a.phone || '', email: a.email || '', rol: 'ADMIN' });
                });
            } catch (e) { /* silently skip */ }
        }

        // Resolver SUPERVISOR_ASIGNADO
        if (roles.includes('SUPERVISOR_ASIGNADO')) {
            try {
                const { data: coords } = await supabase.from('profiles').select('full_name, phone, email').eq('role', 'SUPERVISOR_ASIGNADO').eq('status', 'ACTIVE');
                (coords || []).forEach((c: any) => {
                    destinatarios.push({ nombre: c.full_name || '', telefono: c.phone || '', email: c.email || '', rol: 'SUPERVISOR_ASIGNADO' });
                });
            } catch (e) { /* silently skip */ }
        }

        // Resolver TESORERIA
        if (roles.includes('TESORERIA')) {
            try {
                const { data: tesoreros } = await supabase.from('profiles').select('full_name, phone, email').eq('role', 'TESORERIA').eq('status', 'ACTIVE');
                (tesoreros || []).forEach((t: any) => {
                    destinatarios.push({ nombre: t.full_name || '', telefono: t.phone || '', email: t.email || '', rol: 'TESORERIA' });
                });
            } catch (e) { /* silently skip */ }
        }

        // Para eventos de usuario (user_approved, user_rejected, etc.), el destinatario es el propio usuario
        if (payload.usuario && (roles.includes('GESTOR') || roles.includes('ANALISTA'))) {
            const exists = destinatarios.some(d => d.telefono === (payload.usuario.telefono || ''));
            if (!exists && payload.usuario.telefono) {
                destinatarios.push({ nombre: payload.usuario.nombre || '', telefono: payload.usuario.telefono || '', email: payload.usuario.email || '', rol: payload.usuario.rol || 'GESTOR' });
            }
        }

        return destinatarios;
    },

    triggerWebhooks: async (eventType: string, payload: any) => {
        try {
            let { data: rules, error } = await supabase
                .from('automation_rules')
                .select('webhook_url, event_type, automation_type, recipients, status_filter')
                .eq('active', true) as { data: any[] | null; error: any };

            // Fallback: si columnas nuevas no existen
            if (error) {
                const fallback = await supabase
                    .from('automation_rules')
                    .select('webhook_url, event_type')
                    .eq('active', true);
                rules = fallback.data as any[];
                if (!rules) {
                    const fallback2 = await supabase.from('automation_rules').select('webhook_url').eq('active', true);
                    rules = fallback2.data as any[];
                }
            }

            if (!rules || rules.length === 0) return;

            const matching = rules.filter((r: any) => {
                // Filtro por tipo de evento
                if (!r.event_type) return true;
                let types: string[] = [];
                try {
                    const parsed = JSON.parse(r.event_type);
                    types = Array.isArray(parsed) ? parsed : [parsed];
                } catch {
                    types = r.event_type ? [r.event_type] : [];
                }
                if (!types.includes('all') && !types.includes(eventType)) return false;

                // Filtro por estado: si la regla tiene status_filter y el evento es credit_status_change
                if (eventType === 'credit_status_change' && r.status_filter) {
                    let statusFilters: string[] = [];
                    try {
                        const parsed = typeof r.status_filter === 'string' ? JSON.parse(r.status_filter) : r.status_filter;
                        if (Array.isArray(parsed)) statusFilters = parsed;
                    } catch { /* no filter */ }
                    // Si hay filtros configurados, solo disparar si el nuevo_estado coincide
                    if (statusFilters.length > 0 && payload.nuevo_estado) {
                        const matches = statusFilters.some((sf: string) =>
                            payload.nuevo_estado.toUpperCase().includes(sf.toUpperCase()) || sf.toUpperCase().includes(payload.nuevo_estado.toUpperCase())
                        );
                        if (!matches) return false;
                    }
                }

                return true;
            });

            // Disparar todos en paralelo, resolviendo destinatarios por regla
            await Promise.allSettled(matching.map(async (r: any) => {
                let recipients: string[] = [];
                try {
                    const parsed = typeof r.recipients === 'string' ? JSON.parse(r.recipients) : r.recipients;
                    if (Array.isArray(parsed)) recipients = parsed;
                } catch { /* no recipients */ }

                const destinatarios = recipients.length > 0
                    ? await ProductionService.resolveDestinatarios(recipients, payload)
                    : [];

                return fetch(r.webhook_url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        event: eventType,
                        timestamp: new Date().toISOString(),
                        source: 'skala_platform',
                        automation_type: r.automation_type || 'webhook',
                        destinatarios,
                        ...payload
                    })
                }).catch(err => console.error(`Webhook error (${r.webhook_url}):`, err));
            }));
        } catch (e) {
            console.error('Error disparando webhooks:', e);
        }
    },
    addState: async (name: string, role: UserRole) => {
        const { data: existing } = await supabase.from('credit_states_config').select('order_index').order('order_index', { ascending: false }).limit(1);
        const nextOrder = (existing?.[0]?.order_index || 0) + 1;
        await supabase.from('credit_states_config').insert({ name, role_responsible: role, color: 'bg-gray-500', order_index: nextOrder, is_final: false });
    },
    updateState: async (id: string, updates: { name?: string; color?: string; role_responsible?: string; is_final?: boolean }) => {
        const { error } = await supabase.from('credit_states_config').update(updates).eq('id', id);
        if (error) throw error;
    },
    deleteState: async (id: string) => { await supabase.from('credit_states_config').delete().eq('id', id); },
    reorderState: async (id: string, direction: string) => {
        const states = await ProductionService.getStates();
        const idx = states.findIndex(s => s.id === id);
        if (idx < 0) return;
        const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
        if (swapIdx < 0 || swapIdx >= states.length) return;
        await supabase.from('credit_states_config').update({ order_index: states[swapIdx].order }).eq('id', states[idx].id);
        await supabase.from('credit_states_config').update({ order_index: states[idx].order }).eq('id', states[swapIdx].id);
    },
    addEntity: async (e: any) => { await supabase.from('allied_entities').insert({ name: e.name, rates: e.rates }); },
    deleteEntity: async (id: string) => { await supabase.from('allied_entities').delete().eq('id', id); },
    addZone: async (n: string) => { await supabase.from('zones').insert({ name: n, cities: [] }); },
    deleteZone: async (id: string) => { await supabase.from('zones').delete().eq('id', id); },
    updateZoneCities: async (id: string, c: string[]) => { await supabase.from('zones').update({ cities: c }).eq('id', id); },
    renameZone: async (id: string, name: string) => { await supabase.from('zones').update({ name: name.trim() }).eq('id', id); },
    // --- ROLES CRUD ---
    getRoles: async () => {
        try {
            const { data, error } = await supabase.from('roles').select('*').order('display_order');
            if (!error && data && data.length > 0) {
                return data.map((r: any) => ({
                    id: r.id,
                    name: r.name,
                    displayName: r.display_name || r.name,
                    permissions: r.default_permissions || [],
                    isSystem: r.is_system || false
                }));
            }
        } catch (e) { /* fallback */ }
        // Fallback: construir desde el enum hardcodeado
        return Object.values(UserRole).map(r => ({
            id: r,
            name: r,
            displayName: r.replace(/_/g, ' '),
            permissions: ROLE_DEFAULT_PERMISSIONS[r] || [],
            isSystem: true
        }));
    },
    addRole: async (name: string, displayName: string, permissions: string[]) => {
        const { data: existing } = await supabase.from('roles').select('display_order').order('display_order', { ascending: false }).limit(1);
        const nextOrder = (existing?.[0]?.display_order || 0) + 1;
        const { error } = await supabase.from('roles').insert({
            name: name.toUpperCase().replace(/\s+/g, '_'),
            display_name: displayName,
            default_permissions: permissions,
            is_system: false,
            display_order: nextOrder
        });
        if (error) throw error;
    },
    updateRole: async (id: string, updates: { display_name?: string; default_permissions?: string[] }) => {
        const { error } = await supabase.from('roles').update(updates).eq('id', id);
        if (error) throw error;
    },
    deleteRole: async (id: string) => {
        // No permitir eliminar roles del sistema
        const { data: role } = await supabase.from('roles').select('is_system').eq('id', id).single();
        if (role?.is_system) throw new Error('No se puede eliminar un rol del sistema.');
        const { error } = await supabase.from('roles').delete().eq('id', id);
        if (error) throw error;
    },

    addNews: async (n: any) => { await supabase.from('news').insert({ title: n.title, description: n.description, image_url: n.imageUrl }); },
    deleteNews: async (id: string) => { await supabase.from('news').delete().eq('id', id); },

    exportCSV: async (currentUser: User, filters: ReportFilters, selectedColumns: string[]) => {
        const [credits, states, zones] = await Promise.all([
            ProductionService.getCredits(currentUser),
            ProductionService.getStates(),
            ProductionService.getZones().catch(() => [])
        ]);

        // Obtener zona de cada gestor
        let gestorZoneMap: Record<string, string> = {};
        if (selectedColumns.includes('zona')) {
            const gestorIds = [...new Set(credits.map(c => c.assignedGestorId).filter(Boolean))];
            if (gestorIds.length > 0) {
                const { data: gestorProfiles } = await supabase.from('profiles').select('id, zone_id').in('id', gestorIds);
                if (gestorProfiles) {
                    for (const gp of gestorProfiles) {
                        if (gp.zone_id) {
                            const zone = zones.find((z: any) => z.id === gp.zone_id);
                            gestorZoneMap[gp.id] = zone?.name || '';
                        }
                    }
                }
            }
        }

        let filtered = credits;

        if (filters.startDate) filtered = filtered.filter(c => new Date(c.createdAt) >= new Date(filters.startDate));
        if (filters.endDate) filtered = filtered.filter(c => new Date(c.createdAt) <= new Date(filters.endDate + 'T23:59:59'));
        if (filters.statusId) filtered = filtered.filter(c => c.statusId === filters.statusId);
        if (filters.entity) filtered = filtered.filter(c => c.entidadAliada === filters.entity);
        if ((filters as any).comisionPagada === 'pagada') filtered = filtered.filter(c => c.comisionPagada === true);
        if ((filters as any).comisionPagada === 'pendiente') filtered = filtered.filter(c => !c.comisionPagada);

        const columnMap: Record<string, (c: any) => string> = {
            'fecha_creacion': c => new Date(c.createdAt).toLocaleDateString(),
            'gestor_nombre': c => c.gestorName || '',
            'gestor_id': c => c.assignedGestorId || '',
            'gestor_telefono': c => c.gestorPhone || '',
            'cliente_nombre': c => c.nombreCompleto || '',
            'cliente_documento': c => c.numeroDocumento || '',
            'cliente_celular': c => c.telefonoCelular || '',
            'monto': c => String(c.monto || 0),
            'plazo': c => String(c.plazo || 0),
            'entidad': c => c.entidadAliada || '',
            'tasa': c => String(c.tasa || 0),
            'estado': c => states.find(s => s.id === c.statusId)?.name || '',
            'banco_cliente': c => c.banco || '',
            'tipo_cuenta': c => c.tipoCuenta || '',
            'numero_cuenta': c => c.numeroCuenta || '',
            'comision_estimada': c => String(c.estimatedCommission || 0),
            'comision_pagada': c => c.comisionPagada ? 'Sí' : 'No',
            'fecha_pago_comision': c => c.fechaPagoComision ? new Date(c.fechaPagoComision).toLocaleDateString('es-CO') : '',
            'linea_credito': c => c.lineaCredito || '',
            'correo_cliente': c => c.correo || '',
            'direccion_cliente': c => c.direccionCompleta || '',
            'ciudad_residencia': c => c.ciudadResidencia || '',
            'barrio': c => c.barrio || '',
            'estado_civil': c => c.estadoCivil || '',
            'pagaduria': c => c.pagaduria || '',
            'clave_pagaduria': c => c.clavePagaduria || '',
            'tipo_documento': c => c.tipoDocumento || '',
            'fecha_nacimiento': c => c.fechaNacimiento || '',
            'sexo': c => c.sexo || '',
            'gastos_mensuales': c => String(c.gastosMensuales || 0),
            'activos': c => String(c.activos || 0),
            'pasivos': c => String(c.pasivos || 0),
            'patrimonio': c => String(c.patrimonio || 0),
            'monto_desembolso': c => String(c.montoDesembolso || 0),
            'comision_porcentaje': c => String(c.commissionPercentage || 0),
            'tipo_desembolso': c => c.tipoDesembolso || '',
            'ref1_nombre': c => c.ref1Nombre || '',
            'ref1_telefono': c => c.ref1Telefono || '',
            'ref2_nombre': c => c.ref2Nombre || '',
            'ref2_telefono': c => c.ref2Telefono || '',
            'solicitud_numero': c => String(c.solicitudNumber || ''),
            'fecha_actualizacion': c => c.updatedAt ? new Date(c.updatedAt).toLocaleDateString() : '',
            'zona': c => gestorZoneMap[c.assignedGestorId] || 'Sin zona',
        };

        const headers = selectedColumns.map(c => c.replace(/_/g, ' ').toUpperCase());
        const rows = filtered.map(credit =>
            selectedColumns.map(col => {
                const fn = columnMap[col];
                const val = fn ? fn(credit) : '';
                return `"${val.replace(/"/g, '""')}"`;
            }).join(',')
        );

        // BOM UTF-8 para que Excel interprete bien caracteres especiales (ñ, á, etc.)
        return '\uFEFF' + [headers.join(','), ...rows].join('\n');
    },

    // ─── BILLETERA / COMISIONES ─────────────────────────────────────────────────

    markCommissionPaid: async (creditId: string, paid: boolean, processedBy: string) => {
        const { error } = await supabase.from('credits').update({
            comision_pagada: paid,
            fecha_pago_comision: paid ? new Date().toISOString() : null,
        }).eq('id', creditId);
        if (error) throw error;
        await supabase.from('credit_history').insert({
            credit_id: creditId,
            user_id: processedBy,
            action: paid ? 'COMISIÓN MARCADA COMO PAGADA' : 'COMISIÓN REVERTIDA A PENDIENTE',
            description: paid ? 'La comisión de este crédito fue marcada como pagada.' : 'La comisión fue revertida a pendiente de pago.',
        });
    },

    getWithdrawalRequests: async (user: User): Promise<WithdrawalRequest[]> => {
        let query = supabase.from('withdrawal_requests')
            .select('*, gestor:gestor_id(full_name, phone)')
            .order('created_at', { ascending: false });

        const canViewAll = ProductionService.hasPermission(user, 'MANAGE_WITHDRAWALS');
        if (!canViewAll) {
            query = query.eq('gestor_id', user.id);
        }

        const { data, error } = await query;
        if (error) throw error;
        return (data || []).map((r: any) => ({
            id: r.id,
            gestorId: r.gestor_id,
            gestorName: r.gestor?.full_name || 'Sin nombre',
            gestorPhone: r.gestor?.phone || '',
            estado: r.estado,
            montoTotal: Number(r.monto_total || 0),
            creditIds: Array.isArray(r.credit_ids) ? r.credit_ids : (JSON.parse(r.credit_ids || '[]')),
            createdAt: new Date(r.created_at),
            processedAt: r.processed_at ? new Date(r.processed_at) : undefined,
            processedBy: r.processed_by || undefined,
            notas: r.notas || undefined,
        }));
    },

    createWithdrawalRequest: async (gestorId: string, creditIds: string[], montoTotal: number, currentUser: User) => {
        // TODO: re-activar límite de 1 retiro por día en producción
        // const today = new Date();
        // today.setHours(0, 0, 0, 0);
        // const { data: existing } = await supabase
        //     .from('withdrawal_requests')
        //     .select('id')
        //     .eq('gestor_id', gestorId)
        //     .gte('created_at', today.toISOString());
        // if (existing && existing.length > 0) {
        //     throw new Error('Ya realizaste una solicitud de retiro hoy. Solo se permite una solicitud por día. Disponible mañana.');
        // }

        const { data, error } = await supabase.from('withdrawal_requests').insert({
            gestor_id: gestorId,
            estado: 'PENDIENTE',
            monto_total: montoTotal,
            credit_ids: creditIds,
        }).select().single();
        if (error) throw error;

        // Notificar a admins y tesorería
        const { data: recipients } = await supabase
            .from('profiles')
            .select('id')
            .in('role', ['ADMIN', 'TESORERIA'])
            .eq('status', 'ACTIVE');

        if (recipients && recipients.length > 0) {
            await supabase.from('notifications').insert(
                recipients.map((r: any) => ({
                    user_id: r.id,
                    title: 'Nueva Solicitud de Retiro',
                    message: `${currentUser.name} solicitó un retiro de $${montoTotal.toLocaleString('es-CO')} (${creditIds.length} crédito${creditIds.length > 1 ? 's' : ''}).`,
                    type: 'info',
                    is_read: false,
                    credit_id: null,
                }))
            );
        }

        // Webhook
        ProductionService.triggerWebhooks('withdrawal_requested', {
            request_id: data.id,
            gestor: { id: gestorId, nombre: currentUser.name, email: currentUser.email, telefono: currentUser.phone || '' },
            monto_total: montoTotal,
            creditos: creditIds.length,
        });

        return data;
    },

    processWithdrawalRequest: async (requestId: string, estado: 'PROCESADO' | 'RECHAZADO', processedBy: string, notas?: string) => {
        const { data: req, error: fetchErr } = await supabase
            .from('withdrawal_requests')
            .select('credit_ids, gestor_id, monto_total')
            .eq('id', requestId)
            .single();
        if (fetchErr) throw fetchErr;

        const { error } = await supabase.from('withdrawal_requests').update({
            estado,
            processed_at: new Date().toISOString(),
            processed_by: processedBy,
            notas: notas || null,
        }).eq('id', requestId);
        if (error) throw error;

        // Si se procesa: marcar comisiones como pagadas en todos los créditos incluidos
        if (estado === 'PROCESADO') {
            const creditIds: string[] = Array.isArray(req.credit_ids)
                ? req.credit_ids
                : JSON.parse(req.credit_ids || '[]');
            for (const creditId of creditIds) {
                await ProductionService.markCommissionPaid(creditId, true, processedBy);
            }
        }

        // Notificar al gestor
        const estadoLabel = estado === 'PROCESADO' ? 'procesada' : 'rechazada';
        const notifType = estado === 'PROCESADO' ? 'success' : 'warning';
        await supabase.from('notifications').insert({
            user_id: req.gestor_id,
            title: `Retiro ${estadoLabel}`,
            message: estado === 'PROCESADO'
                ? `Tu solicitud de retiro por $${Number(req.monto_total).toLocaleString('es-CO')} fue procesada. El pago está en camino.`
                : `Tu solicitud de retiro fue rechazada.${notas ? ` Motivo: ${notas}` : ''}`,
            type: notifType,
            is_read: false,
            credit_id: null,
        });
    },

    generateWithdrawalCSV: (requests: WithdrawalRequest[]): string => {
        const fmt = (n: number) => `$${n.toLocaleString('es-CO')}`;
        const headers = ['Fecha', 'Gestor', 'Celular Gestor', 'Monto Total', 'Créditos', 'Estado', 'Procesado', 'Notas'];
        const rows = requests.map(r => [
            `"${new Date(r.createdAt).toLocaleDateString('es-CO')}"`,
            `"${r.gestorName || ''}"`,
            `"${r.gestorPhone || ''}"`,
            `"${fmt(r.montoTotal)}"`,
            `"${r.creditIds.length}"`,
            `"${r.estado}"`,
            `"${r.processedAt ? new Date(r.processedAt).toLocaleDateString('es-CO') : ''}"`,
            `"${(r.notas || '').replace(/"/g, '""')}"`,
        ].join(','));
        return '\uFEFF' + [headers.join(','), ...rows].join('\n');
    },

    // ─── IMPORTACIÓN / EXPORTACIÓN MASIVA DE USUARIOS ──────────────────────────

    batchCreateUsers: async (rows: { nombre: string; email: string; cedula: string; rol: string; password: string; telefono?: string; ciudad?: string }[]) => {
        if (!supabaseAdmin) throw new Error('Configura VITE_SUPABASE_SERVICE_KEY en las variables de entorno para importar usuarios.');

        // Traer cédulas y emails ya existentes
        const { data: existing } = await supabase.from('profiles').select('cedula, email');
        const existingCedulas = new Set((existing || []).map((u: any) => String(u.cedula || '').trim()));
        const existingEmails  = new Set((existing || []).map((u: any) => String(u.email  || '').trim().toLowerCase()));

        const results: { nombre: string; email: string; cedula: string; status: 'creado' | 'omitido' | 'error'; motivo?: string }[] = [];

        for (const row of rows) {
            const emailNorm  = row.email.trim().toLowerCase();
            const cedulaNorm = String(row.cedula).trim();

            if (existingCedulas.has(cedulaNorm)) {
                results.push({ ...row, status: 'omitido', motivo: 'Cédula ya existe' });
                continue;
            }
            if (existingEmails.has(emailNorm)) {
                results.push({ ...row, status: 'omitido', motivo: 'Email ya existe' });
                continue;
            }
            if (!row.password || row.password.trim().length < 6) {
                results.push({ ...row, status: 'error', motivo: 'Contraseña muy corta (mín. 6 caracteres)' });
                continue;
            }

            try {
                const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
                    email: emailNorm,
                    password: row.password.trim(),
                    email_confirm: true,
                });
                if (authError) throw authError;

                const uid = authData.user.id;
                const { error: profileError } = await supabase.from('profiles').insert({
                    id: uid,
                    full_name: row.nombre.trim(),
                    email: emailNorm,
                    cedula: cedulaNorm,
                    role: row.rol.toUpperCase().trim(),
                    status: 'ACTIVE',
                    phone: row.telefono?.trim() || null,
                    city: row.ciudad?.trim() || null,
                });
                if (profileError) {
                    // Si falla el perfil, eliminar el usuario de auth para no dejar huérfanos
                    await supabaseAdmin.auth.admin.deleteUser(uid);
                    throw profileError;
                }

                existingCedulas.add(cedulaNorm);
                existingEmails.add(emailNorm);
                results.push({ ...row, status: 'creado' });

                // Disparar webhook exclusivo de importación masiva
                ProductionService.triggerWebhooks('user_batch_imported', {
                    usuario: {
                        id: uid,
                        nombre: row.nombre.trim(),
                        email: emailNorm,
                        telefono: row.telefono?.trim() || '',
                        cedula: cedulaNorm,
                        ciudad: row.ciudad?.trim() || '',
                        rol: row.rol.toUpperCase().trim(),
                        estado: 'ACTIVE',
                        contrasena_temporal: row.password.trim(),
                    }
                });

                // Notificación in-app al nuevo usuario con sus credenciales
                await supabase.from('notifications').insert({
                    user_id: uid,
                    title: '¡Bienvenido a Skala!',
                    message: `Tu cuenta ha sido creada. Ingresa con tu correo ${emailNorm} y la contraseña que te proporcionaron.`,
                    type: 'success',
                    read: false,
                    created_at: new Date().toISOString(),
                });
            } catch (e: any) {
                results.push({ ...row, status: 'error', motivo: e.message || 'Error desconocido' });
            }
        }

        return results;
    },

    // ── DOCUMENTOS LEGALES ──────────────────────────────────────────────────────
    getLegalDocuments: async (creditId: string) => {
        const { data } = await supabase
            .from('documents')
            .select('*')
            .eq('credit_id', creditId)
            .like('type', 'LEGAL:%')
            .order('uploaded_at', { ascending: false });
        return (data || []).map((d: any) => ({
            id: d.id,
            type: d.type.replace('LEGAL:', ''),
            name: d.name,
            url: d.url,
            uploadedAt: new Date(d.uploaded_at),
        }));
    },

    uploadLegalDocument: async (creditId: string, file: File, docType: string) => {
        const url = await ProductionService.uploadImage(file);
        const { data, error } = await supabase.from('documents').insert({
            credit_id: creditId,
            name: file.name,
            url,
            type: `LEGAL:${docType}`,
        }).select().single();
        if (error) throw error;
        return { id: data.id, type: docType, name: data.name, url, uploadedAt: new Date(data.uploaded_at) };
    },

    deleteLegalDocument: async (docId: string) => {
        const { error } = await supabase.from('documents').delete().eq('id', docId);
        if (error) throw error;
    },

    exportUsersCSV: async () => {
        const users = await ProductionService.getUsers();
        const headers = ['Nombre', 'Email', 'Cédula', 'Rol', 'Teléfono', 'Ciudad', 'Estado', 'Fecha Creación'];
        const rows = users.map((u: any) => [
            u.name || '', u.email || '', u.cedula || '', u.role || '',
            u.phone || '', u.city || '', u.status || '',
            u.createdAt ? new Date(u.createdAt).toLocaleDateString('es-CO') : '',
        ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
        return '\uFEFF' + [headers.join(','), ...rows].join('\n');
    },
};