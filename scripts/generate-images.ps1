Add-Type -AssemblyName System.Drawing

$outDir = "C:\anh-phu-tung"
if (!(Test-Path $outDir)) {
    New-Item -ItemType Directory -Path $outDir -Force | Out-Null
}

$items = @(
    @{ file="did-428hds.jpg"; brand="DID JAPAN"; cat="TRUYEN DONG"; name="Nhong Sen Dia DID 428HDS Vang 10 Ly"; code="PROD_DRV_010" },
    @{ file="nhong-sen-did.jpg"; brand="RECTO THAILAND"; cat="TRUYEN DONG"; name="Bo Nhong Sen Dia Recto 428 Chinh Hang"; code="PROD_DRV_011" },
    @{ file="day-curoa-bando.jpg"; brand="BANDO JAPAN"; cat="TRUYEN DONG"; name="Day Curoa Bando Chinh Hang Nhat Ban"; code="PROD_DRV_012" },
    @{ file="bi-noi-fcc.jpg"; brand="FCC HONDA"; cat="TRUYEN DONG"; name="Bo 6 Vien Bi Noi FCC Chinh Hang"; code="PROD_DRV_013" },
    @{ file="elig-em050.jpg"; brand="ELIG CERAMIC"; cat="HE THONG PHANH"; name="Bo Thang Dia Truoc Elig EM050"; code="PROD_BRK_010" },
    @{ file="heo-dau-brembo.jpg"; brand="BREMBO RACING"; cat="HE THONG PHANH"; name="Heo Dau Brembo 2 Pis Doi Xung"; code="PROD_BRK_011" },
    @{ file="dia-thang-rcb.jpg"; brand="RACING BOY"; cat="HE THONG PHANH"; name="Dia Thang RCB Long Nhom CNC 245mm"; code="PROD_BRK_012" },
    @{ file="tay-thang-rcb.jpg"; brand="RACING BOY"; cat="HE THONG PHANH"; name="Tay Thang Binh Dau RCB E2 Chinh Hang"; code="PROD_BRK_013" },
    @{ file="phuoc-yss.jpg"; brand="YSS SUSPENSION"; cat="GIAM XOC"; name="Phuoc Sau YSS G-Series Binh Dau"; code="PROD_SUS_010" },
    @{ file="phuoc-rcb-vd.jpg"; brand="RACING BOY"; cat="GIAM XOC"; name="Phuoc Binh Dau RCB VD Series Cao Cap"; code="PROD_SUS_011" },
    @{ file="chen-co-skf.jpg"; brand="SKF GENUINE"; cat="GIAM XOC"; name="Bo Chen Co Bi Dua SKF Chinh Hang"; code="PROD_SUS_012" },
    @{ file="loc-gio-k-n.jpg"; brand="K&N PERFORMANCE"; cat="DONG CO"; name="Loc Gio K&N Tang Luu Luong Khi Nap"; code="PROD_ENG_010" },
    @{ file="la-con-fcc.jpg"; brand="FCC JAPAN"; cat="DONG CO"; name="Bo 5 La Con Noi FCC Chinh Hang"; code="PROD_ENG_011" },
    @{ file="long-piston-yamaha.jpg"; brand="YAMAHA GENUINE"; cat="DONG CO"; name="Bo Long Piston Bac STD Chinh Hang"; code="PROD_ENG_012" },
    @{ file="bugi-ngk-iridium.jpg"; brand="NGK SPARK PLUGS"; cat="DIEN - DEN"; name="Bugi NGK Iridium CPR8EAIX-9 Bach Kim"; code="PROD_ELC_010" },
    @{ file="ac-quy-globe.jpg"; brand="GLOBE BATTERY"; cat="DIEN - DEN"; name="Binh Ac Quy Kho Globe WTZ6V 12V-6Ah"; code="PROD_ELC_011" },
    @{ file="den-led-osram.jpg"; brand="OSRAM GERMANY"; cat="DIEN - DEN"; name="Bong Den Pha LED Osram Chan H4"; code="PROD_ELC_012" },
    @{ file="motul-300v.jpg"; brand="MOTUL FRANCE"; cat="NHOT - LOC"; name="Nhot Motul 300V Factory Line 10W40 1L"; code="PROD_OIL_010" },
    @{ file="liqui-moly-scooter.jpg"; brand="LIQUI MOLY"; cat="NHOT - LOC"; name="Nhot Tay Ga Liqui Moly Molygen 5W30"; code="PROD_OIL_011" },
    @{ file="loc-nhot-kn.jpg"; brand="K&N FILTERS"; cat="NHOT - LOC"; name="Loc Nhot K&N KN-153 Chinh Hang"; code="PROD_OIL_012" }
)

foreach ($item in $items) {
    $bmp = New-Object System.Drawing.Bitmap(600, 600)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::ClearTypeGridFit

    $rect = New-Object System.Drawing.Rectangle(0, 0, 600, 600)
    $bgBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
        $rect,
        [System.Drawing.Color]::FromArgb(15, 23, 42),
        [System.Drawing.Color]::FromArgb(30, 41, 59),
        45
    )
    $g.FillRectangle($bgBrush, $rect)

    # Top accent bar
    $orangeBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(249, 115, 22))
    $g.FillRectangle($orangeBrush, 0, 0, 600, 14)

    # Decorative circle in center
    $circleBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(30, 249, 115, 22))
    $g.FillEllipse($circleBrush, 150, 110, 300, 300)
    $ringPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(120, 249, 115, 22), 4)
    $g.DrawEllipse($ringPen, 175, 135, 250, 250)

    # Fonts
    $fontCat = New-Object System.Drawing.Font("Arial", 14, [System.Drawing.FontStyle]::Bold)
    $fontBrand = New-Object System.Drawing.Font("Arial", 28, [System.Drawing.FontStyle]::Bold)
    $fontName = New-Object System.Drawing.Font("Arial", 18, [System.Drawing.FontStyle]::Bold)
    $fontCode = New-Object System.Drawing.Font("Consolas", 13, [System.Drawing.FontStyle]::Regular)

    $whiteBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
    $grayBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(148, 163, 184))
    $amberBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(251, 191, 36))

    $sfCenter = New-Object System.Drawing.StringFormat
    $sfCenter.Alignment = [System.Drawing.StringAlignment]::Center
    $sfCenter.LineAlignment = [System.Drawing.StringAlignment]::Center

    # Category pill text
    $g.DrawString($item.cat, $fontCat, $amberBrush, [System.Drawing.RectangleF]::new(0, 45, 600, 35), $sfCenter)

    # Brand inside circle
    $g.DrawString($item.brand, $fontBrand, $whiteBrush, [System.Drawing.RectangleF]::new(40, 215, 520, 90), $sfCenter)

    # Product Name
    $g.DrawString($item.name, $fontName, $whiteBrush, [System.Drawing.RectangleF]::new(40, 440, 520, 75), $sfCenter)

    # SKU & store footer
    $g.DrawString("SKU: " + $item.code + "  |  PHU TUNG XE MAY CHINH HANG", $fontCode, $grayBrush, [System.Drawing.RectangleF]::new(0, 535, 600, 35), $sfCenter)

    $filePath = Join-Path $outDir $item.file
    $bmp.Save($filePath, [System.Drawing.Imaging.ImageFormat]::Jpeg)

    $g.Dispose()
    $bmp.Dispose()
    Write-Output "Created: $filePath"
}
Write-Output "Done generating 20 images in $outDir"

