$ErrorActionPreference = 'Stop'
$assetRoot = [System.IO.Path]::GetFullPath($PSScriptRoot)
$profilePath = [System.IO.Path]::GetFullPath((Join-Path $assetRoot '.preview-browser-profile'))
if (-not $profilePath.StartsWith($assetRoot + '\', [System.StringComparison]::OrdinalIgnoreCase)) {
    throw 'Preview profile escaped the asset folder.'
}
$browserPath = 'C:\Program Files\Google\Chrome\Application\chrome.exe'
if (-not (Test-Path -LiteralPath $browserPath)) {
    $browserPath = 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
}
$outputPath = Join-Path $assetRoot 'preview_astral_crusader_geometry_v4.png'
$pageUrl = ([System.Uri](Join-Path $assetRoot 'preview.html')).AbsoluteUri
try {
    $browserArgs = @('--headless=new', '--disable-gpu', '--no-sandbox', '--hide-scrollbars',
        '--virtual-time-budget=4000', '--window-size=1095,1436',
        "--user-data-dir=$profilePath", "--screenshot=$outputPath", $pageUrl)
    $process = Start-Process -FilePath $browserPath -ArgumentList $browserArgs -Wait -PassThru -WindowStyle Hidden
    if ($process.ExitCode -ne 0) { throw "Preview browser failed: $($process.ExitCode)" }
    Write-Output $outputPath
} finally {
    if (Test-Path -LiteralPath $profilePath) {
        Remove-Item -LiteralPath $profilePath -Recurse -Force
    }
}
