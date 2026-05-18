import React from 'react';
import useAuthStore from '../store/authStore';
import CompanyDashboard from './CompanyDashboard';
import RegularDashboard from './RegularDashboard';
import { LogOut } from 'lucide-react';

export default function Dashboard() {
    const { user, logout } = useAuthStore();

    if (!user) return <div>Loading...</div>;

    return (
        <div>
            <header style={{ 
                padding: '1rem 2rem', 
                borderBottom: '1px solid var(--border-color)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: 'var(--surface-color)'
            }}>
                <h1 style={{ fontSize: '1.25rem', color: 'var(--primary-color)' }}>MISAVY</h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <span>{user.name} ({user.is_company ? user.company_name : 'Regular'})</span>
                    <button onClick={logout} className="btn" style={{ background: 'transparent', color: 'var(--text-muted)' }}>
                        <LogOut size={20} />
                    </button>
                </div>
            </header>
            
            <main style={{ padding: '2rem' }}>
                {user.is_company ? <CompanyDashboard /> : <RegularDashboard />}
            </main>
        </div>
    );
}
