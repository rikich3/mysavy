import cv2
import ffmpeg
import tempfile
import os
import json
import re
from openai import OpenAI
from app.core.config import settings

client = OpenAI(api_key=settings.OPENAI_API_KEY)

def extract_audio(video_path: str, output_audio_path: str):
    try:
        (
            ffmpeg
            .input(video_path)
            .output(output_audio_path, acodec='pcm_s16le', ac=1, ar='16k')
            .overwrite_output()
            .run(quiet=True)
        )
    except ffmpeg.Error as e:
        print(f"Error extracting audio: {e.stderr.decode()}")
        raise e

def detect_silence(audio_path: str, min_silence_duration=5.0):
    try:
        out, err = (
            ffmpeg
            .input(audio_path)
            .filter('silencedetect', n='-30dB', d=min_silence_duration)
            .output('null', f='null')
            .run(capture_stderr=True)
        )
        stderr = err.decode('utf-8')
        
        silences = []
        silence_start_re = re.compile(r'silence_start: (\d+(\.\d+)?)')
        silence_end_re = re.compile(r'silence_end: (\d+(\.\d+)?)')
        
        current_start = None
        for line in stderr.splitlines():
            start_match = silence_start_re.search(line)
            if start_match:
                current_start = float(start_match.group(1))
            end_match = silence_end_re.search(line)
            if end_match and current_start is not None:
                current_end = float(end_match.group(1))
                silences.append((current_start, current_end))
                current_start = None
                
        return silences
    except ffmpeg.Error as e:
        print(f"Error in silence detection: {e.stderr.decode()}")
        return []

def detect_session_inactivity(session_video_path: str, diff_threshold=100000, inactivity_duration_frames=150):
    # 150 frames at 30fps = 5 seconds
    cap = cv2.VideoCapture(session_video_path)
    if not cap.isOpened():
        return []

    fps = cap.get(cv2.CAP_PROP_FPS)
    if fps <= 0: fps = 30 # fallback
    inactivity_frames_threshold = int(5.0 * fps) # 5 seconds

    ret, prev_frame = cap.read()
    if not ret: return []
    prev_gray = cv2.cvtColor(prev_frame, cv2.COLOR_BGR2GRAY)

    inactive_periods = []
    current_inactive_start = None
    frame_count = 0

    inactive_streak = 0

    while True:
        ret, frame = cap.read()
        if not ret:
            break
        frame_count += 1
        
        # Calculate diff every N frames to speed up (e.g., process 10 fps)
        if frame_count % int(fps/10) != 0:
            continue

        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        diff = cv2.absdiff(prev_gray, gray)
        diff_sum = diff.sum()
        
        if diff_sum < diff_threshold:
            inactive_streak += int(fps/10)
        else:
            if inactive_streak >= inactivity_frames_threshold:
                # Mark period
                end_time = frame_count / fps
                start_time = end_time - (inactive_streak / fps)
                inactive_periods.append((start_time, end_time))
            inactive_streak = 0
            
        prev_gray = gray

    # Catch tail
    if inactive_streak >= inactivity_frames_threshold:
        end_time = frame_count / fps
        start_time = end_time - (inactive_streak / fps)
        inactive_periods.append((start_time, end_time))

    cap.release()
    return inactive_periods

def check_overlap(t, periods):
    # Check if time t is inside any of the periods (start, end)
    for start, end in periods:
        if start <= t <= end:
            return True
    return False

def analyze_videos(session_video_path: str, camera_video_path: str):
    temp_dir = tempfile.mkdtemp()
    audio_path = os.path.join(temp_dir, "audio.wav")
    
    print("Extracting audio...")
    extract_audio(camera_video_path, audio_path)
    
    print("Detecting silences...")
    silences = detect_silence(audio_path)
    print(f"Silences: {silences}")
    
    print("Detecting inactivity...")
    inactivities = detect_session_inactivity(session_video_path)
    print(f"Inactivities: {inactivities}")
    
    print("Transcribing with OpenAI API...")
    try:
        with open(audio_path, "rb") as audio_file:
            transcript = client.audio.transcriptions.create(
                model="whisper-1", 
                file=audio_file,
                response_format="verbose_json"
            )
            segments = transcript.segments if hasattr(transcript, 'segments') else transcript.get("segments", [])
    except Exception as e:
        print(f"Error calling OpenAI API: {e}")
        segments = []
    
    edl = []
    
    for seg in segments:
        start = seg["start"]
        end = seg["end"]
        mid = (start + end) / 2
        text = seg["text"].strip()
        
        if not text: continue
        
        is_silent = check_overlap(mid, silences) # should be false if there's text, but just in case
        is_inactive = check_overlap(mid, inactivities)
        
        # User is talking because there is text
        # talking + inactive = elocuente
        # talking + active = explaining
        # silent + active = focused (whisper won't return text for pure silence, we handle focused below)
        
        if is_inactive:
            clip_type = "elocuente"
        else:
            clip_type = "explaining"
            
        edl.append({
            "type": clip_type,
            "start": start,
            "end": end,
            "text": text,
            "action": "Normal"
        })

    # Find focused segments (silent + active)
    # We iterate over silences. If a silence doesn't overlap with inactivity, it's 'focused'
    for s_start, s_end in silences:
        mid = (s_start + s_end) / 2
        is_inactive = check_overlap(mid, inactivities)
        if not is_inactive:
            edl.append({
                "type": "focused",
                "start": s_start,
                "end": s_end,
                "text": "[Silent / Active Work]",
                "action": "Normal"
            })

    # Sort edl by start time
    edl.sort(key=lambda x: x["start"])
    
    # Cleanup
    try:
        os.remove(audio_path)
        os.rmdir(temp_dir)
    except:
        pass

    return edl
