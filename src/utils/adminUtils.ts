import { UserProfile } from '../types';

export const SUPER_ADMINS = [
    'brandon.skeeterb',
    'djskeeterb',
    'brandon.skeeterb@gmail.com'
];

export const isSuperAdmin = (user: UserProfile | null | undefined): boolean => {
    if (!user) return false;
    return SUPER_ADMINS.includes(user.username) ||
        (user.email ? SUPER_ADMINS.includes(user.email) : false);
};

export const isAdmin = (user: UserProfile | null | undefined): boolean => {
    if (!user) return false;
    return isSuperAdmin(user) || user.role === 'ADMIN';
};
