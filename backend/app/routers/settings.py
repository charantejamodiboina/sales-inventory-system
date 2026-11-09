from typing import List
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.settings import SystemSetting
from app.models.user import User, UserRole
from app.schemas.settings import SettingResponse, SettingUpdate
from app.utils.dependencies import get_current_user, require_roles

router = APIRouter(prefix="/settings", tags=["Configuration"])

@router.get("", response_model=List[SettingResponse])
def get_all_settings(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    settings_list = db.query(SystemSetting).all()
    result = []
    for s in settings_list:
        result.append(
            SettingResponse(
                id=s.id,
                setting_key=s.setting_key,
                setting_value=s.setting_value,
                description=s.description,
                updated_at=s.updated_at,
                updated_by_username=s.updated_by_user.username if s.updated_by_user else "System"
            )
        )
    return result

@router.get("/{setting_key}", response_model=SettingResponse)
def get_setting(setting_key: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    setting = db.query(SystemSetting).filter(SystemSetting.setting_key == setting_key).first()
    if not setting:
        raise HTTPException(status_code=404, detail=f"Setting '{setting_key}' not found")
    return SettingResponse(
        id=setting.id,
        setting_key=setting.setting_key,
        setting_value=setting.setting_value,
        description=setting.description,
        updated_at=setting.updated_at,
        updated_by_username=setting.updated_by_user.username if setting.updated_by_user else "System"
    )

@router.put("/{setting_key}", response_model=SettingResponse)
def update_setting(
    setting_key: str,
    update_data: SettingUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN))
):
    setting = db.query(SystemSetting).filter(SystemSetting.setting_key == setting_key).first()
    if not setting:
        setting = SystemSetting(
            setting_key=setting_key,
            setting_value=update_data.setting_value,
            description=update_data.description,
            updated_by_user_id=current_user.id,
            updated_at=datetime.utcnow()
        )
        db.add(setting)
    else:
        setting.setting_value = update_data.setting_value
        if update_data.description:
            setting.description = update_data.description
        setting.updated_by_user_id = current_user.id
        setting.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(setting)
    return SettingResponse(
        id=setting.id,
        setting_key=setting.setting_key,
        setting_value=setting.setting_value,
        description=setting.description,
        updated_at=setting.updated_at,
        updated_by_username=current_user.username
    )

