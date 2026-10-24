'use client';

// ============================================================
// app/(customer)/order-success/page.tsx — Trang kết quả đặt hàng
// Hiển thị mã đơn hàng, timeline trạng thái, thông tin vận đơn
// ============================================================

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { OrderTimeline } from '@/components/customer/order-timeline';
import { getLocalOrderById, getLocalOrders } from '@/lib/order-storage';
import { formatCurrencyVND } from '@/lib/utils';
import type { Order } from '@/types/order';

export default function OrderSuccessPage() {
  return (
    <Suspense fallback={<OrderSuccessSkeleton />}>
      <OrderSuccessContent />
    </Suspense>
  );
}

function OrderSuccessSkeleton() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-16 animate-pulse space-y-6">
      <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto" />
      <div className="h-6 bg-gray-200 rounded w-1/2 mx-auto" />
      <div className="h-32 bg-gray-200 rounded-2xl" />
    </div>
  );
}

function OrderSuccessContent() {
  const searchParams = useSearchParams();
  const rawId = searchParams.get('order_id');
  const method = searchParams.get('method') || 'COD';

  const [order, setOrder] = useState<Order | null>(null);

  useEffect(() => {
    // 1. Tìm đơn hàng theo order_id
    if (rawId) {
      const found = getLocalOrderById(rawId);
      if (found) {
        setOrder(found);
        return;
      }
    }

    // 2. Nếu không có id hoặc không tìm thấy, lấy đơn mới nhất trong kho local
    const all = getLocalOrders();
    if (all.length > 0) {
      setOrder(all[0]);
    }
  }, [rawId]);

  const displayOrderId = order?.order_id || rawId || `ORD_${Date.now().toString().slice(-8)}`;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Success Badge & Header */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl shadow-sm">
          ✅
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900">
          Đặt hàng thành công!
        </h1>
        <p className="text-sm text-gray-500 mt-2">
          Cảm ơn bạn đã tin tưởng mua phụ tùng tại <strong>Phụ Tùng Xe Máy</strong>.
        </p>
        <div className="inline-flex items-center gap-2 mt-3 px-3 py-1 bg-orange-50 border border-orange-200 rounded-full text-xs text-orange-800">
          <span>Mã đơn hàng:</span>
          <strong className="font-mono">{displayOrderId}</strong>
        </div>
      </div>

      {/* Main Card */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 shadow-sm space-y-8">
        {/* Timeline */}
        <div>
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
            Tiến trình vận đơn
          </h2>
          <OrderTimeline
            status={order?.order_status || 'PLACED'}
            createdAt={order?.created_at || new Date().toISOString()}
            estimatedDelivery={order?.estimated_delivery}
          />
        </div>

        {/* Shipping & Delivery Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-6 border-t border-gray-100 text-xs">
          <div className="space-y-2">
            <h3 className="font-bold text-gray-900 text-sm flex items-center gap-1.5">
              <span>🚚</span> Đơn vị giao nhận
            </h3>
            <p className="text-gray-700">
              Đối tác vận chuyển: <strong>{order?.shipping_partner || 'Giao Hàng Nhanh (GHN)'}</strong>
            </p>
            <p className="text-gray-700">
              Mã vận đơn (Tracking):{' '}
              <strong className="font-mono text-orange-600">
                {order?.tracking_number || 'Đang cập nhật'}
              </strong>
            </p>
            <p className="text-gray-500">
              Thời gian giao dự kiến: 2 - 3 ngày làm việc (trừ Chủ nhật)
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="font-bold text-gray-900 text-sm flex items-center gap-1.5">
              <span>📍</span> Địa chỉ nhận hàng
            </h3>
            <p className="text-gray-800 font-medium">
              {order?.shipping_address.full_name || 'Khách hàng'} • {order?.shipping_address.phone || '090xxxxxxx'}
            </p>
            <p className="text-gray-600">
              {order?.shipping_address.street || 'Địa chỉ giao hàng'}, {order?.shipping_address.ward || ''},{' '}
              {order?.shipping_address.district || ''}, {order?.shipping_address.province || 'Việt Nam'}
            </p>
            <p className="text-gray-500">
              Phương thức thanh toán: <strong>{method === 'COD' ? 'Tiền mặt khi nhận hàng (COD)' : method}</strong>
            </p>
          </div>
        </div>

        {/* Order items preview if available */}
        {order?.items && order.items.length > 0 && (
          <div className="pt-6 border-t border-gray-100">
            <h3 className="font-bold text-gray-900 text-xs uppercase tracking-wider mb-3">
              Danh sách phụ tùng đã đặt
            </h3>
            <div className="divide-y divide-gray-100">
              {order.items.map((item, i) => (
                <div key={i} className="py-2.5 flex items-center justify-between text-xs">
                  <span className="font-medium text-gray-800 line-clamp-1">{item.name} x{item.quantity}</span>
                  <span className="font-bold text-gray-900">{formatCurrencyVND(item.price * item.quantity)}</span>
                </div>
              ))}
              <div className="pt-3 flex items-center justify-between text-sm font-bold text-gray-900">
                <span>Tổng cộng:</span>
                <span className="text-orange-600 font-extrabold text-base">
                  {formatCurrencyVND(order.total_amount)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="pt-6 border-t border-gray-100 flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href={`/orders/${displayOrderId}`}
            className="px-6 py-3 bg-orange-500 hover:bg-orange-400 text-white font-bold text-xs rounded-xl text-center transition-all shadow-md shadow-orange-500/25"
          >
            Theo dõi chi tiết đơn hàng #{displayOrderId}
          </Link>

          <Link
            href="/products"
            className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium text-xs rounded-xl text-center transition-colors"
          >
            Tiếp tục mua hàng
          </Link>
        </div>
      </div>
    </div>
  );
}
