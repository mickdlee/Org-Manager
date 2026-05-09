# Bundle the project into a zip file, excluding git and other unnecessary files

param(
    [string]$OutputPath = "$PSScriptRoot\org-manager-bundle.zip"
)

$projectRoot = $PSScriptRoot
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$zipName = "org-manager-bundle_$timestamp.zip"
$zipPath = Join-Path (Split-Path $OutputPath -Parent) $zipName

# Files and directories to exclude
$excludePatterns = @(
    '.git',
    '.gitignore',
    'node_modules',
    '.vscode',
    'dist',
    'build',
    '.env',
    '.env.local',
    '*.log',
    '.DS_Store',
    'Thumbs.db'
)

Write-Host "Creating zip file: $zipPath"
Write-Host "Source: $projectRoot"
Write-Host "Excluding: $($excludePatterns -join ', ')"

# Create a temporary directory for staging
$stagingDir = Join-Path ([System.IO.Path]::GetTempPath()) "org-manager-bundle-$([guid]::NewGuid())"
New-Item -ItemType Directory -Path $stagingDir | Out-Null

try {
    # Copy all files except excluded patterns
    Write-Host "Copying files..."
    $items = Get-ChildItem -Path $projectRoot -Force

    foreach ($item in $items) {
        $shouldExclude = $false
        foreach ($pattern in $excludePatterns) {
            if ($item.Name -eq $pattern) {
                $shouldExclude = $true
                break
            }
        }
        
        if (-not $shouldExclude) {
            if ($item.PSIsContainer) {
                Copy-Item -Path $item.FullName -Destination (Join-Path $stagingDir $item.Name) -Recurse -Force
            } else {
                Copy-Item -Path $item.FullName -Destination $stagingDir -Force
            }
        }
    }

    # Create zip file
    Write-Host "Zipping files..."
    Add-Type -AssemblyName System.IO.Compression.FileSystem

    if (Test-Path $zipPath) {
        Remove-Item $zipPath -Force
    }

    [System.IO.Compression.ZipFile]::CreateFromDirectory($stagingDir, $zipPath, [System.IO.Compression.CompressionLevel]::Optimal, $false)

    $zipSize = (Get-Item $zipPath).Length / 1MB
    Write-Host "✓ Bundle created successfully!" -ForegroundColor Green
    Write-Host "  Location: $zipPath"
    Write-Host "  Size: $([Math]::Round($zipSize, 2)) MB"

} finally {
    # Clean up staging directory
    if (Test-Path $stagingDir) {
        Remove-Item -Path $stagingDir -Recurse -Force
    }
}
