# Retail Application Reliability & Operations Platform

A customer-checkride practice project for improving availability, deployment reliability, application health, scaling and recovery of a retail order-tracking application on Amazon EKS.

## Project Structure (Separated by Role)
```text
Retail-EKS-Checkride/
├── backend/                     # FastAPI Order Tracking API, Dockerfile & unit tests
│   ├── main.py
│   ├── requirements.txt
│   ├── Dockerfile
│   └── tests/
├── frontend/                    # React Operations Console (Vite)
│   └── src/
├── deploy/                      # Kubernetes manifests
│   └── kubernetes/
│       ├── base/                # Core manifests: namespace, deployment, service
│       └── optional/            # Prerequisite-dependent: hpa, pdb, ingress, rbac
├── .github/workflows/           # Automated CI/CD (OIDC + ECR + EKS rollout/undo)
└── start.bat                    # 1-click launcher for local app, tests & EKS status
```

## What is included
- **Backend (`backend/`):** FastAPI order-tracking API (`/health`, `/ready`, `/version`, `/orders`, `/orders/{id}`, `POST /orders`, `PATCH /orders/{id}`, `POST /ops/readiness`), non-root `Dockerfile`, and unit tests (`backend/tests/test_app.py`).
- **Frontend (`frontend/`):** React operations console with collapsible sidebar, live order creation/status updates, and live readiness probe toggle.
- **Deployment (`deploy/`):** Core Kubernetes manifests (`deploy/kubernetes/base/`) and optional manifests (`deploy/kubernetes/optional/`).
- **CI/CD (`.github/workflows/deploy.yml`):** Automated tests/build, AWS OIDC login, ECR push, `/ready` smoke test, and verified `kubectl rollout undo`.
- **Launcher (`start.bat`):** 1-click Windows controller to start local services, run test suite, or check EKS status.

## 1. Run locally (Windows)
**One-click start:** Double-click [`start.bat`](start.bat) in `Retail-EKS-Checkride` to install any missing dependencies, launch both Backend (`:8080`) and Frontend (`:5173`), and open the browser automatically.

**Manual PowerShell start** (Prerequisites: Python 3.11+ and Node.js 20+):

Terminal 1 — backend:
```powershell
cd Retail-EKS-Checkride
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r backend/requirements.txt
cd backend
uvicorn main:app --reload --host 127.0.0.1 --port 8080
```
Open API docs at `http://127.0.0.1:8080/docs`.

Terminal 2 — frontend:
```powershell
cd Retail-EKS-Checkride\frontend
npm install
npm run dev
```
Open `http://localhost:5173`.

The dashboard connects directly to the live FastAPI backend for order creation, status updates, API health, readiness, and version telemetry. EKS cluster metrics clearly indicate when a live Kubernetes cluster connection is not active.

## 2. Test
From project root:
```powershell
python -m pip install -r backend/requirements.txt -r backend/tests/requirements-test.txt
$env:PYTHONPATH="$PWD\backend"
python -m pytest -q backend/tests
```

## 3. Build container
```powershell
docker build -t retail-order-api:1.0.0 ./backend
docker run --rm -p 8080:8080 retail-order-api:1.0.0
```
If Docker Desktop/WSL is not operational, complete local Python + React practice first.

## 4. Deploy to EKS
Do not assume permissions. First verify:
```powershell
kubectl config current-context
kubectl get namespace siva-p
kubectl auth can-i create deployments -n siva-p
kubectl auth can-i create services -n siva-p
kubectl auth can-i patch deployments -n siva-p
```
Build and push an image to an approved registry (ECR setup and IAM permissions may be administrator-owned). Replace `REPLACE_WITH_IMAGE` in `deploy/kubernetes/base/deployment.yaml` with the full image URI, then apply base manifests:
```powershell
kubectl apply -f deploy/kubernetes/base/namespace.yaml
kubectl apply -f deploy/kubernetes/base/deployment.yaml
kubectl apply -f deploy/kubernetes/base/service.yaml
kubectl rollout status deployment/retail-order-api -n siva-p --timeout=180s
kubectl get pods,deploy,svc -n siva-p -l app=retail-order-api
```
Use `kubectl port-forward service/retail-order-api 8080:80 -n siva-p` to test API locally through the service, if permitted.

## 5. Optional resources
Optional manifests in `deploy/kubernetes/optional/` require cluster prerequisites: HPA requires `metrics-server` / resource metrics; PDB only helps with supported voluntary disruptions; Ingress requires AWS Load Balancer Controller, IAM, subnet tags, security groups, and DNS/TLS; RBAC example requires admin approval. See `docs/architecture/PREREQUISITES.md`.

## Important reliability semantics
- Readiness failure removes the Pod from Service endpoints; it does not restart the container.
- Liveness failure causes kubelet to restart the container.
- Startup probe protects slow-starting apps while initialization occurs.
- `maxUnavailable: 0` with `maxSurge: 1` requests no unavailable replicas during a rolling update, but requires spare scheduling capacity and successful readiness.
- Kubernetes Deployment does not automatically roll back every bad application release. The workflow explicitly runs `kubectl rollout undo` after rollout/smoke-test failure.
- HPA scales Pods, not worker nodes. Node autoscaling is a separate cluster-level concern.
- Three replicas do not prove multi-AZ resilience. Verify node/AZ distribution with an authorized cluster operator.

## Checkride package
Read `docs/architecture/CUSTOMER_REQUIREMENTS.md`, `docs/architecture/ARCHITECTURE.md`, `docs/architecture/PREREQUISITES.md`, `docs/presentation/PRESENTATION_DECK.md`, `docs/runbooks/DEMO_RUNBOOK.md`, and `docs/runbooks/QA_AND_TROUBLESHOOTING.md`, and open `docs/presentation/presentation.html` for the slide deck.
