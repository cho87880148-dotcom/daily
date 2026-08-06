# ============================================================
#  홈 화면 아이콘을 만듭니다.
#
#  원본은 이 폴더의  icon-source.jpg  입니다.
#  아이콘을 바꾸고 싶으면 그 파일을 원하는 그림으로 바꿔치기하고
#  이 스크립트를 다시 실행하세요.
#
#  실행:  .\make-icons.ps1
#
#  ※ 원본은 정사각형이 가장 좋습니다. 직사각형이면 가운데를 정사각형으로
#     잘라서 씁니다 (아이폰 아이콘이 정사각형이라 어차피 잘립니다).
# ============================================================

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$srcPath = Join-Path $root 'icon-source.jpg'

if (-not (Test-Path $srcPath)) {
    Write-Host ''
    Write-Host "  원본 그림이 없습니다: $srcPath" -ForegroundColor Red
    Write-Host '  아이콘으로 쓸 그림을 icon-source.jpg 라는 이름으로 이 폴더에 넣으세요.'
    Write-Host ''
    exit 1
}

$src = [System.Drawing.Image]::FromFile($srcPath)
Write-Host ''
Write-Host "  원본: $($src.Width) x $($src.Height)" -ForegroundColor DarkGray

# 가운데를 정사각형으로 잘라냅니다
$side = [Math]::Min($src.Width, $src.Height)
$cropX = [int](($src.Width  - $side) / 2)
$cropY = [int](($src.Height - $side) / 2)
$crop = New-Object System.Drawing.Rectangle($cropX, $cropY, $side, $side)

foreach ($size in @(180, 512)) {
    $bmp = New-Object System.Drawing.Bitmap($size, $size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)

    # 크게 줄일 때 계단현상이 생기지 않도록 최고 품질로 맞춥니다
    $g.InterpolationMode  = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode      = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode    = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality

    $dest = New-Object System.Drawing.Rectangle(0, 0, $size, $size)
    $g.DrawImage($src, $dest, $crop, [System.Drawing.GraphicsUnit]::Pixel)

    $out = Join-Path $root "icon-$size.png"
    $bmp.Save($out, [System.Drawing.Imaging.ImageFormat]::Png)

    $g.Dispose(); $bmp.Dispose()
    Write-Host "  만듦: icon-$size.png" -ForegroundColor Green
}

$src.Dispose()
Write-Host ''
Write-Host '  ※ 이미 홈 화면에 추가해 두셨다면, 아이콘을 지웠다가 다시 추가해야' -ForegroundColor Yellow
Write-Host '     새 그림으로 바뀝니다. 아이폰이 아이콘을 따로 저장해 두기 때문입니다.' -ForegroundColor Yellow
Write-Host ''
