from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.domain import Video, User, Theme
import os
import uuid
import shutil
from typing import Optional

router = APIRouter(prefix="/videos", tags=["videos"])

UPLOAD_DIR = "videos/"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/upload")
async def upload_video(
    title: str = Form(...),
    user_id: int = Form(...),
    theme_id: int = Form(...),
    session_file: Optional[UploadFile] = File(None),
    camera_file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    theme = db.query(Theme).filter(Theme.id == theme_id).first()
    if not theme:
        raise HTTPException(status_code=404, detail="Theme not found")

    video_id = str(uuid.uuid4())
    session_path = None
    camera_path = None

    if session_file:
        session_path = os.path.join(UPLOAD_DIR, f"{video_id}_session_{session_file.filename}")
        with open(session_path, "wb") as buffer:
            shutil.copyfileobj(session_file.file, buffer)

    if camera_file:
        camera_path = os.path.join(UPLOAD_DIR, f"{video_id}_camera_{camera_file.filename}")
        with open(camera_path, "wb") as buffer:
            shutil.copyfileobj(camera_file.file, buffer)

    db_video = Video(
        title=title,
        user_id=user_id,
        theme_id=theme_id,
        source_session_path=session_path,
        source_camera_path=camera_path,
        status="pending"
    )
    
    db.add(db_video)
    db.commit()
    db.refresh(db_video)
    
    return {"message": "Files uploaded successfully", "video_id": db_video.id}

@router.post("/{video_id}/analyze")
def analyze_video(video_id: int, db: Session = Depends(get_db)):
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
        
    # In a real app, this should be a Celery task.
    # For demo purposes, we will call it synchronously.
    from app.services.analyze_service import analyze_videos
    import json
    
    try:
        edl = analyze_videos(video.source_session_path, video.source_camera_path)
        video.edl_data = json.dumps(edl)
        video.status = "analyzed"
        db.commit()
        return {"edl": edl}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{video_id}/render")
def render_video_endpoint(video_id: int, edl: list, db: Session = Depends(get_db)):
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
        
    from app.services.render_service import render_video
    import json
    
    try:
        # Save the finalized EDL
        video.edl_data = json.dumps(edl)
        output_path = os.path.join(UPLOAD_DIR, f"{video_id}_final.mp4")
        
        # In a real app, send to Celery. Here we do it sync.
        final_path = render_video(video.source_session_path, video.source_camera_path, edl, output_path)
        
        video.final_video_path = final_path
        video.status = "rendered"
        db.commit()
        return {"message": "Video rendered successfully", "final_path": final_path}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
