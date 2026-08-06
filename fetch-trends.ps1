# ============================================================
#  지금 뜨는 검색어를 받아 data\trends.json 으로 저장합니다.
#
#  왜 이 스크립트가 필요한가:
#    브라우저는 보안 때문에 다른 사이트(구글)의 자료를 직접 읽지 못합니다.
#    그래서 이 스크립트가 미리 받아서 파일로 저장해 두고, 앱은 그 파일만 읽습니다.
#
#  실행:  .\fetch-trends.ps1
# ============================================================

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$dataDir = Join-Path $root 'data'
if (-not (Test-Path $dataDir)) { New-Item -ItemType Directory -Path $dataDir | Out-Null }

$ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36'
$url = 'https://trends.google.co.kr/trending/rss?geo=KR'

Write-Host ''
Write-Host '  인기 검색어를 받는 중...' -ForegroundColor Yellow

try {
    $resp = Invoke-WebRequest -Uri $url -Headers @{ 'User-Agent' = $ua } -UseBasicParsing -TimeoutSec 30
} catch {
    Write-Host "  실패: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host '  인터넷 연결을 확인하세요. 기존 파일은 그대로 둡니다.'
    exit 1
}

$xml = [xml]$resp.Content

# 구글이 붙여주는 추가 정보(검색량 등)는 ht: 라는 이름표를 달고 옵니다
$ns = New-Object System.Xml.XmlNamespaceManager($xml.NameTable)
$ns.AddNamespace('ht', 'https://trends.google.com/trending/rss')

$items = @()
foreach ($node in $xml.SelectNodes('//channel/item')) {
    $word = $node.SelectSingleNode('title').InnerText.Trim()
    if (-not $word) { continue }

    $hits = ''
    $trafficNode = $node.SelectSingleNode('ht:approx_traffic', $ns)
    if ($trafficNode) { $hits = $trafficNode.InnerText.Trim() }

    $items += [ordered]@{ word = $word; hits = $hits }
}

if ($items.Count -eq 0) {
    Write-Host '  받아온 검색어가 0개입니다. 구글이 형식을 바꿨을 수 있습니다.' -ForegroundColor Red
    exit 1
}

# ★ 반드시 한국시각으로 적어야 합니다.
#   GitHub 서버는 UTC 로 돌아가서 (Get-Date) 를 그대로 쓰면 9시간 어긋난 시각이 찍힙니다.
#   실제로 그렇게 나가서 "자료가 9시간 전 것"처럼 보였던 적이 있습니다 (2026-08-06).
#   UtcNow + 9 는 윈도우와 리눅스 양쪽에서 똑같이 동작합니다.
$kst = [DateTime]::UtcNow.AddHours(9)

$out = [ordered]@{
    updated = $kst.ToString('yyyy-MM-dd HH:mm')
    source  = 'Google Trends KR'
    items   = @($items | Select-Object -First 10)
}

$json = $out | ConvertTo-Json -Depth 5
$path = Join-Path $dataDir 'trends.json'
[System.IO.File]::WriteAllText($path, $json, (New-Object System.Text.UTF8Encoding($false)))

Write-Host "  저장 완료 - $($out.items.Count)개" -ForegroundColor Green
$rank = 1
foreach ($it in $out.items) {
    $suffix = ''
    if ($it.hits) { $suffix = "  ($($it.hits))" }
    Write-Host ("    {0,2}. {1}{2}" -f $rank, $it.word, $suffix)
    $rank++
}
Write-Host ''
