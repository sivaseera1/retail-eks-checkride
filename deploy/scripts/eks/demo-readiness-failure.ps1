# Controlled demonstration: make all replicas unready. Use only in the demo namespace.
# Save the original setting and restore it immediately after observing the failure.
kubectl set env deployment/retail-order-api SIMULATE_UNREADY=true -n siva-p
Start-Sleep -Seconds 15
kubectl get pods -n siva-p -l app=retail-order-api
kubectl get endpoints retail-order-api -n siva-p
Write-Host "Restore readiness now:"
Write-Host "kubectl set env deployment/retail-order-api SIMULATE_UNREADY=false -n siva-p"
