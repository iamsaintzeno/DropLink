from fastapi import FastAPI

app = FastAPI(title="DropLink API")


@app.get("/healthz", tags=["health"])
def healthz() -> dict[str, str]:
    return {"status": "ok"}
