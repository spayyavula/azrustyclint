<#
.SYNOPSIS
    End-to-end automation script for RustyClint with HTTPS support.

.DESCRIPTION
    This script sets up and runs the complete RustyClint stack with HTTPS enabled.
    It generates self-signed certificates, builds containers, and starts all services.

.PARAMETER Action
    The action to perform: start, stop, restart, logs, clean, status, certs

.PARAMETER Build
    Force rebuild of Docker images

.PARAMETER Detach
    Run containers in detached mode (default: true)

.EXAMPLE
    .\run-e2e.ps1 start
    Starts the e2e environment with HTTPS

.EXAMPLE
    .\run-e2e.ps1 start -Build
    Rebuilds and starts the e2e environment

.EXAMPLE
    .\run-e2e.ps1 logs -Service api
    Shows logs for the API service

.EXAMPLE
    .\run-e2e.ps1 clean
    Stops and removes all containers, volumes, and generated certificates
#>

param(
    [Parameter(Position = 0)]
    [ValidateSet("start", "stop", "restart", "logs", "clean", "status", "certs")]
    [string]$Action = "start",

    [switch]$Build,

    [switch]$Detach = $true,

    [string]$Service = ""
)

$ErrorActionPreference = "Stop"

# Configuration
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$CertsDir = Join-Path $ScriptDir "certs"
$ComposeFile = Join-Path $ScriptDir "docker-compose.e2e.yml"
$ProjectName = "rustyclint-e2e"

# Colors for output
function Write-Info { param($Message) Write-Host "[INFO] $Message" -ForegroundColor Cyan }
function Write-Success { param($Message) Write-Host "[OK] $Message" -ForegroundColor Green }
function Write-Warning { param($Message) Write-Host "[WARN] $Message" -ForegroundColor Yellow }
function Write-Error { param($Message) Write-Host "[ERROR] $Message" -ForegroundColor Red }

# Generate self-signed certificates
function New-SelfSignedCerts {
    Write-Info "Generating self-signed SSL certificates..."

    if (-not (Test-Path $CertsDir)) {
        New-Item -ItemType Directory -Path $CertsDir | Out-Null
    }

    $KeyFile = Join-Path $CertsDir "server.key"
    $CrtFile = Join-Path $CertsDir "server.crt"

    # Check if OpenSSL is available
    $openssl = Get-Command openssl -ErrorAction SilentlyContinue

    if ($openssl) {
        # Generate using OpenSSL
        Write-Info "Using OpenSSL to generate certificates..."

        & openssl req -x509 -nodes -days 365 -newkey rsa:2048 `
            -keyout $KeyFile `
            -out $CrtFile `
            -subj "/C=US/ST=State/L=City/O=RustyClint/OU=Dev/CN=localhost" `
            -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"

        if ($LASTEXITCODE -ne 0) {
            throw "Failed to generate certificates with OpenSSL"
        }
    }
    else {
        # Generate using PowerShell (Windows)
        Write-Info "Using PowerShell to generate certificates..."

        $cert = New-SelfSignedCertificate `
            -DnsName "localhost", "127.0.0.1" `
            -CertStoreLocation "Cert:\CurrentUser\My" `
            -NotAfter (Get-Date).AddYears(1) `
            -KeyExportPolicy Exportable `
            -KeySpec Signature `
            -KeyLength 2048 `
            -KeyAlgorithm RSA `
            -HashAlgorithm SHA256

        # Export private key
        $password = ConvertTo-SecureString -String "temppassword" -Force -AsPlainText
        $pfxPath = Join-Path $CertsDir "server.pfx"

        Export-PfxCertificate -Cert "Cert:\CurrentUser\My\$($cert.Thumbprint)" `
            -FilePath $pfxPath -Password $password | Out-Null

        # Convert PFX to PEM format using certutil
        $pemPath = Join-Path $CertsDir "server.pem"
        & certutil -exportPFX -p "temppassword" "Cert:\CurrentUser\My\$($cert.Thumbprint)" $pfxPath | Out-Null

        # We need OpenSSL to extract key and cert from PFX
        # Fall back to creating a simple test cert
        Write-Warning "PowerShell certificate generation requires OpenSSL to extract PEM files."
        Write-Warning "Please install OpenSSL or use WSL with OpenSSL."

        # Clean up
        Remove-Item $pfxPath -ErrorAction SilentlyContinue
        Remove-Item "Cert:\CurrentUser\My\$($cert.Thumbprint)" -ErrorAction SilentlyContinue

        throw "OpenSSL is required for certificate generation. Please install OpenSSL and try again."
    }

    Write-Success "Certificates generated in $CertsDir"
    Write-Info "  - Private Key: $KeyFile"
    Write-Info "  - Certificate: $CrtFile"
}

# Check if certificates exist
function Test-Certificates {
    $KeyFile = Join-Path $CertsDir "server.key"
    $CrtFile = Join-Path $CertsDir "server.crt"

    return (Test-Path $KeyFile) -and (Test-Path $CrtFile)
}

# Start the e2e environment
function Start-E2E {
    Write-Info "Starting RustyClint E2E environment with HTTPS..."

    # Ensure certificates exist
    if (-not (Test-Certificates)) {
        New-SelfSignedCerts
    }
    else {
        Write-Info "Using existing certificates in $CertsDir"
    }

    # Build command
    $composeArgs = @("-f", $ComposeFile, "-p", $ProjectName, "up")

    if ($Build) {
        $composeArgs += "--build"
    }

    if ($Detach) {
        $composeArgs += "-d"
    }

    Write-Info "Running: docker compose $($composeArgs -join ' ')"
    & docker compose @composeArgs

    if ($LASTEXITCODE -ne 0) {
        throw "Failed to start Docker Compose"
    }

    if ($Detach) {
        Write-Success "E2E environment started successfully!"
        Write-Info ""
        Write-Info "Access the application:"
        Write-Info "  - HTTPS: https://localhost"
        Write-Info "  - API:   https://localhost/api/v1"
        Write-Info "  - Health: https://localhost/health"
        Write-Info ""
        Write-Warning "Note: You may need to accept the self-signed certificate in your browser."
        Write-Info ""
        Write-Info "Useful commands:"
        Write-Info "  .\run-e2e.ps1 logs          - View all logs"
        Write-Info "  .\run-e2e.ps1 logs -Service api  - View API logs"
        Write-Info "  .\run-e2e.ps1 status        - Check service status"
        Write-Info "  .\run-e2e.ps1 stop          - Stop the environment"
        Write-Info "  .\run-e2e.ps1 clean         - Clean up everything"
    }
}

# Stop the e2e environment
function Stop-E2E {
    Write-Info "Stopping RustyClint E2E environment..."

    & docker compose -f $ComposeFile -p $ProjectName down

    if ($LASTEXITCODE -ne 0) {
        throw "Failed to stop Docker Compose"
    }

    Write-Success "E2E environment stopped."
}

# Show logs
function Show-Logs {
    Write-Info "Showing logs..."

    $composeArgs = @("-f", $ComposeFile, "-p", $ProjectName, "logs", "-f")

    if ($Service) {
        $composeArgs += $Service
    }

    & docker compose @composeArgs
}

# Clean up everything
function Clear-E2E {
    Write-Info "Cleaning up RustyClint E2E environment..."

    # Stop and remove containers, networks, volumes
    & docker compose -f $ComposeFile -p $ProjectName down -v --remove-orphans

    # Remove certificates
    if (Test-Path $CertsDir) {
        Write-Info "Removing certificates..."
        Remove-Item -Recurse -Force $CertsDir
    }

    Write-Success "Cleanup complete."
}

# Show status
function Show-Status {
    Write-Info "RustyClint E2E Status:"
    Write-Info ""

    & docker compose -f $ComposeFile -p $ProjectName ps

    Write-Info ""
    Write-Info "Certificate Status:"
    if (Test-Certificates) {
        Write-Success "  Certificates exist in $CertsDir"
    }
    else {
        Write-Warning "  No certificates found"
    }
}

# Main execution
try {
    switch ($Action) {
        "start" {
            Start-E2E
        }
        "stop" {
            Stop-E2E
        }
        "restart" {
            Stop-E2E
            Start-E2E
        }
        "logs" {
            Show-Logs
        }
        "clean" {
            Clear-E2E
        }
        "status" {
            Show-Status
        }
        "certs" {
            New-SelfSignedCerts
        }
    }
}
catch {
    Write-Error $_.Exception.Message
    exit 1
}
