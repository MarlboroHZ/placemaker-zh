# Run on a build machine with the target game's Managed assemblies. Never installs into the game.
[CmdletBinding()]
param([Parameter(Mandatory=$true)][string]$ManagedPath)
$ErrorActionPreference = 'Stop'
$repo = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'))
$managed = (Resolve-Path -LiteralPath $ManagedPath).Path
if (-not (Test-Path -LiteralPath (Join-Path $managed 'Game.dll'))) { throw 'ManagedPath must contain Game.dll from the target game.' }
Get-Command dotnet,node,npm -ErrorAction Stop | Out-Null
Push-Location $repo
try {
    & node tools/localization/check.cjs
    if ($LASTEXITCODE -ne 0) { throw 'Localization check failed. Package was not built.' }
    if (-not (Test-Path -LiteralPath (Join-Path $repo 'UI/node_modules/webpack'))) {
        & npm ci --prefix UI
        if ($LASTEXITCODE -ne 0) { throw 'UI dependency installation failed.' }
    }
    & dotnet build Placemaker.csproj -c Release -p:Deploy=false "-p:ManagedPath=$managed"
    if ($LASTEXITCODE -ne 0) { throw 'Build failed. Package was not created.' }
    $id = (Get-Date -Format 'yyyyMMdd-HHmmss') + '-' + [Guid]::NewGuid().ToString('N').Substring(0,8)
    $stage = Join-Path $repo ".forensics/packages/$id/Placemaker"
    New-Item -ItemType Directory -Path $stage -Force | Out-Null
    Copy-Item -Path (Join-Path $repo 'bin/Release/*') -Destination $stage -Recurse
    Copy-Item -Path (Join-Path $repo 'UI/build/*') -Destination $stage -Recurse -Force
    foreach ($file in @('Placemaker.dll','0Harmony.dll','Placemaker.mjs','Placemaker.css','Lang/zh-HANS.ui.json','Recipes')) {
        if (-not (Test-Path -LiteralPath (Join-Path $stage $file))) { throw "Package missing $file" }
    }
    Copy-Item -LiteralPath (Join-Path $repo 'docs/LOCALIZATION-ZH.md') -Destination (Join-Path $stage 'LOCALIZATION-ZH.md')
    $commit = & git rev-parse HEAD
    if ($LASTEXITCODE -ne 0) { throw 'Cannot identify source commit.' }
    $dirty = [bool](& git status --porcelain)
    @{ sourceCommit=$commit; uncommittedChanges=$dirty; gameAssemblyVersion=(Get-Item -LiteralPath (Join-Path $managed 'Game.dll')).VersionInfo.FileVersion; gameVerified=$false; sourceUrl='https://github.com/MarlboroHZ/placemaker'; note='Machine-assisted Chinese localization; game validation still required.' } | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $stage 'localization-build.json') -Encoding UTF8
    $out = Join-Path $repo '.forensics/packages'
    $zip = Join-Path $out "Placemaker-zh-HANS-$id.zip"
    Compress-Archive -LiteralPath $stage -DestinationPath $zip
    Write-Host "Package created: $zip"
    Write-Host 'Not installed and not game-verified. Keep the matching source commit with this package.'
} finally { Pop-Location }
