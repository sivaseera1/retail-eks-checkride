# Retail Order Reliability Platform (Amazon EKS)

A clean, production-ready retail order tracking service and operations platform on Amazon EKS demonstrating high availability, zero-downtime rolling updates, and automated rollback recovery.

---

## Clean Project Structure

```text
Retail-EKS-Checkride/
├── backend/                      # FastAPI Retail Order API & unit tests
│   ├── main.py                   # /health, /ready, /version, /orders
│   ├── requirements.txt
│   ├── Dockerfile                # Non-root user 10001:10001
│   └── tests/test_app.py         # Pytest verification suite
├── frontend/                     # React Operations Console (Vite)
│   └── src/
├── deploy/                       # Kubernetes Manifests
│   └── kubernetes/base/
│       ├── namespace.yaml        # Namespace: siva-p
│       ├── deployment.yaml       # 3 Replicas, RollingUpdate, Probes, Resources
│       └── service.yaml          # ClusterIP Service (:80 -> :8080)
├── .github/workflows/deploy.yml  # Automated CI/CD (OIDC + ECR + EKS Rollout/Undo)
└── start.bat                     # 1-Click Windows Launcher & Controller
```

---

## 1. Quick Start (Windows)
Double-click **`start.bat`** (or run `.\start.bat` in PowerShell) to:
- Launch the backend API on `http://127.0.0.1:8080`
- Launch the frontend console on `http://localhost:5173`
- Run unit tests or check EKS status with a single keystroke.

---

## 2. Core Reliability Controls

| Control | Implementation | Purpose |
| :--- | :--- | :--- |
| **Liveness Probe** | `GET /health` | Checks if process is alive; restarts container if broken. |
| **Readiness Probe** | `GET /ready` | Checks if Pod is ready for traffic; removes from endpoints if failing without restart. |
| **Rolling Update** | `maxUnavailable: 0`, `maxSurge: 1` | Always keeps 3 replicas available during deployments (zero downtime). |
| **Security** | `USER 10001:10001` in Dockerfile | Runs as an explicit unprivileged non-root user. |
| **Automated Recovery**| `kubectl rollout undo` in CI/CD | Reverts deployment automatically if rollout or smoke test fails. |

---

## 3. Manual EKS Commands

Check deployment, pods and service:
```powershell
kubectl get deployment,pods,svc,endpoints -n siva-p -l app=retail-order-api
```

Watch a rolling update:
```powershell
kubectl rollout status deployment/retail-order-api -n siva-p
```

Trigger automated rollback:
```powershell
kubectl rollout undo deployment/retail-order-api -n siva-p
```
