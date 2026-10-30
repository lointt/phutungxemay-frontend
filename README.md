# Phụ Tùng Xe Máy Chính Hãng — Frontend & AWS Serverless

Ứng dụng thương mại điện tử chuyên cung cấp phụ tùng xe máy chính hãng, tích hợp **Trợ lý Tư vấn Phụ tùng AI (WebSocket + RAG)**, **Bộ lọc sản phẩm đa tiêu chí tức thì**, và hạ tầng **AWS Serverless** (`CloudFront`, `S3`, `DynamoDB`, `Cognito`, `API Gateway`).

👉 **Xem tài liệu kỹ thuật chi tiết (bao gồm toàn bộ lệnh AWS CLI, Script & Code):**  
📄 [`docs/HUONG_DAN_KY_THUAT_VA_CLI.md`](./docs/HUONG_DAN_KY_THUAT_VA_CLI.md)

---

## Khởi Chạy Nhanh (Quick Start)

```powershell
# 1. Cài đặt thư viện
npm install

# 2. Chạy môi trường Development (http://localhost:3000)
npm run dev

# 3. Build bản Production
npm run build
npm run start
```

## Các Lệnh AWS CLI Thường Dùng

```powershell
# Đồng bộ ảnh sản phẩm lên S3 Bucket
aws s3 sync ./public/images s3://phutungxemay-product-images-2026/images/ --region ap-southeast-1 --content-type "image/jpeg" --cache-control "public, max-age=31536000"

# Kiểm tra tổng số sản phẩm trong bảng DynamoDB Products
aws dynamodb scan --table-name Products --select "COUNT" --region ap-southeast-1
```
