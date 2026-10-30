import json
import subprocess
import tempfile
import os
import sys

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

# Danh sách 26 mã sản phẩm cũ/lỗi ảnh cần dọn sạch để bảng Products có đúng 20 sản phẩm chuẩn
OLD_PRODUCT_IDS = [
    "PROD_BRAKE_003",
    "PROD_ACC_001",
    "PROD_OIL_002",
    "PROD_DRIVE_001",
    "PROD_OIL_001",
    "PROD_OIL_003",
    "PROD_DRIVE_003",
    "PROD_TYRE_002",
    "PROD_SHOCK_002",
    "PROD_SPARK_002",
    "PROD_BRK_001",
    "PROD_BRAKE_002",
    "PROD_BRAKE_001",
    "PROD_NEW_923",
    "PROD_LIGHT_001",
    "PROD_TYRE_001",
    "PROD_FILTER_001",
    "PROD_SUSP_001",
    "PROD_DRV_002",
    "PROD_DRIVE_002",
    "PROD_NEW_961",
    "PROD_FORK_001",
    "PROD_SPARK_001",
    "PROD_EXHAUST_001",
    "PROD_SUSP_002",
    "PROD_BATT_001",
]

# Danh sách 20 sản phẩm thực tế chuẩn theo 6 danh mục:
# Truyền động, Động cơ, Giảm xóc, Hệ thống phanh, Điện - Đèn, Nhớt - Lọc
products = [
    # --- 1. TRUYỀN ĐỘNG (4 sản phẩm) ---
    {
        "ProductID": "PROD_DRV_010",
        "name": "Bộ nhông sên dĩa DID 428HDS Vàng 10 ly",
        "category": "Truyền động",
        "price": 480000,
        "stock": 35,
        "brand": "DID",
        "status": "ACTIVE",
        "is_active": True,
        "image_url": "https://d1ksuy3hfmko20.cloudfront.net/images/did-428hds.jpg",
        "image_urls": ["https://d1ksuy3hfmko20.cloudfront.net/images/did-428hds.jpg"],
        "description": "Sên mạ vàng 10 ly chịu lực kéo cao, êm ái khi chạy tốc độ cao, chống giãn vượt trội.",
        "compatible_models": ["Winner 150", "Winner X", "Exciter 150", "Sonic 150"],
        "created_at": "2026-10-20T08:00:00Z"
    },
    {
        "ProductID": "PROD_DRV_011",
        "name": "Bộ nhông sên dĩa Recto chính hãng Thái Lan 428",
        "category": "Truyền động",
        "price": 320000,
        "stock": 50,
        "brand": "Recto",
        "status": "ACTIVE",
        "is_active": True,
        "image_url": "https://d1ksuy3hfmko20.cloudfront.net/images/nhong-sen-did.jpg",
        "image_urls": ["https://d1ksuy3hfmko20.cloudfront.net/images/nhong-sen-did.jpg"],
        "description": "Nhông dĩa thép carbon C45 tôi cao tần, vận hành bền bỉ cho dòng xe số phổ thông.",
        "compatible_models": ["Wave Alpha", "Wave RSX", "Future 125", "Sirius"],
        "created_at": "2026-10-19T08:00:00Z"
    },
    {
        "ProductID": "PROD_DRV_012",
        "name": "Dây curoa Bando chính hãng Nhật Bản",
        "category": "Truyền động",
        "price": 390000,
        "stock": 40,
        "brand": "Bando",
        "status": "ACTIVE",
        "is_active": True,
        "image_url": "https://d1ksuy3hfmko20.cloudfront.net/images/day-curoa-bando.jpg",
        "image_urls": ["https://d1ksuy3hfmko20.cloudfront.net/images/day-curoa-bando.jpg"],
        "description": "Dây curoa cao su tổng hợp chịu nhiệt cao, truyền lực mượt mà, chống trượt nồi xe tay ga.",
        "compatible_models": ["Air Blade 125", "Air Blade 150", "Vario 150", "Lead 125"],
        "created_at": "2026-10-18T08:00:00Z"
    },
    {
        "ProductID": "PROD_DRV_013",
        "name": "Bộ bi nồi FCC chính hãng Honda",
        "category": "Truyền động",
        "price": 180000,
        "stock": 60,
        "brand": "FCC",
        "status": "ACTIVE",
        "is_active": True,
        "image_url": "https://d1ksuy3hfmko20.cloudfront.net/images/bi-noi-fcc.jpg",
        "image_urls": ["https://d1ksuy3hfmko20.cloudfront.net/images/bi-noi-fcc.jpg"],
        "description": "Bộ 6 viên bi nồi chuẩn trọng lượng zin giúp xe tăng tốc mượt, tiết kiệm nhiên liệu.",
        "compatible_models": ["Vision", "Air Blade 125", "SH Mode", "Vario 125"],
        "created_at": "2026-10-17T08:00:00Z"
    },

    # --- 2. HỆ THỐNG PHANH (4 sản phẩm) ---
    {
        "ProductID": "PROD_BRK_010",
        "name": "Bố thắng đĩa trước Elig EM050 Ceramic",
        "category": "Hệ thống phanh",
        "price": 150000,
        "stock": 80,
        "brand": "Elig",
        "status": "ACTIVE",
        "is_active": True,
        "image_url": "https://d1ksuy3hfmko20.cloudfront.net/images/elig-em050.jpg",
        "image_urls": ["https://d1ksuy3hfmko20.cloudfront.net/images/elig-em050.jpg"],
        "description": "Má phanh gốm Ceramic hiệu suất cao, không kêu, không ăn mòn đĩa phanh, tản nhiệt nhanh.",
        "compatible_models": ["Exciter 150", "Exciter 155", "Winner X", "Sirius FI"],
        "created_at": "2026-10-24T08:00:00Z"
    },
    {
        "ProductID": "PROD_BRK_011",
        "name": "Heo dầu Brembo 2 Pis đối xứng chính hãng",
        "category": "Hệ thống phanh",
        "price": 2850000,
        "stock": 12,
        "brand": "Brembo",
        "status": "ACTIVE",
        "is_active": True,
        "image_url": "https://d1ksuy3hfmko20.cloudfront.net/images/heo-dau-brembo.jpg",
        "image_urls": ["https://d1ksuy3hfmko20.cloudfront.net/images/heo-dau-brembo.jpg"],
        "description": "Heo phanh Brembo 2 piston đối xứng lực bóp thắng cực nhạy, an toàn khi phanh gấp.",
        "compatible_models": ["Exciter 150", "Exciter 155", "Winner X", "Vario 150", "SH 150i"],
        "created_at": "2026-10-23T08:00:00Z"
    },
    {
        "ProductID": "PROD_BRK_012",
        "name": "Đĩa thắng RCB lòng nhôm CNC 245mm",
        "category": "Hệ thống phanh",
        "price": 650000,
        "stock": 25,
        "brand": "RCB",
        "status": "ACTIVE",
        "is_active": True,
        "image_url": "https://d1ksuy3hfmko20.cloudfront.net/images/dia-thang-rcb.jpg",
        "image_urls": ["https://d1ksuy3hfmko20.cloudfront.net/images/dia-thang-rcb.jpg"],
        "description": "Đĩa phanh thép không gỉ kết hợp lòng nhôm CNC sắc nét, tản nhiệt nhanh, chống cong vênh.",
        "compatible_models": ["Exciter 150", "Winner 150", "Winner X"],
        "created_at": "2026-10-22T08:00:00Z"
    },
    {
        "ProductID": "PROD_BRK_013",
        "name": "Tay thắng bình dầu RCB E2 chính hãng",
        "category": "Hệ thống phanh",
        "price": 520000,
        "stock": 30,
        "brand": "RCB",
        "status": "ACTIVE",
        "is_active": True,
        "image_url": "https://d1ksuy3hfmko20.cloudfront.net/images/tay-thang-rcb.jpg",
        "image_urls": ["https://d1ksuy3hfmko20.cloudfront.net/images/tay-thang-rcb.jpg"],
        "description": "Cùm tay thắng RCB chính hãng cho cảm giác bóp êm tay, tăng lực dầu phanh ổn định.",
        "compatible_models": ["Wave Alpha", "Exciter 150", "Winner X", "Vario 150"],
        "created_at": "2026-10-21T08:00:00Z"
    },

    # --- 3. GIẢM XÓC (3 sản phẩm) ---
    {
        "ProductID": "PROD_SUS_010",
        "name": "Phuộc sau YSS G-Series bình dầu chính hãng",
        "category": "Giảm xóc",
        "price": 2450000,
        "stock": 18,
        "brand": "YSS",
        "status": "ACTIVE",
        "is_active": True,
        "image_url": "https://d1ksuy3hfmko20.cloudfront.net/images/phuoc-yss.jpg",
        "image_urls": ["https://d1ksuy3hfmko20.cloudfront.net/images/phuoc-yss.jpg"],
        "description": "Phuộc bình dầu YSS Thái Lan tăng chỉnh độ nén lò xo, đầm chắc khi ôm cua và chở nặng.",
        "compatible_models": ["Vario 150", "Air Blade 150", "Vision", "SH Mode"],
        "created_at": "2026-10-27T08:00:00Z"
    },
    {
        "ProductID": "PROD_SUS_011",
        "name": "Phuộc bình dầu RCB VD Series cao cấp",
        "category": "Giảm xóc",
        "price": 3600000,
        "stock": 10,
        "brand": "RCB",
        "status": "ACTIVE",
        "is_active": True,
        "image_url": "https://d1ksuy3hfmko20.cloudfront.net/images/phuoc-rcb-vd.jpg",
        "image_urls": ["https://d1ksuy3hfmko20.cloudfront.net/images/phuoc-rcb-vd.jpg"],
        "description": "Phuộc đơn Monoshock có tăng chỉnh Rebound & Compression đầy đủ, ti mạ vàng chống trầy.",
        "compatible_models": ["Exciter 150", "Exciter 155", "Winner X"],
        "created_at": "2026-10-26T08:00:00Z"
    },
    {
        "ProductID": "PROD_SUS_012",
        "name": "Bộ chén cổ SKF chính hãng chống kêu cụp",
        "category": "Giảm xóc",
        "price": 350000,
        "stock": 45,
        "brand": "SKF",
        "status": "ACTIVE",
        "is_active": True,
        "image_url": "https://d1ksuy3hfmko20.cloudfront.net/images/chen-co-skf.jpg",
        "image_urls": ["https://d1ksuy3hfmko20.cloudfront.net/images/chen-co-skf.jpg"],
        "description": "Chén cổ bi đũa chịu lực SKF khắc phục triệt để tiếng kêu lộc cộc khi qua ổ gà.",
        "compatible_models": ["Exciter 150", "Winner X", "Air Blade 125", "SH 150i"],
        "created_at": "2026-10-25T08:00:00Z"
    },

    # --- 4. ĐỘNG CƠ (3 sản phẩm) ---
    {
        "ProductID": "PROD_ENG_010",
        "name": "Lọc gió K&N chính hãng tăng lưu lượng khí nạp",
        "category": "Động cơ",
        "price": 1150000,
        "stock": 20,
        "brand": "K&N",
        "status": "ACTIVE",
        "is_active": True,
        "image_url": "https://d1ksuy3hfmko20.cloudfront.net/images/loc-gio-k-n.jpg",
        "image_urls": ["https://d1ksuy3hfmko20.cloudfront.net/images/loc-gio-k-n.jpg"],
        "description": "Lọc gió vải tẩm dầu K&N vệ sinh tái sử dụng trọn đời, giúp ga đầu nhẹ và bốc hơn.",
        "compatible_models": ["Exciter 150", "Winner 150", "Winner X", "Vario 150"],
        "created_at": "2026-10-16T08:00:00Z"
    },
    {
        "ProductID": "PROD_ENG_011",
        "name": "Bộ lá côn nồi FCC chính hãng chống trượt côn",
        "category": "Động cơ",
        "price": 380000,
        "stock": 35,
        "brand": "FCC",
        "status": "ACTIVE",
        "is_active": True,
        "image_url": "https://d1ksuy3hfmko20.cloudfront.net/images/la-con-fcc.jpg",
        "image_urls": ["https://d1ksuy3hfmko20.cloudfront.net/images/la-con-fcc.jpg"],
        "description": "Bộ 5 lá bố nồi FCC Nhật Bản độ bám cao, sang số nhẹ nhàng, chịu nhiệt dầu máy tốt.",
        "compatible_models": ["Exciter 150", "Winner 150", "Winner X", "Sonic 150"],
        "created_at": "2026-10-15T08:00:00Z"
    },
    {
        "ProductID": "PROD_ENG_012",
        "name": "Bộ lòng piston bạc STD chính hãng Yamaha",
        "category": "Động cơ",
        "price": 1450000,
        "stock": 15,
        "brand": "Yamaha",
        "status": "ACTIVE",
        "is_active": True,
        "image_url": "https://d1ksuy3hfmko20.cloudfront.net/images/long-piston-yamaha.jpg",
        "image_urls": ["https://d1ksuy3hfmko20.cloudfront.net/images/long-piston-yamaha.jpg"],
        "description": "Xy-lanh Kiếng DiASil kèm trái piston nén, bạc, ắc, phe cài đồng bộ chính hãng.",
        "compatible_models": ["Exciter 150", "Exciter 155", "FZ150i"],
        "created_at": "2026-10-14T08:00:00Z"
    },

    # --- 5. ĐIỆN - ĐÈN (3 sản phẩm) ---
    {
        "ProductID": "PROD_ELC_010",
        "name": "Bugi NGK Iridium CPR8EAIX-9 bạch kim đánh lửa mạnh",
        "category": "Điện - Đèn",
        "price": 240000,
        "stock": 75,
        "brand": "NGK",
        "status": "ACTIVE",
        "is_active": True,
        "image_url": "https://d1ksuy3hfmko20.cloudfront.net/images/bugi-ngk-iridium.jpg",
        "image_urls": ["https://d1ksuy3hfmko20.cloudfront.net/images/bugi-ngk-iridium.jpg"],
        "description": "Đầu điện cực Iridium siêu mảnh 0.6mm đốt sạch nhiên liệu, nhạy nổ máy, tiết kiệm xăng.",
        "compatible_models": ["Exciter 150", "Winner X", "Air Blade 150", "Vario 150", "SH 150i"],
        "created_at": "2026-10-13T08:00:00Z"
    },
    {
        "ProductID": "PROD_ELC_011",
        "name": "Bình ắc quy Globe WTZ6V 12V-6Ah khô miễn bảo dưỡng",
        "category": "Điện - Đèn",
        "price": 360000,
        "stock": 40,
        "brand": "Globe",
        "status": "ACTIVE",
        "is_active": True,
        "image_url": "https://d1ksuy3hfmko20.cloudfront.net/images/ac-quy-globe.jpg",
        "image_urls": ["https://d1ksuy3hfmko20.cloudfront.net/images/ac-quy-globe.jpg"],
        "description": "Ắc quy khô kín khí dòng phóng ổn định, chuyên dùng cho xe có hệ thống Idling Stop.",
        "compatible_models": ["Air Blade 125", "Vision", "Lead 125", "Winner X", "Vario 150"],
        "created_at": "2026-10-12T08:00:00Z"
    },
    {
        "ProductID": "PROD_ELC_012",
        "name": "Bóng đèn pha LED Osram chân H4 tăng sáng",
        "category": "Điện - Đèn",
        "price": 390000,
        "stock": 30,
        "brand": "Osram",
        "status": "ACTIVE",
        "is_active": True,
        "image_url": "https://d1ksuy3hfmko20.cloudfront.net/images/den-led-osram.jpg",
        "image_urls": ["https://d1ksuy3hfmko20.cloudfront.net/images/den-led-osram.jpg"],
        "description": "Bóng LED Osram gom sáng chuẩn, không gây chói mắt người đối diện, tiết kiệm điện bình.",
        "compatible_models": ["Wave RSX", "Sirius", "Future 125", "Exciter 135"],
        "created_at": "2026-10-11T08:00:00Z"
    },

    # --- 6. NHỚT - LỌC (3 sản phẩm) ---
    {
        "ProductID": "PROD_OIL_010",
        "name": "Nhớt Motul 300V Factory Line Road Racing 10W40 1L",
        "category": "Nhớt - Lọc",
        "price": 420000,
        "stock": 65,
        "brand": "Motul",
        "status": "ACTIVE",
        "is_active": True,
        "image_url": "https://d1ksuy3hfmko20.cloudfront.net/images/motul-300v.jpg",
        "image_urls": ["https://d1ksuy3hfmko20.cloudfront.net/images/motul-300v.jpg"],
        "description": "Nhớt tổng hợp 100% công nghệ Ester Core bảo vệ động cơ tối đa ở vòng tua cao.",
        "compatible_models": ["Winner 150", "Winner X", "Exciter 150", "Exciter 155", "Sonic 150"],
        "created_at": "2026-10-30T08:00:00Z"
    },
    {
        "ProductID": "PROD_OIL_011",
        "name": "Nhớt tay ga Liqui Moly Molygen Scooter 5W30 0.8L",
        "category": "Nhớt - Lọc",
        "price": 265000,
        "stock": 55,
        "brand": "Liqui Moly",
        "status": "ACTIVE",
        "is_active": True,
        "image_url": "https://d1ksuy3hfmko20.cloudfront.net/images/liqui-moly-scooter.jpg",
        "image_urls": ["https://d1ksuy3hfmko20.cloudfront.net/images/liqui-moly-scooter.jpg"],
        "description": "Nhớt tổng hợp nhập khẩu Đức tích hợp phụ gia chống mài mòn, mát máy cho xe tay ga.",
        "compatible_models": ["SH 150i", "SH Mode", "Air Blade 150", "Vario 150", "Vision"],
        "created_at": "2026-10-29T08:00:00Z"
    },
    {
        "ProductID": "PROD_OIL_012",
        "name": "Lọc nhớt K&N KN-153 chính hãng lọc cặn kim loại",
        "category": "Nhớt - Lọc",
        "price": 195000,
        "stock": 50,
        "brand": "K&N",
        "status": "ACTIVE",
        "is_active": True,
        "image_url": "https://d1ksuy3hfmko20.cloudfront.net/images/loc-nhot-kn.jpg",
        "image_urls": ["https://d1ksuy3hfmko20.cloudfront.net/images/loc-nhot-kn.jpg"],
        "description": "Lọc nhớt lưu lượng cao giữ sạch mạt kim loại trong động cơ, bảo vệ bơm nhớt và cam cò.",
        "compatible_models": ["Exciter 150", "Exciter 155", "FZ150i", "R15 V3"],
        "created_at": "2026-10-28T08:00:00Z"
    },
]


def to_dynamodb_attr(val):
    if isinstance(val, bool):
        return {"BOOL": val}
    if isinstance(val, (int, float)):
        return {"N": str(val)}
    if isinstance(val, str):
        return {"S": val}
    if isinstance(val, list):
        return {"L": [to_dynamodb_attr(x) for x in val]}
    if isinstance(val, dict):
        return {"M": {k: to_dynamodb_attr(v) for k, v in val.items()}}
    return {"S": str(val)}


def run_batch_write(requests):
    # DynamoDB batch-write-item tối đa 25 items mỗi lần gọi
    for i in range(0, len(requests), 25):
        chunk = requests[i : i + 25]
        payload = {"Products": chunk}
        with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False, encoding="ascii") as tmp:
            json.dump(payload, tmp, ensure_ascii=True)
            tmp_path = tmp.name
        try:
            subprocess.run(
                [
                    "aws",
                    "dynamodb",
                    "batch-write-item",
                    "--region",
                    "ap-southeast-1",
                    "--request-items",
                    f"file://{tmp_path}",
                ],
                check=True,
                shell=(os.name == "nt"),
            )
        finally:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)


if __name__ == "__main__":
    print("1. Dọn các sản phẩm cũ/lỗi ảnh trong DynamoDB...")
    delete_requests = [
        {"DeleteRequest": {"Key": {"ProductID": {"S": pid}}}}
        for pid in OLD_PRODUCT_IDS
    ]
    run_batch_write(delete_requests)
    print(f"Đã xóa {len(OLD_PRODUCT_IDS)} sản phẩm cũ/lỗi ảnh.")

    print("2. Nạp 20 sản phẩm thực tế kèm ảnh S3 thật vào DynamoDB...")
    put_requests = [
        {"PutRequest": {"Item": {k: to_dynamodb_attr(v) for k, v in p.items()}}}
        for p in products
    ]
    run_batch_write(put_requests)
    for p in products:
        print(f"Đã nạp: {p['ProductID']} - {p['name']} ({p['category']})")
    print(f"Hoàn tất! Bảng Products hiện có chuẩn {len(products)} sản phẩm thực tế!")
