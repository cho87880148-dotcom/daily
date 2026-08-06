# ============================================================
#  미리보기 서버.
#
#  PC 에서 볼 때        :  http://localhost:8090
#  아이폰에서 볼 때     :  실행하면 아래에 찍히는 http://192.168... 주소를
#                          아이폰 사파리 주소창에 입력하세요 (같은 와이파이여야 합니다)
#
#  끄려면 Ctrl+C
# ============================================================

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$port = 8090

# 내 PC 의 와이파이 주소를 찾습니다 (아이폰에서 접속할 때 씁니다)
$lan = $null
try {
    $lan = (Get-NetIPAddress -AddressFamily IPv4 |
            Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254.*' } |
            Sort-Object -Property InterfaceMetric |
            Select-Object -First 1).IPAddress
} catch {}

$listener = New-Object System.Net.HttpListener
# + 로 열면 이 PC 의 모든 주소에서 접속을 받습니다 (아이폰 접속에 필요)
$listener.Prefixes.Add("http://+:$port/")

try {
    $listener.Start()
} catch {
    Write-Host ''
    Write-Host '  모든 주소로 열지 못했습니다. localhost 전용으로 대신 엽니다.' -ForegroundColor Yellow
    Write-Host '  (아이폰에서 보려면 PowerShell 을 관리자 권한으로 실행하세요)' -ForegroundColor Yellow
    $listener = New-Object System.Net.HttpListener
    $listener.Prefixes.Add("http://localhost:$port/")
    $listener.Start()
    $lan = $null
}

Write-Host ''
Write-Host "  PC     :  http://localhost:$port" -ForegroundColor Green
if ($lan) { Write-Host "  아이폰 :  http://${lan}:$port" -ForegroundColor Green }
Write-Host ''
Write-Host '  끄려면 Ctrl+C' -ForegroundColor DarkGray
Write-Host ''

$mime = @{
    '.html' = 'text/html; charset=utf-8'
    '.css'  = 'text/css; charset=utf-8'
    '.js'   = 'application/javascript; charset=utf-8'
    '.json' = 'application/json; charset=utf-8'
    '.png'  = 'image/png'
    '.ico'  = 'image/x-icon'
}

try {
    while ($listener.IsListening) {
        $ctx = $listener.GetContext()
        $rel = [System.Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath).TrimStart('/')
        if ([string]::IsNullOrWhiteSpace($rel)) { $rel = 'index.html' }

        $file = Join-Path $root ($rel -replace '/', '\')

        if (Test-Path $file -PathType Leaf) {
            $ext = [System.IO.Path]::GetExtension($file).ToLower()
            $type = $mime[$ext]
            if (-not $type) { $type = 'application/octet-stream' }

            $bytes = [System.IO.File]::ReadAllBytes($file)
            $ctx.Response.ContentType = $type
            # 고친 내용이 바로 보이도록 저장하지 않게 합니다
            $ctx.Response.Headers.Add('Cache-Control', 'no-store')
            $ctx.Response.ContentLength64 = $bytes.Length
            $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
        } else {
            $ctx.Response.StatusCode = 404
            $msg = [System.Text.Encoding]::UTF8.GetBytes('404 - ' + $rel)
            $ctx.Response.OutputStream.Write($msg, 0, $msg.Length)
        }
        $ctx.Response.OutputStream.Close()
    }
} finally {
    $listener.Stop()
    $listener.Close()
    Write-Host '  서버를 껐습니다.' -ForegroundColor DarkGray
}
