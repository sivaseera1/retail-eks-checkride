# 15-minute customer presentation outline

1. Customer challenge (2 min): deployment downtime, unhealthy instances and failed order requests.
2. Requirements and success criteria (2 min): availability, release continuity, recovery, visibility and scaling.
3. Architecture (3 min): request path, EKS workload, Service/readiness, ECR and CI/CD, monitoring.
4. Reliability controls (3 min): probes, replicas, rolling update, graceful termination, HPA/PDB caveats.
5. Release and recovery flow (3 min): test → build → push → deploy → rollout/smoke validation → explicit rollback.
6. Demo scope and limitations (2 min): show verified evidence; call out admin-owned prerequisites and integrations not yet connected.

Do not claim real customer order integration, multi-AZ resilience, CloudWatch monitoring, ALB ingress or autoscaling unless provisioned and demonstrated.
