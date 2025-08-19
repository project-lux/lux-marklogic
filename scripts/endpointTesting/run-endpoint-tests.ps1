# LUX Endpoint Test Runner
# PowerShell script for running endpoint tests with different configurations

param(
    [string]$ConfigDir = "configs",
    [string]$Environment = "local", 
    [string]$OutputDir = "test-reports",
    [switch]$Parallel = $false,
    [int]$Delay = 0,
    [switch]$Verbose = $false
)

# Colors for console output
function Write-ColorOutput($ForegroundColor) {
    $fc = $host.UI.RawUI.ForegroundColor
    $host.UI.RawUI.ForegroundColor = $ForegroundColor
    if ($args) {
        Write-Output $args
    }
    $host.UI.RawUI.ForegroundColor = $fc
}

function Write-Success { Write-ColorOutput Green $args }
function Write-Error { Write-ColorOutput Red $args }
function Write-Warning { Write-ColorOutput Yellow $args }
function Write-Info { Write-ColorOutput Cyan $args }

# Check if Node.js is installed
try {
    $nodeVersion = node --version
    Write-Info "Node.js version: $nodeVersion"
} catch {
    Write-Error "Node.js is not installed or not in PATH"
    Write-Error "Please install Node.js from https://nodejs.org/"
    exit 1
}

# Check if npm packages are installed
$packageJsonPath = Join-Path $PSScriptRoot "package.json"
$nodeModulesPath = Join-Path $PSScriptRoot "node_modules"

if (-not (Test-Path $nodeModulesPath)) {
    Write-Warning "Node modules not found. Installing dependencies..."
    Push-Location $PSScriptRoot
    try {
        npm install
        if ($LASTEXITCODE -ne 0) {
            throw "npm install failed"
        }
        Write-Success "Dependencies installed successfully"
    } catch {
        Write-Error "Failed to install dependencies: $_"
        Pop-Location
        exit 1
    }
    Pop-Location
}

# Verify config directory exists
$configPath = Join-Path $PSScriptRoot $ConfigDir
if (-not (Test-Path $configPath)) {
    Write-Error "Configuration directory not found: $configPath"
    Write-Info "Please create the configs directory and add endpoint configuration files"
    Write-Info "Run 'npm run create-templates' to generate template files"
    exit 1
}

# Check if config directory has any Excel files
$configFiles = Get-ChildItem -Path $configPath -Filter "*.xlsx"
if ($configFiles.Count -eq 0) {
    Write-Warning "No Excel configuration files found in: $configPath"
    Write-Info "Available files:"
    Get-ChildItem -Path $configPath | ForEach-Object { Write-Info "  - $($_.Name)" }
    Write-Info "Run 'npm run create-templates' to generate template files"
}

# Create output directory
$outputPath = Join-Path $PSScriptRoot $OutputDir
if (-not (Test-Path $outputPath)) {
    New-Item -ItemType Directory -Path $outputPath -Force | Out-Null
    Write-Info "Created output directory: $outputPath"
}

# Build command arguments
$args = @()
$args += $configPath
$args += $outputPath

if ($Verbose) {
    $env:DEBUG = "true"
}

# Run the test
Write-Info "Starting endpoint tests..."
Write-Info "Configuration Directory: $ConfigDir"
Write-Info "Environment: $Environment"
Write-Info "Output Directory: $OutputDir"
Write-Info "Parallel Execution: $Parallel"

if ($Delay -gt 0) {
    Write-Info "Delay between tests: ${Delay}ms"
    $env:TEST_DELAY = $Delay
}

$env:TEST_ENVIRONMENT = $Environment
$env:PARALLEL_EXECUTION = if ($Parallel) { "true" } else { "false" }

Push-Location $PSScriptRoot
try {
    $startTime = Get-Date
    Write-Info "Test execution started at: $startTime"
    
    node endpoint-test-runner.js @args
    
    $endTime = Get-Date
    $duration = $endTime - $startTime
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "All tests completed successfully!"
        Write-Info "Total execution time: $($duration.ToString('mm\:ss\.fff'))"
        
        # Show recent report files
        Write-Info "`nGenerated reports:"
        Get-ChildItem -Path $outputPath -Filter "*endpoint-test-report*" | 
            Sort-Object LastWriteTime -Descending | 
            Select-Object -First 3 | 
            ForEach-Object { Write-Info "  - $($_.Name)" }
            
    } else {
        Write-Error "Tests failed with exit code: $LASTEXITCODE"
        Write-Info "Check the output above for error details"
    }
    
} catch {
    Write-Error "Failed to run tests: $_"
    exit 1
} finally {
    Pop-Location
}

# Optional: Open HTML report if available
$htmlReports = Get-ChildItem -Path $outputPath -Filter "*.html" | Sort-Object LastWriteTime -Descending
if ($htmlReports.Count -gt 0) {
    $latestReport = $htmlReports[0].FullName
    Write-Info "`nLatest HTML report: $($htmlReports[0].Name)"
    
    $response = Read-Host "Would you like to open the HTML report? (y/N)"
    if ($response -eq 'y' -or $response -eq 'Y') {
        Start-Process $latestReport
    }
}

Write-Info "Endpoint testing completed."
