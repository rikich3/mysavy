import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../api';

export default function AppMediaEditor() {
    const location = useLocation();
    const navigate = useNavigate();
    const { videoId, theme, mockedRealtime } = location.state || {};

    const [edl, setEdl] = useState([]);
    const [status, setStatus] = useState('idle'); // idle, analyzing, editing, rendering, done

    useEffect(() => {
        if (mockedRealtime) {
            // Mocking EDL for real-time since we don't have an actual file uploaded to backend in the mockup
            setEdl([
                { id: 1, type: "explaining", start: 0, end: 5, action: "Normal", volume: 100 },
                { id: 2, type: "focused", start: 5, end: 15, action: "Zoom", volume: 50 },
                { id: 3, type: "elocuente", start: 15, end: 20, action: "Normal", volume: 100 }
            ]);
            setStatus('editing');
        } else if (videoId) {
            handleAnalyze();
        }
    }, [videoId, mockedRealtime]);

    const handleAnalyze = async () => {
        setStatus('analyzing');
        try {
            const res = await api.post(`/videos/${videoId}/analyze`);
            const loadedEdl = res.data.edl.map((clip, i) => ({ ...clip, id: i, volume: 100 }));
            setEdl(loadedEdl);
            setStatus('editing');
        } catch (err) {
            console.error(err);
            alert("Analysis failed.");
            setStatus('idle');
        }
    };

    const handleRender = async () => {
        if (mockedRealtime) {
            setStatus('done');
            return;
        }
        
        setStatus('rendering');
        try {
            await api.post(`/videos/${videoId}/render`, edl);
            setStatus('done');
        } catch (err) {
            console.error(err);
            alert("Rendering failed.");
            setStatus('editing');
        }
    };

    const updateClip = (id, field, value) => {
        setEdl(edl.map(c => c.id === id ? { ...c, [field]: value } : c));
    };

    const moveClip = (index, dir) => {
        const newEdl = [...edl];
        const swapIndex = index + dir;
        if (swapIndex < 0 || swapIndex >= newEdl.length) return;
        
        const temp = newEdl[index];
        newEdl[index] = newEdl[swapIndex];
        newEdl[swapIndex] = temp;
        setEdl(newEdl);
    };

    const deleteClip = (id) => {
        setEdl(edl.filter(c => c.id !== id));
    };

    if (status === 'analyzing') return <div style={{ padding: '2rem', textAlign: 'center' }}><h2>Analyzing Video... This may take a moment.</h2></div>;
    if (status === 'rendering') return <div style={{ padding: '2rem', textAlign: 'center' }}><h2>Rendering Final Video... Hang tight!</h2></div>;
    if (status === 'done') return (
        <div style={{ padding: '2rem', textAlign: 'center' }}>
            <h2>Upload Complete!</h2>
            <p>Your exploit for {theme?.title} is now visible to companies.</p>
            <button className="btn btn-primary" onClick={() => navigate('/dashboard')} style={{ marginTop: '1rem' }}>
                Back to Dashboard
            </button>
        </div>
    );

    return (
        <div style={{ padding: '2rem', display: 'flex', gap: '2rem', height: '100vh', boxSizing: 'border-box' }}>
            {/* Left: Video Player Preview (Mocked) */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <h2 style={{ marginBottom: '1rem' }}>App Media Editor</h2>
                <div style={{ 
                    flex: 1, 
                    backgroundColor: 'black', 
                    borderRadius: '0.75rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.5)'
                }}>
                    <p>[ Video Player Preview ]</p>
                </div>
            </div>

            {/* Right: EDL List */}
            <div style={{ width: '450px', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3 style={{ margin: 0 }}>Timeline Clips</h3>
                    <button onClick={handleRender} className="btn btn-primary" style={{ backgroundColor: 'var(--accent-color)' }}>
                        Render & Publish
                    </button>
                </div>
                
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem', paddingRight: '0.5rem' }}>
                    {edl.map((clip, idx) => (
                        <div key={clip.id} className="card" style={{ padding: '1rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                <strong style={{ color: 'var(--primary-color)' }}>{clip.type.toUpperCase()}</strong>
                                <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Clip {idx + 1}</span>
                            </div>
                            
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                <div>
                                    <label style={{ fontSize: '0.75rem' }}>Start (s)</label>
                                    <input 
                                        type="number" 
                                        className="input" 
                                        style={{ marginBottom: 0, padding: '0.25rem 0.5rem' }} 
                                        value={clip.start}
                                        onChange={e => updateClip(clip.id, 'start', parseFloat(e.target.value))}
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.75rem' }}>End (s)</label>
                                    <input 
                                        type="number" 
                                        className="input" 
                                        style={{ marginBottom: 0, padding: '0.25rem 0.5rem' }} 
                                        value={clip.end}
                                        onChange={e => updateClip(clip.id, 'end', parseFloat(e.target.value))}
                                    />
                                </div>
                            </div>
                            
                            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                <select 
                                    className="input" 
                                    style={{ flex: 1, marginBottom: 0, padding: '0.25rem 0.5rem' }}
                                    value={clip.action}
                                    onChange={e => updateClip(clip.id, 'action', e.target.value)}
                                >
                                    <option value="Normal">Normal</option>
                                    <option value="Zoom">Zoom</option>
                                </select>
                                
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                    <label style={{ fontSize: '0.75rem' }}>Audio: {clip.volume}%</label>
                                    <input 
                                        type="range" 
                                        min="0" max="200" 
                                        value={clip.volume}
                                        onChange={e => updateClip(clip.id, 'volume', parseInt(e.target.value))}
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem' }}>
                                <button className="btn" style={{ padding: '0.25rem 0.5rem', border: '1px solid var(--border-color)' }}>▶ Play</button>
                                
                                <div style={{ display: 'flex', gap: '0.25rem' }}>
                                    <button onClick={() => moveClip(idx, -1)} disabled={idx === 0} className="btn" style={{ padding: '0.25rem' }}>↑</button>
                                    <button onClick={() => moveClip(idx, 1)} disabled={idx === edl.length - 1} className="btn" style={{ padding: '0.25rem' }}>↓</button>
                                    <button onClick={() => deleteClip(clip.id)} className="btn" style={{ padding: '0.25rem', color: 'red' }}>✕</button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
