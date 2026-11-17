# Technical Q&A and troubleshooting

## Key questions and precise answers

**Why use readiness and liveness separately?** Readiness controls traffic eligibility. Liveness controls container restart. Combining dependency outages into liveness can create restart loops.

**What does maxUnavailable 0 do?** During a rolling update, the Deployment controller should not intentionally reduce available replicas below the desired count. It may need extra capacity for maxSurge 1. Scheduling constraints or failing readiness can stall the rollout.

**Does Kubernetes automatically rollback a failed deployment?** Not for every application-level failure. The Deployment controller reports stalled progress; this CI workflow explicitly calls `kubectl rollout undo` when rollout validation or smoke test fails.

**Does HPA scale EC2 nodes?** No. HPA changes Pod replica count. Cluster/node autoscaling is separate and depends on cluster configuration and permissions.

**Do 3 replicas guarantee high availability across AZs?** No. Verify actual worker-node/AZ distribution and configure topology spread or anti-affinity, with enough capacity.

**What does a PDB protect?** It limits voluntary disruptions through supported eviction paths. It does not protect against involuntary node failures or every maintenance action.

## Troubleshooting
- `ImagePullBackOff`: verify image URI, tag, ECR repository, node pull permissions and image architecture.
- `Pending`: inspect `kubectl describe pod`; check CPU/memory requests, node capacity, taints, quotas and scheduling constraints.
- `CrashLoopBackOff`: inspect logs and previous logs; verify app command, dependencies, probes and container exit code.
- Readiness probe failure: `kubectl describe pod`; test `/ready` from inside the Pod; verify port/path and app startup.
- Service has no endpoints: check selector labels and Pod readiness.
- Rollout timeout: inspect Deployment conditions, ReplicaSets, Pod events, image pulls and readiness.
- HPA shows unknown: check `kubectl top pods -n siva-p`, metrics-server and resource requests.
- Forbidden: inspect `kubectl auth can-i`; request namespace-scoped RBAC from admin; do not bypass permissions.
