import ffmpeg
import os
import tempfile

def create_srt_from_edl(edl, output_srt_path):
    # EDL is expected to be a list of dicts: {start: float, end: float, text: str, type: str}
    with open(output_srt_path, "w") as f:
        for idx, clip in enumerate(edl):
            if not clip.get("text") or clip.get("type") == "focused":
                continue
                
            start_time = format_time(clip["start"])
            end_time = format_time(clip["end"])
            
            f.write(f"{idx+1}\n")
            f.write(f"{start_time} --> {end_time}\n")
            f.write(f"{clip['text']}\n\n")

def format_time(seconds):
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    msecs = int((seconds - int(seconds)) * 1000)
    return f"{hours:02d}:{minutes:02d}:{secs:02d},{msecs:03d}"

def render_video(session_video_path, camera_video_path, edl, output_path):
    # This is a simplified sequential renderer. A true FFMPEG complex filtergraph 
    # for arbitrary EDLs can be extremely complex, so we will generate individual 
    # clip segments and then concat them.

    temp_dir = tempfile.mkdtemp()
    clip_paths = []
    
    # Check if files exist
    if not os.path.exists(session_video_path) or not os.path.exists(camera_video_path):
        raise FileNotFoundError("Source videos missing.")

    try:
        for idx, clip in enumerate(edl):
            start = clip["start"]
            end = clip["end"]
            duration = end - start
            if duration <= 0: continue

            out_clip_path = os.path.join(temp_dir, f"clip_{idx}.mp4")
            
            sess_input = ffmpeg.input(session_video_path, ss=start, t=duration)
            cam_input = ffmpeg.input(camera_video_path, ss=start, t=duration)

            if clip["type"] == "elocuente":
                # Camera full screen
                video = cam_input.video
                audio = cam_input.audio
                
            elif clip["type"] == "explaining":
                # Session full screen, Camera PiP top right
                # Resize camera to 1/4th width
                sess_vid = sess_input.video
                cam_vid = cam_input.video.filter('scale', 'iw/4', '-1')
                # Overlay PiP at x=W-w-10, y=10
                video = ffmpeg.overlay(sess_vid, cam_vid, x='main_w-overlay_w-10', y=10)
                audio = cam_input.audio
                
            else: # focused
                # Session full screen
                video = sess_input.video
                audio = cam_input.audio # keep audio even if silent, to match concat stream types

            # Subtitles can be added later or per clip. Let's do per clip if there's text
            # Actually, generating a full SRT and applying it at the end is better, 
            # but concat changes timestamps. We will just render the clips, concat, 
            # and then add subtitles to the concatenated video.
            
            (
                ffmpeg
                .output(video, audio, out_clip_path, acodec='aac', vcodec='libx264', strict='experimental')
                .overwrite_output()
                .run(quiet=True)
            )
            
            clip_paths.append(out_clip_path)

        # Concat clips
        concat_file_path = os.path.join(temp_dir, "concat.txt")
        with open(concat_file_path, "w") as f:
            for p in clip_paths:
                f.write(f"file '{p}'\n")

        concat_out_path = os.path.join(temp_dir, "concat_out.mp4")
        (
            ffmpeg
            .input(concat_file_path, format='concat', safe=0)
            .output(concat_out_path, c='copy')
            .overwrite_output()
            .run(quiet=True)
        )
        
        # Add subtitles
        srt_path = os.path.join(temp_dir, "subs.srt")
        create_srt_from_edl(edl, srt_path)
        
        (
            ffmpeg
            .input(concat_out_path)
            .output(output_path, vf=f"subtitles={srt_path}")
            .overwrite_output()
            .run(quiet=True)
        )
        
    finally:
        # Cleanup
        for p in clip_paths:
            try: os.remove(p)
            except: pass
        try: os.remove(os.path.join(temp_dir, "concat.txt"))
        except: pass
        try: os.remove(os.path.join(temp_dir, "concat_out.mp4"))
        except: pass
        try: os.remove(os.path.join(temp_dir, "subs.srt"))
        except: pass
        try: os.rmdir(temp_dir)
        except: pass

    return output_path
