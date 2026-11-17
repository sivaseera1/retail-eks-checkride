# Use only after image is built/pushed and the image value is replaced.
# Applies core base manifests first; optional HPA/PDB/Ingress live in deploy/kubernetes/optional.
$ErrorActionPreference = "Stop"
$RepoRoot = Resolve-Path "$PSScriptRoot\..\..\.."
Set-Location $RepoRoot
kubectl config current-context
kubectl auth can-i create deployments -n siva-p
kubectl apply -f deploy/kubernetes/base/namespace.yaml
kubectl apply -f deploy/kubernetes/base/deployment.yaml
kubectl apply -f deploy/kubernetes/base/service.yaml
kubectl rollout status deployment/retail-order-api -n siva-p --timeout=180s
kubectl get pods,svc,deploy -n siva-p -l app=retail-order-api
