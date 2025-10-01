from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timezone, date

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Helper functions for MongoDB date serialization
def prepare_for_mongo(data):
    """Convert date objects to ISO format strings for MongoDB storage"""
    if isinstance(data, dict):
        for key, value in data.items():
            if isinstance(value, date):
                data[key] = value.isoformat()
    return data

def parse_from_mongo(item):
    """Convert ISO format strings back to date objects"""
    if isinstance(item.get('date'), str):
        try:
            item['date'] = datetime.fromisoformat(item['date']).date()
        except:
            pass
    return item

def model_to_mongo_dict(model_instance):
    """Convert Pydantic model to MongoDB-compatible dict"""
    data = model_instance.dict()
    return prepare_for_mongo(data)

# Define Models
class JournalEntry(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    date: date
    content: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class JournalEntryCreate(BaseModel):
    date: date
    content: str

class JournalEntryUpdate(BaseModel):
    content: str

class LifeTask(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: Optional[str] = None
    category: Optional[str] = "General"
    target_value: int = 100  # Default target for completion
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class LifeTaskCreate(BaseModel):
    name: str
    description: Optional[str] = None
    category: Optional[str] = "General"
    target_value: int = 100

class LifeTaskUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    target_value: Optional[int] = None

class ProgressEntry(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    task_id: str
    date: date
    progress_value: int  # Progress value (0-100 or custom target)
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ProgressEntryCreate(BaseModel):
    task_id: str
    date: date
    progress_value: int
    notes: Optional[str] = None

# Journal Entry Routes
@api_router.post("/journal-entries", response_model=JournalEntry)
async def create_journal_entry(entry: JournalEntryCreate):
    entry_dict = entry.dict()
    entry_dict = prepare_for_mongo(entry_dict)
    journal_obj = JournalEntry(**entry_dict)
    
    # Check if entry already exists for this date
    existing = await db.journal_entries.find_one({"date": entry_dict["date"]})
    if existing:
        raise HTTPException(status_code=400, detail="Journal entry already exists for this date")
    
    # Convert to MongoDB-compatible format
    mongo_dict = model_to_mongo_dict(journal_obj)
    await db.journal_entries.insert_one(mongo_dict)
    return journal_obj

@api_router.get("/journal-entries", response_model=List[JournalEntry])
async def get_journal_entries():
    entries = await db.journal_entries.find().sort("date", -1).to_list(1000)
    return [JournalEntry(**parse_from_mongo(entry)) for entry in entries]

@api_router.get("/journal-entries/{entry_date}")
async def get_journal_entry_by_date(entry_date: str):
    entry = await db.journal_entries.find_one({"date": entry_date})
    if not entry:
        return None
    return JournalEntry(**parse_from_mongo(entry))

@api_router.put("/journal-entries/{entry_date}", response_model=JournalEntry)
async def update_journal_entry(entry_date: str, entry_update: JournalEntryUpdate):
    existing = await db.journal_entries.find_one({"date": entry_date})
    if not existing:
        raise HTTPException(status_code=404, detail="Journal entry not found")
    
    update_dict = entry_update.dict(exclude_unset=True)
    update_dict["updated_at"] = datetime.now(timezone.utc)
    
    await db.journal_entries.update_one(
        {"date": entry_date}, 
        {"$set": update_dict}
    )
    
    updated_entry = await db.journal_entries.find_one({"date": entry_date})
    return JournalEntry(**parse_from_mongo(updated_entry))

@api_router.delete("/journal-entries/{entry_date}")
async def delete_journal_entry(entry_date: str):
    result = await db.journal_entries.delete_one({"date": entry_date})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Journal entry not found")
    return {"message": "Journal entry deleted successfully"}

# Life Task Routes
@api_router.post("/life-tasks", response_model=LifeTask)
async def create_life_task(task: LifeTaskCreate):
    task_obj = LifeTask(**task.dict())
    await db.life_tasks.insert_one(task_obj.dict())
    return task_obj

@api_router.get("/life-tasks", response_model=List[LifeTask])
async def get_life_tasks():
    tasks = await db.life_tasks.find().sort("created_at", -1).to_list(1000)
    return [LifeTask(**task) for task in tasks]

@api_router.put("/life-tasks/{task_id}", response_model=LifeTask)
async def update_life_task(task_id: str, task_update: LifeTaskUpdate):
    existing = await db.life_tasks.find_one({"id": task_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Task not found")
    
    update_dict = task_update.dict(exclude_unset=True)
    await db.life_tasks.update_one({"id": task_id}, {"$set": update_dict})
    
    updated_task = await db.life_tasks.find_one({"id": task_id})
    return LifeTask(**updated_task)

@api_router.delete("/life-tasks/{task_id}")
async def delete_life_task(task_id: str):
    # Also delete all progress entries for this task
    await db.progress_entries.delete_many({"task_id": task_id})
    
    result = await db.life_tasks.delete_one({"id": task_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"message": "Task deleted successfully"}

# Progress Entry Routes
@api_router.post("/progress-entries", response_model=ProgressEntry)
async def create_progress_entry(entry: ProgressEntryCreate):
    entry_dict = entry.dict()
    entry_dict = prepare_for_mongo(entry_dict)
    
    # Check if progress entry already exists for this task and date
    existing = await db.progress_entries.find_one({
        "task_id": entry_dict["task_id"], 
        "date": entry_dict["date"]
    })
    
    if existing:
        # Update existing entry
        update_dict = {"progress_value": entry_dict["progress_value"]}
        if entry_dict.get("notes"):
            update_dict["notes"] = entry_dict["notes"]
        
        await db.progress_entries.update_one(
            {"task_id": entry_dict["task_id"], "date": entry_dict["date"]},
            {"$set": update_dict}
        )
        updated_entry = await db.progress_entries.find_one({
            "task_id": entry_dict["task_id"], 
            "date": entry_dict["date"]
        })
        return ProgressEntry(**parse_from_mongo(updated_entry))
    else:
        progress_obj = ProgressEntry(**entry_dict)
        await db.progress_entries.insert_one(progress_obj.dict())
        return progress_obj

@api_router.get("/progress-entries/{task_id}")
async def get_progress_entries_by_task(task_id: str):
    entries = await db.progress_entries.find({"task_id": task_id}).sort("date", -1).to_list(1000)
    return [ProgressEntry(**parse_from_mongo(entry)) for entry in entries]

@api_router.get("/progress-entries/week/{task_id}")
async def get_weekly_progress(task_id: str):
    # Get last 7 days of progress for a task
    from datetime import timedelta
    end_date = date.today()
    start_date = end_date - timedelta(days=6)  # Last 7 days
    
    entries = await db.progress_entries.find({
        "task_id": task_id,
        "date": {"$gte": start_date.isoformat(), "$lte": end_date.isoformat()}
    }).sort("date", 1).to_list(7)
    
    return [ProgressEntry(**parse_from_mongo(entry)) for entry in entries]

# Dashboard/Stats Routes
@api_router.get("/stats/dashboard")
async def get_dashboard_stats():
    total_entries = await db.journal_entries.count_documents({})
    total_tasks = await db.life_tasks.count_documents({})
    
    # Get today's journal entry
    today = date.today().isoformat()
    today_entry = await db.journal_entries.find_one({"date": today})
    
    # Get today's progress entries
    today_progress = await db.progress_entries.find({"date": today}).to_list(100)
    
    return {
        "total_journal_entries": total_entries,
        "total_life_tasks": total_tasks,
        "has_today_journal": bool(today_entry),
        "today_progress_count": len(today_progress)
    }

# Basic route
@api_router.get("/")
async def root():
    return {"message": "Journal & Life Tracker API"}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()