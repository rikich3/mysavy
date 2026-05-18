import { create } from 'zustand';
import api from '../api';

const useAuthStore = create((set) => ({
    user: null,
    token: localStorage.getItem('token') || null,
    isAuthenticated: !!localStorage.getItem('token'),
    
    login: async (email, password) => {
        try {
            const response = await api.post('/auth/login', { email, password });
            const { access_token } = response.data;
            localStorage.setItem('token', access_token);
            set({ token: access_token, isAuthenticated: true });
            return true;
        } catch (error) {
            console.error('Login failed', error);
            return false;
        }
    },

    fetchUser: async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) return;
            const response = await api.get('/auth/me?token=' + token);
            set({ user: response.data, isAuthenticated: true });
        } catch (error) {
            console.error('Failed to fetch user', error);
            localStorage.removeItem('token');
            set({ user: null, token: null, isAuthenticated: false });
        }
    },

    logout: () => {
        localStorage.removeItem('token');
        set({ user: null, token: null, isAuthenticated: false });
    }
}));

export default useAuthStore;
