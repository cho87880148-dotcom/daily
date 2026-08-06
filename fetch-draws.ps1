# ============================================================
#  역대 로또 1등 당첨번호를 받아 data\draws.json 으로 저장합니다.
#  화면 아래쪽 "역대 1등 번호 통계" 에 쓰입니다.
#
#  실행:  .\fetch-draws.ps1
#
#  ※ 이 자료가 없어도 앱은 그대로 돌아갑니다.
#     통계 칸만 안 보이고, 합계 기준은 기본값(100~175)을 씁니다.
#
#  ※ 이미 받아둔 회차는 건너뛰고 새 회차만 받습니다.
#     매주 토요일 추첨 뒤에 한 번씩 실행하면 됩니다.
# ============================================================

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$dataDir = Join-Path $root 'data'
if (-not (Test-Path $dataDir)) { New-Item -ItemType Directory -Path $dataDir | Out-Null }
$outPath = Join-Path $dataDir 'draws.json'

$ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36'

# ---- 이미 받아둔 것 불러오기 ----
$have = @{}
$latestHave = 0
if (Test-Path $outPath) {
    try {
        $old = (Get-Content $outPath -Raw -Encoding UTF8) | ConvertFrom-Json
        foreach ($d in $old.draws) {
            $have[[int]$d.no] = @{ no = [int]$d.no; nums = @($d.nums | ForEach-Object { [int]$_ }); bonus = [int]$d.bonus }
            if ([int]$d.no -gt $latestHave) { $latestHave = [int]$d.no }
        }
        Write-Host "  이미 받아둔 회차: $($have.Count)개 (최근 ${latestHave}회)" -ForegroundColor DarkGray
    } catch {
        Write-Host '  기존 파일을 읽지 못해 처음부터 받습니다.' -ForegroundColor Yellow
    }
}

# ---- 1회차 추첨일(2002-12-07)로부터 지금까지 몇 회차인지 어림잡기 ----
$firstDraw = Get-Date '2002-12-07'
$weeks = [Math]::Floor(((Get-Date) - $firstDraw).TotalDays / 7)
$guessLatest = 1 + $weeks

Write-Host ''
Write-Host "  당첨번호를 받는 중... (최대 ${guessLatest}회차까지 확인)" -ForegroundColor Yellow

$added = 0
$failStreak = 0
$blocked = $false

for ($no = $latestHave + 1; $no -le $guessLatest + 1; $no++) {
    $url = "https://www.dhlottery.co.kr/common.do?method=getLottoNumber&drwNo=$no"
    try {
        $r = Invoke-WebRequest -Uri $url -Headers @{ 'User-Agent' = $ua } -UseBasicParsing -TimeoutSec 20
        $body = $r.Content.Trim()

        # 정상이면 JSON 이 옵니다. HTML 이 오면 동행복권이 막은 것입니다.
        if ($body.StartsWith('<')) { $blocked = $true; break }

        $j = $body | ConvertFrom-Json
        if ($j.returnValue -ne 'success') { $failStreak++; if ($failStreak -ge 3) { break }; continue }

        $nums = @($j.drwtNo1, $j.drwtNo2, $j.drwtNo3, $j.drwtNo4, $j.drwtNo5, $j.drwtNo6) |
                ForEach-Object { [int]$_ } | Sort-Object
        $have[$no] = @{ no = $no; nums = @($nums); bonus = [int]$j.bnusNo }
        $added++
        $failStreak = 0

        if ($added % 50 -eq 0) { Write-Host "    ${no}회까지 완료..." -ForegroundColor DarkGray }
        Start-Sleep -Milliseconds 120   # 상대 서버에 부담 주지 않기 위한 간격
    } catch {
        $failStreak++
        if ($failStreak -ge 3) { break }
    }
}

if ($blocked) {
    Write-Host ''
    Write-Host '  동행복권이 프로그램 접근을 막아두었습니다.' -ForegroundColor Red
    Write-Host ''
    Write-Host '  대신 이렇게 하시면 됩니다 (한 번만 하면 됩니다):' -ForegroundColor Yellow
    Write-Host '    1. https://dhlottery.co.kr  ->  당첨결과  ->  회차별 당첨번호'
    Write-Host '    2. 조회 범위를 1회 ~ 최신회차로 두고 [엑셀 다운로드]'
    Write-Host "    3. 내려받은 파일을 이 폴더의 data\ 안에 넣고 알려주세요"
    Write-Host ''
    Write-Host '  ※ 이 자료가 없어도 앱은 정상 동작합니다. 통계 칸만 안 보입니다.' -ForegroundColor DarkGray
    Write-Host ''
    if ($have.Count -eq 0) { exit 1 }
}

if ($have.Count -eq 0) {
    Write-Host '  받은 자료가 없습니다.' -ForegroundColor Red
    exit 1
}

# ---- 저장 ----
$sorted = $have.Values | Sort-Object { $_.no }
$latest = ($sorted | Select-Object -Last 1).no

$out = [ordered]@{
    updated = (Get-Date).ToString('yyyy-MM-dd')
    latest  = $latest
    draws   = @($sorted | ForEach-Object { [ordered]@{ no = $_.no; nums = $_.nums; bonus = $_.bonus } })
}

$json = $out | ConvertTo-Json -Depth 5 -Compress
[System.IO.File]::WriteAllText($outPath, $json, (New-Object System.Text.UTF8Encoding($false)))

Write-Host ''
Write-Host "  저장 완료 - 총 $($have.Count)회분 (최근 ${latest}회), 이번에 새로 받은 것 ${added}회" -ForegroundColor Green
Write-Host ''
