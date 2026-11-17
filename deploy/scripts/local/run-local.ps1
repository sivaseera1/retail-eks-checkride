$ErrorActionPreference = "Stop"
Write-Host "Starting Retail Order Tracking API..."
$RepoRoot = Resolve-Path "$PSScriptRoot\..\..\.."
Set-Location $RepoRoot
if (!(Test-Path ".venv")) { python -m venv .venv }
.\.venv\Scripts\Activate.ps1
python -m pip install -r backend/requirements.txt
Set-Location "$RepoRoot\backend"
uvicorn main:app --reload --host 127.0.0.1 --port 8080
