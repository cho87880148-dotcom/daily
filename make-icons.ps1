# ============================================================
#  홈 화면 아이콘 두 개를 만듭니다. 한 번만 실행하면 됩니다.
#  아이콘 모양이 마음에 안 들면 아래 색과 글자를 바꾸고 다시 실행하세요.
# ============================================================

Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $MyInvocation.MyCommand.Path

$bgTop    = [System.Drawing.Color]::FromArgb(255, 32, 40, 54)
$bgBottom = [System.Drawing.Color]::FromArgb(255, 14, 17, 22)
$gold     = [System.Drawing.Color]::FromArgb(255, 255, 210, 63)

foreach ($size in @(180, 512)) {
    $bmp = New-Object System.Drawing.Bitmap($size, $size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAlias

    # 배경 (위에서 아래로 그라데이션)
    $rect = New-Object System.Drawing.Rectangle(0, 0, $size, $size)
    $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush($rect, $bgTop, $bgBottom, 90)
    $g.FillRectangle($brush, $rect)

    # 가운데 금색 원 (로또 공 느낌)
    $pad = [int]($size * 0.20)
    $circle = New-Object System.Drawing.Rectangle($pad, $pad, ($size - $pad * 2), ($size - $pad * 2))
    $goldBrush = New-Object System.Drawing.SolidBrush($gold)
    $g.FillEllipse($goldBrush, $circle)

    # 가운데 글자
    $fontSize = [int]($size * 0.30)
    $font = New-Object System.Drawing.Font('Malgun Gothic', $fontSize, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
    $fmt = New-Object System.Drawing.StringFormat
    $fmt.Alignment = [System.Drawing.StringAlignment]::Center
    $fmt.LineAlignment = [System.Drawing.StringAlignment]::Center
    $textBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 18, 22, 28))
    $g.DrawString('오늘', $font, $textBrush, [System.Drawing.RectangleF]::new(0, 0, $size, $size), $fmt)

    $path = Join-Path $root "icon-$size.png"
    $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)

    $g.Dispose(); $bmp.Dispose(); $brush.Dispose(); $goldBrush.Dispose(); $textBrush.Dispose(); $font.Dispose()
    Write-Host "  만듦: icon-$size.png" -ForegroundColor Green
}

Write-Host ''
