'use client';

// ============================================================
// components/customer/products-catalog.tsx
// Quản lý toàn bộ bộ lọc (Lọc sản phẩm) + Sắp xếp + Lưới sản phẩm
// Phản hồi tức thì (0ms) trên trình duyệt & đồng bộ URL
// ============================================================

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ProductCard, ProductCardSkeleton } from '@/components/customer/product-card';
import { cn, formatCurrencyVND, getCategoryLabel } from '@/lib/utils';
import type { Product } from '@/types/product';

const CATEGORIES: { value: string; label: string }[] = [
  { value: 'Truyền động', label: 'Truyền động' },
  { value: 'Động cơ', label: 'Động cơ' },
  { value: 'Giảm xóc', label: 'Giảm xóc' },
  { value: 'Hệ thống phanh', label: 'Hệ thống phanh' },
  { value: 'Điện - Đèn', label: 'Điện - Đèn' },
  { value: 'Nhớt - Lọc', label: 'Nhớt - Lọc' },
  { value: 'Lốp - Vỏ xe', label: 'Lốp - Vỏ xe' },
  { value: 'Phụ kiện - Pô xe', label: 'Phụ kiện - Pô xe' },
];

const POPULAR_MODELS: { label: string; value: string }[] = [
  { label: 'Tất cả dòng xe', value: '' },
  { label: 'Yamaha Exciter 150 / 155', value: 'Exciter' },
  { label: 'Honda Winner / Winner X', value: 'Winner' },
  { label: 'Honda SH 125i / 150i / Mode', value: 'SH' },
  { label: 'Honda Vario / Click', value: 'Vario' },
  { label: 'Honda Air Blade', value: 'Air Blade' },
  { label: 'Honda Wave Alpha / RSX / Future', value: 'Wave' },
  { label: 'Honda Vision / Lead', value: 'Vision' },
  { label: 'Yamaha Sirius / Jupiter', value: 'Sirius' },
  { label: 'Suzuki Raider / Satria', value: 'Raider' },
];

const CATEGORY_ALIASES: Record<string, string[]> = {
  'truyền động': ['truyền động', 'hệ thống truyền động'],
  'động cơ': ['động cơ'],
  'giảm xóc': ['giảm xóc', 'giảm xóc sau', 'hệ thống giảm xóc & lái', 'phuộc'],
  'hệ thống phanh': ['hệ thống phanh', 'phanh', 'thắng'],
  'điện - đèn': ['điện - đèn', 'điện', 'đèn'],
  'nhớt - lọc': ['nhớt - lọc', 'dầu nhớt & phụ gia', 'nhớt', 'lọc'],
  'lốp - vỏ xe': ['lốp - vỏ xe', 'lốp', 'vỏ xe'],
  'phụ kiện - pô xe': ['phụ kiện - pô xe', 'phụ kiện', 'pô xe', 'dàn áo'],
};

const PRICE_RANGES: { label: string; min?: number; max?: number }[] = [
  { label: 'Tất cả', min: undefined, max: undefined },
  { label: 'Dưới 200.000đ', min: undefined, max: 200000 },
  { label: '200.000 - 500.000đ', min: 200000, max: 500000 },
  { label: '500.000 - 2.000.000đ', min: 500000, max: 2000000 },
  { label: 'Trên 2.000.000đ', min: 2000000, max: undefined },
];

const SORT_OPTIONS = [
  { value: 'popular', label: 'Phổ biến nhất' },
  { value: 'price_asc', label: 'Giá tăng dần' },
  { value: 'price_desc', label: 'Giá giảm dần' },
  { value: 'newest', label: 'Mới nhất' },
] as const;

function matchesCategory(productCat: string, targetCategory: string): boolean {
  if (!targetCategory) return true;
  const target = getCategoryLabel(targetCategory).toLowerCase();
  const aliases = CATEGORY_ALIASES[target] ?? [target];
  const itemCat = productCat.toLowerCase();
  return aliases.some(
    (alias) => itemCat === alias || itemCat.includes(alias) || alias.includes(itemCat),
  );
}

interface ProductsCatalogProps {
  initialProducts: Product[];
}

export function ProductsCatalog({ initialProducts }: ProductsCatalogProps) {
  const searchParams = useSearchParams();
  const searchParamsString = searchParams.toString();

  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [isFetchingClient, setIsFetchingClient] = useState<boolean>(initialProducts.length === 0);

  const gridRef = useRef<HTMLDivElement>(null);
  const quickSearchInputRef = useRef<HTMLInputElement>(null);
  const lastExternalQueryRef = useRef<string>(searchParamsString);
  const isInternalUpdateRef = useRef<boolean>(false);

  // Dự phòng: Nếu SSR gặp gián đoạn mạng tạm thời, trình duyệt tự động tải danh sách sản phẩm trực tiếp
  useEffect(() => {
    if (initialProducts.length > 0) {
      setProducts(initialProducts);
      setIsFetchingClient(false);
      return;
    }
    let cancelled = false;
    setIsFetchingClient(true);
    const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'https://d1ksuy3hfmko20.cloudfront.net';
    fetch(`${apiBase}/api/products`)
      .then((r) => r.json())
      .then((data: { items?: Record<string, unknown>[] }) => {
        if (cancelled) return;
        const rawItems = data.items ?? [];
        const normalized: Product[] = rawItems.map((raw) => {
          const productId = String(raw.ProductID ?? raw.product_id ?? raw.id ?? '');
          const rawImage = typeof raw.image_url === 'string' ? raw.image_url : undefined;
          const rawImages = Array.isArray(raw.image_urls) ? (raw.image_urls as string[]) : [];
          const imageUrls = rawImages.length > 0 ? rawImages : rawImage ? [rawImage] : [];
          const rawModels = Array.isArray(raw.compatible_models) ? (raw.compatible_models as string[]) : [];
          return {
            product_id: productId,
            ProductID: productId,
            name: String(raw.name ?? 'Phụ tùng xe máy'),
            description: String(raw.description ?? ''),
            category: String(raw.category ?? 'Khác'),
            price: Number(raw.price ?? 0),
            stock: Number(raw.stock ?? 0),
            image_urls: imageUrls,
            image_url: imageUrls[0],
            compatible_vehicles: rawModels.map((m) => ({ brand: '', model: m, year_from: 2015, year_to: 2026 })),
            compatible_models: rawModels,
            sku: String(raw.sku ?? productId),
            brand: String(raw.brand ?? 'Chính hãng'),
            specs: (raw.specs as Record<string, string>) ?? {},
            status: String(raw.status ?? 'ACTIVE'),
            is_active: raw.status !== 'INACTIVE',
            created_at: String(raw.created_at ?? '2026-01-01T00:00:00.000Z'),
            updated_at: String(raw.updated_at ?? '2026-01-01T00:00:00.000Z'),
          };
        });
        setProducts(normalized);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setIsFetchingClient(false);
      });
    return () => {
      cancelled = true;
    };
  }, [initialProducts]);

  // State bộ lọc phản hồi tức thì
  const [selectedCategory, setSelectedCategory] = useState<string>(
    () => searchParams.get('category') ?? '',
  );
  const [minPrice, setMinPrice] = useState<number | undefined>(() =>
    searchParams.get('min_price') ? Number(searchParams.get('min_price')) : undefined,
  );
  const [maxPrice, setMaxPrice] = useState<number | undefined>(() =>
    searchParams.get('max_price') ? Number(searchParams.get('max_price')) : undefined,
  );
  const [customMinInput, setCustomMinInput] = useState<string>(
    () => searchParams.get('min_price') ?? '',
  );
  const [customMaxInput, setCustomMaxInput] = useState<string>(
    () => searchParams.get('max_price') ?? '',
  );
  const [inStockOnly, setInStockOnly] = useState<boolean>(
    () => searchParams.get('in_stock') === 'true',
  );
  const [selectedBrand, setSelectedBrand] = useState<string>(
    () => searchParams.get('brand') ?? '',
  );
  const [compatibleBrand, setCompatibleBrand] = useState<string>(
    () => searchParams.get('compatible_brand') ?? '',
  );
  const [compatibleModel, setCompatibleModel] = useState<string>(
    () => searchParams.get('compatible_model') ?? '',
  );
  const [searchQuery, setSearchQuery] = useState<string>(
    () => searchParams.get('search') ?? '',
  );
  const [sortBy, setSortBy] = useState<string>(
    () => searchParams.get('sort') ?? 'popular',
  );
  const [filterAppliedBanner, setFilterAppliedBanner] = useState<boolean>(false);

  // Trạng thái đóng/mở các nhóm lọc trong sidebar
  const [openCatSection, setOpenCatSection] = useState(true);
  const [openVehicleSection, setOpenVehicleSection] = useState(true);
  const [openPriceSection, setOpenPriceSection] = useState(true);
  const [openBrandSection, setOpenBrandSection] = useState(true);
  const [openStockSection, setOpenStockSection] = useState(true);

  // Chỉ đồng bộ từ URL khi người dùng click từ Header / Footer / VehicleSelector bên ngoài
  useEffect(() => {
    if (isInternalUpdateRef.current) {
      isInternalUpdateRef.current = false;
      lastExternalQueryRef.current = searchParamsString;
      return;
    }
    if (searchParamsString === lastExternalQueryRef.current) {
      return;
    }
    lastExternalQueryRef.current = searchParamsString;
    const params = new URLSearchParams(searchParamsString);
    setSelectedCategory(params.get('category') ?? '');
    const minP = params.get('min_price') ? Number(params.get('min_price')) : undefined;
    const maxP = params.get('max_price') ? Number(params.get('max_price')) : undefined;
    setMinPrice(minP);
    setMaxPrice(maxP);
    setCustomMinInput(minP !== undefined ? String(minP) : '');
    setCustomMaxInput(maxP !== undefined ? String(maxP) : '');
    setInStockOnly(params.get('in_stock') === 'true');
    setSelectedBrand(params.get('brand') ?? '');
    setCompatibleBrand(params.get('compatible_brand') ?? '');
    setCompatibleModel(params.get('compatible_model') ?? '');
    setSearchQuery(params.get('search') ?? '');
    setSortBy(params.get('sort') ?? 'popular');
  }, [searchParamsString]);

  // Đồng bộ ngược lại lên thanh địa chỉ URL mà không kích hoạt router reset
  function syncUrl(next: {
    category?: string;
    min_price?: number;
    max_price?: number;
    in_stock?: boolean;
    brand?: string;
    compatible_brand?: string;
    compatible_model?: string;
    search?: string;
    sort?: string;
  }) {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams();
    const cat = next.category !== undefined ? next.category : selectedCategory;
    const minP = 'min_price' in next ? next.min_price : minPrice;
    const maxP = 'max_price' in next ? next.max_price : maxPrice;
    const stock = next.in_stock !== undefined ? next.in_stock : inStockOnly;
    const br = next.brand !== undefined ? next.brand : selectedBrand;
    const cBrand = next.compatible_brand !== undefined ? next.compatible_brand : compatibleBrand;
    const cModel = next.compatible_model !== undefined ? next.compatible_model : compatibleModel;
    const q = next.search !== undefined ? next.search : searchQuery;
    const s = next.sort !== undefined ? next.sort : sortBy;

    if (cat) params.set('category', cat);
    if (minP !== undefined) params.set('min_price', String(minP));
    if (maxP !== undefined) params.set('max_price', String(maxP));
    if (stock) params.set('in_stock', 'true');
    if (br) params.set('brand', br);
    if (cBrand) params.set('compatible_brand', cBrand);
    if (cModel) params.set('compatible_model', cModel);
    if (q) params.set('search', q);
    if (s && s !== 'popular') params.set('sort', s);

    const qs = params.toString();
    isInternalUpdateRef.current = true;
    lastExternalQueryRef.current = qs;
    const newUrl = `/products${qs ? `?${qs}` : ''}`;
    window.history.replaceState(window.history.state, '', newUrl);
  }

  // Danh sách các thương hiệu phụ tùng hiện có
  const availableBrands = useMemo(() => {
    const set = new Set<string>();
    for (const p of products) {
      if (p.brand && p.brand.trim()) {
        set.add(p.brand.trim());
      }
    }
    return Array.from(set).sort();
  }, [products]);

  // Đếm số lượng sản phẩm theo từng danh mục
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const cat of CATEGORIES) {
      counts[cat.value] = products.filter((p) =>
        matchesCategory(p.category, cat.value),
      ).length;
    }
    return counts;
  }, [products]);

  // Lọc và sắp xếp sản phẩm tức thì
  const filteredProducts = useMemo(() => {
    let list = [...products];

    // 1. Lọc theo danh mục
    if (selectedCategory) {
      list = list.filter((item) => matchesCategory(item.category, selectedCategory));
    }

    // 2. Lọc theo từ khóa tìm kiếm
    if (searchQuery.trim()) {
      const kw = searchQuery.trim().toLowerCase();
      list = list.filter((item) => {
        const matchName = item.name.toLowerCase().includes(kw);
        const matchSku = item.sku.toLowerCase().includes(kw);
        const matchBrand = item.brand.toLowerCase().includes(kw);
        const matchDesc = item.description.toLowerCase().includes(kw);
        const matchCat = item.category.toLowerCase().includes(kw);
        const matchModels = item.compatible_models?.some((m) => m.toLowerCase().includes(kw));
        return matchName || matchSku || matchBrand || matchDesc || matchCat || matchModels;
      });
    }

    // 3. Lọc theo thương hiệu phụ tùng
    if (selectedBrand) {
      const b = selectedBrand.toLowerCase();
      list = list.filter((item) => item.brand.toLowerCase() === b);
    }

    // 4. Lọc theo hãng xe & dòng xe tương thích
    if (compatibleBrand) {
      const cb = compatibleBrand.toLowerCase();
      list = list.filter(
        (item) =>
          item.compatible_models?.some((m) => m.toLowerCase().includes(cb)) ||
          item.compatible_vehicles.some((v) => v.brand.toLowerCase().includes(cb)) ||
          item.description.toLowerCase().includes(cb),
      );
    }

    if (compatibleModel) {
      const cm = compatibleModel.toLowerCase();
      list = list.filter(
        (item) =>
          item.compatible_models?.some((m) => m.toLowerCase().includes(cm)) ||
          item.compatible_vehicles.some((v) => v.model.toLowerCase().includes(cm)) ||
          item.name.toLowerCase().includes(cm) ||
          item.description.toLowerCase().includes(cm),
      );
    }

    // 5. Lọc theo khoảng giá
    if (minPrice !== undefined) {
      list = list.filter((item) => item.price >= minPrice);
    }
    if (maxPrice !== undefined) {
      list = list.filter((item) => item.price <= maxPrice);
    }

    // 6. Lọc chỉ còn hàng
    if (inStockOnly) {
      list = list.filter((item) => item.stock > 0);
    }

    // 7. Sắp xếp
    if (sortBy === 'price_asc') {
      list.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'price_desc') {
      list.sort((a, b) => b.price - a.price);
    } else if (sortBy === 'newest') {
      list.sort((a, b) => {
        const timeA = Date.parse(a.created_at) || 0;
        const timeB = Date.parse(b.created_at) || 0;
        if (timeB !== timeA) return timeB - timeA;
        return b.product_id.localeCompare(a.product_id);
      });
    } else {
      list.sort((a, b) => a.product_id.localeCompare(b.product_id));
    }

    return list;
  }, [
    products,
    selectedCategory,
    searchQuery,
    selectedBrand,
    compatibleBrand,
    compatibleModel,
    minPrice,
    maxPrice,
    inStockOnly,
    sortBy,
  ]);

  function handleSelectCategory(cat: string) {
    setSelectedCategory(cat);
    syncUrl({ category: cat });
  }

  function handleSelectPriceRange(min?: number, max?: number) {
    setMinPrice(min);
    setMaxPrice(max);
    setCustomMinInput(min !== undefined ? String(min) : '');
    setCustomMaxInput(max !== undefined ? String(max) : '');
    syncUrl({ min_price: min, max_price: max });
  }

  function handleSelectBrand(brand: string) {
    const nextBrand = selectedBrand === brand ? '' : brand;
    setSelectedBrand(nextBrand);
    syncUrl({ brand: nextBrand });
  }

  function handleSelectVehicleModel(model: string) {
    setCompatibleModel(model);
    syncUrl({ compatible_model: model });
  }

  function handleToggleInStock(checked: boolean) {
    setInStockOnly(checked);
    syncUrl({ in_stock: checked });
  }

  function handleChangeSort(val: string) {
    setSortBy(val);
    syncUrl({ sort: val });
  }

  // Khi người dùng bấm trực tiếp vào phễu "Lọc sản phẩm" (ở đầu hoặc cuối bảng lọc)
  function handleExecuteFunnelFilter() {
    const parsedMin = customMinInput.trim() ? Number(customMinInput.replace(/\D/g, '')) : minPrice;
    const parsedMax = customMaxInput.trim() ? Number(customMaxInput.replace(/\D/g, '')) : maxPrice;

    const finalMin = parsedMin && !Number.isNaN(parsedMin) ? parsedMin : undefined;
    const finalMax = parsedMax && !Number.isNaN(parsedMax) ? parsedMax : undefined;

    setMinPrice(finalMin);
    setMaxPrice(finalMax);
    syncUrl({
      category: selectedCategory,
      min_price: finalMin,
      max_price: finalMax,
      in_stock: inStockOnly,
      brand: selectedBrand,
      compatible_brand: compatibleBrand,
      compatible_model: compatibleModel,
      search: searchQuery,
      sort: sortBy,
    });

    setFilterAppliedBanner(true);
    setTimeout(() => setFilterAppliedBanner(false), 2500);

    if (gridRef.current && typeof window !== 'undefined' && window.innerWidth < 1024) {
      gridRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function handleClearAllFilters() {
    setSelectedCategory('');
    setMinPrice(undefined);
    setMaxPrice(undefined);
    setCustomMinInput('');
    setCustomMaxInput('');
    setInStockOnly(false);
    setSelectedBrand('');
    setCompatibleBrand('');
    setCompatibleModel('');
    setSearchQuery('');
    setSortBy('popular');
    isInternalUpdateRef.current = true;
    lastExternalQueryRef.current = '';
    if (typeof window !== 'undefined') {
      window.history.replaceState(window.history.state, '', '/products');
    }
  }

  const hasActiveFilters = Boolean(
    selectedCategory ||
    minPrice !== undefined ||
    maxPrice !== undefined ||
    inStockOnly ||
    selectedBrand ||
    compatibleBrand ||
    compatibleModel ||
    searchQuery.trim(),
  );

  const pageTitle = searchQuery.trim()
    ? `Kết quả tìm kiếm cho "${searchQuery.trim()}"`
    : selectedCategory
      ? getCategoryLabel(selectedCategory)
      : 'Tất cả sản phẩm';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <a href="/" className="hover:text-orange-500 transition-colors">
          Trang chủ
        </a>
        <span>/</span>
        <span className="text-gray-800 font-medium">{pageTitle}</span>
      </nav>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* ── Sidebar: Lọc sản phẩm ────────────────────────────────────────── */}
        <aside className="lg:w-72 flex-shrink-0">
          <div className="lg:sticky lg:top-20 bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
            {/* Header Phễu Lọc sản phẩm — Bấm để thực thi lọc ngay */}
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-gray-100">
              <button
                type="button"
                onClick={handleExecuteFunnelFilter}
                title="Bấm để lọc sản phẩm theo các tiêu chí đã chọn"
                className="flex items-center gap-2 font-bold text-gray-900 hover:text-orange-600 transition-colors cursor-pointer group"
              >
                <span className="w-8 h-8 rounded-lg bg-orange-50 group-hover:bg-orange-500 flex items-center justify-center transition-colors">
                  <svg
                    className="w-4 h-4 text-orange-500 group-hover:text-white transition-colors flex-shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                    />
                  </svg>
                </span>
                <span className="text-base">Lọc sản phẩm</span>
              </button>

              {hasActiveFilters ? (
                <button
                  type="button"
                  onClick={handleClearAllFilters}
                  className="text-xs text-orange-600 hover:text-orange-700 bg-orange-50 hover:bg-orange-100 px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer"
                >
                  Đặt lại
                </button>
              ) : (
                <span className="text-xs text-gray-400 font-medium">
                  {filteredProducts.length} SP
                </span>
              )}
            </div>

            {/* Ô lọc nhanh theo tên / mã phụ tùng ngay dưới phễu lọc */}
            <div className="mt-3">
              <div className="relative">
                <input
                  ref={quickSearchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    syncUrl({ search: e.target.value });
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleExecuteFunnelFilter();
                  }}
                  placeholder="Nhập tên phụ tùng, dòng xe..."
                  className="w-full pl-8 pr-8 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-400 focus:bg-white text-gray-800 placeholder-gray-400"
                />
                <svg
                  className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      syncUrl({ search: '' });
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            <div className="mt-2">
              {/* 1. Danh mục */}
              <div className="border-t border-gray-100 pt-3.5 mt-3">
                <button
                  type="button"
                  onClick={() => setOpenCatSection((v) => !v)}
                  className="flex items-center justify-between w-full mb-2 text-sm font-semibold text-gray-800 cursor-pointer"
                >
                  <span>Danh mục phụ tùng</span>
                  <svg
                    className={cn(
                      'w-4 h-4 text-gray-400 transition-transform',
                      openCatSection && 'rotate-180',
                    )}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {openCatSection && (
                  <div className="space-y-1">
                    <button
                      type="button"
                      onClick={() => handleSelectCategory('')}
                      className={cn(
                        'w-full flex items-center justify-between text-left px-3 py-2 text-sm rounded-lg transition-colors cursor-pointer',
                        !selectedCategory
                          ? 'bg-orange-500 text-white font-semibold shadow-sm'
                          : 'text-gray-600 hover:bg-orange-50 hover:text-orange-600',
                      )}
                    >
                      <span>Tất cả danh mục</span>
                      <span
                        className={cn(
                          'text-xs px-1.5 py-0.5 rounded-md',
                          !selectedCategory ? 'bg-white/20 text-white' : 'text-gray-400 bg-gray-100',
                        )}
                      >
                        {products.length}
                      </span>
                    </button>

                    {CATEGORIES.map((cat) => {
                      const isActive = selectedCategory === cat.value;
                      return (
                        <button
                          key={cat.value}
                          type="button"
                          onClick={() => handleSelectCategory(cat.value)}
                          className={cn(
                            'w-full flex items-center justify-between text-left px-3 py-2 text-sm rounded-lg transition-colors cursor-pointer',
                            isActive
                              ? 'bg-orange-500 text-white font-semibold shadow-sm'
                              : 'text-gray-600 hover:bg-orange-50 hover:text-orange-600',
                          )}
                        >
                          <span>{cat.label}</span>
                          <span
                            className={cn(
                              'text-xs px-1.5 py-0.5 rounded-md',
                              isActive
                                ? 'bg-white/20 text-white font-bold'
                                : 'text-gray-400 bg-gray-100',
                            )}
                          >
                            {categoryCounts[cat.value] ?? 0}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 2. Dòng xe tương thích */}
              <div className="border-t border-gray-100 pt-3.5 mt-3.5">
                <button
                  type="button"
                  onClick={() => setOpenVehicleSection((v) => !v)}
                  className="flex items-center justify-between w-full mb-2 text-sm font-semibold text-gray-800 cursor-pointer"
                >
                  <span>Dòng xe tương thích</span>
                  <svg
                    className={cn(
                      'w-4 h-4 text-gray-400 transition-transform',
                      openVehicleSection && 'rotate-180',
                    )}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {openVehicleSection && (
                  <select
                    value={compatibleModel}
                    onChange={(e) => handleSelectVehicleModel(e.target.value)}
                    aria-label="Chọn dòng xe tương thích"
                    className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-400 text-gray-700 font-medium cursor-pointer"
                  >
                    {POPULAR_MODELS.map((m) => (
                      <option key={m.label} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* 3. Khoảng giá */}
              <div className="border-t border-gray-100 pt-3.5 mt-3.5">
                <button
                  type="button"
                  onClick={() => setOpenPriceSection((v) => !v)}
                  className="flex items-center justify-between w-full mb-2 text-sm font-semibold text-gray-800 cursor-pointer"
                >
                  <span>Khoảng giá</span>
                  <svg
                    className={cn(
                      'w-4 h-4 text-gray-400 transition-transform',
                      openPriceSection && 'rotate-180',
                    )}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {openPriceSection && (
                  <div className="space-y-1">
                    {PRICE_RANGES.map((range) => {
                      const isActive = minPrice === range.min && maxPrice === range.max;
                      return (
                        <button
                          key={range.label}
                          type="button"
                          onClick={() => handleSelectPriceRange(range.min, range.max)}
                          className={cn(
                            'w-full text-left px-3 py-2 text-sm rounded-lg transition-colors cursor-pointer',
                            isActive
                              ? 'bg-orange-500 text-white font-semibold shadow-sm'
                              : 'text-gray-600 hover:bg-orange-50 hover:text-orange-600',
                          )}
                        >
                          {range.label}
                        </button>
                      );
                    })}

                    {/* Nhập khoảng giá tùy chọn */}
                    <div className="pt-2 mt-2 border-t border-dashed border-gray-200">
                      <p className="text-[11px] text-gray-500 mb-1.5 font-medium">
                        Hoặc nhập khoảng giá (VNĐ):
                      </p>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          inputMode="numeric"
                          value={customMinInput}
                          onChange={(e) => setCustomMinInput(e.target.value)}
                          placeholder="Từ (vd: 100000)"
                          className="w-1/2 px-2.5 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 text-gray-800"
                        />
                        <span className="text-gray-400 text-xs">-</span>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={customMaxInput}
                          onChange={(e) => setCustomMaxInput(e.target.value)}
                          placeholder="Đến (vd: 500000)"
                          className="w-1/2 px-2.5 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 text-gray-800"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 4. Thương hiệu phụ tùng */}
              <div className="border-t border-gray-100 pt-3.5 mt-3.5">
                <button
                  type="button"
                  onClick={() => setOpenBrandSection((v) => !v)}
                  className="flex items-center justify-between w-full mb-2 text-sm font-semibold text-gray-800 cursor-pointer"
                >
                  <span>Thương hiệu</span>
                  <svg
                    className={cn(
                      'w-4 h-4 text-gray-400 transition-transform',
                      openBrandSection && 'rotate-180',
                    )}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {openBrandSection && (
                  <div className="flex flex-wrap gap-1.5">
                    {availableBrands.map((brand) => {
                      const isActive = selectedBrand === brand;
                      return (
                        <button
                          key={brand}
                          type="button"
                          onClick={() => handleSelectBrand(brand)}
                          className={cn(
                            'px-2.5 py-1 text-xs rounded-lg border transition-all cursor-pointer',
                            isActive
                              ? 'bg-orange-500 text-white border-orange-500 font-semibold shadow-sm'
                              : 'bg-gray-50 text-gray-700 border-gray-200 hover:border-orange-300 hover:text-orange-600',
                          )}
                        >
                          {brand}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 5. Tình trạng kho */}
              <div className="border-t border-gray-100 pt-3.5 mt-3.5">
                <button
                  type="button"
                  onClick={() => setOpenStockSection((v) => !v)}
                  className="flex items-center justify-between w-full mb-2 text-sm font-semibold text-gray-800 cursor-pointer"
                >
                  <span>Tình trạng</span>
                  <svg
                    className={cn(
                      'w-4 h-4 text-gray-400 transition-transform',
                      openStockSection && 'rotate-180',
                    )}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {openStockSection && (
                  <label className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-gray-50 rounded-lg transition-colors">
                    <input
                      type="checkbox"
                      checked={inStockOnly}
                      onChange={(e) => handleToggleInStock(e.target.checked)}
                      className="w-4 h-4 text-orange-500 border-gray-300 rounded focus:ring-orange-400 cursor-pointer"
                    />
                    <span className="text-sm text-gray-700">Chỉ hiện sản phẩm còn hàng</span>
                  </label>
                )}
              </div>

              {/* Nút Phễu Lọc Sản Phẩm nổi bật */}
              <div className="pt-4 mt-3 border-t border-gray-100 space-y-2">
                <button
                  type="button"
                  onClick={handleExecuteFunnelFilter}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-orange-500 hover:bg-orange-600 active:scale-[0.99] text-white text-sm font-semibold rounded-xl shadow-md shadow-orange-500/20 transition-all cursor-pointer"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                    />
                  </svg>
                  <span>Lọc sản phẩm ({filteredProducts.length})</span>
                </button>

                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={handleClearAllFilters}
                    className="w-full py-2 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                  >
                    Xóa toàn bộ bộ lọc
                  </button>
                )}
              </div>
            </div>
          </div>
        </aside>

        {/* ── Products Grid ────────────────────────────────────────────────── */}
        <div ref={gridRef} className="flex-1 min-w-0">
          {/* Header row */}
          <div className="flex items-center justify-between mb-5 gap-3">
            <div>
              <h1 className="text-xl font-bold text-gray-900">{pageTitle}</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-sm text-gray-500">
                  {filteredProducts.length > 0
                    ? `Hiển thị ${filteredProducts.length} / ${products.length} sản phẩm`
                    : 'Không tìm thấy sản phẩm nào'}
                </p>
                {filterAppliedBanner && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200 animate-pulse">
                    ✓ Đã áp dụng bộ lọc
                  </span>
                )}
              </div>
            </div>

            {/* Sort dropdown */}
            <select
              value={sortBy}
              onChange={(e) => handleChangeSort(e.target.value)}
              aria-label="Sắp xếp sản phẩm"
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 text-gray-700 cursor-pointer"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Active filter badges */}
          {hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-2 mb-5 p-3 bg-orange-50/60 border border-orange-100 rounded-xl">
              <span className="text-xs font-semibold text-orange-800 mr-1">Đang lọc theo:</span>
              {selectedCategory && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-white text-orange-700 border border-orange-200 shadow-xs">
                  Danh mục: {selectedCategory}
                  <button
                    type="button"
                    onClick={() => handleSelectCategory('')}
                    className="hover:text-orange-900 font-bold cursor-pointer"
                  >
                    ✕
                  </button>
                </span>
              )}
              {selectedBrand && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-white text-orange-700 border border-orange-200 shadow-xs">
                  Thương hiệu: {selectedBrand}
                  <button
                    type="button"
                    onClick={() => handleSelectBrand(selectedBrand)}
                    className="hover:text-orange-900 font-bold cursor-pointer"
                  >
                    ✕
                  </button>
                </span>
              )}
              {(minPrice !== undefined || maxPrice !== undefined) && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-white text-orange-700 border border-orange-200 shadow-xs">
                  Giá:{' '}
                  {PRICE_RANGES.find((r) => r.min === minPrice && r.max === maxPrice)?.label ??
                    `${minPrice ? formatCurrencyVND(minPrice) : '0đ'} - ${maxPrice ? formatCurrencyVND(maxPrice) : 'Trở lên'}`}
                  <button
                    type="button"
                    onClick={() => handleSelectPriceRange(undefined, undefined)}
                    className="hover:text-orange-900 font-bold cursor-pointer"
                  >
                    ✕
                  </button>
                </span>
              )}
              {(compatibleBrand || compatibleModel) && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-white text-orange-700 border border-orange-200 shadow-xs">
                  🏍️ Xe: {compatibleBrand} {compatibleModel}
                  <button
                    type="button"
                    onClick={() => {
                      setCompatibleBrand('');
                      setCompatibleModel('');
                      syncUrl({ compatible_brand: '', compatible_model: '' });
                    }}
                    className="hover:text-orange-900 font-bold cursor-pointer"
                  >
                    ✕
                  </button>
                </span>
              )}
              {inStockOnly && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-white text-orange-700 border border-orange-200 shadow-xs">
                  Chỉ còn hàng
                  <button
                    type="button"
                    onClick={() => handleToggleInStock(false)}
                    className="hover:text-orange-900 font-bold cursor-pointer"
                  >
                    ✕
                  </button>
                </span>
              )}
              {searchQuery.trim() && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-white text-orange-700 border border-orange-200 shadow-xs">
                  Từ khóa: &ldquo;{searchQuery}&rdquo;
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      syncUrl({ search: '' });
                    }}
                    className="hover:text-orange-900 font-bold cursor-pointer"
                  >
                    ✕
                  </button>
                </span>
              )}
              <button
                type="button"
                onClick={handleClearAllFilters}
                className="ml-auto text-xs font-semibold text-orange-600 hover:text-orange-800 underline cursor-pointer"
              >
                Xóa tất cả
              </button>
            </div>
          )}

          {/* Grid */}
          {isFetchingClient ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </div>
          ) : filteredProducts.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredProducts.map((product) => (
                <ProductCard key={product.product_id} product={product} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-2xl border border-gray-100">
              <div className="text-5xl mb-4">🔍</div>
              <h3 className="text-lg font-semibold text-gray-700 mb-2">
                Không tìm thấy sản phẩm phù hợp
              </h3>
              <p className="text-gray-500 text-sm mb-6">
                Thử thay đổi bộ lọc hoặc nhấn nút bên dưới để xem toàn bộ sản phẩm
              </p>
              <button
                type="button"
                onClick={handleClearAllFilters}
                className="px-5 py-2.5 bg-orange-500 hover:bg-orange-400 text-white text-sm font-semibold rounded-xl transition-colors cursor-pointer"
              >
                Xem tất cả sản phẩm
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
