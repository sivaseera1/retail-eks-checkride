import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from fastapi.testclient import TestClient
import main

client = TestClient(main.app)


def test_liveness():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "alive"


def test_readiness():
    main.SIMULATE_UNREADY = False
    response = client.get("/ready")
    assert response.status_code == 200
    assert response.json()["status"] == "ready"


def test_readiness_unready_keeps_liveness_alive():
    main.SIMULATE_UNREADY = True
    try:
        assert client.get("/health").status_code == 200
        ready = client.get("/ready")
        assert ready.status_code == 503
        assert ready.json()["detail"] == "instance marked unready"
    finally:
        main.SIMULATE_UNREADY = False


def test_ops_readiness_toggle():
    try:
        res_off = client.post("/ops/readiness", params={"ready": "false"})
        assert res_off.status_code == 200
        assert res_off.json()["ready"] is False
        assert client.get("/ready").status_code == 503
        assert client.get("/health").status_code == 200

        res_on = client.post("/ops/readiness", params={"ready": "true"})
        assert res_on.status_code == 200
        assert res_on.json()["ready"] is True
        assert client.get("/ready").status_code == 200
    finally:
        main.SIMULATE_UNREADY = False


def test_version_and_root():
    root = client.get("/")
    assert root.status_code == 200
    assert root.json()["service"] == "retail-order-tracking-api"

    ver = client.get("/version")
    assert ver.status_code == 200
    assert "version" in ver.json()


def test_orders():
    res = client.get("/orders")
    assert res.status_code == 200
    assert len(res.json()) >= 1

    created = client.post("/orders", json={
        "id": "2001",
        "customer": "Test Customer",
        "item": "Test Item",
        "amount": 1000
    })
    assert created.status_code == 201

    get_res = client.get("/orders/2001")
    assert get_res.status_code == 200
    assert get_res.json()["customer"] == "Test Customer"

    patch_res = client.patch("/orders/2001", json={"status": "Delivered"})
    assert patch_res.status_code == 200
    assert patch_res.json()["status"] == "Delivered"

    assert client.get("/orders/9999").status_code == 404
