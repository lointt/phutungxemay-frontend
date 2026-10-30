Add-Type -AssemblyName System.Drawing

$outDir1 = "C:\anh-phu-tung"
$outDir2 = "c:\Users\DUY\PhuTungXeMay\phutungxemay-frontend\public\images"
New-Item -ItemType Directory -Force -Path $outDir1 | Out-Null
New-Item -ItemType Directory -Force -Path $outDir2 | Out-Null

$grids = @(
    @{
        Path = "C:\Users\DUY\.gemini\antigravity\brain\c3bf559d-badf-4d55-aaf3-206a0d99db69\products_grid_transmission_1793334702647.jpg"
        TL = "did-428hds.jpg"
        TR = "nhong-sen-did.jpg"
        BL = "day-curoa-bando.jpg"
        BR = "bi-noi-fcc.jpg"
    },
    @{
        Path = "C:\Users\DUY\.gemini\antigravity\brain\c3bf559d-badf-4d55-aaf3-206a0d99db69\products_grid_brakes_1793334718027.jpg"
        TL = "elig-em050.jpg"
        TR = "heo-dau-brembo.jpg"
        BL = "dia-thang-rcb.jpg"
        BR = "tay-thang-rcb.jpg"
    },
    @{
        Path = "C:\Users\DUY\.gemini\antigravity\brain\c3bf559d-badf-4d55-aaf3-206a0d99db69\products_grid_suspension_filter_1793334737488.jpg"
        TL = "phuoc-yss.jpg"
        TR = "phuoc-rcb-vd.jpg"
        BL = "chen-co-skf.jpg"
        BR = "loc-gio-k-n.jpg"
    },
    @{
        Path = "C:\Users\DUY\.gemini\antigravity\brain\c3bf559d-badf-4d55-aaf3-206a0d99db69\products_grid_engine_electrical_1793334753845.jpg"
        TL = "la-con-fcc.jpg"
        TR = "long-piston-yamaha.jpg"
        BL = "bugi-ngk-iridium.jpg"
        BR = "ac-quy-globe.jpg"
    },
    @{
        Path = "C:\Users\DUY\.gemini\antigravity\brain\c3bf559d-badf-4d55-aaf3-206a0d99db69\products_grid_lighting_oil_1793334777122.jpg"
        TL = "den-led-osram.jpg"
        TR = "motul-300v.jpg"
        BL = "liqui-moly-scooter.jpg"
        BR = "loc-nhot-kn.jpg"
    }
)

$jpegCodec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
$encParams = New-Object System.Drawing.Imaging.EncoderParameters(1)
$encParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, 92L)

$pad = 8
foreach ($g in $grids) {
    $bmp = [System.Drawing.Bitmap]::new($g.Path)
    $w = [int]($bmp.Width / 2)
    $h = [int]($bmp.Height / 2)
    $cw = $w - ($pad * 2)
    $ch = $h - ($pad * 2)

    $quadrants = @(
        @{ Name = $g.TL; Rect = [System.Drawing.Rectangle]::new($pad, $pad, $cw, $ch) },
        @{ Name = $g.TR; Rect = [System.Drawing.Rectangle]::new($w + $pad, $pad, $cw, $ch) },
        @{ Name = $g.BL; Rect = [System.Drawing.Rectangle]::new($pad, $h + $pad, $cw, $ch) },
        @{ Name = $g.BR; Rect = [System.Drawing.Rectangle]::new($w + $pad, $h + $pad, $cw, $ch) }
    )

    foreach ($q in $quadrants) {
        $cropped = $bmp.Clone($q.Rect, $bmp.PixelFormat)
        $p1 = Join-Path $outDir1 $q.Name
        $p2 = Join-Path $outDir2 $q.Name
        $cropped.Save($p1, $jpegCodec, $encParams)
        $cropped.Save($p2, $jpegCodec, $encParams)
        $cropped.Dispose()
        Write-Output "Saved $($q.Name)"
    }
    $bmp.Dispose()
}
Write-Output "Successfully sliced all 20 realistic product photos!"
