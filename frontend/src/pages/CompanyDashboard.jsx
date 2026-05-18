import React, { useEffect, useState } from 'react';
import api from '../api';
import useAuthStore from '../store/authStore';

export default function CompanyDashboard() {
    const { user } = useAuthStore();
    const [themes, setThemes] = useState([]);
    const [newThemeTitle, setNewThemeTitle] = useState('');
    const [newThemeDesc, setNewThemeDesc] = useState('');

    useEffect(() => {
        fetchThemes();
    }, []);

    const fetchThemes = async () => {
        try {
            const res = await api.get('/themes/');
            setThemes(res.data);
        } catch (e) {
            console.error(e);
        }
    };

    const handleCreateTheme = async (e) => {
        e.preventDefault();
        try {
            await api.post(`/themes/?user_id=${user.id}`, {
                title: newThemeTitle,
                description: newThemeDesc
            });
            setNewThemeTitle('');
            setNewThemeDesc('');
            fetchThemes();
        } catch (e) {
            alert('Error creating theme');
        }
    };

    return (
        <div>
            <h2>Company Dashboard - {user.company_name}</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem', marginTop: '2rem' }}>
                <div className="card">
                    <h3>Create New Theme</h3>
                    <form onSubmit={handleCreateTheme} style={{ marginTop: '1rem' }}>
                        <input 
                            className="input" 
                            placeholder="Theme Title (e.g., React Developer)"
                            value={newThemeTitle}
                            onChange={e => setNewThemeTitle(e.target.value)}
                            required
                        />
                        <textarea 
                            className="input" 
                            placeholder="Description of skills required..."
                            value={newThemeDesc}
                            onChange={e => setNewThemeDesc(e.target.value)}
                            rows={4}
                        />
                        <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                            Post Theme
                        </button>
                    </form>
                </div>
                
                <div>
                    <h3>Active Themes</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                        {themes.map(t => (
                            <div key={t.id} className="card">
                                <h4>{t.title}</h4>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{t.description}</p>
                            </div>
                        ))}
                        {themes.length === 0 && <p>No themes posted yet.</p>}
                    </div>
                </div>
            </div>
        </div>
    );
}
