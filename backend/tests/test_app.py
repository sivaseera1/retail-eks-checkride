import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from fastapi.testclient import TestClient
import main
client = TestClient(main.app)

def test_liveness():
    response = client.get("/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "alive"
    assert "instance" in body


def test_readiness():
    main.SIMULATE_UNREADY = False
    main.SIMULATE_SLOW_START = False
    main.STARTUP_DELAY_SECONDS = 0.0
    response = client.get("/ready")
    assert response.status_code == 200
    assert response.json()["status"] == "ready"


def test_readiness_unready_keeps_liveness_alive():
    main.SIMULATE_SLOW_START = False
    main.STARTUP_DELAY_SECONDS = 0.0
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


def test_ops_readiness_toggle_disabled(monkeypatch):
    monkeypatch.setattr(main, "ENABLE_OPS_TOGGLE", False)
    res = client.post("/ops/readiness", params={"ready": "false"})
    assert res.status_code == 403


def test_slow_start_blocks_health_and_ready_until_elapsed(monkeypatch):
    monkeypatch.setattr(main, "SIMULATE_SLOW_START", True)
    monkeypatch.setattr(main, "STARTUP_DELAY_SECONDS", 30.0)
    monkeypatch.setattr(main, "STARTED_AT", 1000.0)
    monkeypatch.setattr(main.time, "time", lambda: 1005.0)
    assert client.get("/health").status_code == 503
    assert client.get("/ready").status_code == 503

    monkeypatch.setattr(main.time, "time", lambda: 1035.0)
    assert client.get("/health").status_code == 200
    assert client.get("/ready").status_code == 200


def test_version_and_root():
    root = client.get("/")
    assert root.status_code == 200
    assert root.json()["service"] == "retail-order-tracking-api"

    ver = client.get("/version")
    assert ver.status_code == 200
    assert "version" in ver.json()
    assert "instance" in ver.json()


def test_orders_list_and_filter():
    response = client.get("/orders")
    assert response.status_code == 200
    assert len(response.json()) >= 1

    filtered = client.get("/orders", params={"status": "Shipped"})
    assert filtered.status_code == 200
    assert all(o["status"] == "Shipped" for o in filtered.json())


def test_order_found_and_missing():
    assert client.get("/orders/1001").status_code == 200
    assert client.get("/orders/9999").status_code == 404


def test_create_and_update_order():
    created = client.post(
        "/orders",
        json={
            "id": "2001",
            "customer": "Meera Nair",
            "item": "Noise-Canceling Earbuds",
            "status": "Processing",
            "amount": 3499,
        },
    )
    assert created.status_code == 201
    assert created.json()["tracking"] == "NS-TRK-2001"

    dup = client.post(
        "/orders",
        json={
            "id": "2001",
            "customer": "Meera Nair",
            "item": "Noise-Canceling Earbuds",
            "amount": 3499,
        },
    )
    assert dup.status_code == 409

    patched = client.patch("/orders/2001", json={"status": "Shipped"})
    assert patched.status_code == 200
    assert patched.json()["status"] == "Shipped"

    missing_patch = client.patch("/orders/9999", json={"status": "Delivered"})
    assert missing_patch.status_code == 404
