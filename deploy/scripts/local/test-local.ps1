$ErrorActionPreference = "Stop"
$RepoRoot = Resolve-Path "$PSScriptRoot\..\..\.."
Set-Location $RepoRoot
python -m pip install -r backend/requirements.txt -r backend/tests/requirements-test.txt
$env:PYTHONPATH = "$RepoRoot\backend"
python -m pytest -q backend/tests
