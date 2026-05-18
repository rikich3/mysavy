import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import useAuthStore from '../store/authStore';

export default function RegularDashboard() {
    const { user } = useAuthStore();
    const navigate = useNavigate();
    const [themes, setThemes] = useState([]);

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

    const handleSubscribe = async (themeId) => {
        try {
            await api.post(`/themes/${themeId}/subscribe?user_id=${user.id}`);
            alert('Subscribed!');
            // Ideally we refresh the user subscriptions here
        } catch (e) {
            alert('Error subscribing or already subscribed');
        }
    };

    return (
        <div>
            <h2>Welcome back, {user.name}</h2>
            <p style={{ color: 'var(--text-muted)' }}>Find themes below to showcase your skills.</p>
            
            <div style={{ marginTop: '2rem' }}>
                <h3>Available Themes</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem', marginTop: '1rem' }}>
                    {themes.map(t => (
                        <div key={t.id} className="card">
                            <h4>{t.title}</h4>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1rem' }}>
                                {t.description}
                            </p>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button onClick={() => handleSubscribe(t.id)} className="btn btn-primary">
                                    Subscribe
                                </button>
                                <button 
                                    onClick={() => navigate('/post', { state: { theme: t }})} 
                                    className="btn" 
                                    style={{ backgroundColor: 'var(--border-color)', color: 'white' }}
                                >
                                    Post Exploit
                                </button>
                            </div>
                        </div>
                    ))}
                    {themes.length === 0 && <p>No themes available.</p>}
                </div>
            </div>
        </div>
    );
}
