# Customer problem, requirements and acceptance criteria

## Customer problem
A retail company operates an online order-tracking application that experiences frequent downtime during deployments. Occasionally, application instances become unhealthy, resulting in failed customer requests.

## Requirements → design controls → evidence
| Customer requirement | Design control | Demo evidence |
|---|---|---|
| Improve availability | Multiple replicas, readiness probes, Service routing, capacity planning | Unready Pod removed from endpoints while remaining ready replicas continue serving |
| Minimal release disruption | RollingUpdate, maxUnavailable 0, maxSurge 1, startup/readiness probes, graceful termination | Observe rollout and verify API during release |
| Reliable recovery | Deployment revision history, pipeline rollout/smoke validation, explicit rollback | Introduce failed release in a safe demo namespace, show rollback and restored version |
| Healthy instances | Liveness/readiness/startup probes, resource requests/limits | Demonstrate different probe outcomes |
| Scaling | Optional HPA based on CPU metrics | Show HPA configuration and metrics availability; do not claim if unavailable |
| Operational visibility | API health/version endpoints, Kubernetes events/logs, CloudWatch integration | Show evidence and clearly mark unconnected integrations |

## Acceptance criteria
1. API `/health` returns HTTP 200 when process is alive.
2. API `/ready` returns HTTP 200 when ready and HTTP 503 when `SIMULATE_UNREADY=true`.
3. `/orders` lists sample orders and `/orders/{id}` returns order details or 404.
4. Kubernetes Service selects only Pods with the application label; not-ready Pods are removed from ready endpoints.
5. Deployment has 3 desired replicas and rolling update values `maxUnavailable: 0`, `maxSurge: 1`.
6. New release is not considered complete until `kubectl rollout status` succeeds and optional smoke test passes.
7. Failed validation triggers explicit rollback and post-rollback verification.
8. No fabricated live cluster, uptime, metrics or alert values are presented.

## Scope boundaries
This is a demonstration application with static sample order records. It is not connected to a real retailer's order database, payment, carrier or inventory systems. Those require customer APIs, credentials, network approvals, data contracts and security review.
