# Environment prerequisites and administrator-owned dependencies

## User-level environment
- Windows PowerShell
- Python 3.11+
- Node.js 20+
- kubectl compatible with EKS cluster
- Docker Desktop only if local Docker engine is healthy

## Existing training environment assumptions
- EKS cluster: `eks-training`
- AWS Region: `ap-south-1`
- Namespace: `siva-p`
- Namespace permissions are limited; do not assume cluster-admin access.

## Verify your access
```powershell
kubectl config current-context
kubectl get namespace siva-p
kubectl auth can-i get pods -n siva-p
kubectl auth can-i create deployments -n siva-p
kubectl auth can-i patch deployments -n siva-p
kubectl auth can-i create services -n siva-p
kubectl auth can-i create horizontalpodautoscalers -n siva-p
kubectl auth can-i create poddisruptionbudgets -n siva-p
```
If a command returns `no`, request the smallest required namespace-scoped permission. Do not attempt to bypass RBAC.

## AWS / admin prerequisites
1. ECR repository and push/pull permissions.
2. GitHub Actions OIDC identity provider and narrowly scoped IAM role, trusted to the correct repository/branch.
3. IAM role/user access to describe EKS and update kubeconfig.
4. Kubernetes RBAC for CI role to update only the target Deployment in `siva-p`.
5. Worker-node capacity for 3 replicas plus maxSurge 1; node autoscaling if required.
6. Metrics Server / resource metrics for HPA.
7. AWS Load Balancer Controller, subnet tags, security groups, DNS and TLS for ALB ingress.
8. CloudWatch Container Insights/log integration if requested.
9. Admin-approved namespace Role/RoleBinding if the dashboard backend will read Kubernetes resources.

## Security notes
- Use GitHub OIDC; do not store long-lived AWS access keys in GitHub secrets.
- Never expose kubeconfig, service-account tokens or AWS credentials to React/browser code.
- Restrict CI IAM and Kubernetes RBAC to the minimum resources and namespace.
- Do not apply the optional RBAC/Ingress manifests without administrator approval.
