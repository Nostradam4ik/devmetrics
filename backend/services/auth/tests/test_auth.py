import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_register_user(client: AsyncClient):
    response = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "test@example.com",
            "password": "Test1234!",
            "full_name": "Test User",
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["message"] == "User registered successfully"
    assert "user" in data
    assert "tokens" in data
    assert data["user"]["email"] == "test@example.com"
    assert data["user"]["full_name"] == "Test User"


@pytest.mark.asyncio
async def test_register_duplicate_email(client: AsyncClient):
    await client.post(
        "/api/v1/auth/register",
        json={
            "email": "test@example.com",
            "password": "Test1234!",
            "full_name": "Test User",
        },
    )

    response = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "test@example.com",
            "password": "AnotherPass1!",
            "full_name": "Another User",
        },
    )
    assert response.status_code == 400
    assert "already registered" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_register_short_password(client: AsyncClient):
    response = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "test@example.com",
            "password": "short",
            "full_name": "Test User",
        },
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_register_invalid_email(client: AsyncClient):
    response = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "not-an-email",
            "password": "Test1234!",
        },
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_login_success(client: AsyncClient):
    await client.post(
        "/api/v1/auth/register",
        json={
            "email": "test@example.com",
            "password": "Test1234!",
            "full_name": "Test User",
        },
    )

    response = await client.post(
        "/api/v1/auth/login",
        json={"email": "test@example.com", "password": "Test1234!"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "tokens" in data
    assert "access_token" in data["tokens"]
    assert "refresh_token" in data["tokens"]
    assert data["tokens"]["token_type"] == "bearer"


@pytest.mark.asyncio
async def test_login_wrong_password(client: AsyncClient):
    await client.post(
        "/api/v1/auth/register",
        json={
            "email": "test@example.com",
            "password": "Test1234!",
            "full_name": "Test User",
        },
    )

    response = await client.post(
        "/api/v1/auth/login",
        json={"email": "test@example.com", "password": "WrongPassword!"},
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_login_nonexistent_user(client: AsyncClient):
    response = await client.post(
        "/api/v1/auth/login",
        json={"email": "nobody@example.com", "password": "Test1234!"},
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_get_current_user(client: AsyncClient):
    register_response = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "test@example.com",
            "password": "Test1234!",
            "full_name": "Test User",
        },
    )
    access_token = register_response.json()["tokens"]["access_token"]

    response = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {access_token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "test@example.com"
    assert data["full_name"] == "Test User"


@pytest.mark.asyncio
async def test_get_current_user_no_token(client: AsyncClient):
    response = await client.get("/api/v1/auth/me")
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_get_current_user_invalid_token(client: AsyncClient):
    response = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": "Bearer invalid-token-here"},
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_refresh_token(client: AsyncClient):
    register_response = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "test@example.com",
            "password": "Test1234!",
            "full_name": "Test User",
        },
    )
    refresh_token = register_response.json()["tokens"]["refresh_token"]

    response = await client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": refresh_token},
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data


@pytest.mark.asyncio
async def test_refresh_token_invalid(client: AsyncClient):
    response = await client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": "invalid-refresh-token"},
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_logout(client: AsyncClient):
    register_response = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "test@example.com",
            "password": "Test1234!",
            "full_name": "Test User",
        },
    )
    access_token = register_response.json()["tokens"]["access_token"]

    response = await client.post(
        "/api/v1/auth/logout",
        headers={"Authorization": f"Bearer {access_token}"},
    )
    assert response.status_code == 200
    assert response.json()["message"] == "Logout successful"
