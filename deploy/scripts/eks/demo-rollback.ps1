# Demonstrate rollback safely only after recording the current revision.
kubectl rollout history deployment/retail-order-api -n siva-p
kubectl rollout undo deployment/retail-order-api -n siva-p
kubectl rollout status deployment/retail-order-api -n siva-p --timeout=180s
kubectl get deployment retail-order-api -n siva-p
