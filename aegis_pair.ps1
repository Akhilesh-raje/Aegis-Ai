#!/usr/bin/env pwsh
# ═══════════════════════════════════════════════════════════════════════
# AegisAI — Remote Agent Auto-Pair Script
# ═══════════════════════════════════════════════════════════════════════
# Run this on the CLIENT system that is connected to the Admin's hotspot.
# It will auto-discover the Admin IP (the gateway), verify connectivity,
# and launch the AegisAI Agent to begin secure real-time streaming.
# ═══════════════════════════════════════════════════════════════════════

Write-Host ""
Write-Host "  ╔═══════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "  ║   AEGIS AI — Remote Agent Auto-Pair Script   ║" -ForegroundColor Cyan
Write-Host "  ╚═══════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# ── Step 1: Discover Admin IP via Gateway ──────────────────────────────
Write-Host "[1/5] Discovering Admin system via network gateway..." -ForegroundColor Yellow

$gateway = $null
try {
    # Get the default gateway (the hotspot host = Admin machine)
    $route = Get-NetRoute -DestinationPrefix "0.0.0.0/0" -ErrorAction Stop | 
             Where-Object { $_.NextHop -ne "0.0.0.0" } | 
             Sort-Object -Property RouteMetric | 
             Select-Object -First 1
    $gateway = $route.NextHop
} catch {
    Write-Host "[!] Could not auto-detect gateway. Trying fallback..." -ForegroundColor Red
}

if (-not $gateway) {
    # Fallback: parse ipconfig
    $ipconfigOutput = ipconfig | Select-String "Default Gateway" | ForEach-Object { 
        ($_ -split ":\s*")[1].Trim() 
    } | Where-Object { $_ -ne "" } | Select-Object -First 1
    $gateway = $ipconfigOutput
}

if (-not $gateway) {
    Write-Host "[FATAL] Could not detect network gateway." -ForegroundColor Red
    Write-Host "        Make sure this system is connected to the Admin's hotspot." -ForegroundColor Red
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

$ADMIN_IP = $gateway
$ADMIN_PORT = 8000
$ADMIN_URL = "http://${ADMIN_IP}:${ADMIN_PORT}"

Write-Host "       Admin IP discovered: $ADMIN_IP" -ForegroundColor Green
Write-Host "       Admin URL: $ADMIN_URL" -ForegroundColor Green

# ── Step 2: Get Client Identity ───────────────────────────────────────
Write-Host "[2/5] Collecting system identity..." -ForegroundColor Yellow

$NODE_ID = $env:COMPUTERNAME
$OS_INFO = [System.Environment]::OSVersion.VersionString
$LOCAL_IP = (Get-NetIPAddress -AddressFamily IPv4 | 
             Where-Object { $_.InterfaceAlias -notlike "*Loopback*" -and $_.IPAddress -ne "127.0.0.1" } | 
             Select-Object -First 1).IPAddress

Write-Host "       Node ID:   $NODE_ID" -ForegroundColor Green
Write-Host "       Local IP:  $LOCAL_IP" -ForegroundColor Green
Write-Host "       OS:        $OS_INFO" -ForegroundColor Green

# ── Step 3: Check Admin Reachability ──────────────────────────────────
Write-Host "[3/5] Testing connectivity to Admin server..." -ForegroundColor Yellow

$connected = $false
for ($i = 1; $i -le 5; $i++) {
    try {
        $response = Invoke-WebRequest -Uri "$ADMIN_URL/api/stats" -TimeoutSec 3 -UseBasicParsing -ErrorAction Stop
        if ($response.StatusCode -eq 200) {
            $connected = $true
            Write-Host "       Connection verified! Admin is ONLINE." -ForegroundColor Green
            break
        }
    } catch {
        Write-Host "       Attempt $i/5 — waiting for Admin..." -ForegroundColor DarkYellow
        Start-Sleep -Seconds 2
    }
}

if (-not $connected) {
    Write-Host "[FATAL] Cannot reach Admin at $ADMIN_URL" -ForegroundColor Red
    Write-Host "        Possible causes:" -ForegroundColor Red
    Write-Host "        - Admin server not running (start it first)" -ForegroundColor Red
    Write-Host "        - Firewall blocking port $ADMIN_PORT" -ForegroundColor Red
    Write-Host "        - Not connected to Admin's hotspot" -ForegroundColor Red
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

# ── Step 4: Pre-Register via REST ─────────────────────────────────────
Write-Host "[4/5] Registering with Admin SOC Command Center..." -ForegroundColor Yellow

try {
    $body = @{
        node_id  = $NODE_ID
        hostname = $NODE_ID
        os       = $OS_INFO
        local_ip = $LOCAL_IP
    } | ConvertTo-Json

    $regResponse = Invoke-WebRequest -Uri "$ADMIN_URL/api/fleet/register" `
        -Method POST `
        -Body $body `
        -ContentType "application/json" `
        -UseBasicParsing `
        -TimeoutSec 10

    $regData = $regResponse.Content | ConvertFrom-Json
    Write-Host "       Registration SUCCESSFUL" -ForegroundColor Green
    Write-Host "       Token: $($regData.token.Substring(0, 12))..." -ForegroundColor DarkGray
} catch {
    Write-Host "[WARNING] Pre-registration failed: $($_.Exception.Message)" -ForegroundColor DarkYellow
    Write-Host "          The agent will retry during startup." -ForegroundColor DarkYellow
}

# ── Step 5: Launch AegisAI Agent ──────────────────────────────────────
Write-Host "[5/5] Launching AegisAI Agent..." -ForegroundColor Yellow
Write-Host ""
Write-Host "  ╔═══════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "  ║  PAIRED SUCCESSFULLY                          ║" -ForegroundColor Green
Write-Host "  ║  Admin: $($ADMIN_IP.PadRight(38))  ║" -ForegroundColor Green
Write-Host "  ║  Agent: $($NODE_ID.PadRight(38))  ║" -ForegroundColor Green
Write-Host "  ║  Status: STREAMING TELEMETRY                  ║" -ForegroundColor Green
Write-Host "  ╚═══════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host ""
Write-Host "  The Admin can now see this system in Fleet & Identities." -ForegroundColor Cyan
Write-Host "  Press Ctrl+C to disconnect." -ForegroundColor DarkGray
Write-Host ""

# Set environment and launch
$env:NODE_ROLE = "client"
$env:ADMIN_URL = $ADMIN_URL
$env:NODE_ID = $NODE_ID

# Run the agent
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8001
