import logging
from sqlalchemy.orm import Session
from app.core.database import SessionLocal, engine, Base
from app.models.domain import User
import hashlib

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def hash_password(password: str) -> str:
    # Basic hashing for demo purposes; in production, use passlib with bcrypt
    return hashlib.sha256(password.encode()).hexdigest()

def init_db():
    logger.info("Creating tables...")
    Base.metadata.create_all(bind=engine)
    
    db: Session = SessionLocal()
    
    try:
        # Check if users already exist
        if db.query(User).first():
            logger.info("Database already seeded.")
            return

        logger.info("Seeding users...")
        
        # Company Users
        company_users = [
            User(name="Leonela", username="Leo", company_name="Google", is_company=True, email="leonela@google.com", hashed_password=hash_password("Leonela1_Empresa")),
            User(name="Karen", username="Karen", company_name="Amazon", is_company=True, email="karen@amazon.com", hashed_password=hash_password("Karen1_Empresa")),
            User(name="Liz", username="Liz", company_name="Oracle", is_company=True, email="liz@oracle.com", hashed_password=hash_password("Liz1_Empresa")),
            User(name="Ricardo", username="Rick", company_name="NTTData", is_company=True, email="ricardo@nttdata.com", hashed_password=hash_password("Ricardo1_Empresa")),
        ]

        # Regular Users
        regular_users = [
            User(name="Leonela", username="Leo", is_company=False, email="leonela@gmail.com", hashed_password=hash_password("Leonela1_Regular")),
            User(name="Karen", username="Karen", is_company=False, email="karen@gmail.com", hashed_password=hash_password("Karen1_Regular")),
            User(name="Liz", username="Liz", is_company=False, email="liz@gmail.com", hashed_password=hash_password("Liz1_Regular")),
            User(name="Ricardo", username="Rick", is_company=False, email="ricardo@gmail.com", hashed_password=hash_password("Ricardo1_Regular")),
        ]

        db.add_all(company_users + regular_users)
        db.commit()
        logger.info("Successfully seeded users.")
        
    except Exception as e:
        logger.error(f"Error seeding database: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    init_db()
