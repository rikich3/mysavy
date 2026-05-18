from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.models.domain import Theme, Subscription, User
from app.models.schemas import ThemeCreate, ThemeResponse

router = APIRouter(prefix="/themes", tags=["themes"])

@router.post("/", response_model=ThemeResponse)
def create_theme(theme: ThemeCreate, user_id: int, db: Session = Depends(get_db)):
    # Note: user_id should come from the authenticated token in a real app
    user = db.query(User).filter(User.id == user_id).first()
    if not user or not user.is_company:
        raise HTTPException(status_code=403, detail="Only companies can create themes")
    
    db_theme = Theme(title=theme.title, description=theme.description, creator_id=user_id)
    db.add(db_theme)
    db.commit()
    db.refresh(db_theme)
    return db_theme

@router.get("/", response_model=List[ThemeResponse])
def get_themes(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return db.query(Theme).offset(skip).limit(limit).all()

@router.post("/{theme_id}/subscribe")
def subscribe_to_theme(theme_id: int, user_id: int, db: Session = Depends(get_db)):
    theme = db.query(Theme).filter(Theme.id == theme_id).first()
    if not theme:
        raise HTTPException(status_code=404, detail="Theme not found")
        
    existing_sub = db.query(Subscription).filter(
        Subscription.user_id == user_id, 
        Subscription.theme_id == theme_id
    ).first()
    
    if existing_sub:
        raise HTTPException(status_code=400, detail="Already subscribed")
        
    sub = Subscription(user_id=user_id, theme_id=theme_id)
    db.add(sub)
    db.commit()
    return {"message": "Subscribed successfully"}
