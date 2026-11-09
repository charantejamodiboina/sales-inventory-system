import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.database import Base, get_db
from app.main import app
from app.seed import seed_database
from app.utils.security import create_access_token

TEST_DATABASE_URL = "sqlite:///./test_sales_inventory.db"

test_engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    Base.metadata.drop_all(bind=test_engine)
    Base.metadata.create_all(bind=test_engine)
    
    # Override app get_db
    def override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    seed_database()
    yield
    Base.metadata.drop_all(bind=test_engine)

@pytest.fixture
def client():
    return TestClient(app)

@pytest.fixture
def admin_headers():
    token = create_access_token(data={"sub": "admin", "role": "ADMIN"})
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture
def manager_headers():
    token = create_access_token(data={"sub": "manager", "role": "MANAGER"})
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture
def sales_headers():
    token = create_access_token(data={"sub": "sales", "role": "SALES_USER"})
    return {"Authorization": f"Bearer {token}"}

