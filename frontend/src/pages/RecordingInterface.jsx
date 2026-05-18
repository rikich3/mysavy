import React, { useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export default function RecordingInterface() {
    const location = useLocation();
    const navigate = useNavigate();
    const theme = location.state?.theme;

    const [isRecording, setIsRecording] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [includeCamera, setIncludeCamera] = useState(true);
    const [statusText, setStatusText] = useState('Setup your recording');

    const sessionRecorderRef = useRef(null);
    const cameraRecorderRef = useRef(null);
    
    const sessionChunksRef = useRef([]);
    const cameraChunksRef = useRef([]);
    
    const handleStartRecording = async () => {
        try {
            sessionChunksRef.current = [];
            cameraChunksRef.current = [];
            
            // Get screen stream
            const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
            
            // Get camera stream if selected
            let cameraStream = null;
            if (includeCamera) {
                cameraStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            }

            // Setup Screen Recorder
            const sessionRecorder = new MediaRecorder(screenStream, { mimeType: 'video/webm' });
            sessionRecorder.ondataavailable = e => {
                if (e.data.size > 0) sessionChunksRef.current.push(e.data);
            };
            sessionRecorderRef.current = sessionRecorder;

            // Setup Camera Recorder
            if (cameraStream) {
                const cameraRecorder = new MediaRecorder(cameraStream, { mimeType: 'video/webm' });
                cameraRecorder.ondataavailable = e => {
                    if (e.data.size > 0) cameraChunksRef.current.push(e.data);
                };
                cameraRecorderRef.current = cameraRecorder;
            }

            // Start recording
            sessionRecorder.start(1000);
            if (cameraRecorderRef.current) cameraRecorderRef.current.start(1000);
            
            setIsRecording(true);
            setStatusText('Recording in progress...');

            // Handle user stopping screen share from browser controls
            screenStream.getVideoTracks()[0].onended = () => {
                handleStopRecording();
            };

        } catch (err) {
            console.error("Error starting recording:", err);
            alert("Failed to capture screen or camera. Please ensure permissions are granted.");
        }
    };

    const handleStopRecording = () => {
        if (!isRecording) return;
        setStatusText('Processing recording...');
        
        const stopRecorder = (recorder) => {
            if (recorder && recorder.state !== 'inactive') {
                recorder.stop();
                recorder.stream.getTracks().forEach(t => t.stop());
            }
        };

        stopRecorder(sessionRecorderRef.current);
        stopRecorder(cameraRecorderRef.current);
        
        setIsRecording(false);
        setIsUploading(true);

        // Wait a brief moment for final chunks to arrive
        setTimeout(uploadRecordings, 500);
    };

    const uploadRecordings = async () => {
        setStatusText('Uploading videos to server...');
        try {
            const formData = new FormData();
            formData.append('theme_id', theme.id);
            
            const sessionBlob = new Blob(sessionChunksRef.current, { type: 'video/webm' });
            formData.append('session_video', sessionBlob, 'session.webm');
            
            if (includeCamera && cameraChunksRef.current.length > 0) {
                const cameraBlob = new Blob(cameraChunksRef.current, { type: 'video/webm' });
                formData.append('camera_video', cameraBlob, 'camera.webm');
            } else {
                // If no camera, just send the session as both for now to satisfy backend requirement
                formData.append('camera_video', sessionBlob, 'camera.webm');
            }

            import api from '../api';
            const res = await api.post('/videos/', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            
            setStatusText('Upload complete! Redirecting to Editor...');
            navigate('/editor', { state: { theme, videoId: res.data.video_id } });
            
        } catch (err) {
            console.error("Upload failed", err);
            setStatusText('Upload failed. Please try again.');
            setIsUploading(false);
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
