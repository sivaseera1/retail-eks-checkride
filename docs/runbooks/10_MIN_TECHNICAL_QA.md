# Technical discussion preparation

Prepare to explain:
- Difference between Pod, Deployment, ReplicaSet and Service.
- How readiness affects Service endpoints.
- How liveness causes container restart.
- Why startup probes matter.
- RollingUpdate maxUnavailable and maxSurge trade-offs.
- How `kubectl rollout status`, `history`, `undo` work.
- Why application-level rollback is explicit in CI/CD.
- Why HPA requires resource metrics and resource requests.
- Difference between HPA and node autoscaling.
- What PDB does and does not protect.
- Why 3 replicas do not prove multi-AZ.
- How GitHub OIDC avoids long-lived AWS keys.
- How to troubleshoot Pending, ImagePullBackOff, CrashLoopBackOff, readiness failures and RBAC Forbidden.
