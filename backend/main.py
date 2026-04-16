"""
FastAPI entrypoint for LoL Augment Recommendation MVP.
Run from `backend/`: uvicorn main:app --reload --host 0.0.0.0 --port 8000
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from db.pool import close_pool, init_pool
from routes.champions import router as champions_router
from routes.recommend import router as recommend_router

logging.basicConfig(level=logging.INFO)


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_pool()
    yield
    close_pool()


app = FastAPI(title="LoL Augment Recommendation API", version="0.2.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.cors_origins.split(",") if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(recommend_router)
app.include_router(champions_router)


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}
