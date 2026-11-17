# Customer checkride: 15-minute demo runbook

## Before the meeting
- Run API and React UI locally; confirm browser displays the connected API badge.
- If EKS access is approved, verify three ready replicas and Service endpoints.
- Save current image tag and Deployment revision before fault demonstrations.
- Use a dedicated demo namespace/workload. Never inject faults into shared production workloads.
- Have `kubectl get pods`, `kubectl get endpoints`, `kubectl describe pod`, logs and rollout history ready.
- Do not claim an integration is live unless you can show its source.

## 15-minute demo
### 0:00–2:00 — Customer problem and solution
Explain downtime during deployments and unhealthy instances. Show architecture: customer → ALB/Ingress (if provisioned) → Service → ready Pods. Explain CI/CD and recovery path.

### 2:00–4:00 — Healthy baseline
Show UI order lookup. Show:
```powershell
kubectl get deploy,pods,svc -n siva-p -l app=retail-order-api
kubectl get endpoints retail-order-api -n siva-p
kubectl rollout status deployment/retail-order-api -n siva-p
```
Call `/health`, `/ready`, `/version`.

### 4:00–7:00 — Unhealthy instance / readiness
In a safe demo deployment:
```powershell
kubectl set env deployment/retail-order-api SIMULATE_UNREADY=true -n siva-p
kubectl get pods -n siva-p -l app=retail-order-api
kubectl get endpoints retail-order-api -n siva-p
```
Explain readiness failure removes that Pod from ready Service endpoints; it does not restart the container. Restore:
```powershell
kubectl set env deployment/retail-order-api SIMULATE_UNREADY=false -n siva-p
kubectl rollout status deployment/retail-order-api -n siva-p
```
Caution: setting the Deployment environment variable changes the Pod template and triggers a rollout; this particular simple demo switch can make every new Pod unready. For a true single-Pod test, use a controlled one-Pod test deployment or a dedicated fault-injection method rather than changing the shared Deployment.

### 7:00–10:00 — Rolling deployment
Deploy a new healthy image tag using the approved pipeline or:
```powershell
kubectl set image deployment/retail-order-api api=YOUR_ECR_URI:NEW_TAG -n siva-p
kubectl rollout status deployment/retail-order-api -n siva-p
kubectl rollout history deployment/retail-order-api -n siva-p
```
Explain maxUnavailable 0 and maxSurge 1. This requires spare scheduling capacity and healthy readiness.

### 10:00–13:00 — Failed release / rollback
Use a deliberately failing image or controlled bad release only in the dedicated demo namespace. Let rollout validation fail, then:
```powershell
kubectl rollout undo deployment/retail-order-api -n siva-p
kubectl rollout status deployment/retail-order-api -n siva-p
kubectl get deploy,pods -n siva-p -l app=retail-order-api
```
Verify `/version` and order API. Explain pipeline executes rollback; Deployment does not automatically revert all application-level failures by itself.

### 13:00–15:00 — Close
Summarize measurable controls and caveats: three replicas are not proof of multi-AZ; HPA requires metrics; ALB/ECR/CloudWatch and OIDC need provisioning. State what is implemented and what is a prerequisite.

## Demo safety
Do not simulate faults in a shared training workload without explicit approval. Do not make all replicas unready on a shared namespace. Record baseline revision/image and have a tested recovery command ready.
