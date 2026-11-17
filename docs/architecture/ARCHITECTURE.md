# Solution architecture

## End-to-End AWS Architecture Diagram

```mermaid
flowchart TB
    User["Customer Browser / React Console"] -->|HTTPS| ALB["AWS Application Load Balancer (Ingress - Optional)"]
    ALB -->|HTTP :80| Svc["Kubernetes Service (ClusterIP :80 -> :8080)"]
    Svc -->|"Routes only to /ready = 200"| Pod1["FastAPI Pod 1 (AZ-a)"]
    Svc -->|"Routes only to /ready = 200"| Pod2["FastAPI Pod 2 (AZ-b)"]
    Svc -->|"Routes only to /ready = 200"| Pod3["FastAPI Pod 3 (AZ-c)"]

    HPA["HPA (3-8 Pods @ 70% CPU)"] -.->|Scales replicas| Deploy["Deployment (RollingUpdate: maxUnavailable 0, maxSurge 1)"]
    PDB["PDB (minAvailable: 2)"] -.->|Guards voluntary evictions| Deploy
    Deploy --> Pod1 & Pod2 & Pod3

    Dev["Developer Push (main)"] --> GHA["GitHub Actions (pytest + npm build)"]
    GHA -->|OIDC short-lived token| ECR["Amazon ECR (Immutable SHA image)"]
    GHA -->|"kubectl set image + rollout status"| Deploy
    GHA -->|"Rollout or /ready smoke test fails"| Undo["kubectl rollout undo + verify"]
    ECR -.->|Pulls image| Pod1 & Pod2 & Pod3
```

## Logical request path
Customer browser → (optional AWS ALB / Ingress) → Kubernetes Service → ready FastAPI Pods → order API.

## Delivery path
Developer commit → GitHub Actions → unit tests → Docker build → Amazon ECR → EKS Deployment image update → rollout validation → optional smoke test → rollback on failure.

## Operations path
FastAPI `/health`, `/ready`, `/version`; Kubernetes probes, Pod/Deployment/Service state, events and logs; CloudWatch integration when provisioned.

## Kubernetes controls
- Deployment: 3 replicas; RollingUpdate; maxUnavailable 0; maxSurge 1; `topologySpreadConstraints` across zones (`topology.kubernetes.io/zone`) and nodes (`kubernetes.io/hostname`).
- Service: ClusterIP, selector `app=retail-order-api`.
- Startup probe: `/health` gives slow-starting containers time to initialize (`SIMULATE_SLOW_START` / `STARTUP_DELAY_SECONDS`).
- Readiness probe: `/ready` removes an unready Pod from Service endpoints without restarting it.
- Liveness probe: `/health` restarts container after repeated failed checks.
- Resource requests/limits: scheduler reservation (`100m`/`128Mi`) and ceiling (`500m`/`256Mi`).
- Security: non-root runtime user, `readOnlyRootFilesystem: true` with `/tmp` `emptyDir`, dropped capabilities.
- PDB: optional voluntary-disruption guard; minAvailable 2.
- HPA: optional CPU target 70%, min 3 max 8; requires metrics API.
- Graceful termination: 30-second termination grace and 5-second `preStop` delay.

## Failure-mode reasoning
Readiness failure: container can remain running but does not receive Service traffic. Liveness failure: kubelet restarts the container. Startup probe: suppresses liveness/readiness until startup succeeds. Failed rollout: deployment may stall; pipeline detects unsuccessful rollout or smoke test and explicitly invokes rollout undo.

## Availability caveats
Three replicas alone do not guarantee multi-AZ placement or node failure tolerance. Confirm worker-node distribution, topology spread/anti-affinity, capacity and autoscaler with the EKS administrator. A Service routes only to ready endpoints but does not create spare capacity. ALB, ECR, IAM/OIDC, CloudWatch, metrics-server and node autoscaling are environment-dependent.
