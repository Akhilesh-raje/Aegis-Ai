# Authentication Neutralized for Direct Analyst Access
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List
import hashlib
from backend.engine.webhook_engine import webhook_engine
from backend.api.routes import _state

router = APIRouter(prefix="/api/settings")

class WebhookCreate(BaseModel):
    url: str

class UserCreate(BaseModel):
    username: str
    password: str
    role: str

@router.get("/webhooks")
async def list_webhooks():
    db = _state("db")
    return db.get_webhooks()

@router.post("/webhooks")
async def add_webhook(req: WebhookCreate):
    db = _state("db")
    hook_id = db.add_webhook(req.url, "InternalAnalyst")
    # reload webhooks into the engine memory
    webhook_engine.webhook_urls = [h["url"] for h in db.get_webhooks()]
    db.log_audit_action("system_admin", "add_webhook", req.url, f"Added Webhook ID {hook_id}")
    return {"status": "success", "id": hook_id}

@router.delete("/webhooks/{hook_id}")
async def remove_webhook(hook_id: str):
    db = _state("db")
    db.delete_webhook(hook_id)
    # reload webhooks into the engine memory
    webhook_engine.webhook_urls = [h["url"] for h in db.get_webhooks()]
    db.log_audit_action("system_admin", "remove_webhook", hook_id, f"Deleted Webhook ID {hook_id}")
    return {"status": "success"}

@router.get("/users")
async def list_users():
    db = _state("db")
    return db.get_users()

@router.post("/users")
async def create_user(req: UserCreate):
    db = _state("db")
    password_hash = hashlib.sha256(req.password.encode()).hexdigest()
    
    try:
        user_id = db.add_user(req.username, password_hash, req.role)
        db.log_audit_action("system_admin", "create_user", req.username, f"Assigned role {req.role}")
        return {"status": "success", "id": user_id}
    except Exception as e:
        # Import HTTPException locally since I removed the top-level import
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/users/{target_user_id}")
async def remove_user(target_user_id: str):
    # Import state from the backend package
    from backend.api.routes import _state
    db = _state("db")
    db.delete_user(target_user_id)
    db.log_audit_action("system_admin", "delete_user", target_user_id, f"Deleted user account")
    return {"status": "success"}
