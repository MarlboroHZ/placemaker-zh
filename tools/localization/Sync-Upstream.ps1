# Fetch and inspect by default. -Merge creates an isolated update branch and merges there.
[CmdletBinding()]
param([switch]$Merge, [string]$UpstreamBranch, [string]$UpdateBranch)
$ErrorActionPreference = 'Stop'
$repo = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'))
function Git {
    param([Parameter(ValueFromRemainingArguments=$true)][string[]]$Arguments)
    $result = & git -C $repo @Arguments
    if ($LASTEXITCODE -ne 0) { throw "git $($Arguments -join ' ') failed ($LASTEXITCODE)." }
    return $result
}
$remotes = @(Git @('remote'))
if ($remotes -notcontains 'upstream') {
    throw 'Configure upstream first using the original author repository (see docs/LOCALIZATION-ZH.md). No files changed.'
}
if ($Merge -and (Git @('status','--porcelain'))) { throw 'Commit or stash your changes before merging upstream.' }
Git @('fetch','upstream')
if (-not $UpstreamBranch) {
    $head = @(@(Git @('ls-remote','--symref','upstream','HEAD')) | Where-Object { $_ -match '^ref: refs/heads/(.+)\s+HEAD$' })
    if ($head.Count -ne 1 -or $head[0] -notmatch '^ref: refs/heads/(.+)\s+HEAD$') { throw 'Cannot resolve upstream default branch; specify -UpstreamBranch.' }
    $UpstreamBranch = $Matches[1]
}
Git @('check-ref-format', '--branch', $UpstreamBranch) | Out-Null
$ref = "refs/remotes/upstream/$UpstreamBranch"
Git @('rev-parse','--verify',"$ref^{commit}") | Out-Null
Write-Host "Upstream: $ref"
Git @('log','--oneline',"HEAD..$ref")
Git @('diff','--stat',"HEAD...$ref",'--','Lang','UI/src','Game/Localization')
if (-not $Merge) { Write-Host 'Inspection only. Run again with -Merge to merge into a new update branch.'; exit 0 }
if (-not $UpdateBranch) { $UpdateBranch = 'codex/zh-update-' + (Get-Date -Format 'yyyyMMdd-HHmmss') }
Git @('check-ref-format','--branch',$UpdateBranch) | Out-Null
Git @('switch','-c',$UpdateBranch)
Git @('merge','--no-edit',$ref)
# Conflicts leave Git's normal merge state intact; never resolve or reset user work automatically.
Push-Location $repo
try {
    & node UI/tools/extract-lang.js --check
    if ($LASTEXITCODE -ne 0) { throw 'UI English extraction changed. Regenerate and review its diff.' }
    & node tools/localization/check.cjs
    if ($LASTEXITCODE -ne 0) { throw 'Translation work remains. Inspect .forensics/localization/zh-HANS-report.json before accepting the source revision.' }
} finally { Pop-Location }
Write-Host "Merged on $UpdateBranch. Build and game validation are still required; nothing was pushed or installed."
