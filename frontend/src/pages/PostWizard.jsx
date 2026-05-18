import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import api from '../api';

export default function PostWizard() {
    const { user } = useAuthStore();
    const location = useLocation();
    const navigate = useNavigate();
    const theme = location.state?.theme;

    const [step, setStep] = useState(1);
    const [style, setStyle] = useState('default');
    const [mode, setMode] = useState(''); // 'sources' or 'realtime'

    // For file uploads
    const [sessionFile, setSessionFile] = useState(null);
    const [cameraFile, setCameraFile] = useState(null);
    const [isUploading, setIsUploading] = useState(false);

    if (!theme) {
        return <div>No theme selected. Please go back.</div>;
    }

    const handleFileUpload = async (e) => {
        e.preventDefault();
        setIsUploading(true);
        const formData = new FormData();
        formData.append('title', `${user.username} Exploit for ${theme.title}`);
        formData.append('user_id', user.id);
        formData.append('theme_id', theme.id);
        if (sessionFile) formData.append('session_file', sessionFile);
        if (cameraFile) formData.append('camera_file', cameraFile);

        try {
            const res = await api.post('/videos/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            // Proceed to App Media Editor
            navigate('/editor', { state: { videoId: res.data.video_id, theme } });
        } catch (err) {
            console.error(err);
            alert('Upload failed');
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div style={{ maxWidth: '600px', margin: '0 auto', paddingTop: '2rem' }}>
            <div className="card">
                <h2>Post on: {theme.title}</h2>
                
                {step === 1 && (
                    <div style={{ marginTop: '1.5rem' }}>
                        <h3>1. Select Editing Style</h3>
                        <select 
                            className="input" 
                            style={{ marginTop: '0.5rem' }}
                            value={style} 
                            onChange={e => setStyle(e.target.value)}
                        >
                            <option value="default">Default Style (Requires Camera & Audio)</option>
                        </select>
                        <button onClick={() => setStep(2)} className="btn btn-primary" style={{ marginTop: '1rem' }}>
                            Next
                        </button>
                    </div>
                )}

                {step === 2 && (
                    <div style={{ marginTop: '1.5rem' }}>
                        <h3>2. Choose Mode</h3>
                        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                            <button 
                                className={`btn ${mode === 'sources' ? 'btn-primary' : ''}`}
                                style={mode !== 'sources' ? { border: '1px solid var(--border-color)' } : {}}
                                onClick={() => setMode('sources')}
                            >
                                I have sources
                            </button>
                            <button 
                                className={`btn ${mode === 'realtime' ? 'btn-primary' : ''}`}
                                style={mode !== 'realtime' ? { border: '1px solid var(--border-color)' } : {}}
                                onClick={() => setMode('realtime')}
                            >
                                Real Time Recording
                            </button>
                        </div>
                        
                        <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                            <button onClick={() => setStep(1)} className="btn" style={{ border: '1px solid var(--border-color)' }}>
                                Back
                            </button>
                            <button 
                                onClick={() => mode === 'realtime' ? navigate('/record', { state: { theme }}) : setStep(3)} 
                                className="btn btn-primary"
                                disabled={!mode}
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}

                {step === 3 && mode === 'sources' && (
                    <div style={{ marginTop: '1.5rem' }}>
                        <h3>3. Upload Sources</h3>
                        <form onSubmit={handleFileUpload} style={{ marginTop: '1rem' }}>
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem' }}>Session Footage</label>
                                <input type="file" accept="video/*" onChange={e => setSessionFile(e.target.files[0])} required />
                            </div>
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem' }}>Camera Footage (Must match length)</label>
                                <input type="file" accept="video/*" onChange={e => setCameraFile(e.target.files[0])} required />
                            </div>
                            
                            <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                                <button type="button" onClick={() => setStep(2)} className="btn" style={{ border: '1px solid var(--border-color)' }}>
                                    Back
                                </button>
                                <button type="submit" className="btn btn-primary" disabled={isUploading}>
                                    {isUploading ? 'Uploading...' : 'Upload & Edit'}
                                </button>
                            </div>
                        </form>
                    </div>
                )}
            </div>
        </div>
    );
}
