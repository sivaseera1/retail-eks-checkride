# Customer Checkride Presentation Deck (15 Minutes + 10-Min Q&A)

> **Interactive Slide Deck:** Open `docs/presentation/presentation.html` in any browser (collapsible sidebar, `←` / `→` keyboard navigation, and Print-to-PDF). Every slide below matches `docs/presentation/presentation.html` 1-for-1.

---

## Slide 01 — Title & Scope (0:00–1:00)
**Headline:** Zero-Downtime Deployment & Reliability Platform for Retail Order Tracking  
**Key Points:**
- **Customer Focus:** Online order tracking where failed requests or release outages directly affect customer trust.
- **Target Platform:** Amazon EKS (`eks-training`, `ap-south-1`, namespace `siva-p`), Amazon ECR, and GitHub Actions OIDC.
- **Session Plan:** 15-minute architecture & live Operations Console walkthrough + 10-minute technical Q&A.

## Slide 02 — Customer Problem (1:00–2:30)
**Headline:** Why Customer Requests Fail Today
- **Pain Point 1 — Downtime During Releases:** Old instances stop before new instances are ready; abrupt shutdown drops in-flight requests; failed releases lack automated validation and rollback.
- **Pain Point 2 — Unhealthy Instances Receive Traffic:** Load balancers route requests to degraded or slow-starting processes; stuck processes are not automatically recycled.

## Slide 03 — Requirements Matrix (2:30–4:00)
| Requirement | EKS / AWS Control | Verification Evidence |
|---|---|---|
| **High Availability** | 3 replicas, ClusterIP Service, `topologySpreadConstraints`, optional PDB (`minAvailable: 2`) | Healthy endpoints continue serving if 1 Pod fails or drains |
| **Minimal Release Disruption** | `RollingUpdate` (`maxUnavailable: 0`, `maxSurge: 1`), `30s` grace + `5s` `preStop` | New Pod passes `/ready` before old Pod terminates |
| **Application Health** | Separate `/health` (startup & liveness) and `/ready` (readiness) | `SIMULATE_UNREADY=true` / `POST /ops/readiness` isolates Pod without restart |
| **Scaling** | Optional HPA (`3–8` Pods at `70%` CPU, `100m` CPU request) | `deploy/kubernetes/optional/hpa.yaml` + `metrics-server` prerequisite |
| **Reliable Recovery** | CI/CD rollout status gate + `/ready` smoke test + automatic `kubectl rollout undo` | Failed deployment automatically reverts and verifies stability |

## Slide 04 — AWS Architecture (4:00–6:00)
- **Request Path:** Customer Browser → Optional AWS ALB (`Ingress`) → Kubernetes `Service` (`ClusterIP :80 → :8080`) → 3 Ready FastAPI Pods (`siva-p`).
- **Delivery Path:** GitHub Push → `pytest` + `npm run build` → GitHub OIDC (no static AWS keys) → Amazon ECR (immutable SHA tag) → EKS Rollout → Verify or `kubectl rollout undo`.
- **Security & Observability:** Non-root container user (`app`), `readOnlyRootFilesystem: true` with `/tmp` `emptyDir`, dropped capabilities (`ALL`), and live `/health`, `/ready`, `/version` telemetry (including serving `instance`).

## Slide 05 — Health Probes (6:00–8:00)
- **Startup Probe (`GET /health`):** `periodSeconds: 5`, `failureThreshold: 18` (90s budget). Shields slow-starting containers (`SIMULATE_SLOW_START=true`) before liveness/readiness act.
- **Readiness Probe (`GET /ready`):** `periodSeconds: 5`, `failureThreshold: 2`. Controls *traffic eligibility*—removes an unready Pod from Service endpoints without restarting it.
- **Liveness Probe (`GET /health`):** `periodSeconds: 10`, `failureThreshold: 3`. Controls *container restart*—checks process liveness only, never external dependencies.

## Slide 06 — Rolling Deployments (8:00–9:30)
- `maxUnavailable: 0` + `maxSurge: 1` spins up Pod #4 and waits for `/ready` = `200` before terminating an existing Pod.
- `preStop: sleep 5` + `terminationGracePeriodSeconds: 30` allows EndpointSlice propagation and active request draining before `SIGKILL`.
- **Operational Requirement:** Requires spare cluster CPU/memory for the surge Pod.

## Slide 07 — Availability & Scaling (9:30–11:00)
- **Topology Spread:** `topologySpreadConstraints` across `topology.kubernetes.io/zone` and `kubernetes.io/hostname` (`whenUnsatisfiable: ScheduleAnyway`).
- **HPA (`3–8` Pods at `70%` CPU):** Scales Pods (requires `metrics-server`), not EC2 worker nodes.
- **PDB (`minAvailable: 2`):** Protects against voluntary evictions, not unexpected node failures.

## Slide 08 — CI/CD & Rollback (11:00–12:30)
- Runs `pytest` (`9` tests) and `npm run build` before touching AWS.
- Builds immutable SHA-tagged container (`APP_VERSION` build arg) and deploys via GitHub OIDC.
- Checks `kubectl rollout status --timeout=180s` and optional `/ready` smoke test; runs `kubectl rollout undo` + post-undo `rollout status` verification on failure.

## Slide 09 — Live Walkthrough (12:30–14:00)
1. **Live Orders & Baseline:** Open the Operations Console (`http://localhost:5173/`), create/update an order (`POST /orders`, `PATCH /orders/{id}`), and show live `/health`, `/ready`, `/version`, and serving `instance`.
2. **Unhealthy Instance:** Click **Simulate Unready (503)** on **Application health** (`POST /ops/readiness?ready=false`) — verify `/ready` returns `503` (UI status **Degraded**) while `/health` remains `200`, then click **Restore Ready (200)**.
3. **Rolling Update & Rollback:** Walk through `maxUnavailable: 0` / `maxSurge: 1` and `kubectl rollout undo` recovery sequence.

## Slide 10 — Scope & Prerequisites (14:00–14:30)
- **Implemented & Verified:** FastAPI backend (`backend/main.py`), unit tests (`backend/tests/test_app.py`), React Operations Console (`frontend/`), EKS manifests (`deploy/kubernetes/`), and OIDC workflow (`.github/workflows/deploy.yml`).
- **Admin / Cluster Prerequisites for Live EKS:** EKS cluster (`eks-training`), namespace RBAC (`siva-p`), ECR repository, GitHub OIDC IAM role, `metrics-server` (HPA), AWS Load Balancer Controller (Ingress), and CloudWatch / node autoscaling.

## Slide 11 — Summary & Q&A (14:30–15:00)
- Recap: **Zero-Downtime Releases**, **Self-Healing Health Isolation**, and **Verified Pipeline Rollback**.
- Open floor for 10-minute Q&A (see `docs/10_MIN_TECHNICAL_QA.md` and `docs/QA_AND_TROUBLESHOOTING.md`).
