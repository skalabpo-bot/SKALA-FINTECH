
import { Credit, CreditState, User, UserRole, Comment, DashboardStats, Notification, ReportFilters, CreditDocument, NewsItem, Permission, N8nConfig, UserDocument, CreditHistoryItem, Zone, AlliedEntity, ALL_PERMISSIONS } from '../types';
import { ProductionService, INITIAL_STATES, ROLE_DEFAULT_PERMISSIONS, COLOMBIAN_CITIES, COLOMBIAN_BANKS } from './productionService';

export { COLOMBIAN_CITIES, COLOMBIAN_BANKS };

const USE_PRODUCTION = true;

const MockProvider = {
    hasPermission: (user: User, permission: string) => true,
    login: async (email: string, pass: string) => null,
    getCredits: (user: User) => [],
    getUsers: () => [],
    getNotifications: (id: string) => [],
    getStats: (user: User) => ({ totalCredits: 0, disbursedCredits: 0, totalCommissionEarned: 0, byStatus: {} }),
    uploadImage: async (f: File) => '#',
    getEntities: () => [],
    getStates: () => INITIAL_STATES,
    getPagadurias: () => ["COLPENSIONES", "CREMIL", "GOBIERNO"],
    registerGestor: async (d: any) => null,
    approveUser: async (id: string) => {},
    deleteUser: async (id: string) => {},
    markNotificationAsRead: async (id: string) => {},
    markAllNotificationsAsRead: async (uid: string) => {},
    createCredit: async (d: any, u: any) => null,
    updateUserProfile: async (id: string, d: any) => d,
    getRoleDefaults: (r: UserRole) => ROLE_DEFAULT_PERMISSIONS[r],
    getZones: () => [],
    getNews: () => [],
    getCreditLines: async () => ['LIBRE INVERSION', 'COMPRA DE CARTERA', 'RETANQUEO', 'LIBRE + SANEAMIENTO', 'COMPRA + SANEAMIENTO'],
};

export const MockService = USE_PRODUCTION ? (ProductionService as any) : MockProvider;
export { INITIAL_STATES, ROLE_DEFAULT_PERMISSIONS };
