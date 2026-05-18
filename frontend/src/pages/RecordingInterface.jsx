import React, { useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export default function RecordingInterface() {
    const location = useLocation();
    const navigate = useNavigate();
    const theme = location.state?.theme;

    const [isRecording, setIsRecording] = useState(false);
    const [includeCamera, setIncludeCamera] = useState(true);
    const [statusText, setStatusText] = useState('Setup your recording');

    const mediaRecorderRef = useRef(null);
    const [recordedChunks, setRecordedChunks] = useState([]);
    
    const handleStartRecording = async () => {
        try {
            // Request Screen
            const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
            
            // Note: A full implementation would use a Canvas to composite screen+camera, 
            // or record them as separate streams using two MediaRecorders.
            // For this UI mockup, we will record just the screen as the "Session" 
            // and simulate the PiP or secondary camera recording.

            const options = { mimeType: 'video/webm' };
            const mediaRecorder = new MediaRecorder(screenStream, options);

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    setRecordedChunks(prev => [...prev, event.data]);
                }
            };

            mediaRecorder.onstop = () => {
                setStatusText('Recording stopped. Ready to upload.');
            };

            mediaRecorderRef.current = mediaRecorder;
            mediaRecorder.start();
            setIsRecording(true);
            setStatusText('Recording in progress...');
        } catch (err) {
            console.error("Error starting recording:", err);
            alert("Failed to capture screen.");
        }
    };

    const handleStopRecording = () => {
        if (mediaRecorderRef.current) {
            mediaRecorderRef.current.stop();
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
            setIsRecording(false);
            
            // Navigate to editor (mocking the upload step for now)
            setTimeout(() => {
                navigate('/editor', { state: { theme, mockedRealtime: true } });
            }, 1000);
        }
    };

    return (
        <div style={{ maxWidth: '600px', margin: '0 auto', paddingTop: '2rem', textAlign: 'center' }}>
            <div className="card">
                <h2>Real Time Recording for {theme?.title}</h2>
                <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>{statusText}</p>
                
                {!isRecording ? (
                    <div>
                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                                <input 
                                    type="checkbox" 
                                    checked={includeCamera} 
                                    onChange={e => setIncludeCamera(e.target.checked)}
                                />
                                Include Camera & Audio
                            </label>
                        </div>
                        <button onClick={handleStartRecording} className="btn btn-primary" style={{ backgroundColor: 'var(--accent-color)' }}>
                            Start Screen Share & Record
                        </button>
                    </div>
                ) : (
                    <div>
                        <div style={{ 
                            width: '50px', height: '50px', borderRadius: '50%', 
                            backgroundColor: 'red', margin: '0 auto 2rem', 
                            animation: 'pulse 1.5s infinite' 
                        }} />
                        <button onClick={handleStopRecording} className="btn btn-primary" style={{ backgroundColor: 'red' }}>
                            Stop Recording
                        </button>
                        
                        <style>{`
                            @keyframes pulse {
                                0% { opacity: 1; transform: scale(1); }
                                50% { opacity: 0.5; transform: scale(1.1); }
                                100% { opacity: 1; transform: scale(1); }
                            }
                        `}</style>
                    </div>
                )}
            </div>
        </div>
    );
}
