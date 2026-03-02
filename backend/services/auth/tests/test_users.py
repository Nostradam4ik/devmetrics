import pytest
from httpx import AsyncClient


async def register_and_get_token(client: AsyncClient) -> str:
    response = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "test@example.com",
            "password": "Test1234!",
            "full_name": "Test User",
        },
    )
    return response.json()["tokens"]["access_token"]


@pytest.mark.asyncio
async def test_get_profile(client: AsyncClient):
    token = await register_and_get_token(client)

    response = await client.get(
        "/api/v1/users/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "test@example.com"
    assert data["full_name"] == "Test User"


@pytest.mark.asyncio
async def test_update_profile(client: AsyncClient):
    token = await register_and_get_token(client)

    response = await client.patch(
        "/api/v1/users/me",
        headers={"Authorization": f"Bearer {token}"},
        json={"full_name": "Updated Name"},
    )
    assert response.status_code == 200
    assert response.json()["full_name"] == "Updated Name"


@pytest.mark.asyncio
async def test_update_profile_avatar(client: AsyncClient):
    token = await register_and_get_token(client)

    response = await client.patch(
        "/api/v1/users/me",
        headers={"Authorization": f"Bearer {token}"},
        json={"avatar_url": "https://example.com/avatar.png"},
    )
    assert response.status_code == 200
    assert response.json()["avatar_url"] == "https://example.com/avatar.png"


@pytest.mark.asyncio
async def test_change_password(client: AsyncClient):
    token = await register_and_get_token(client)

    response = await client.post(
        "/api/v1/users/me/change-password",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "current_password": "Test1234!",
            "new_password": "NewPass5678!",
        },
    )
    assert response.status_code == 200
    assert response.json()["message"] == "Password changed successfully"

    # Verify can login with new password
    login_response = await client.post(
        "/api/v1/auth/login",
        json={"email": "test@example.com", "password": "NewPass5678!"},
    )
    assert login_response.status_code == 200


@pytest.mark.asyncio
async def test_change_password_wrong_current(client: AsyncClient):
    token = await register_and_get_token(client)

    response = await client.post(
        "/api/v1/users/me/change-password",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "current_password": "WrongPassword!",
            "new_password": "NewPass5678!",
        },
    )
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_delete_account(client: AsyncClient):
    token = await register_and_get_token(client)

    response = await client.delete(
        "/api/v1/users/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    assert response.json()["message"] == "Account deleted successfully"

    # Verify cannot login anymore
    login_response = await client.post(
        "/api/v1/auth/login",
        json={"email": "test@example.com", "password": "Test1234!"},
    )
    assert login_response.status_code == 403


@pytest.mark.asyncio
async def test_health_check(client: AsyncClient):
    response = await client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"
    assert response.json()["service"] == "auth"


@pytest.mark.asyncio
async def test_root(client: AsyncClient):
    response = await client.get("/")
    assert response.status_code == 200
    assert response.json()["status"] == "running"
