# Aryam site backup — exports Supabase data + copies schema/seed into backups/
# Usage (from repo root):
#   powershell -ExecutionPolicy Bypass -File scripts/backup.ps1
#
# Backups stay local (gitignored). Code is already backed up on GitHub.

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $Root

function Read-DotEnv {
  param([string]$Path)
  $map = @{}
  if (-not (Test-Path $Path)) { return $map }
  Get-Content $Path | ForEach-Object {
    $line = $_.Trim()
    if (-not $line -or $line.StartsWith("#")) { return }
    $i = $line.IndexOf("=")
    if ($i -lt 1) { return }
    $k = $line.Substring(0, $i).Trim()
    $v = $line.Substring($i + 1).Trim()
    if (($v.StartsWith('"') -and $v.EndsWith('"')) -or ($v.StartsWith("'") -and $v.EndsWith("'"))) {
      $v = $v.Substring(1, $v.Length - 2)
    }
    $map[$k] = $v
  }
  return $map
}

$envMap = Read-DotEnv (Join-Path $Root ".env")
$SupabaseUrl = $envMap["SUPABASE_URL"]
$ServiceKey = $envMap["SUPABASE_SERVICE_ROLE_KEY"]
if (-not $ServiceKey) { $ServiceKey = $envMap["SUPABASE_ANON_KEY"] }

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupDir = Join-Path $Root "backups\aryam-$stamp"
New-Item -ItemType Directory -Force -Path $backupDir | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $backupDir "data") | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $backupDir "supabase") | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $backupDir "meta") | Out-Null

Write-Host "Creating backup: $backupDir"

# --- Git snapshot info ---
$gitHead = ""
$gitStatus = ""
try { $gitHead = (git -C $Root rev-parse HEAD 2>$null) } catch { }
try { $gitStatus = (git -C $Root status --short 2>$null | Out-String) } catch { }
@{
  createdAt = (Get-Date).ToString("o")
  siteUrl = $envMap["SITE_URL"]
  gitHead = "$gitHead"
  gitStatus = "$gitStatus"
  note = "Local backup of Aryam catalog + SQL. Code history lives on GitHub."
} | ConvertTo-Json | Set-Content -Encoding UTF8 (Join-Path $backupDir "meta\info.json")

# --- Copy SQL + seed files ---
if (Test-Path (Join-Path $Root "supabase")) {
  Copy-Item -Path (Join-Path $Root "supabase\*") -Destination (Join-Path $backupDir "supabase") -Recurse -Force
}
if (Test-Path (Join-Path $Root "data")) {
  Copy-Item -Path (Join-Path $Root "data\*") -Destination (Join-Path $backupDir "data") -Recurse -Force
}
if (Test-Path (Join-Path $Root "env.example")) {
  Copy-Item (Join-Path $Root "env.example") (Join-Path $backupDir "meta\env.example") -Force
}

# --- Export Supabase tables ---
function Export-Table {
  param([string]$Table, [string]$OutFile)
  if (-not $SupabaseUrl -or -not $ServiceKey) {
    Write-Warning "Skipping $Table — SUPABASE_URL / key missing in .env"
    return $false
  }
  $uri = "$SupabaseUrl/rest/v1/$Table`?select=*"
  try {
    $rows = Invoke-RestMethod -Uri $uri -Headers @{
      apikey = $ServiceKey
      Authorization = "Bearer $ServiceKey"
      Prefer = "count=exact"
    } -Method Get
    $rows | ConvertTo-Json -Depth 20 | Set-Content -Encoding UTF8 $OutFile
    $count = if ($rows -is [Array]) { $rows.Count } else { if ($null -eq $rows) { 0 } else { 1 } }
    Write-Host ("  exported {0} ({1} rows)" -f $Table, $count)
    return $true
  } catch {
    Write-Warning ("  failed {0} : {1}" -f $Table, $_.Exception.Message)
    return $false
  }
}

$exportDir = Join-Path $backupDir "exports"
New-Item -ItemType Directory -Force -Path $exportDir | Out-Null
Export-Table -Table "products" -OutFile (Join-Path $exportDir "products.json") | Out-Null
Export-Table -Table "orders" -OutFile (Join-Path $exportDir "orders.json") | Out-Null
Export-Table -Table "instagram_posts_cache" -OutFile (Join-Path $exportDir "instagram_posts_cache.json") | Out-Null
Export-Table -Table "google_reviews_cache" -OutFile (Join-Path $exportDir "google_reviews_cache.json") | Out-Null

# --- Zip it ---
$zipPath = Join-Path $Root "backups\aryam-$stamp.zip"
if (Test-Path $zipPath) { Remove-Item $zipPath -Force }
Compress-Archive -Path $backupDir -DestinationPath $zipPath -Force
Write-Host ""
Write-Host "Backup ready:"
Write-Host "  folder: $backupDir"
Write-Host "  zip:    $zipPath"
Write-Host ""
Write-Host "Keep the zip somewhere safe (Drive / external disk). Do not commit backups/ to git."
