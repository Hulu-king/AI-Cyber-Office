$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  AI Cyber Office - One-Click Installer " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$InstallDir = Join-Path $env:USERPROFILE "AI-Cyber-Office"
$RepoZip = "https://github.com/Hulu-king/AI-Cyber-Office/archive/refs/heads/master.zip"

# 1. Download or update repository
if (Get-Command git -ErrorAction SilentlyContinue) {
    if (Test-Path (Join-Path $InstallDir ".git")) {
        Write-Host "[1/4] Updating existing AI-Cyber-Office..." -ForegroundColor Yellow
        git -C $InstallDir pull --ff-only
    } else {
        Write-Host "[1/4] Cloning AI-Cyber-Office..." -ForegroundColor Yellow
        if (Test-Path $InstallDir) { Remove-Item -Recurse -Force $InstallDir }
        git clone https://github.com/Hulu-king/AI-Cyber-Office.git $InstallDir
    }
} else {
    Write-Host "[1/4] Downloading AI-Cyber-Office ZIP (git not found)..." -ForegroundColor Yellow
    $ZipPath = Join-Path $env:TEMP "ai-cyber-office.zip"
    Invoke-WebRequest -Uri $RepoZip -OutFile $ZipPath
    $ExtractTmp = Join-Path $env:TEMP "ai-cyber-office-extract"
    if (Test-Path $ExtractTmp) { Remove-Item -Recurse -Force $ExtractTmp }
    Expand-Archive -Path $ZipPath -DestinationPath $ExtractTmp -Force
    if (Test-Path $InstallDir) { Remove-Item -Recurse -Force $InstallDir }
    Move-Item (Join-Path $ExtractTmp "AI-Cyber-Office-master") $InstallDir
    Remove-Item -Force $ZipPath
}

# 2. Install Skill for ChatGPT / Codex
Write-Host "[2/4] Configuring ChatGPT / Codex Skill..." -ForegroundColor Yellow
$CodexSkillDir = Join-Path $env:USERPROFILE ".codex\skills\ai-cyber-office"
New-Item -ItemType Directory -Force (Split-Path $CodexSkillDir) | Out-Null
if (Test-Path $CodexSkillDir) { Remove-Item -Recurse -Force $CodexSkillDir }
Copy-Item -Recurse (Join-Path $InstallDir "skills\ai-cyber-office") $CodexSkillDir

# 3. Register MCP Server in ~/.codex/config.toml
Write-Host "[3/4] Registering MCP Server in Codex config..." -ForegroundColor Yellow
$CodexCfg = Join-Path $env:USERPROFILE ".codex\config.toml"
$PythonExe = if (Get-Command python -ErrorAction SilentlyContinue) { "python" } elseif (Get-Command py -ErrorAction SilentlyContinue) { "py" } else { "python" }
$McpPath = ($InstallDir -replace "\\", "/") + "/mcp_server.py"
if (!(Test-Path $CodexCfg)) { New-Item -ItemType File -Force $CodexCfg | Out-Null }
$CfgText = Get-Content $CodexCfg -Raw -ErrorAction SilentlyContinue
if (-not $CfgText -or $CfgText -notmatch "mcp_servers\.ai_cyber_office") {
    Add-Content -Path $CodexCfg -Value "`n[mcp_servers.ai_cyber_office]`ncommand = `"$PythonExe`"`nargs = [`"$McpPath`"]`n"
}

# 4. Create Desktop Shortcut & Launch
Write-Host "[4/4] Creating Desktop shortcut & launching AI Cyber Office..." -ForegroundColor Green
$DesktopDir = [Environment]::GetFolderPath("Desktop")
$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut((Join-Path $DesktopDir "AI Cyber Office.lnk"))
$Shortcut.TargetPath = $PythonExe
$Shortcut.Arguments = "`"$(Join-Path $InstallDir 'server.py')`""
$Shortcut.WorkingDirectory = $InstallDir
$Shortcut.WindowStyle = 7
$Shortcut.Save()

Start-Process -FilePath $PythonExe -ArgumentList "`"$(Join-Path $InstallDir 'server.py')`"" -WorkingDirectory $InstallDir -WindowStyle Minimized
Start-Sleep -Seconds 2
Start-Process "http://localhost:8080"

Write-Host "`nDone! Restart ChatGPT Desktop to activate the plugin, and enjoy http://localhost:8080" -ForegroundColor Green
