Add-Type -AssemblyName System.Drawing

$outDir1 = "C:\anh-phu-tung"
$outDir2 = "c:\Users\DUY\PhuTungXeMay\phutungxemay-frontend\public\images"
New-Item -ItemType Directory -Force -Path $outDir1 | Out-Null
New-Item -ItemType Directory -Force -Path $outDir2 | Out-Null

$grids = @(
    @{
        Path = "C:\Users\DUY\.gemini\antigravity\brain\c3bf559d-badf-4d55-aaf3-206a0d99db69\products_grid_transmission_1793334702647.jpg"
        TL = "did-428hds"
        TR = "nhong-sen-did"
        BL = "day-curoa-bando"
        BR = "bi-noi-fcc"
    },
    @{
        Path = "C:\Users\DUY\.gemini\antigravity\brain\c3bf559d-badf-4d55-aaf3-206a0d99db69\products_grid_brakes_1793334718027.jpg"
        TL = "elig-em050"
        TR = "heo-dau-brembo"
        BL = "dia-thang-rcb"
        BR = "tay-thang-rcb"
    },
    @{
        Path = "C:\Users\DUY\.gemini\antigravity\brain\c3bf559d-badf-4d55-aaf3-206a0d99db69\products_grid_suspension_filter_1793334737488.jpg"
        TL = "phuoc-yss"
        TR = "phuoc-rcb-vd"
        BL = "chen-co-skf"
        BR = "loc-gio-k-n"
    },
    @{
        Path = "C:\Users\DUY\.gemini\antigravity\brain\c3bf559d-badf-4d55-aaf3-206a0d99db69\products_grid_engine_electrical_1793334753845.jpg"
        TL = "la-con-fcc"
        TR = "long-piston-yamaha"
        BL = "bugi-ngk-iridium"
        BR = "ac-quy-globe"
    },
    @{
        Path = "C:\Users\DUY\.gemini\antigravity\brain\c3bf559d-badf-4d55-aaf3-206a0d99db69\products_grid_lighting_oil_1793334777122.jpg"
        TL = "den-led-osram"
        TR = "motul-300v"
        BL = "liqui-moly-scooter"
        BR = "loc-nhot-kn"
    },
    @{
        Path = "C:\Users\DUY\.gemini\antigravity\brain\c3bf559d-badf-4d55-aaf3-206a0d99db69\products_grid_tires_exhaust_mirrors_1793335395615.jpg"
        TL = "lop-michelin-pilot"
        TR = "lop-maxxis-khong-ruot"
        BL = "po-akrapovic-carbon"
        BR = "kinh-hau-cnc-rcb"
    },
    @{
        Path = "C:\Users\DUY\.gemini\antigravity\brain\c3bf559d-badf-4d55-aaf3-206a0d99db69\products_grid_clutch_cam_brakehose_1793335415371.jpg"
        TL = "chuong-noi-bo-ba-cang"
        TR = "truc-cam-co-uma"
        BL = "day-dau-hel-brembo"
        BR = "bo-thang-dum-yamaha"
    },
    @{
        Path = "C:\Users\DUY\.gemini\antigravity\brain\c3bf559d-badf-4d55-aaf3-206a0d99db69\products_grid_lighting_forks_maintenance_1793335434810.jpg"
        TL = "den-tro-sang-biled"
        TR = "ti-phuoc-truoc-zin"
        BL = "xit-sen-motul-c4"
        BR = "nuoc-lam-mat-motul"
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
        @{ Base = $g.TL; Rect = [System.Drawing.Rectangle]::new($pad, $pad, $cw, $ch) },
        @{ Base = $g.TR; Rect = [System.Drawing.Rectangle]::new($w + $pad, $pad, $cw, $ch) },
        @{ Base = $g.BL; Rect = [System.Drawing.Rectangle]::new($pad, $h + $pad, $cw, $ch) },
        @{ Base = $g.BR; Rect = [System.Drawing.Rectangle]::new($w + $pad, $h + $pad, $cw, $ch) }
    )

    foreach ($q in $quadrants) {
        $cropped = $bmp.Clone($q.Rect, $bmp.PixelFormat)
        foreach ($suffix in @(".jpg", "-real.jpg")) {
            $fileName = "$($q.Base)$suffix"
            $p1 = Join-Path $outDir1 $fileName
            $p2 = Join-Path $outDir2 $fileName
            $cropped.Save($p1, $jpegCodec, $encParams)
            $cropped.Save($p2, $jpegCodec, $encParams)
        }
        $cropped.Dispose()
        Write-Output "Saved $($q.Base).jpg & $($q.Base)-real.jpg"
    }
    $bmp.Dispose()
}
Write-Output "Successfully sliced all 32 realistic product photos!"
