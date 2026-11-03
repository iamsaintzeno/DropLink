import asyncio

import httpx

from app.main import app


def test_healthz_returns_successful_liveness_payload() -> None:
    async def get_healthz() -> httpx.Response:
        async with httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app),
            base_url="http://testserver",
        ) as client:
            return await client.get("/healthz")

    response = asyncio.run(get_healthz())

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
