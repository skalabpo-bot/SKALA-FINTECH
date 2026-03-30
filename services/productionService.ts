import { supabase, supabaseAdmin } from './supabaseClient';
import {
    Credit, User, UserRole, AlliedEntity, Notification, Permission, Comment,
    CreditDocument, CreditState, Zone, DashboardStats, ReportFilters, NewsItem, CreditHistoryItem,
    WithdrawalRequest, PolicyAnalysis
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
    [UserRole.ANALISTA]: ['VIEW_DASHBOARD', 'VIEW_ALL_CREDITS', 'VIEW_ASSIGNED_CREDITS', 'CHANGE_CREDIT_STATUS', 'ADD_COMMENT', 'EDIT_CREDIT_INFO', 'VIEW_REPORTS', 'EXPORT_DATA', 'MARK_COMMISSION_PAID'],
    [UserRole.TESORERIA]: ['VIEW_DASHBOARD', 'VIEW_ALL_CREDITS', 'CHANGE_CREDIT_STATUS', 'ADD_COMMENT', 'EXPORT_DATA', 'MARK_COMMISSION_PAID', 'MANAGE_WITHDRAWALS'],
    [UserRole.SUPERVISOR_ASIGNADO]: ['VIEW_DASHBOARD', 'VIEW_ZONE_CREDITS', 'ADD_COMMENT', 'VIEW_REPORTS', 'EXPORT_DATA'],
    [UserRole.ANALISTA_ENTIDAD]: ['VIEW_DASHBOARD', 'VIEW_ASSIGNED_CREDITS', 'CHANGE_CREDIT_STATUS', 'ADD_COMMENT', 'EDIT_CREDIT_INFO', 'VIEW_REPORTS', 'EXPORT_DATA']
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
        gestorZoneName: c.gestor_profile?.zones?.name || undefined,
        assignedAnalystId: c.assigned_analyst_id || undefined,
        analystName: c.analyst_profile?.full_name || undefined,
        assignedEntityAnalystId: c.assigned_entity_analyst_id || undefined,
        entityAnalystName: c.entity_analyst_profile?.full_name || undefined,
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
    documents: p.registration_docs || [],
    assignedEntities: Array.isArray(p.assigned_entities) ? p.assigned_entities : []
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
        // Asegurar que ANALISTA siempre tenga VIEW_ALL_CREDITS
        if (user.role === 'ANALISTA' && user.permissions && !user.permissions.includes('VIEW_ALL_CREDITS' as Permission)) {
            user.permissions.push('VIEW_ALL_CREDITS' as Permission);
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
                const activeCredits = existingCredits.filter((c: any) => !finalStateIds.includes(c.status_id));
                if (activeCredits.length > 0) {
                    const newPagaduria = (rest.pagaduria || '').toString().trim().toUpperCase();
                    // Permitir si la pagaduría es diferente a TODOS los créditos activos
                    const conflictCredit = activeCredits.find((c: any) => {
                        const existingPagaduria = (c.client_data?.pagaduria || '').toString().trim().toUpperCase();
                        // Bloquear si misma pagaduría, o si alguno no tiene pagaduría registrada
                        return !existingPagaduria || !newPagaduria || existingPagaduria === newPagaduria;
                    });
                    if (conflictCredit) {
                        const activeStateName = states.find(s => s.id === conflictCredit.status_id)?.name || 'en trámite';
                        const existingPag = (conflictCredit.client_data?.pagaduria || '');
                        throw new Error(
                            `Ya existe un crédito activo para la cédula ${cedula}` +
                            (existingPag ? ` con pagaduría ${existingPag}` : '') +
                            ` (estado: ${activeStateName}). ` +
                            `Solo puedes radicar otro crédito si es con una pagaduría diferente.`
                        );
                    }
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

        // Snapshot completo de condiciones originales de radicación
        const snapshotRadicacion = [
            `Monto: $${Number(monto).toLocaleString()}`,
            `Monto Desembolso: $${Number(montoDesembolso || monto || 0).toLocaleString()}`,
            `Plazo: ${plazo} meses`,
            `Entidad: ${entidadAliada}`,
            `Tasa: ${tasa}% NMV`,
            `Comisión: ${commPercent}% ($${commEst.toLocaleString()})`,
            `Nombres: ${rest.nombres || ''} ${rest.apellidos || ''}`,
            `Cédula: ${rest.numeroDocumento || ''}`,
            `Teléfono: ${rest.telefonoCelular || ''}`,
            `Correo: ${rest.correo || ''}`,
            `Pagaduría: ${rest.pagaduria || ''}`,
            `Ciudad: ${rest.ciudadResidencia || ''}`,
            `Dirección: ${rest.direccionCompleta || ''}`,
            `Estado Civil: ${rest.estadoCivil || ''}`,
            `Banco: ${rest.banco || ''} - ${rest.tipoCuenta || ''} - ${rest.numeroCuenta || ''}`,
            `Línea de Crédito: ${rest.lineaCredito || ''}`,
            `Tipo Pensión: ${rest.tipoPension || ''}`,
            `Mesada: $${Number(rest.mesadaPensional || 0).toLocaleString()}`,
            `Gastos Mensuales: $${Number(rest.gastosMensuales || 0).toLocaleString()}`,
            `Activos: $${Number(rest.activos || 0).toLocaleString()}`,
            `Pasivos: $${Number(rest.pasivos || 0).toLocaleString()}`,
        ].join('\n');

        await supabase.from('credit_history').insert({
            credit_id: data.id,
            user_id: currentUser.id,
            action: 'RADICACIÓN',
            description: `Expediente radicado por el gestor.\n\n--- CONDICIONES ORIGINALES ---\n${snapshotRadicacion}`
        });

        if (documents?.length > 0) {
            const docsToInsert = documents.map((d: any) => ({
                credit_id: data.id,
                name: d.name,
                url: d.url,
                type: d.type
            }));
            const { error: docsError } = await supabase.from('documents').insert(docsToInsert);
            if (docsError) {
                console.error('Error al guardar documentos:', docsError);
                // Reintentar con supabaseAdmin por si es RLS
                const { error: docsError2 } = await supabaseAdmin.from('documents').insert(docsToInsert);
                if (docsError2) console.error('Error al guardar documentos (admin):', docsError2);
            }
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

        // Notificar al supervisor de la zona del gestor
        if (currentUser.zoneId) {
            try {
                const { data: supervisors } = await supabase
                    .from('profiles')
                    .select('id')
                    .eq('zone_id', currentUser.zoneId)
                    .eq('role', 'SUPERVISOR_ASIGNADO')
                    .eq('status', 'ACTIVE');
                if (supervisors && supervisors.length > 0) {
                    await supabase.from('notifications').insert(
                        supervisors.map((s: any) => ({
                            user_id: s.id,
                            title: 'Nuevo crédito radicado en tu zona',
                            message: `${currentUser.name} radicó un crédito para ${rest.nombres} ${rest.apellidos}.`,
                            type: 'info',
                            is_read: false,
                            credit_id: data.id,
                        }))
                    );
                }
            } catch (e) { console.warn('No se pudo notificar al supervisor:', e); }
        }

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

        // --- AUTO-ENVIAR AUTORIZACIÓN DE CONSULTA Y VALIDACIÓN DE IDENTIDAD ---
        try {
            await ProductionService.createAuthorizationToken(data.id, currentUser.id);
            await supabase.from('notifications').insert({
                user_id: currentUser.id,
                title: 'Autorización enviada',
                message: `Se envió la autorización de consulta y validación de identidad a ${rest.nombres} ${rest.apellidos} (${rest.telefonoCelular}).`,
                type: 'info',
                is_read: false,
                credit_id: data.id,
            });
        } catch (e) { console.warn('No se pudo crear autorización automática:', e); }

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

        // Obtener datos anteriores PRIMERO (para fallback y audit log)
        let previousData: any = {};
        try {
            const { data: prev } = await supabase.from('credits').select('amount, term, entity_name, interest_rate, disbursement_amount, client_data').eq('id', creditId).single();
            previousData = prev || {};
        } catch { /* continuar sin datos previos */ }

        // Resolver valores con fallback a datos anteriores
        const finalMonto = monto != null && String(monto).trim() !== '' ? Number(monto) : (previousData.amount ?? 0);
        const finalPlazo = plazo != null && String(plazo).trim() !== '' ? Number(plazo) : (previousData.term ?? 0);
        const finalTasa = tasa != null && String(tasa).trim() !== '' ? Number(tasa) : (previousData.interest_rate ?? 0);
        const finalDesembolso = montoDesembolso != null && String(montoDesembolso).trim() !== '' ? Number(montoDesembolso) : (previousData.disbursement_amount ?? 0);

        // Recalcular comisión basada en entidad y tasa
        const entities = await ProductionService.getEntities();
        const entity = entities.find((e: any) => e.name === (entidadAliada || previousData.entity_name));
        const rateConfig = entity?.rates?.find((r: any) => r.rate === finalTasa);
        const commPercent = rateConfig?.commission || 5;
        const commEst = (finalMonto * commPercent) / 100;

        const updatePayload: any = {
            amount: finalMonto,
            term: finalPlazo,
            entity_name: entidadAliada || previousData.entity_name || '',
            interest_rate: finalTasa,
            disbursement_amount: finalDesembolso,
            commission_percent: commPercent,
            commission_est: commEst,
            client_data: { ...clientFields, nombreCompleto: `${clientFields.nombres || ''} ${clientFields.apellidos || ''}`.trim() },
            updated_at: new Date().toISOString()
        };

        const { error } = await supabase.from('credits').update(updatePayload).eq('id', creditId);
        if (error) throw error;

        // Sincronizar datos del cliente en authorization_tokens pendientes
        const newName = `${clientFields.nombres || ''} ${clientFields.apellidos || ''}`.trim();
        const syncAuth: any = {};
        if (clientFields.correo) syncAuth.client_email = clientFields.correo;
        if (newName) syncAuth.client_name = newName;
        if (clientFields.telefonoCelular) syncAuth.client_phone = clientFields.telefonoCelular;
        if (clientFields.numeroDocumento) syncAuth.client_document = clientFields.numeroDocumento;
        if (Object.keys(syncAuth).length > 0) {
            await supabase.from('authorization_tokens').update(syncAuth).eq('credit_id', creditId).eq('status', 'pending');
        }

        // Audit log detallado: registrar cambios Y estado completo antes/después
        const changes: string[] = [];
        const prevClient = previousData.client_data || {};

        // Comparar condiciones financieras
        if (String(previousData.amount) !== String(finalMonto)) changes.push(`Monto: $${previousData.amount?.toLocaleString() || 0} → $${finalMonto.toLocaleString()}`);
        if (String(previousData.term) !== String(finalPlazo)) changes.push(`Plazo: ${previousData.term || 0} → ${finalPlazo} meses`);
        if ((previousData.entity_name || '') !== (entidadAliada || previousData.entity_name || '')) changes.push(`Entidad: ${previousData.entity_name || '-'} → ${entidadAliada}`);
        if (String(previousData.interest_rate) !== String(finalTasa)) changes.push(`Tasa: ${previousData.interest_rate || 0}% → ${finalTasa}%`);
        if (String(previousData.disbursement_amount) !== String(finalDesembolso)) changes.push(`Monto Desembolso: $${previousData.disbursement_amount?.toLocaleString() || 0} → $${finalDesembolso.toLocaleString()}`);

        // Comparar todos los campos del cliente
        const allClientFields = ['nombres', 'apellidos', 'correo', 'telefonoCelular', 'direccionCompleta', 'barrio', 'ciudadResidencia', 'estadoCivil', 'pagaduria', 'banco', 'tipoCuenta', 'numeroCuenta', 'lineaCredito', 'tipoPension', 'mesadaPensional', 'gastosMensuales', 'activos', 'pasivos', 'numeroDocumento'];
        for (const field of allClientFields) {
            const prev = String(prevClient[field] || '');
            const curr = String(clientFields[field] || '');
            if (prev !== curr && (prev || curr)) {
                changes.push(`${field}: ${prev || '-'} → ${curr || '-'}`);
            }
        }

        // Siempre guardar estado completo ANTES y DESPUÉS para trazabilidad total
        const snapshotAntes = [
            `Monto: $${previousData.amount?.toLocaleString() || 0}`,
            `Monto Desembolso: $${previousData.disbursement_amount?.toLocaleString() || 0}`,
            `Plazo: ${previousData.term || 0} meses`,
            `Entidad: ${previousData.entity_name || '-'}`,
            `Tasa: ${previousData.interest_rate || 0}% NMV`,
            `Nombres: ${prevClient.nombres || ''} ${prevClient.apellidos || ''}`,
            `Cédula: ${prevClient.numeroDocumento || ''}`,
            `Teléfono: ${prevClient.telefonoCelular || ''}`,
            `Correo: ${prevClient.correo || ''}`,
            `Pagaduría: ${prevClient.pagaduria || ''}`,
            `Ciudad: ${prevClient.ciudadResidencia || ''}`,
            `Banco: ${prevClient.banco || ''} - ${prevClient.tipoCuenta || ''} - ${prevClient.numeroCuenta || ''}`,
            `Mesada: $${Number(prevClient.mesadaPensional || 0).toLocaleString()}`,
            `Gastos: $${Number(prevClient.gastosMensuales || 0).toLocaleString()}`,
        ].join('\n');

        const snapshotDespues = [
            `Monto: $${finalMonto.toLocaleString()}`,
            `Monto Desembolso: $${finalDesembolso.toLocaleString()}`,
            `Plazo: ${finalPlazo} meses`,
            `Entidad: ${entidadAliada || previousData.entity_name || '-'}`,
            `Tasa: ${finalTasa}% NMV`,
            `Nombres: ${clientFields.nombres || ''} ${clientFields.apellidos || ''}`,
            `Cédula: ${clientFields.numeroDocumento || ''}`,
            `Teléfono: ${clientFields.telefonoCelular || ''}`,
            `Correo: ${clientFields.correo || ''}`,
            `Pagaduría: ${clientFields.pagaduria || ''}`,
            `Ciudad: ${clientFields.ciudadResidencia || ''}`,
            `Banco: ${clientFields.banco || ''} - ${clientFields.tipoCuenta || ''} - ${clientFields.numeroCuenta || ''}`,
            `Mesada: $${Number(clientFields.mesadaPensional || 0).toLocaleString()}`,
            `Gastos: $${Number(clientFields.gastosMensuales || 0).toLocaleString()}`,
        ].join('\n');

        const description = changes.length > 0
            ? `Campos editados:\n${changes.join('\n')}\n\n--- ANTES ---\n${snapshotAntes}\n\n--- DESPUÉS ---\n${snapshotDespues}`
            : `Guardado sin cambios detectados.\n\n--- ESTADO COMPLETO ---\n${snapshotDespues}`;

        await supabase.from('credit_history').insert({
            credit_id: creditId,
            user_id: userId,
            action: 'EDICIÓN',
            description
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

    resetDevolucionTask: async (creditId: string, taskId: string, user: User) => {
        const { data: row, error: readErr } = await supabase.from('credits').select('client_data').eq('id', creditId).single();
        if (readErr) throw readErr;

        const clientData = row?.client_data || {};
        const tasks: any[] = clientData.devolucionTasks || [];
        const task = tasks.find((t: any) => t.id === taskId);
        if (!task) throw new Error('Tarea no encontrada');

        const updatedTasks = tasks.map((t: any) =>
            t.id === taskId
                ? { id: t.id, title: t.title, requiresDoc: t.requiresDoc, completed: false }
                : t
        );
        const { error } = await supabase.from('credits')
            .update({ client_data: { ...clientData, devolucionTasks: updatedTasks }, updated_at: new Date().toISOString() })
            .eq('id', creditId);
        if (error) throw error;

        try {
            await supabase.from('credit_history').insert({
                credit_id: creditId,
                user_id: user.id,
                action: 'TAREA REINICIADA',
                description: `${user.name} reinició la tarea: "${task.title}" para corregirla.`
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
        // Intentar con join de analista y analista de entidad; si la columna no existe, fallback sin ella
        let selectStr = '*, gestor_profile:assigned_gestor_id(full_name, phone), analyst_profile:assigned_analyst_id(full_name, phone), entity_analyst_profile:assigned_entity_analyst_id(full_name)';
        let query = supabase.from('credits').select(selectStr).order('created_at', { ascending: false });
        const canViewAll = ProductionService.hasPermission(user, 'VIEW_ALL_CREDITS');
        const canViewZone = ProductionService.hasPermission(user, 'VIEW_ZONE_CREDITS') || user.role === 'SUPERVISOR_ASIGNADO';

        if (!canViewAll) {
            if (canViewZone && user.zoneId) {
                // SUPERVISOR_ASIGNADO: obtener todos los gestores de su zona y filtrar créditos
                // También incluir sus propios créditos (si fue gestor antes del cambio de rol)
                const { data: zoneProfiles } = await supabase
                    .from('profiles')
                    .select('id')
                    .eq('zone_id', user.zoneId);
                const zoneGestorIds = (zoneProfiles || []).map((p: any) => p.id);
                // Asegurar que el propio supervisor esté incluido (para ver sus créditos anteriores)
                if (!zoneGestorIds.includes(user.id)) zoneGestorIds.push(user.id);
                query = query.in('assigned_gestor_id', zoneGestorIds);
            } else if (user.role === 'ANALISTA') {
                query = query.or(`assigned_gestor_id.eq.${user.id},assigned_analyst_id.eq.${user.id}`);
            } else if (user.role === 'ANALISTA_ENTIDAD') {
                // Solo ve créditos que un analista le haya asignado explícitamente
                query = query.eq('assigned_entity_analyst_id', user.id);
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
                    if (!zoneGestorIds.includes(user.id)) zoneGestorIds.push(user.id);
                    fallbackQuery = fallbackQuery.in('assigned_gestor_id', zoneGestorIds);
                } else if (user.role === 'ANALISTA') {
                    fallbackQuery = fallbackQuery.or(`assigned_gestor_id.eq.${user.id},assigned_analyst_id.eq.${user.id}`);
                } else if (user.role === 'ANALISTA_ENTIDAD') {
                    fallbackQuery = fallbackQuery.eq('assigned_entity_analyst_id', user.id);
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
      let { data: c } = await supabase.from('credits').select('*, gestor_profile:assigned_gestor_id(full_name, phone), analyst_profile:assigned_analyst_id(full_name, phone), entity_analyst_profile:assigned_entity_analyst_id(full_name)').eq('id', id).single();
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

        // Notificar al supervisor de la zona del gestor
        if (credit?.assigned_gestor_id) {
            try {
                const { data: gestorProfile2 } = await supabase.from('profiles').select('zone_id').eq('id', credit.assigned_gestor_id).single();
                if (gestorProfile2?.zone_id) {
                    const { data: supervisors } = await supabase
                        .from('profiles')
                        .select('id')
                        .eq('zone_id', gestorProfile2.zone_id)
                        .eq('role', 'SUPERVISOR_ASIGNADO')
                        .eq('status', 'ACTIVE');
                    if (supervisors && supervisors.length > 0) {
                        const supervisorNotifs = supervisors
                            .filter((s: any) => s.id !== user.id)
                            .map((s: any) => ({
                                user_id: s.id,
                                title: 'Actualización en tu zona',
                                message: `El crédito de ${clientName} fue actualizado a: ${stateName}.`,
                                type: 'info' as const,
                                is_read: false,
                                credit_id: creditId,
                            }));
                        if (supervisorNotifs.length > 0) {
                            await supabase.from('notifications').insert(supervisorNotifs);
                        }
                    }
                }
            } catch (e) { console.warn('No se pudo notificar al supervisor:', e); }
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

    // Obtener lista de analistas de entidad activos
    getEntityAnalysts: async (): Promise<{ id: string; name: string }[]> => {
        const { data } = await supabase
            .from('profiles')
            .select('id, full_name')
            .eq('role', 'ANALISTA_ENTIDAD')
            .eq('status', 'ACTIVE')
            .order('full_name');
        return (data || []).map((a: any) => ({ id: a.id, name: a.full_name }));
    },

    // Asignar analista de entidad a un crédito
    assignEntityAnalyst: async (creditId: string, entityAnalystId: string, assignedBy: User) => {
        const { data: analyst } = await supabase.from('profiles').select('full_name').eq('id', entityAnalystId).single();
        await supabase.from('credits').update({
            assigned_entity_analyst_id: entityAnalystId,
            updated_at: new Date().toISOString()
        }).eq('id', creditId);

        await supabase.from('credit_history').insert({
            credit_id: creditId,
            user_id: assignedBy.id,
            action: 'ASIGNACIÓN ANALISTA ENTIDAD',
            description: `Analista de entidad asignado: ${analyst?.full_name || 'N/A'}`
        });

        // Notificar al analista de entidad
        const { data: credit } = await supabase.from('credits').select('client_data').eq('id', creditId).single();
        const clientName = credit?.client_data?.nombreCompleto || 'Cliente';
        await supabase.from('notifications').insert({
            user_id: entityAnalystId,
            title: 'Crédito Asignado',
            message: `Se te ha asignado el crédito de ${clientName} por ${assignedBy.name}.`,
            type: 'info',
            is_read: false,
            credit_id: creditId
        });
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

        // Notificación in-app + push al otro usuario del chat (gestor ↔ analista ↔ supervisor)
        const clienteName = clienteInfo?.nombre || 'cliente';
        const notifRecipients: string[] = [];
        if (gestorInfo?.id && gestorInfo.id !== user.id) notifRecipients.push(gestorInfo.id);
        if (analystInfo?.id && analystInfo.id !== user.id) notifRecipients.push(analystInfo.id);

        // Incluir supervisor de la zona del gestor
        if (gestorInfo?.id) {
            try {
                const { data: gestorP } = await supabase.from('profiles').select('zone_id').eq('id', gestorInfo.id).single();
                if (gestorP?.zone_id) {
                    const { data: supervisors } = await supabase.from('profiles').select('id').eq('zone_id', gestorP.zone_id).eq('role', 'SUPERVISOR_ASIGNADO').eq('status', 'ACTIVE');
                    (supervisors || []).forEach((s: any) => {
                        if (s.id !== user.id && !notifRecipients.includes(s.id)) notifRecipients.push(s.id);
                    });
                }
            } catch (e) { /* silently continue */ }
        }

        if (notifRecipients.length > 0) {
            const notifications = notifRecipients.map(recipientId => ({
                user_id: recipientId,
                title: `Nuevo mensaje de ${user.name}`,
                message: file ? `${user.name} envio un archivo en el credito de ${clienteName}` : `${user.name}: ${text.substring(0, 100)}${text.length > 100 ? '...' : ''}`,
                type: 'info',
                is_read: false,
                credit_id: creditId
            }));
            await supabase.from('notifications').insert(notifications).catch(() => {});
        }
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
        // Obtener rol actual antes de actualizar para detectar cambio de rol
        const { data: currentProfile } = await supabase.from('profiles').select('role, full_name, cedula').eq('id', id).single();
        const previousRole = currentProfile?.role;

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
        if (d.assignedEntities !== undefined) updateData.assigned_entities = d.assignedEntities || [];
        const { error } = await supabase.from('profiles').update(updateData).eq('id', id);
        if (error) throw error;

        // Si cambió a SUPERVISOR_ASIGNADO, crear zona automáticamente
        const newRole = d.role || previousRole;
        if (newRole === 'SUPERVISOR_ASIGNADO' && previousRole !== 'SUPERVISOR_ASIGNADO') {
            try {
                const fullName = d.name || currentProfile?.full_name || '';
                const cedula = d.cedula || currentProfile?.cedula || '';
                const nameParts = fullName.trim().split(/\s+/);
                const initial1 = (nameParts[0] || '').charAt(0).toUpperCase();
                const initial2 = (nameParts[nameParts.length > 1 ? 1 : 0] || '').charAt(0).toUpperCase();
                const last3 = cedula.slice(-3);
                const zoneName = `${initial1}${initial2}-${last3}`;

                // Usar supabaseAdmin para evitar problemas de RLS
                const db = supabaseAdmin || supabase;
                const { data: zoneData, error: zoneError } = await db
                    .from('zones')
                    .insert({ name: zoneName, cities: [] })
                    .select()
                    .single();

                if (zoneError) {
                    console.error('Error creando zona:', zoneError);
                } else if (zoneData?.id) {
                    const { error: assignError } = await db.from('profiles').update({ zone_id: zoneData.id }).eq('id', id);
                    if (assignError) console.error('Error asignando zona al supervisor:', assignError);
                }
            } catch (err) {
                console.error('Error creando zona para nuevo supervisor:', err);
            }

            // Notificar al usuario del cambio de rol
            await supabase.from('notifications').insert({
                user_id: id,
                title: 'Cambio de rol',
                message: `Tu rol ha sido actualizado a SUPERVISOR ASIGNADO. Se te ha creado una zona automáticamente. Tus créditos en proceso siguen asignados a ti.`,
                type: 'info',
                is_read: false,
                credit_id: null,
            }).catch(() => {});
        } else if (d.role && d.role !== previousRole) {
            // Notificar cambio de rol para cualquier otro cambio
            await supabase.from('notifications').insert({
                user_id: id,
                title: 'Cambio de rol',
                message: `Tu rol ha sido actualizado a ${d.role.replace(/_/g, ' ')}. Tus créditos en proceso siguen asignados a ti.`,
                type: 'info',
                is_read: false,
                credit_id: null,
            }).catch(() => {});
        }

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
        const { data: profile } = await supabase.from('profiles').select('full_name, email, phone, role, cedula').eq('id', id).single();
        await supabase.from('profiles').update({ status: 'ACTIVE' }).eq('id', id);

        // Si es supervisor, crear zona automáticamente al aprobar
        if (profile?.role === 'SUPERVISOR_ASIGNADO' && profile?.full_name) {
            try {
                const nameParts = profile.full_name.trim().split(/\s+/);
                const initial1 = (nameParts[0] || '').charAt(0).toUpperCase();
                const initial2 = (nameParts[nameParts.length > 1 ? 1 : 0] || '').charAt(0).toUpperCase();
                const last3 = (profile.cedula || '').slice(-3);
                const supervisorCode = `${initial1}${initial2}-${last3}`;
                const zoneName = supervisorCode;

                const { data: zoneData } = await supabase
                    .from('zones')
                    .insert({ name: zoneName, cities: [] })
                    .select()
                    .single();

                if (zoneData?.id) {
                    await supabase.from('profiles').update({ zone_id: zoneData.id }).eq('id', id);
                }
            } catch (err) {
                console.warn('Error creando zona para supervisor:', err);
            }
        }

        // Notificar al usuario aprobado
        await supabase.from('notifications').insert({
            user_id: id,
            title: 'Solicitud Aprobada',
            message: `Tu solicitud como ${(profile?.role || '').replace(/_/g, ' ')} ha sido aprobada. Ya puedes usar la plataforma.`,
            type: 'success',
            is_read: false,
            credit_id: null,
        }).catch(() => {});

        // Si es gestor, notificar al supervisor de su zona
        if (profile?.role === 'GESTOR' || profile?.role === 'ANALISTA') {
            try {
                const { data: updatedProfile } = await supabase.from('profiles').select('zone_id').eq('id', id).single();
                if (updatedProfile?.zone_id) {
                    const { data: supervisors } = await supabase.from('profiles').select('id').eq('zone_id', updatedProfile.zone_id).eq('role', 'SUPERVISOR_ASIGNADO').eq('status', 'ACTIVE');
                    if (supervisors && supervisors.length > 0) {
                        await supabase.from('notifications').insert(
                            supervisors.map((s: any) => ({
                                user_id: s.id,
                                title: 'Nuevo miembro en tu zona',
                                message: `${profile?.full_name || 'Un usuario'} fue aprobado como ${(profile?.role || '').replace(/_/g, ' ')} en tu zona.`,
                                type: 'info',
                                is_read: false,
                                credit_id: null,
                            }))
                        );
                    }
                }
            } catch (e) { /* silently continue */ }
        }

        ProductionService.triggerWebhooks('user_approved', {
            usuario: { id, nombre: profile?.full_name || '', email: profile?.email || '', telefono: profile?.phone || '', rol: profile?.role || '' }
        });
    },
    rejectUser: async (id: string) => {
        const { data: profile } = await supabase.from('profiles').select('full_name, email, phone, role').eq('id', id).single();
        await supabase.from('profiles').update({ status: 'REJECTED' }).eq('id', id);

        // Notificar al usuario rechazado
        await supabase.from('notifications').insert({
            user_id: id,
            title: 'Solicitud Rechazada',
            message: `Tu solicitud como ${(profile?.role || '').replace(/_/g, ' ')} no fue aprobada. Contacta al administrador para más información.`,
            type: 'warning',
            is_read: false,
            credit_id: null,
        }).catch(() => {});

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
                    isFinal: s.is_final || false,
                    enableTasks: s.enable_tasks || false,
                    enableEdit: s.enable_edit || false
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
            if (error) return [...COLOMBIAN_CITIES];
            if (!data || data.length === 0) {
                // Primera vez: sembrar BD con todas las ciudades (sin duplicados)
                const rows = COLOMBIAN_CITIES.map(name => ({ name }));
                await supabase.from('cities').upsert(rows, { onConflict: 'name', ignoreDuplicates: true });
                return [...COLOMBIAN_CITIES];
            }
            return data.map((c: any) => c.name as string);
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
        const { error } = await supabase.from('cities').upsert({ name: name.toUpperCase().trim() }, { onConflict: 'name', ignoreDuplicates: true });
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
    updateState: async (id: string, updates: { name?: string; color?: string; role_responsible?: string; is_final?: boolean; enable_tasks?: boolean; enable_edit?: boolean }) => {
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
    bulkReassignZone: async (fromZoneId: string, toZoneId: string | null) => {
        const { error } = await supabase.from('profiles').update({ zone_id: toZoneId || null }).eq('zone_id', fromZoneId);
        if (error) throw error;
    },
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

        // Obtener zona, cédula, email y supervisor de cada gestor
        let gestorZoneMap: Record<string, string> = {};
        let gestorCedulaMap: Record<string, string> = {};
        let gestorEmailMap: Record<string, string> = {};
        let gestorCityMap: Record<string, string> = {};
        let gestorSupervisorMap: Record<string, string> = {};
        let gestorSupervisorPhoneMap: Record<string, string> = {};

        const needsGestorData = selectedColumns.some(c => ['zona','gestor_cedula','gestor_email','gestor_ciudad','supervisor_nombre','supervisor_telefono'].includes(c));
        if (needsGestorData) {
            const gestorIds = [...new Set(credits.map(c => c.assignedGestorId).filter(Boolean))];
            if (gestorIds.length > 0) {
                const { data: gestorProfiles } = await supabase.from('profiles').select('id, zone_id, cedula, email, city').in('id', gestorIds);
                if (gestorProfiles) {
                    // Obtener todos los supervisores de una vez
                    const zoneIds = [...new Set(gestorProfiles.map((gp: any) => gp.zone_id).filter(Boolean))];
                    let supervisorMap: Record<string, { name: string; phone: string }> = {};
                    if (zoneIds.length > 0) {
                        const { data: supervisors } = await supabase.from('profiles').select('id, full_name, phone, zone_id').eq('role', 'SUPERVISOR_ASIGNADO').in('zone_id', zoneIds);
                        if (supervisors) {
                            for (const s of supervisors) {
                                if (s.zone_id) supervisorMap[s.zone_id] = { name: s.full_name || '', phone: s.phone || '' };
                            }
                        }
                    }
                    for (const gp of gestorProfiles) {
                        gestorCedulaMap[gp.id] = gp.cedula || '';
                        gestorEmailMap[gp.id] = gp.email || '';
                        gestorCityMap[gp.id] = gp.city || '';
                        if (gp.zone_id) {
                            const zone = zones.find((z: any) => z.id === gp.zone_id);
                            gestorZoneMap[gp.id] = zone?.name || '';
                            gestorSupervisorMap[gp.id] = supervisorMap[gp.zone_id]?.name || '';
                            gestorSupervisorPhoneMap[gp.id] = supervisorMap[gp.zone_id]?.phone || '';
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
            'gestor_cedula': c => gestorCedulaMap[c.assignedGestorId] || '',
            'gestor_email': c => gestorEmailMap[c.assignedGestorId] || '',
            'gestor_ciudad': c => gestorCityMap[c.assignedGestorId] || '',
            'supervisor_nombre': c => gestorSupervisorMap[c.assignedGestorId] || '',
            'supervisor_telefono': c => gestorSupervisorPhoneMap[c.assignedGestorId] || '',
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

    toggleRecommendCredit: async (creditId: string, recommend: boolean, user: User) => {
        // Read current client_data, set recomendado flag
        const { data: existing } = await supabase.from('credits').select('client_data').eq('id', creditId).single();
        const clientData = existing?.client_data || {};
        clientData.recomendado = recommend;
        const { error } = await supabase.from('credits').update({ client_data: clientData, updated_at: new Date().toISOString() }).eq('id', creditId);
        if (error) throw error;
        await supabase.from('credit_history').insert({
            credit_id: creditId,
            user_id: user.id,
            user_name: user.name,
            action: recommend ? 'CRÉDITO RECOMENDADO' : 'RECOMENDACIÓN REMOVIDA',
            description: recommend ? `${user.name} marcó este crédito como recomendado.` : `${user.name} removió la recomendación de este crédito.`,
        }).catch(() => {});
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

    batchCreateUsers: async (rows: { nombre: string; email: string; cedula: string; rol: string; password: string; telefono?: string; ciudad?: string; supervisor?: string }[]) => {
        if (!supabaseAdmin) throw new Error('Configura VITE_SUPABASE_SERVICE_KEY en las variables de entorno para importar usuarios.');

        // Traer cédulas ya existentes en profiles (única validación de duplicado)
        const { data: existing } = await supabase.from('profiles').select('cedula');
        const existingCedulas = new Set((existing || []).map((u: any) => String(u.cedula || '').trim()));

        // Mapear supervisor por nombre de zona, ID de zona, o nombre del supervisor
        const { data: zonesData } = await supabase.from('zones').select('id, name');
        const zoneMap = new Map<string, string>();
        (zonesData || []).forEach((z: any) => {
            if (z.name && z.id) {
                zoneMap.set(z.name.trim().toUpperCase(), z.id);
                zoneMap.set(z.id.trim().toUpperCase(), z.id); // también por ID/UUID
            }
        });
        // También mapear por nombre completo del supervisor
        const { data: supervisors } = await supabase.from('profiles').select('full_name, zone_id').eq('role', 'SUPERVISOR_ASIGNADO');
        const supervisorMap = new Map<string, string>();
        (supervisors || []).forEach((s: any) => {
            if (s.full_name && s.zone_id) supervisorMap.set(s.full_name.trim().toUpperCase(), s.zone_id);
        });

        const results: { nombre: string; email: string; cedula: string; status: 'creado' | 'omitido' | 'error'; motivo?: string }[] = [];
        const existingEmails = new Set<string>();

        for (const row of rows) {
            const emailNorm  = row.email.trim().toLowerCase();
            const cedulaNorm = String(row.cedula).trim();

            if (existingCedulas.has(cedulaNorm)) {
                results.push({ ...row, status: 'omitido', motivo: 'Cédula ya existe' });
                continue;
            }
            if (!row.password || row.password.trim().length < 6) {
                results.push({ ...row, status: 'error', motivo: 'Contraseña muy corta (mín. 6 caracteres)' });
                continue;
            }

            try {
                let uid: string;

                // Intentar crear en Auth
                const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
                    email: emailNorm,
                    password: row.password.trim(),
                    email_confirm: true,
                });

                if (authError) {
                    // Si ya existe en Auth (por intento previo), buscar su ID
                    const { data: { users } } = await supabaseAdmin.auth.admin.listUsers({ filter: emailNorm });
                    const existingAuth = users?.find((u: any) => u.email === emailNorm);
                    if (!existingAuth) throw authError;
                    uid = existingAuth.id;
                } else {
                    uid = authData.user.id;
                }

                // Esperar un momento para que el trigger de Auth termine
                await new Promise(r => setTimeout(r, 500));

                // Resolver zone_id: buscar primero por nombre de supervisor, luego por nombre de zona
                let zoneId: string | null = null;
                if (row.supervisor?.trim()) {
                    const key = row.supervisor.trim().toUpperCase();
                    zoneId = supervisorMap.get(key) || zoneMap.get(key) || null;
                }

                // Upsert del perfil (sobrescribe lo que haya creado el trigger)
                const { error: profileError } = await supabaseAdmin.from('profiles').upsert({
                    id: uid,
                    full_name: row.nombre.trim(),
                    email: emailNorm,
                    cedula: cedulaNorm,
                    role: row.rol.toUpperCase().trim(),
                    status: 'ACTIVE',
                    phone: row.telefono?.trim() || null,
                    city: row.ciudad?.trim() || null,
                    ...(zoneId ? { zone_id: zoneId } : {}),
                }, { onConflict: 'id' });
                if (profileError) throw profileError;

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

    // --- LECTURAS DE CRÉDITO (read receipts) ---
    markCreditAsRead: async (creditId: string, userId: string, userName: string) => {
        try {
            await supabase.from('credit_reads').upsert(
                { credit_id: creditId, user_id: userId, user_name: userName, last_read_at: new Date().toISOString() },
                { onConflict: 'credit_id,user_id' }
            );
        } catch { /* tabla puede no existir aún */ }
    },

    getCreditReadMap: async (userId: string): Promise<Record<string, Date>> => {
        try {
            const { data } = await supabase.from('credit_reads').select('credit_id, last_read_at').eq('user_id', userId);
            const map: Record<string, Date> = {};
            (data || []).forEach((r: any) => { map[r.credit_id] = new Date(r.last_read_at); });
            return map;
        } catch { return {}; }
    },

    getCreditReadsByCredit: async (creditId: string): Promise<{ userId: string; userName: string; lastReadAt: Date }[]> => {
        try {
            const { data } = await supabase.from('credit_reads').select('user_id, user_name, last_read_at').eq('credit_id', creditId);
            return (data || []).map((r: any) => ({ userId: r.user_id, userName: r.user_name || 'Usuario', lastReadAt: new Date(r.last_read_at) }));
        } catch { return []; }
    },

    // =============================================
    // OBSERVACIONES INTERNAS (DOCS LEGALES)
    // =============================================

    getLegalNotes: async (creditId: string) => {
        try {
            const { data } = await supabase
                .from('legal_notes')
                .select('*')
                .eq('credit_id', creditId)
                .order('created_at', { ascending: false });
            return (data || []).map((n: any) => ({
                id: n.id,
                text: n.text,
                userName: n.user_name,
                userRole: n.user_role,
                createdAt: n.created_at,
            }));
        } catch { return []; }
    },

    addLegalNote: async (creditId: string, text: string, userId: string, userName: string, userRole: string) => {
        const { data, error } = await supabase.from('legal_notes').insert({
            credit_id: creditId,
            text,
            user_id: userId,
            user_name: userName,
            user_role: userRole,
        }).select().single();
        if (error) throw error;
        return {
            id: data.id,
            text: data.text,
            userName: data.user_name,
            userRole: data.user_role,
            createdAt: data.created_at,
        };
    },

    // =============================================
    // AUTORIZACIÓN DE CONSULTA Y VALIDACIÓN DE IDENTIDAD
    // =============================================

    createAuthorizationToken: async (creditId: string, createdBy: string) => {
        // Obtener datos del crédito y cliente
        const { data: credit } = await supabase.from('credits')
            .select('id, client_data, entity_name')
            .eq('id', creditId)
            .single();
        if (!credit) throw new Error('Crédito no encontrado');

        const cd = credit.client_data || {};
        const clientName = cd.nombreCompleto || `${cd.nombres || ''} ${cd.apellidos || ''}`.trim();
        const clientDoc = cd.numeroDocumento || '';
        const clientPhone = cd.telefonoCelular || '';
        const clientEmail = cd.correo || '';

        if (!clientName || !clientDoc) throw new Error('Datos del cliente incompletos para generar autorización');

        // Generar token único
        const token = crypto.randomUUID().replace(/-/g, '') + Date.now().toString(36);

        // Buscar validation_url de la entidad directamente en financial_entities
        let validationUrl = '';
        try {
            if (credit.entity_name) {
                const { data: entity } = await supabase
                    .from('financial_entities')
                    .select('validation_url')
                    .eq('name', credit.entity_name)
                    .single();
                if (entity?.validation_url) validationUrl = entity.validation_url;
            }
        } catch { /* entidad sin validation_url configurada */ }

        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);

        const { data: authToken, error } = await supabase.from('authorization_tokens').insert({
            credit_id: creditId,
            token,
            status: 'pending',
            expires_at: expiresAt.toISOString(),
            client_name: clientName,
            client_document: clientDoc,
            client_phone: clientPhone,
            client_email: clientEmail,
            validation_url: validationUrl || null,
            created_by: createdBy,
        }).select().single();

        if (error) throw error;

        // Disparar webhook para que n8n envíe el link al cliente
        const appUrl = 'https://skalapp.co';
        ProductionService.triggerWebhooks('authorization_request_sent', {
            credit_id: creditId,
            token,
            authorization_url: `${appUrl}/?autorizacion=${token}`,
            cliente: {
                nombre: clientName,
                documento: clientDoc,
                celular: clientPhone,
                correo: clientEmail,
            },
        });

        return authToken;
    },

    getAuthorizationByToken: async (token: string) => {
        const { data, error } = await supabase
            .from('authorization_tokens')
            .select('*')
            .eq('token', token)
            .single();
        if (error || !data) return null;

        // Verificar si expiró
        if (data.status === 'pending' && new Date(data.expires_at) < new Date()) {
            await supabase.from('authorization_tokens').update({ status: 'expired' }).eq('id', data.id);
            return { ...data, status: 'expired' };
        }
        return data;
    },

    requestAuthorizationOtp: async (token: string, channel: 'whatsapp' | 'email' = 'whatsapp') => {
        const { data: auth } = await supabase
            .from('authorization_tokens')
            .select('*')
            .eq('token', token)
            .single();
        if (!auth) throw new Error('Token no encontrado');
        if (auth.status !== 'pending') throw new Error('Esta autorización ya fue procesada');
        if (new Date(auth.expires_at) < new Date()) throw new Error('Esta autorización ha expirado');

        // Generar OTP de 6 dígitos
        const otp = String(Math.floor(100000 + Math.random() * 900000));
        const otpExpires = new Date();
        otpExpires.setMinutes(otpExpires.getMinutes() + 10);

        await supabase.from('authorization_tokens').update({
            otp_code: otp,
            otp_expires_at: otpExpires.toISOString(),
        }).eq('id', auth.id);

        // Disparar webhook para que n8n envíe el OTP por el canal elegido
        ProductionService.triggerWebhooks('authorization_otp_requested', {
            credit_id: auth.credit_id,
            otp_code: otp,
            canal: channel,
            cliente: {
                nombre: auth.client_name,
                documento: auth.client_document,
                celular: auth.client_phone,
                correo: auth.client_email,
            },
        });

        const hint = channel === 'whatsapp'
            ? auth.client_phone.slice(-4)
            : auth.client_email ? auth.client_email.replace(/(.{2})(.*)(@.*)/, '$1***$3') : '';
        return { sent: true, phone_hint: hint, channel };
    },

    verifyAndSignAuthorization: async (token: string, otp: string, clientIp?: string) => {
        const { data: auth } = await supabase
            .from('authorization_tokens')
            .select('*')
            .eq('token', token)
            .single();
        if (!auth) throw new Error('Token no encontrado');
        if (auth.status !== 'pending') throw new Error('Esta autorización ya fue procesada');
        if (new Date(auth.expires_at) < new Date()) throw new Error('Esta autorización ha expirado');
        if (!auth.otp_code) throw new Error('Primero debes solicitar un código');
        if (auth.otp_expires_at && new Date(auth.otp_expires_at) < new Date()) throw new Error('El código ha expirado. Solicita uno nuevo.');
        if (auth.otp_code !== otp) throw new Error('Código incorrecto');

        const signedAt = new Date().toISOString();

        // Marcar como firmado
        await supabase.from('authorization_tokens').update({
            status: 'signed',
            signed_at: signedAt,
            client_ip: clientIp || null,
            otp_code: null, // limpiar OTP
        }).eq('id', auth.id);

        // Disparar webhook de firma
        ProductionService.triggerWebhooks('authorization_signed', {
            credit_id: auth.credit_id,
            cliente: {
                nombre: auth.client_name,
                documento: auth.client_document,
                celular: auth.client_phone,
            },
            signed_at: signedAt,
        });

        // Notificar al gestor del crédito
        try {
            const { data: credit } = await supabase.from('credits').select('assigned_gestor_id').eq('id', auth.credit_id).single();
            if (credit?.assigned_gestor_id) {
                await supabase.from('notifications').insert({
                    user_id: credit.assigned_gestor_id,
                    title: 'Autorización firmada',
                    message: `${auth.client_name} (CC: ${auth.client_document}) firmó la autorización de consulta y validación de identidad.`,
                    type: 'success',
                    is_read: false,
                    credit_id: auth.credit_id,
                });
            }
        } catch { /* silenciar error de notificación */ }

        // Construir URL de validación con parámetros del cliente
        let redirectUrl = '';
        if (auth.validation_url) {
            const baseUrl = auth.validation_url;
            const separator = baseUrl.includes('?') ? '&' : '?';
            const params = new URLSearchParams({
                nombre: auth.client_name,
                documento: auth.client_document,
                telefono: auth.client_phone,
                ...(auth.client_email ? { correo: auth.client_email } : {}),
            });
            redirectUrl = `${baseUrl}${separator}${params.toString()}`;
        }

        return { signed: true, validation_url: redirectUrl || null, auth_id: auth.id, signed_at: signedAt };
    },

    uploadAuthorizationPdf: async (authId: string, creditId: string, pdfBlob: Blob, clientName: string, clientDocument: string) => {
        const fileName = `autorizacion_centrales_${clientDocument}_${Date.now()}.pdf`;
        const { error: uploadError } = await supabase.storage.from('skala-bucket').upload(fileName, pdfBlob, {
            contentType: 'application/pdf',
        });
        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage.from('skala-bucket').getPublicUrl(fileName);

        // Guardar URL del PDF en authorization_tokens
        await supabase.from('authorization_tokens').update({ pdf_url: publicUrl }).eq('id', authId);

        // Registrar en documents del crédito
        await supabase.from('documents').insert({
            credit_id: creditId,
            name: `Autorización Consulta y Validación - ${clientName}`,
            url: publicUrl,
            type: 'LEGAL:AUTORIZACION_CENTRALES',
            uploaded_at: new Date().toISOString(),
        });

        return publicUrl;
    },

    getAuthorizationStatus: async (creditId: string) => {
        const { data } = await supabase
            .from('authorization_tokens')
            .select('*')
            .eq('credit_id', creditId)
            .order('created_at', { ascending: false })
            .limit(1);
        return data?.[0] || null;
    },

    resendAuthorization: async (creditId: string, createdBy: string) => {
        // Verificar si existe una autorización vigente
        const existing = await ProductionService.getAuthorizationStatus(creditId);

        if (existing && existing.status === 'signed') {
            throw new Error('Esta autorización ya fue firmada');
        }

        // Si existe y está pendiente, reenviar el mismo token
        if (existing && existing.status === 'pending' && new Date(existing.expires_at) > new Date()) {
            const appUrl = 'https://skalapp.co';
            ProductionService.triggerWebhooks('authorization_request_sent', {
                credit_id: creditId,
                token: existing.token,
                authorization_url: `${appUrl}/?autorizacion=${existing.token}`,
                cliente: {
                    nombre: existing.client_name,
                    documento: existing.client_document,
                    celular: existing.client_phone,
                    correo: existing.client_email,
                },
            });
            return existing;
        }

        // Si expiró o no existe, crear nuevo token
        return ProductionService.createAuthorizationToken(creditId, createdBy);
    },

    updateAuthorizationValidationUrl: async (authId: string, validationUrl: string) => {
        const { error } = await supabase
            .from('authorization_tokens')
            .update({ validation_url: validationUrl })
            .eq('id', authId);
        if (error) throw error;
    },

    // ─── POLÍTICAS POR ENTIDAD ───────────────────────────────────────────────

    getEntityPolicy: async (entityName: string): Promise<{ policy_text: string; file_url?: string; file_name?: string } | null> => {
        const { data } = await supabase.from('entity_policies').select('policy_text, file_url, file_name').eq('entity_name', entityName).single();
        return data || null;
    },

    getEntityPolicies: async (): Promise<{ entity_name: string; policy_text: string; file_url?: string; file_name?: string }[]> => {
        const { data } = await supabase.from('entity_policies').select('entity_name, policy_text, file_url, file_name').order('entity_name');
        return data || [];
    },

    saveEntityPolicy: async (entityName: string, policyText: string, newFiles?: File[], existingFiles?: { name: string; url: string }[]) => {
        // Subir archivos nuevos
        const uploadedFiles: { name: string; url: string }[] = [...(existingFiles || [])];

        if (newFiles && newFiles.length > 0) {
            for (const file of newFiles) {
                const ext = file.name.split('.').pop() || 'pdf';
                const path = `policies/${entityName}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.${ext}`;
                const { error: upErr } = await supabase.storage.from('documents').upload(path, file, { upsert: true });
                if (upErr) throw upErr;
                const { data: urlData } = supabase.storage.from('documents').getPublicUrl(path);
                uploadedFiles.push({ name: file.name, url: urlData.publicUrl });
            }
        }

        const upsertData: any = {
            entity_name: entityName,
            policy_text: policyText,
            updated_at: new Date().toISOString(),
            file_url: JSON.stringify(uploadedFiles),
            file_name: uploadedFiles.map(f => f.name).join(', ') || null,
        };

        const { error } = await supabase.from('entity_policies').upsert(upsertData, { onConflict: 'entity_name' });
        if (error) throw error;
    },

    // ─── ANÁLISIS DE DOCUMENTOS LEGALES CON IA ──────────────────────────────

    analyzeDocumentsWithAI: async (creditId: string, user: User, onProgress?: (step: string) => void): Promise<PolicyAnalysis> => {
        const progress = onProgress || (() => {});

        // 1. Obtener crédito
        progress('Obteniendo datos del crédito...');
        const { data: creditData } = await supabase.from('credits').select('entity_name, client_data').eq('id', creditId).single();

        // 2. Obtener política de la entidad del crédito
        const entityName = creditData?.entity_name;
        progress(`Cargando política de ${entityName || 'la entidad'}...`);
        let policyData = entityName ? await ProductionService.getEntityPolicy(entityName) : null;
        // Fallback a política general si no hay por entidad
        if (!policyData) policyData = await ProductionService.getEntityPolicy('__GENERAL__');
        if (!policyData) throw new Error(`No hay política configurada para ${entityName || 'esta entidad'}. Configúrala en la entidad desde el Simulador > Admin.`);
        const { file_url: policyFilesJson } = policyData;
        let policyFilesList: { name: string; url: string }[] = [];
        try { policyFilesList = JSON.parse(policyFilesJson || '[]'); } catch { if (policyFilesJson) policyFilesList = [{ name: 'Política', url: policyFilesJson }]; }
        if (policyFilesList.length === 0) throw new Error(`No hay archivos de política configurados para ${entityName || 'esta entidad'}. Sube al menos un PDF de política en la entidad desde el Simulador > Admin.`);

        // 3. Obtener documentos legales del crédito
        progress('Obteniendo documentos legales...');
        const docs = await ProductionService.getLegalDocuments(creditId);
        if (!docs || docs.length === 0) throw new Error('No hay documentos legales para analizar');

        // 4. Helper para descargar archivo como base64
        const fetchAsBase64 = async (url: string): Promise<{ base64: string; mimeType: string } | null> => {
            try {
                const response = await fetch(url);
                const blob = await response.blob();
                const base64 = await new Promise<string>((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
                    reader.readAsDataURL(blob);
                });
                return { base64, mimeType: blob.type };
            } catch { return null; }
        };

        // 5. Descargar documentos legales como base64
        const docContents: { name: string; type: string; base64: string; mimeType: string }[] = [];
        for (let i = 0; i < docs.length; i++) {
            const doc = docs[i];
            progress(`Descargando documento ${i + 1}/${docs.length}: ${doc.name}...`);
            const result = await fetchAsBase64(doc.url);
            if (result) docContents.push({ name: doc.name, type: doc.type, ...result });
        }
        if (docContents.length === 0) throw new Error('No se pudieron descargar los documentos');

        // 6. Descargar archivos de política
        const policyFilesData: { name: string; base64: string; mimeType: string }[] = [];
        for (let i = 0; i < policyFilesList.length; i++) {
            const pf = policyFilesList[i];
            progress(`Descargando política ${i + 1}/${policyFilesList.length}: ${pf.name}...`);
            const result = await fetchAsBase64(pf.url);
            if (result) policyFilesData.push({ name: pf.name, ...result });
        }

        // 7. Llamar a Gemini
        progress('Enviando a Gemini IA para análisis...');
        const API_KEYS = [
            import.meta.env.VITE_GEMINI_API_KEY,
            import.meta.env.VITE_GEMINI_API_KEY_2,
            import.meta.env.VITE_GEMINI_API_KEY_3,
        ].filter(Boolean);

        const apiKey = API_KEYS[0];
        if (!apiKey) throw new Error('No hay API key de Gemini configurada');

        const { GoogleGenAI } = await import('@google/genai');
        const ai = new GoogleGenAI({ apiKey });

        const parts: any[] = [];

        // Agregar archivos de política primero
        if (policyFilesData.length > 0) {
            parts.push({ text: `📋 DOCUMENTOS DE POLÍTICA DE CRÉDITO (${policyFilesData.length} documento${policyFilesData.length > 1 ? 's' : ''} de referencia):` });
            for (const pf of policyFilesData) {
                parts.push({ text: `📋 Política: ${pf.name}` });
                parts.push({ inlineData: { data: pf.base64, mimeType: pf.mimeType } });
            }
        }

        // Prompt principal
        parts.push({ text: `Eres un analista de riesgo crediticio EXPERTO en créditos de libranza en Colombia. Tu trabajo es filtrar con MÁXIMA RIGUROSIDAD y reportar ÚNICAMENTE alertas que sean factor decisivo real para negar o condicionar el crédito.

Entidad del crédito: ${creditData?.entity_name || 'No especificada'}

Los documentos de política de la entidad están arriba. Úsalos como la FUENTE DE VERDAD para determinar qué obligaciones chocan con la política, qué se debe comprar o sanear, y qué bloquea el crédito.

═══ REGLAS DE FILTRADO ESTRICTO ═══

1. OBLIGACIONES EN CENTRALES DE RIESGO — REPORTAR INDIVIDUALMENTE:
   - Listar CADA obligación como un hallazgo SEPARADO (una por una, NO agrupar ni resumir)
   - Solo incluir obligaciones que:
     a) Tengan MORAS ACTIVAS (30+ días) en sectores FINANCIERO o REAL (bancos, cooperativas, entidades de crédito)
     b) El monto en mora sea SIGNIFICATIVO (>$500.000 COP)
     c) CHOQUEN con la política de la entidad (exceden límites de endeudamiento, superan topes de mora permitidos, etc.)
     d) Necesiten ser COMPRADAS (compra de cartera) o SANEADAS para viabilizar el crédito
   - Para cada obligación incluir: entidad acreedora, monto total, monto en mora, días de mora, si se debe comprar o sanear
   - NO reportar: obligaciones al día con buen comportamiento, cuotas de celular, servicios públicos, telecomunicaciones, suscripciones, seguros al día
   - NO reportar: sectores que NO afectan libranza (telefonía, servicios públicos, salud prepagada, educación)
   - NO reportar obligaciones que NO chocan con la política de la entidad

2. PROCESOS JURÍDICOS — Solo reportar si:
   - Es un PROCESO EJECUTIVO (cobro coactivo/embargo) que afecte capacidad de pago
   - Es un proceso PENAL con condena o investigación activa relevante
   - Hay EMBARGOS activos sobre salario o bienes
   - NO reportar: procesos de familia (divorcios, custodia, alimentos a menos que haya embargo)
   - NO reportar: procesos civiles menores, tutelas, procesos laborales donde el cliente es demandante
   - NO reportar: procesos terminados, archivados o con sentencia favorable al cliente

3. LISTAS RESTRICTIVAS — Solo reportar si:
   - Aparece en listas OFAC, ONU, o listas nacionales de lavado de activos/terrorismo
   - Tiene reportes en SARLAFT con nivel de riesgo ALTO
   - NO reportar: PEP (Personas Expuestas Políticamente) a menos que la política lo prohíba explícitamente
   - NO reportar: coincidencias parciales de nombre o falsos positivos evidentes

4. POLÍTICA DE LA ENTIDAD — Solo reportar si:
   - Incumple una regla EXPLÍCITA del documento de política
   - Citar la regla exacta que se incumple y el dato concreto que la viola

═══ REGLAS DE FORMATO ═══

- Si NO hay alertas reales después de aplicar estos filtros → status "verde", hallazgos vacío []
- OBLIGACIONES: cada obligación problemática es UN hallazgo separado. NO agrupar. Formato de descripción: "Entidad: [nombre] | Monto: $[X] | Mora: $[Y] ([Z] días) | Acción: [comprar/sanear/revisar] — [razón por la que choca con la política]"
- PROCESOS y LISTAS: reportar individualmente también, con datos concretos
- NO des resúmenes genéricos. NO repitas información del documento que no sea una alerta.
- Sin límite de hallazgos si todos son obligaciones reales que chocan con la política. Pero NO inflar con alertas irrelevantes.

RESPONDE EXCLUSIVAMENTE en este formato JSON (sin markdown, sin backticks):
{
  "status": "verde|amarillo|rojo",
  "resumen": "1 oración directa: el hallazgo más grave o 'Sin alertas relevantes'",
  "hallazgos": [
    { "tipo": "OBLIGACION|PROCESO|LISTA_RESTRICTIVA|POLITICA", "descripcion": "dato concreto individual con montos/entidades y acción requerida", "severidad": "alto|medio|bajo" }
  ]
}

- verde: Sin alertas reales, todo limpio para libranza
- amarillo: Hay obligaciones a comprar/sanear o situaciones a revisar pero el crédito puede ser viable
- rojo: Hay factores que bloquean o condicionan seriamente el crédito (embargos, listas, mora extrema)` });

        // Agregar documentos del crédito
        for (const doc of docContents) {
            parts.push({ text: `📄 Documento: ${doc.name} (${doc.type})` });
            parts.push({ inlineData: { data: doc.base64, mimeType: doc.mimeType } });
        }

        let analysis: PolicyAnalysis;
        const models = ['gemini-2.5-flash', 'gemini-2.5-flash-preview-05-20'];

        for (const model of models) {
            try {
                const response = await ai.models.generateContent({
                    model,
                    contents: [{ role: 'user', parts }],
                });
                const text = response.text?.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim() || '';
                const parsed = JSON.parse(text);
                analysis = {
                    status: parsed.status || 'amarillo',
                    resumen: parsed.resumen || 'Sin resumen disponible',
                    hallazgos: (parsed.hallazgos || []).map((h: any) => ({
                        tipo: h.tipo || 'RIESGO',
                        descripcion: h.descripcion || '',
                        severidad: h.severidad || 'medio',
                    })),
                    analyzedAt: new Date().toISOString(),
                    entityName: creditData?.entity_name || 'General',
                };

                // 6. Guardar en client_data
                progress('Guardando resultado del análisis...');
                const clientData = creditData?.client_data || {};
                clientData.legalAnalysis = analysis;
                await supabase.from('credits').update({ client_data: clientData }).eq('id', creditId);

                // 7. Registrar en historial
                await supabase.from('credit_history').insert({
                    credit_id: creditId,
                    action: 'ANÁLISIS IA',
                    description: `Análisis de documentos legales: ${analysis.status.toUpperCase()} — ${analysis.hallazgos.length} hallazgo(s)`,
                    user_id: user.id,
                    user_name: user.name,
                    user_role: user.role,
                });

                return analysis;
            } catch (e) {
                if (model === models[models.length - 1]) throw new Error('Error al analizar con IA: ' + (e as Error).message);
            }
        }

        throw new Error('No se pudo completar el análisis');
    },
};