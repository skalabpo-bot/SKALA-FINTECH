
import { supabase } from './supabaseClient';
import { 
    Credit, User, UserRole, AlliedEntity, Notification, Permission, Comment, 
    CreditDocument, CreditState, Zone, DashboardStats, ReportFilters, NewsItem, CreditHistoryItem
} from '../types';

export const INITIAL_STATES: CreditState[] = [
  { id: '1', name: 'RADICADO / PENDIENTE REVISIÓN', color: 'bg-gray-500', order: 1, roleResponsible: UserRole.ASISTENTE_OPERATIVO },
  { id: '2', name: 'EN ESTUDIO - ANALISTA', color: 'bg-blue-500', order: 2, roleResponsible: UserRole.ANALISTA },
  { id: '3', name: 'APROBADO - PENDIENTE FIRMA', color: 'bg-indigo-500', order: 3, roleResponsible: UserRole.GESTOR },
  { id: '4.5', name: 'PENDIENTE FIRMA ELECTRÓNICA', color: 'bg-pink-500', order: 4, roleResponsible: UserRole.GESTOR },
  { id: '8', name: 'DESEMBOLSADO', color: 'bg-orange-600', order: 9, roleResponsible: UserRole.GESTOR, isFinal: true },
  { id: '9', name: 'DEVUELTO', color: 'bg-red-500', order: 10, roleResponsible: UserRole.GESTOR, isFinal: true },
];

export const ROLE_DEFAULT_PERMISSIONS: Record<UserRole, Permission[]> = {
    [UserRole.ADMIN]: ['VIEW_DASHBOARD', 'CREATE_CREDIT', 'VIEW_OWN_CREDITS', 'VIEW_ALL_CREDITS', 'VIEW_ASSIGNED_CREDITS', 'EDIT_CREDIT_INFO', 'CHANGE_CREDIT_STATUS', 'ADD_COMMENT', 'MANAGE_USERS', 'MANAGE_NEWS', 'CONFIGURE_SYSTEM', 'VIEW_REPORTS', 'EXPORT_DATA', 'MANAGE_AUTOMATIONS', 'ASSIGN_ANALYST_MANUAL'],
    [UserRole.GESTOR]: ['VIEW_DASHBOARD', 'CREATE_CREDIT', 'VIEW_OWN_CREDITS', 'ADD_COMMENT'],
    [UserRole.ASISTENTE_OPERATIVO]: ['VIEW_DASHBOARD', 'VIEW_ALL_CREDITS', 'VIEW_ASSIGNED_CREDITS', 'CHANGE_CREDIT_STATUS', 'ADD_COMMENT', 'EDIT_CREDIT_INFO'],
    [UserRole.ANALISTA]: ['VIEW_DASHBOARD', 'VIEW_ASSIGNED_CREDITS', 'CHANGE_CREDIT_STATUS', 'ADD_COMMENT', 'EDIT_CREDIT_INFO', 'VIEW_REPORTS', 'EXPORT_DATA'],
    [UserRole.TESORERIA]: ['VIEW_DASHBOARD', 'VIEW_ALL_CREDITS', 'CHANGE_CREDIT_STATUS', 'ADD_COMMENT', 'EXPORT_DATA']
};

const mapCreditFromDB = (c: any): Credit => {
    const clientData = c.client_data || {};
    return {
        id: c.id,
        createdAt: new Date(c.created_at),
        updatedAt: new Date(c.updated_at),
        assignedGestorId: c.assigned_gestor_id,
        statusId: c.status_id,
        ...clientData,
        monto: Number(c.amount || 0),
        plazo: Number(c.term || 0),
        entidadAliada: c.entity_name,
        tasa: Number(c.interest_rate || 0),
        commissionPercentage: Number(c.commission_percent || 0),
        estimatedCommission: Number(c.commission_est || 0),
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
        if (user.role === UserRole.ADMIN) return true;
        const perms = user.permissions?.length ? user.permissions : ROLE_DEFAULT_PERMISSIONS[user.role] || [];
        return perms.includes(permission as any);
    },

    login: async (email: string, password?: string) => {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password: password || '' });
        if (error || !data.user) throw new Error("Credenciales inválidas.");
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', data.user.id).single();
        if (!profile || profile.status === 'REJECTED') throw new Error("Acceso denegado.");
        if (profile.status === 'PENDING') return null;
        return mapUserFromDB(profile);
    },

    registerGestor: async (userData: any) => {
        const { email, password, name, phone, cedula, city, banco, tipoCuenta, numeroCuenta, registration_docs } = userData;

        console.log('🚀 Intentando registrar usuario:', { email, name });

        // SIMPLIFICADO: Solo metadatos mínimos (los documentos se guardan después)
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: name,
                    phone: phone || '',
                    cedula: cedula || '',
                    city: city || '',
                    role: 'GESTOR',
                    status: 'PENDING'
                }
            }
        });

        if (error) {
            console.error('❌ Error de Supabase Auth:', error);
            console.error('Detalles del error:', {
                message: error.message,
                status: error.status,
                name: error.name
            });
            throw new Error(error.message || 'Error al registrar usuario');
        }

        // Verificación de respaldo para asegurar que el perfil se cree
        if (data.user) {
           console.log('✅ Usuario creado en Auth:', data.user.id);

           // Esperar un momento para que el trigger termine
           await new Promise(resolve => setTimeout(resolve, 500));

           // Upsert para asegurar que el perfil exista con todos los datos
           const { error: profileError } = await supabase.from('profiles').upsert({
               id: data.user.id,
               full_name: name,
               email: email,
               role: 'GESTOR',
               status: 'PENDING',
               phone: phone || '',
               cedula: cedula || '',
               city: city || '',
               bank_details: { banco: banco || '', tipoCuenta: tipoCuenta || 'AHORROS', numeroCuenta: numeroCuenta || '' },
               registration_docs: registration_docs || [],
               updated_at: new Date().toISOString()
           });

           if (profileError) {
               console.error("❌ Error creando/actualizando perfil:", profileError);
               // No lanzar error, el usuario ya fue creado en auth
           } else {
               console.log('✅ Perfil creado/actualizado correctamente');
           }

           // CREAR NOTIFICACIÓN PARA TODOS LOS ADMINISTRADORES
           try {
               await ProductionService.notifyAdminsNewGestor(data.user.id, name);
               console.log('✅ Notificaciones enviadas a admins');
           } catch (notifError) {
               console.error('⚠️ Error al enviar notificaciones:', notifError);
               // No es crítico si falla
           }
        }

        return data.user;
    },

    notifyAdminsNewGestor: async (gestorId: string, gestorName: string) => {
        // Obtener todos los administradores
        const { data: admins } = await supabase
            .from('profiles')
            .select('id')
            .eq('role', 'ADMIN')
            .eq('status', 'ACTIVE');

        if (!admins || admins.length === 0) return;

        // Crear una notificación para cada administrador
        const notifications = admins.map(admin => ({
            user_id: admin.id,
            title: 'Nueva Solicitud de Gestor',
            message: `${gestorName} ha solicitado acceso como Gestor Aliado. Revisa y aprueba su solicitud.`,
            type: 'info',
            is_read: false,
            credit_id: null
        }));

        await supabase.from('notifications').insert(notifications);
    },

    createCredit: async (formData: any, currentUser: User) => {
        const { monto, plazo, entidadAliada, tasa, documents, ...rest } = formData;
        const entities = await ProductionService.getEntities();
        const entity = entities.find(e => e.name === entidadAliada);
        const rateConfig = entity?.rates.find((r: any) => r.rate === Number(tasa));
        const commPercent = rateConfig?.commission || 5;
        const commEst = (Number(monto) * commPercent) / 100;

        const { data, error } = await supabase.from('credits').insert({
            assigned_gestor_id: currentUser.id,
            status_id: '1', 
            amount: Number(monto),
            term: Number(plazo),
            entity_name: entidadAliada,
            interest_rate: Number(tasa),
            commission_percent: commPercent,
            commission_est: commEst,
            client_data: { ...rest, nombreCompleto: `${rest.nombres} ${rest.apellidos}` }
        }).select().single();

        if (error) throw error;

        // Trazabilidad inicial mandatoria
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
        return data;
    },

    updateCreditData: async (creditId: string, newData: any, userId: string) => {
        const { monto, plazo, entidadAliada, tasa, ...rest } = newData;
        const { error } = await supabase.from('credits').update({
            amount: Number(monto),
            term: Number(plazo),
            entity_name: entidadAliada,
            interest_rate: Number(tasa),
            client_data: { ...rest, nombreCompleto: `${rest.nombres} ${rest.apellidos}` },
            updated_at: new Date().toISOString()
        }).eq('id', creditId);
        
        if (error) throw error;
        
        await supabase.from('credit_history').insert({ 
            credit_id: creditId, 
            user_id: userId, 
            action: 'EDICIÓN', 
            description: 'Actualización de campos maestros del expediente.' 
        });
    },

    getCredits: async (user: User) => {
        let query = supabase.from('credits').select('*, profiles:assigned_gestor_id(full_name, phone)').order('created_at', { ascending: false });
        if (user.role === UserRole.GESTOR) query = query.eq('assigned_gestor_id', user.id);
        const { data, error } = await query;
        if (error) throw error;
        return (data || []).map(mapCreditFromDB);
    },

    getCreditById: async (id: string) => {
      const { data: c } = await supabase.from('credits').select('*, profiles:assigned_gestor_id(full_name, phone)').eq('id', id).single();
      if (!c) return undefined;
      const credit = mapCreditFromDB(c);
      
      const { data: coms } = await supabase.from('comments').select(`*, profiles(full_name, role)`).eq('credit_id', id).order('created_at', { ascending: true });
      credit.comments = (coms || []).map(com => ({ id: com.id, userId: com.user_id, userName: com.profiles?.full_name || 'Sistema', userRole: com.profiles?.role as UserRole, text: com.text, timestamp: new Date(com.created_at), attachmentName: com.attachment_name, attachmentUrl: com.attachment_url, isSystem: com.is_system }));
      
      const { data: docs } = await supabase.from('documents').select('*').eq('credit_id', id).order('created_at', { ascending: false });
      credit.documents = (docs || []).map(d => ({ id: d.id, type: d.type as any, name: d.name, url: d.url, uploadedAt: new Date(d.created_at) }));
      
      // CARGA DE TRAZABILIDAD (CRÍTICO)
      const { data: hist } = await supabase.from('credit_history').select('*, profiles(full_name, role)').eq('credit_id', id).order('created_at', { ascending: false });
      credit.history = (hist || []).map(h => ({ id: h.id, date: new Date(h.created_at), action: h.action, description: h.description, userId: h.user_id, userName: h.profiles?.full_name, userRole: h.profiles?.role }));

      return credit;
    },

    updateCreditStatus: async (creditId: string, statusId: string, user: User, comment: string) => {
        const stateName = INITIAL_STATES.find(s => s.id === statusId)?.name || 'N/A';
        await supabase.from('credits').update({ status_id: statusId, updated_at: new Date().toISOString() }).eq('id', creditId);
        
        await supabase.from('credit_history').insert({ 
            credit_id: creditId, 
            user_id: user.id, 
            action: 'CAMBIO ESTADO', 
            description: `Estado cambiado a ${stateName}. Motivo: ${comment}` 
        });
        
        await supabase.from('comments').insert({ 
            credit_id: creditId, 
            user_id: user.id, 
            text: `Nuevo Estado: ${stateName}.`, 
            is_system: true 
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
        
        if (url && file) {
            // SINCRONIZACIÓN AUTOMÁTICA CON EXPEDIENTE DIGITAL
            await supabase.from('documents').insert({
                credit_id: creditId,
                name: file.name,
                url: url,
                type: 'ADJUNTO_CHAT'
            });
        }
    },

    uploadImage: async (file: File) => {
        const fileName = `${Date.now()}_${file.name.replace(/\s/g, '_')}`;
        const { error } = await supabase.storage.from('skala-bucket').upload(fileName, file);
        if (error) throw error;
        const { data: { publicUrl } } = supabase.storage.from('skala-bucket').getPublicUrl(fileName);
        return publicUrl;
    },

    getUsers: async () => {
        const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
        return (data || []).map(mapUserFromDB);
    },

    getEntities: async () => {
        const { data } = await supabase.from('allied_entities').select('*');
        return data || [];
    },

    getNews: async () => {
        const { data } = await supabase.from('news').select('*').order('created_at', { ascending: false });
        return (data || []).map(n => ({ ...n, createdAt: new Date(n.created_at) }));
    },

    getNotifications: async (userId: string) => {
        const { data } = await supabase.from('notifications').select('*').eq('user_id', userId).order('created_at', { ascending: false });
        return data || [];
    },

    getStats: async (user: User): Promise<DashboardStats> => {
        const credits = await ProductionService.getCredits(user);
        const stats: DashboardStats = {
            totalCredits: credits.length,
            disbursedCredits: credits.filter(c => c.statusId === '8').length,
            pendingCredits: credits.filter(c => !['8', '9'].includes(c.statusId)).length,
            returnedCredits: credits.filter(c => c.statusId === '9').length,
            totalAmountSolicited: credits.reduce((acc, c) => acc + (c.monto || 0), 0),
            totalAmountDisbursed: credits.filter(c => c.statusId === '8').reduce((acc, c) => acc + (c.monto || 0), 0),
            totalCommissionEarned: credits.filter(c => c.statusId === '8').reduce((acc, c) => acc + (c.estimatedCommission || 0), 0),
            byStatus: {}
        };
        credits.forEach(c => {
            const statusName = INITIAL_STATES.find(s => s.id === c.statusId)?.name || 'Otros';
            stats.byStatus[statusName] = (stats.byStatus[statusName] || 0) + 1;
        });
        return stats;
    },

    getPagadurias: async () => ["COLPENSIONES", "CREMIL", "CASUR", "FIDUPREVISORA", "GOBIERNO", "PRIVADA"],
    getZones: async () => { const { data } = await supabase.from('zones').select('*'); return data || []; },
    updateUserProfile: async (id: string, d: any) => { await supabase.from('profiles').update({ full_name: d.name, phone: d.phone, cedula: d.cedula, city: d.city, bank_details: { banco: d.banco, tipoCuenta: d.tipoCuenta, numeroCuenta: d.numeroCuenta } }).eq('id', id); return { ...d, id }; },
    approveUser: async (id: string) => {
        await supabase.from('profiles').update({ status: 'ACTIVE' }).eq('id', id);
        // Marcar como leídas las notificaciones de solicitud de gestor para todos los admins
        await supabase.from('notifications')
            .update({ is_read: true })
            .eq('title', 'Nueva Solicitud de Gestor')
            .ilike('message', `%ha solicitado acceso%`);
    },
    rejectUser: async (id: string) => {
        await supabase.from('profiles').update({ status: 'REJECTED' }).eq('id', id);
        // Marcar como leídas las notificaciones de solicitud de gestor para todos los admins
        await supabase.from('notifications')
            .update({ is_read: true })
            .eq('title', 'Nueva Solicitud de Gestor')
            .ilike('message', `%ha solicitado acceso%`);
    },
    deleteUser: async (id: string) => { await supabase.from('profiles').delete().eq('id', id); },
    markNotificationAsRead: async (id: string) => { await supabase.from('notifications').update({ is_read: true }).eq('id', id); },
    markAllNotificationsAsRead: async (uid: string) => { await supabase.from('notifications').update({ is_read: true }).eq('user_id', uid); },
    getStates: () => INITIAL_STATES,
    getRoleDefaults: (role: UserRole) => ROLE_DEFAULT_PERMISSIONS[role],
    getN8nConfig: () => ({ apiKey: '', automations: [] }),
    updateN8nConfig: (c: any) => {},
    testAutomation: (u: string) => {},
    addState: async (name: string, role: UserRole) => { await supabase.from('credit_states_config').insert({ name, role_responsible: role }); },
    deleteState: async (id: string) => { await supabase.from('credit_states_config').delete().eq('id', id); },
    reorderState: async () => {},
    addEntity: async (e: any) => { await supabase.from('allied_entities').insert({ name: e.name, rates: e.rates }); },
    deleteEntity: async (id: string) => { await supabase.from('allied_entities').delete().eq('id', id); },
    addZone: async (n: string) => { await supabase.from('zones').insert({ name: n, cities: [] }); },
    deleteZone: async (id: string) => { await supabase.from('zones').delete().eq('id', id); },
    updateZoneCities: async (id: string, c: string[]) => { await supabase.from('zones').update({ cities: c }).eq('id', id); },
    addNews: async (n: any) => { await supabase.from('news').insert({ title: n.title, description: n.description, image_url: n.imageUrl }); },
    deleteNews: async (id: string) => { await supabase.from('news').delete().eq('id', id); }
};
