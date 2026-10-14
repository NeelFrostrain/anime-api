import sys
from pathlib import Path

# Add project root and backend to sys.path so tests run seamlessly from root or backend/
_backend_dir = Path(__file__).resolve().parent.parent
_project_root = _backend_dir.parent
for _p in (str(_project_root), str(_backend_dir)):
    if _p not in sys.path:
        sys.path.insert(0, _p)

import pytest
from fastapi.testclient import TestClient
try:
    from backend.app.main import app
except ModuleNotFoundError:
    from app.main import app

client = TestClient(app)

def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "app" in data

def test_spotlight():
    response = client.get("/api/v1/anime/spotlight")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) > 0
    first = data[0]
    assert "id" in first
    assert "title" in first
    assert "coverImage" in first

def test_trending():
    response = client.get("/api/v1/anime/trending?page=1&perPage=5")
    assert response.status_code == 200
    data = response.json()
    assert data["page"] == 1
    assert "results" in data
    assert len(data["results"]) <= 5

def test_anime_detail():
    # One Piece = 21
    response = client.get("/api/v1/anime/21")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == 21
    assert "studios" in data
    assert "genres" in data
    assert "streamingLinks" in data

def test_search_and_suggestions():
    # Autocomplete suggestions
    sug_res = client.get("/api/v1/search/suggestions?q=titan")
    assert sug_res.status_code == 200
    sug_data = sug_res.json()
    assert isinstance(sug_data, list)

    # Full search
    search_res = client.get("/api/v1/search?q=titan&page=1&perPage=5")
    assert search_res.status_code == 200
    search_data = search_res.json()
    assert "results" in search_data

def test_schedule():
    res = client.get("/api/v1/schedule/week")
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    assert len(data) == 7

def test_auth_and_user_watchlist():
    # Register test user
    user_email = f"test_{pytest.__version__.replace('.', '')}@example.com"
    reg_res = client.post("/api/v1/auth/register", json={
        "email": user_email,
        "username": "testuser_otaku",
        "password": "secretpassword123",
    })
    
    # Could be 201 or 400 if user already exists from past test run
    if reg_res.status_code == 201:
        token = reg_res.json()["accessToken"]
    else:
        login_res = client.post("/api/v1/auth/login", json={
            "email": user_email,
            "password": "secretpassword123",
        })
        assert login_res.status_code == 200
        token = login_res.json()["accessToken"]

    headers = {"Authorization": f"Bearer {token}"}

    # Verify /auth/me
    me_res = client.get("/api/v1/auth/me", headers=headers)
    assert me_res.status_code == 200
    assert me_res.json()["email"] == user_email

    # Add item to watchlist
    wl_add = client.post("/api/v1/user/watchlist", headers=headers, json={
        "animeId": 16498,
        "animeTitle": "Attack on Titan",
        "status": "WATCHING",
        "progress": 3,
        "totalEpisodes": 25,
    })
    assert wl_add.status_code == 200

    # Get watchlist
    wl_get = client.get("/api/v1/user/watchlist", headers=headers)
    assert wl_get.status_code == 200
    assert len(wl_get.json()) >= 1
