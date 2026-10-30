# Hướng Dẫn Chi Tiết Từng Bước (Step-by-Step) — Triển Khai & Hoàn Thiện Hệ Thống Phụ Tùng Xe Máy

Tài liệu này trình bày **tất cả các bước thực hiện theo trình tự từ Bước 1 đến Bước 10**, bao gồm đầy đủ **lệnh CLI**, **script tự động hóa** và **mã nguồn (Code)** chi tiết cho từng file trong dự án.

---

## Mục Lục Nhanh

- [Bước 1: Thiết lập biến môi trường (`.env.local`) & Khởi chạy Local](#bước-1-thiết-lập-biến-môi-trường-envlocal--khởi-chạy-local)
- [Bước 2: Cấu hình AWS CLI & Kiểm tra kết nối Hạ tầng](#bước-2-cấu-hình-aws-cli--kiểm-tra-kết-nối-hạ-tầng)
- [Bước 3: Cắt ảnh phụ tùng thực tế & Đồng bộ lên Amazon S3](#bước-3-cắt-ảnh-phụ-tùng-thực-tế--đồng-bộ-lên-amazon-s3)
- [Bước 4: Tạo mới 32 sản phẩm thực tế vào bảng `Products` (DynamoDB)](#bước-4-tạo-mới-32-sản-phẩm-thực-tế-vào-bảng-products-dynamodb)
- [Bước 5: Khắc phục lỗi Timeout IPv6 CloudFront & Next.js 16 Cache](#bước-5-khắc-phục-lỗi-timeout-ipv6-cloudfront--nextjs-16-cache)
- [Bước 6: Thiết kế lại Logo thương hiệu & Đồng bộ giao diện](#bước-6-thiết-kế-lại-logo-thương-hiệu--đồng-bộ-giao-diện)
- [Bước 7: Xây dựng Bộ lọc sản phẩm đa tiêu chí (Sidebar & Modal)](#bước-7-xây-dựng-bộ-lọc-sản-phẩm-đa-tiêu-chí-sidebar--modal)
- [Bước 8: Hoàn thiện Đăng ký, Đăng nhập & Quên mật khẩu (AWS Cognito)](#bước-8-hoàn-thiện-đăng-ký-đăng-nhập--quên-mật-khẩu-aws-cognito)
- [Bước 9: Nâng cấp Trợ lý Tư vấn Phụ tùng AI (WebSocket + RAG + Đơn hàng)](#bước-9-nâng-cấp-trợ-lý-tư-vấn-phụ-tùng-ai-websocket--rag--đơn-hàng)
- [Bước 10: Kiểm tra lỗi (Type-check), Build Production & Quản lý Git](#bước-10-kiểm-tra-lỗi-type-check-build-production--quản-lý-git)

---

## Bước 1: Thiết lập biến môi trường (`.env.local`) & Khởi chạy Local

### 1.1. Di chuyển vào thư mục dự án và cài đặt thư viện
Mở **PowerShell** hoặc **Terminal** và chạy lệnh:

```powershell
cd c:\Users\DUY\PhuTungXeMay\phutungxemay-frontend
npm install
```

### 1.2. Tạo file `.env.local` tại thư mục gốc `phutungxemay-frontend`
Tạo file `c:\Users\DUY\PhuTungXeMay\phutungxemay-frontend\.env.local` với nội dung:

```env
# ============================================================
# Cấu hình môi trường cho Phụ Tùng Xe Máy Frontend
# ============================================================

# CloudFront / API Gateway Base URL
NEXT_PUBLIC_API_BASE_URL=https://d1ksuy3hfmko20.cloudfront.net

# CloudFront CDN cho hình ảnh sản phẩm (S3: phutungxemay-product-images-2026)
NEXT_PUBLIC_CDN_BASE_URL=https://d1ksuy3hfmko20.cloudfront.net

# AWS Cognito Authentication
NEXT_PUBLIC_COGNITO_USER_POOL_ID=ap-southeast-1_ecJz9V8QY
NEXT_PUBLIC_COGNITO_CLIENT_ID=7rbclbi7o4vun1dpe6k2glmel7
NEXT_PUBLIC_AWS_REGION=ap-southeast-1

# WebSocket AI Chat Endpoint
NEXT_PUBLIC_WEBSOCKET_URL=wss://9trjqwwev1.execute-api.ap-southeast-1.amazonaws.com/production
```

### 1.3. Khởi chạy máy chủ Development
```powershell
npm run dev
```
Sau khi chạy lệnh, mở trình duyệt tại địa chỉ: `http://localhost:3000`.

---

## Bước 2: Cấu hình AWS CLI & Kiểm tra kết nối Hạ tầng

### 2.1. Kiểm tra phiên bản AWS CLI
```powershell
aws --version
```

### 2.2. Thiết lập thông tin xác thực AWS (Region Singapore `ap-southeast-1`)
```powershell
aws configure set aws_access_key_id <YOUR_AWS_ACCESS_KEY_ID>
aws configure set aws_secret_access_key <YOUR_AWS_SECRET_ACCESS_KEY>
aws configure set default.region ap-southeast-1
aws configure set default.output json
```

### 2.3. Kiểm tra kết nối tài khoản, S3 Bucket và bảng DynamoDB
```powershell
# 1. Xác nhận tài khoản IAM đang kết nối
aws sts get-caller-identity

# 2. Kiểm tra danh sách S3 Bucket
aws s3 ls

# 3. Kiểm tra danh sách bảng DynamoDB tại ap-southeast-1
aws dynamodb list-tables --region ap-southeast-1
```

---

## Bước 3: Cắt ảnh phụ tùng thực tế & Đồng bộ lên Amazon S3

### 3.1. Chạy script cắt ảnh sản phẩm chất lượng cao
File script [`scripts/slice-product-images.ps1`](../scripts/slice-product-images.ps1) sử dụng thư viện `.NET System.Drawing` để cắt 8 tấm ảnh lưới Studio 2×2 thành **32 bức ảnh phụ tùng riêng biệt** (lưu đồng thời bản `.jpg` và `-real.jpg` vào `public/images/`):

```powershell
powershell -ExecutionPolicy Bypass -File "c:\Users\DUY\PhuTungXeMay\phutungxemay-frontend\scripts\slice-product-images.ps1"
```

**Code của `scripts/slice-product-images.ps1`:**
```powershell
Add-Type -AssemblyName System.Drawing

$outDir = "c:\Users\DUY\PhuTungXeMay\phutungxemay-frontend\public\images"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

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
            $cropped.Save((Join-Path $outDir $fileName), $jpegCodec, $encParams)
        }
        $cropped.Dispose()
    }
    $bmp.Dispose()
}
```

### 3.2. Upload toàn bộ ảnh thực tế lên S3 Bucket qua AWS CLI
```powershell
# Đồng bộ toàn bộ ảnh từ public/images lên s3://phutungxemay-product-images-2026/images/
aws s3 sync "c:\Users\DUY\PhuTungXeMay\phutungxemay-frontend\public\images" s3://phutungxemay-product-images-2026/images/ --region ap-southeast-1 --content-type "image/jpeg" --cache-control "public, max-age=31536000"

# Kiểm tra lại các file ảnh đã có trên S3
aws s3 ls s3://phutungxemay-product-images-2026/images/ --region ap-southeast-1
```

Sau khi upload lên S3, mọi ảnh đều truy cập được qua CloudFront CDN:
`https://d1ksuy3hfmko20.cloudfront.net/images/<ten-file>-real.jpg`

---

## Bước 4: Tạo mới 32 sản phẩm thực tế vào bảng `Products` (DynamoDB)

### 4.1. Danh mục chuẩn hóa trên cả Frontend & DynamoDB (8 danh mục)
1. `Dầu nhớt & Phụ gia`
2. `Hệ thống truyền động`
3. `Hệ thống phanh`
4. `Hệ thống giảm xóc & Lái`
5. `Động cơ`
6. `Điện - Đèn`
7. `Lốp & Mâm xe`
8. `Phụ kiện & Đồ chơi xe`

### 4.2. Các lệnh AWS CLI thao tác trực tiếp với bảng `Products`

```powershell
# 1. Quét kiểm tra tổng số sản phẩm hiện có trong bảng Products
aws dynamodb scan --table-name Products --select "COUNT" --region ap-southeast-1

# 2. Liệt kê chi tiết mã, tên, danh mục, giá và link ảnh của toàn bộ sản phẩm
aws dynamodb scan --table-name Products --projection-expression "product_id, #n, category, price, stock, image_url" --expression-attribute-names '{"#n":"name"}' --region ap-southeast-1

# 3. Lệnh mẫu thêm/cập nhật 1 sản phẩm vào DynamoDB
aws dynamodb put-item --table-name Products --region ap-southeast-1 --item '{
  "product_id": {"S": "PROD_EXH_010"},
  "name": {"S": "Pô Akrapovic Carbon Full System Chính Hãng"},
  "brand": {"S": "Akrapovic"},
  "category": {"S": "Phụ kiện & Đồ chơi xe"},
  "price": {"N": "4850000"},
  "stock": {"N": "12"},
  "image_url": {"S": "https://d1ksuy3hfmko20.cloudfront.net/images/po-akrapovic-carbon-real.jpg"},
  "description": {"S": "Lon pô sợi carbon chống nóng cao cấp kèm cổ pô inox 304 chuẩn từng dòng xe côn tay."},
  "compatible_vehicles": {"L": [
    {"S": "Yamaha Exciter 155"},
    {"S": "Yamaha Exciter 150"},
    {"S": "Honda Winner X"},
    {"S": "Honda CBR150R"}
  ]},
  "created_at": {"S": "2026-10-30T05:00:00Z"}
}'

# 4. Lệnh xóa 1 sản phẩm theo khóa chính product_id
aws dynamodb delete-item --table-name Products --region ap-southeast-1 --key '{"product_id": {"S": "PROD_ID_CAN_XOA"}}'
```

---

## Bước 5: Khắc phục lỗi Timeout IPv6 CloudFront & Next.js 16 Cache

### 5.1. Nguyên nhân lỗi
1. **Lỗi Timeout 10 giây (`UND_ERR_CONNECT_TIMEOUT`)**: Khi Next.js SSR gọi `fetch('https://d1ksuy3hfmko20.cloudfront.net/api/products')` trên Windows, Node.js `undici` cố gắng kết nối qua IPv6 trước và bị treo.
2. **Lỗi mất bộ lọc trên Next.js 16**: Thuộc tính `cacheComponents: true` trong `next.config.ts` khiến Next.js gửi lại RSC payload cũ có `"q":""`, làm reset trạng thái lọc của người dùng.

### 5.2. Code sửa trong [`next.config.ts`](../next.config.ts)
```typescript
import type { NextConfig } from 'next';
import dns from 'node:dns';
import net from 'node:net';

// Bắt buộc Node.js ưu tiên phân giải IPv4 và tắt autoSelectFamily để tránh lỗi UND_ERR_CONNECT_TIMEOUT với CloudFront trên Windows
dns.setDefaultResultOrder('ipv4first');
if (typeof net.setDefaultAutoSelectFamily === 'function') {
  net.setDefaultAutoSelectFamily(false);
}

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.amazonaws.com',
      },
      {
        protocol: 'https',
        hostname: '**.cloudfront.net',
      },
    ],
  },
};

export default nextConfig;
```

### 5.3. Code tối ưu SSR Fetcher & Bộ nhớ đệm dự phòng trong [`lib/server-api.ts`](../lib/server-api.ts)
```typescript
import dns from 'node:dns';
import net from 'node:net';
import type { Product, ProductsResponse } from '@/types/product';

dns.setDefaultResultOrder('ipv4first');
if (typeof net.setDefaultAutoSelectFamily === 'function') {
  net.setDefaultAutoSelectFamily(false);
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? 'https://d1ksuy3hfmko20.cloudfront.net';

// Lưu cache danh sách sản phẩm trong RAM để phản hồi tức thì nếu mạng chập chờn
let cachedAllProducts: Product[] = [];

export async function getProducts(params?: {
  category?: string;
  compatible_vehicle?: string;
  q?: string;
}): Promise<Product[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/products`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return cachedAllProducts;
    const data: ProductsResponse = await res.json();
    const allProducts = data.products ?? (data as unknown as Product[]) ?? [];
    if (allProducts.length > 0) {
      cachedAllProducts = allProducts;
    }
    return filterServerProducts(allProducts, params);
  } catch {
    return filterServerProducts(cachedAllProducts, params);
  }
}
```

---

## Bước 6: Thiết kế lại Logo thương hiệu & Đồng bộ giao diện

### 6.1. Xử lý file ảnh Logo chuẩn 1:1 (`public/brand-logo.png`)
Logo mới được thiết kế không chứa chữ nhỏ bên trong biểu tượng (giúp không bị rối chữ ở kích thước nhỏ 40×40px), tập trung vào hình tượng mô tô thể thao màu cam ánh kim kết hợp đĩa phanh CNC và bánh răng truyền động trên nền đen Carbon.

Script PowerShell cắt sát viền tỷ lệ 1:1 (512×512px):
```powershell
Add-Type -AssemblyName System.Drawing
$src = [System.Drawing.Bitmap]::new("brand_logo_icon.jpg")
$pad = 24
$cropRect = [System.Drawing.Rectangle]::new($pad, $pad, $src.Width - ($pad * 2), $src.Height - ($pad * 2))
$dest = New-Object System.Drawing.Bitmap(512, 512)
$g = [System.Drawing.Graphics]::FromImage($dest)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.DrawImage($src, (New-Object System.Drawing.Rectangle(0, 0, 512, 512)), $cropRect, [System.Drawing.GraphicsUnit]::Pixel)
$dest.Save("c:\Users\DUY\PhuTungXeMay\phutungxemay-frontend\public\brand-logo.png", [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose(); $dest.Dispose(); $src.Dispose()
```

### 6.2. Cập nhật Logo trên Header ([`components/customer/header.tsx`](../components/customer/header.tsx))
```tsx
<Link href="/" className="flex items-center gap-3 shrink-0 group">
  <div className="relative w-10 h-10 sm:w-11 sm:h-11 rounded-xl overflow-hidden shadow-md shadow-orange-500/15 border border-slate-200/80 bg-slate-900 shrink-0 group-hover:scale-105 group-hover:shadow-orange-500/30 transition-all duration-200">
    <img
      src="/brand-logo.png?v=2"
      alt="Phụ Tùng Xe Máy Logo"
      className="w-full h-full object-cover"
    />
  </div>
  <div className="hidden sm:flex flex-col leading-none">
    <span className="font-black text-slate-900 text-[15px] tracking-tight group-hover:text-orange-600 transition-colors">
      PHỤ TÙNG <span className="text-orange-500">XE MÁY</span>
    </span>
    <span className="text-[10px] font-semibold text-slate-400 tracking-widest uppercase mt-1">
      Chính hãng • Uy tín
    </span>
  </div>
</Link>
```

### 6.3. Cập nhật Hero Banner Trang chủ ([`app/(customer)/page.tsx`](../app/(customer)/page.tsx))
Đã cập nhật biểu tượng trung tâm và xóa nhãn phụ không cần thiết theo yêu cầu:
```tsx
{/* Hero Logo & Emblem Illustration */}
<div className="hidden md:flex justify-center">
  <div className="relative w-80 h-80 lg:w-96 lg:h-96 flex items-center justify-center">
    <div className="absolute inset-0 bg-gradient-to-tr from-orange-500/35 via-amber-500/20 to-transparent rounded-full blur-3xl" />
    <div className="relative w-72 h-72 lg:w-80 lg:h-80 rounded-[2rem] overflow-hidden border-2 border-orange-500/40 shadow-2xl shadow-orange-950/70 group">
      <img
        src="/brand-logo.png?v=2"
        alt="Phụ Tùng Xe Máy Chính Hãng"
        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
      />
    </div>
    {/* Floating badge */}
    <div className="absolute -bottom-3 -left-4 bg-slate-900/90 backdrop-blur-md border border-orange-500/30 rounded-2xl px-4 py-2.5 shadow-xl flex items-center gap-2.5">
      <span className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse" />
      <span className="text-xs font-bold text-white tracking-wide">Chính Hãng 100%</span>
    </div>
  </div>
</div>
```

*(Tương tự, Logo mới cũng đã được cập nhật đồng bộ trong [`components/customer/footer.tsx`](../components/customer/footer.tsx), [`app/(auth)/layout.tsx`](../app/(auth)/layout.tsx) và [`components/admin/admin-sidebar.tsx`](../components/admin/admin-sidebar.tsx)).*

---

## Bước 7: Xây dựng Bộ lọc sản phẩm đa tiêu chí (Sidebar & Modal)

Trong file [`components/customer/products-catalog.tsx`](../components/customer/products-catalog.tsx):
1. **Nút `"Lọc sản phẩm"` có biểu tượng phễu lọc**: Khi nhấn vào sẽ mở ngay **Cửa sổ Bộ lọc sản phẩm chuyên nghiệp (Filter Modal)** cho phép chọn nhiều tiêu chí cùng lúc.
2. **Thanh bên (Sidebar) trên màn hình lớn**: Cho phép chọn/bỏ chọn trực tiếp từng Danh mục, Dòng xe, Thương hiệu, Khoảng giá, Tình trạng hàng và đếm số lượng sản phẩm khớp theo thời gian thực.
3. **Đồng bộ URL mượt mà**: Dùng `window.history.replaceState` kết hợp biến cờ `isInternalUpdateRef` để cập nhật thanh địa chỉ trình duyệt mà không gây tải lại trang.

**Đoạn code đồng bộ trạng thái lọc trong [`components/customer/products-catalog.tsx`](../components/customer/products-catalog.tsx):**
```tsx
function syncUrlParams(
  cats: string[],
  vehs: string[],
  q: string,
  brands: string[],
  prices: number[],
  inStock: boolean,
  sort: SortKey,
) {
  if (typeof window === 'undefined') return;
  isInternalUpdateRef.current = true;
  const params = new URLSearchParams();
  if (cats.length > 0) params.set('category', cats.join(','));
  if (vehs.length > 0) params.set('compatible_vehicle', vehs.join(','));
  if (q.trim()) params.set('q', q.trim());
  if (brands.length > 0) params.set('brand', brands.join(','));
  if (prices.length > 0) params.set('price', prices.join(','));
  if (inStock) params.set('in_stock', '1');
  if (sort !== 'popular') params.set('sort', sort);

  const qs = params.toString();
  const newUrl = qs ? `${pathname}?${qs}` : pathname;
  window.history.replaceState(window.history.state, '', newUrl);
}
```

---

## Bước 8: Hoàn thiện Đăng ký, Đăng nhập & Quên mật khẩu (AWS Cognito)

### 8.1. Chuẩn hóa Số điện thoại & Nút Ẩn/Hiện mật khẩu ([`app/(auth)/register/page.tsx`](../app/(auth)/register/page.tsx))
- Người dùng nhập số điện thoại 10 chữ số bắt đầu bằng số `0` (ví dụ: `0901234567`).
- Hệ thống tự động kiểm tra hợp lệ bằng biểu thức chính quy `/^0\d{9}$/` và chuyển đổi thành `+84901234567` khi gọi hàm `signUp` của AWS Cognito.
- Bổ sung nút biểu tượng con mắt (Show/Hide Password) cho cả 2 ô **Mật khẩu** và **Xác nhận mật khẩu**.

### 8.2. Trang Quên mật khẩu ([`app/(auth)/forgot-password/page.tsx`](../app/(auth)/forgot-password/page.tsx))
Tích hợp đầy đủ quy trình 2 bước với AWS Cognito:
- **Bước 1**: Nhập Email tài khoản để nhận mã xác thực OTP 6 chữ số qua hàm `forgotPassword(email)`.
- **Bước 2**: Nhập mã OTP và mật khẩu mới qua hàm `confirmPassword(email, code, newPassword)`.

---

## Bước 9: Nâng cấp Trợ lý Tư vấn Phụ tùng AI (WebSocket + RAG + Đơn hàng)

### 9.1. Nút Chatbot tròn nổi góc dưới bên phải ([`components/chat/chat-widget.tsx`](../components/chat/chat-widget.tsx))
Hiển thị Avatar tròn của chuyên viên tư vấn (`/chatbot-avatar.png`) kèm chấm xanh trạng thái trực tuyến, hoàn toàn không có chữ thừa.

```tsx
<button
  onClick={() => setIsOpen(true)}
  className="group relative w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white p-0.5 flex items-center justify-center shadow-[0_8px_28px_rgba(0,0,0,0.22)] hover:shadow-[0_10px_32px_rgba(249,115,22,0.4)] hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer ring-2 ring-white"
  aria-label="Mở trợ lý tư vấn trực tuyến"
>
  <img
    src="/chatbot-avatar.png"
    alt="Trợ lý tư vấn"
    className="w-full h-full rounded-full object-cover"
  />
  <span className="absolute bottom-0 right-0 flex h-3.5 w-3.5">
    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
    <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-green-500 border-2 border-white" />
  </span>
</button>
```

### 9.2. Thanh gợi ý chủ đề phổ biến không bị cắt chữ ([`components/chat/quick-prompts.tsx`](../components/chat/quick-prompts.tsx))
Sử dụng `flex-wrap` để hiển thị trọn vẹn tất cả các chủ đề gợi ý (`Tra cứu đơn hàng`, `Cổ xe kêu cụp cụp`, `Tư vấn dầu nhớt`, `Bảo dưỡng định kỳ`, `Đèn pha sáng yếu`, `Phanh đĩa kêu rít`, `Sên kêu lách cách`) mà không bị khuất chữ ở mép phải khung chat:

```tsx
export function QuickPrompts({ onSelectPrompt, disabled }: QuickPromptsProps) {
  return (
    <div className="py-2 px-1">
      <div className="flex items-center justify-between mb-1.5 px-0.5">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          Chủ đề phổ biến
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {EXTENDED_PROMPTS.map((item) => (
          <button
            key={item.id}
            type="button"
            disabled={disabled}
            onClick={() => onSelectPrompt(item.message)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium bg-slate-50 hover:bg-orange-50 text-slate-700 hover:text-orange-600 border border-slate-200/90 hover:border-orange-300 transition-all cursor-pointer disabled:opacity-50"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-orange-400 flex-shrink-0" />
            <span>{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
```

### 9.3. Khung hội thoại & Ô nhập tin nhắn tích hợp ([`components/chat/chat-window.tsx`](../components/chat/chat-window.tsx))
- Header màu Slate Carbon đồng bộ nhận diện thương hiệu.
- Ô nhập tin nhắn và nút gửi được gộp chung vào một khung capsule bo tròn tinh tế.
- Tích hợp xử lý WebSocket + Chẩn đoán kỹ thuật dự phòng trong [`hooks/use-websocket-chat.ts`](../hooks/use-websocket-chat.ts) và tra cứu vận đơn trong [`lib/order-chat-helper.ts`](../lib/order-chat-helper.ts).

---

## Bước 10: Kiểm tra lỗi (Type-check), Build Production & Quản lý Git

### 10.1. Kiểm tra lỗi TypeScript toàn dự án
```powershell
cd c:\Users\DUY\PhuTungXeMay\phutungxemay-frontend
npx tsc --noEmit
```

### 10.2. Đóng gói bản Production (Build)
```powershell
npm run build
```

### 10.3. Lưu trữ lịch sử mã nguồn với Git CLI
```powershell
# Kiểm tra trạng thái các file đã thay đổi
git status

# Thêm toàn bộ thay đổi vào vùng Staging
git add .

# Tạo bản ghi Commit
git commit -m "feat: complete frontend UI/UX, multi-select filter, brand logo, and AI consultant chat"

# Đẩy mã nguồn lên kho lưu trữ từ xa (GitHub / GitLab)
git push origin main
```

### 10.4. Làm mới Cache CloudFront sau khi cập nhật ảnh hoặc dữ liệu trên AWS
```powershell
# Tìm Distribution ID của d1ksuy3hfmko20.cloudfront.net
aws cloudfront list-distributions --query "DistributionList.Items[?DomainName=='d1ksuy3hfmko20.cloudfront.net'].Id" --output text

# Xóa cache để CloudFront cập nhật ngay lập tức
aws cloudfront create-invalidation --distribution-id <DISTRIBUTION_ID> --paths "/*"
```
