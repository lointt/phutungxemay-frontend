'use client';

// ============================================================
// components/customer/products-catalog.tsx
// Quản lý toàn bộ bộ lọc (Lọc sản phẩm) + Giao diện Popup tích chọn
// Hỗ trợ tích chọn nhiều Danh mục, Thương hiệu, Dòng xe, Khoảng giá
// ============================================================

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ProductCard, ProductCardSkeleton } from '@/components/customer/product-card';
import { cn, formatCurrencyVND, getCategoryLabel } from '@/lib/utils';
import type { Product } from '@/types/product';

const CATEGORIES: { value: string; label: string; icon: string }[] = [
  { value: 'Truyền động', label: 'Truyền động', icon: '⚙️' },
  { value: 'Động cơ', label: 'Động cơ', icon: '🔧' },
  { value: 'Giảm xóc', label: 'Giảm xóc', icon: '🔩' },
  { value: 'Hệ thống phanh', label: 'Hệ thống phanh', icon: '🛑' },
  { value: 'Điện - Đèn', label: 'Điện - Đèn', icon: '💡' },
  { value: 'Nhớt - Lọc', label: 'Nhớt - Lọc', icon: '🛢️' },
  { value: 'Lốp - Vỏ xe', label: 'Lốp - Vỏ xe', icon: '🛞' },
  { value: 'Phụ kiện - Pô xe', label: 'Phụ kiện - Pô xe', icon: '🏍️' },
];

const POPULAR_MODELS: { label: string; value: string }[] = [
  { label: 'Exciter 150 / 155', value: 'Exciter' },
  { label: 'Winner / Winner X', value: 'Winner' },
  { label: 'SH 125i / 150i / Mode', value: 'SH' },
  { label: 'Vario / Click', value: 'Vario' },
  { label: 'Air Blade', value: 'Air Blade' },
  { label: 'Wave Alpha / RSX / Future', value: 'Wave' },
  { label: 'Vision / Lead', value: 'Vision' },
  { label: 'Sirius / Jupiter', value: 'Sirius' },
  { label: 'Raider / Satria', value: 'Raider' },
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
  { label: 'Tất cả mức giá', min: undefined, max: undefined },
  { label: 'Dưới 200.000đ', min: undefined, max: 200000 },
  { label: '200.000đ – 500.000đ', min: 200000, max: 500000 },
  { label: '500.000đ – 2.000.000đ', min: 500000, max: 2000000 },
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

function parseCsvParam(raw: string | null): string[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

interface ProductsCatalogProps {
  initialProducts: Product[];
}

export function ProductsCatalog({ initialProducts }: ProductsCatalogProps) {
  const searchParams = useSearchParams();
  const searchParamsString = searchParams.toString();

  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [isFetchingClient, setIsFetchingClient] = useState<boolean>(initialProducts.length === 0);

  // Mở/đóng giao diện Popup tích chọn lọc sản phẩm khi ấn vào "Lọc sản phẩm"
  const [isFilterModalOpen, setIsFilterModalOpen] = useState<boolean>(false);

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

  // State tích chọn nhiều tiêu chí (Multi-select checkboxes)
  const [selectedCategories, setSelectedCategories] = useState<string[]>(() =>
    parseCsvParam(searchParams.get('category')).map((c) => getCategoryLabel(c)),
  );
  const [selectedBrands, setSelectedBrands] = useState<string[]>(() =>
    parseCsvParam(searchParams.get('brand')),
  );
  const [selectedModels, setSelectedModels] = useState<string[]>(() =>
    parseCsvParam(searchParams.get('compatible_model')),
  );
  const [compatibleBrand, setCompatibleBrand] = useState<string>(
    () => searchParams.get('compatible_brand') ?? '',
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
  const [searchQuery, setSearchQuery] = useState<string>(
    () => searchParams.get('search') ?? '',
  );
  const [sortBy, setSortBy] = useState<string>(
    () => searchParams.get('sort') ?? 'popular',
  );

  // Trạng thái đóng/mở các nhóm lọc trong sidebar
  const [openCatSection, setOpenCatSection] = useState(true);
  const [openVehicleSection, setOpenVehicleSection] = useState(true);
  const [openPriceSection, setOpenPriceSection] = useState(true);
  const [openBrandSection, setOpenBrandSection] = useState(true);
  const [openStockSection, setOpenStockSection] = useState(true);

  // Đóng modal khi nhấn phím Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setIsFilterModalOpen(false);
    }
    if (isFilterModalOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFilterModalOpen]);

  // Đồng bộ từ URL khi người dùng chọn Danh mục hoặc Tìm kiếm từ thanh Header / Footer / VehicleSelector
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
    setSelectedCategories(parseCsvParam(params.get('category')).map((c) => getCategoryLabel(c)));
    setSelectedBrands(parseCsvParam(params.get('brand')));
    setSelectedModels(parseCsvParam(params.get('compatible_model')));
    setCompatibleBrand(params.get('compatible_brand') ?? '');
    const minP = params.get('min_price') ? Number(params.get('min_price')) : undefined;
    const maxP = params.get('max_price') ? Number(params.get('max_price')) : undefined;
    setMinPrice(minP);
    setMaxPrice(maxP);
    setCustomMinInput(minP !== undefined ? String(minP) : '');
    setCustomMaxInput(maxP !== undefined ? String(maxP) : '');
    setInStockOnly(params.get('in_stock') === 'true');
    setSearchQuery(params.get('search') ?? '');
    setSortBy(params.get('sort') ?? 'popular');
  }, [searchParamsString]);

  // Đồng bộ ngược lại lên thanh địa chỉ URL
  function syncUrl(next: {
    categories?: string[];
    brands?: string[];
    models?: string[];
    compatible_brand?: string;
    min_price?: number;
    max_price?: number;
    in_stock?: boolean;
    search?: string;
    sort?: string;
  }) {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams();
    const cats = next.categories !== undefined ? next.categories : selectedCategories;
    const brs = next.brands !== undefined ? next.brands : selectedBrands;
    const mdls = next.models !== undefined ? next.models : selectedModels;
    const cBrand = next.compatible_brand !== undefined ? next.compatible_brand : compatibleBrand;
    const minP = 'min_price' in next ? next.min_price : minPrice;
    const maxP = 'max_price' in next ? next.max_price : maxPrice;
    const stock = next.in_stock !== undefined ? next.in_stock : inStockOnly;
    const q = next.search !== undefined ? next.search : searchQuery;
    const s = next.sort !== undefined ? next.sort : sortBy;

    if (cats.length > 0) params.set('category', cats.join(','));
    if (brs.length > 0) params.set('brand', brs.join(','));
    if (mdls.length > 0) params.set('compatible_model', mdls.join(','));
    if (cBrand) params.set('compatible_brand', cBrand);
    if (minP !== undefined) params.set('min_price', String(minP));
    if (maxP !== undefined) params.set('max_price', String(maxP));
    if (stock) params.set('in_stock', 'true');
    if (q) params.set('search', q);
    if (s && s !== 'popular') params.set('sort', s);

    const qs = params.toString();
    isInternalUpdateRef.current = true;
    lastExternalQueryRef.current = qs;
    const newUrl = `/products${qs ? `?${qs}` : ''}`;
    window.history.replaceState(window.history.state, '', newUrl);
  }

  // Danh sách các thương hiệu phụ tùng hiện có kèm số lượng
  const availableBrands = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of products) {
      const b = p.brand?.trim();
      if (b) {
        counts[b] = (counts[b] ?? 0) + 1;
      }
    }
    return Object.entries(counts)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([name, count]) => ({ name, count }));
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

  // Đếm số lượng sản phẩm theo từng dòng xe phổ biến
  const modelCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const m of POPULAR_MODELS) {
      const cm = m.value.toLowerCase();
      counts[m.value] = products.filter(
        (item) =>
          item.compatible_models?.some((mod) => mod.toLowerCase().includes(cm)) ||
          item.compatible_vehicles.some((v) => v.model.toLowerCase().includes(cm)) ||
          item.name.toLowerCase().includes(cm) ||
          item.description.toLowerCase().includes(cm),
      ).length;
    }
    return counts;
  }, [products]);

  // Lọc và sắp xếp sản phẩm tức thì theo các ô đã tích chọn
  const filteredProducts = useMemo(() => {
    let list = [...products];

    // 1. Lọc theo danh sách Danh mục đã tích chọn
    if (selectedCategories.length > 0) {
      list = list.filter((item) =>
        selectedCategories.some((cat) => matchesCategory(item.category, cat)),
      );
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

    // 3. Lọc theo danh sách Thương hiệu đã tích chọn
    if (selectedBrands.length > 0) {
      const lowerBrands = selectedBrands.map((b) => b.toLowerCase());
      list = list.filter((item) => lowerBrands.includes(item.brand.toLowerCase()));
    }

    // 4. Lọc theo hãng xe & danh sách Dòng xe đã tích chọn
    if (compatibleBrand) {
      const cb = compatibleBrand.toLowerCase();
      list = list.filter(
        (item) =>
          item.compatible_models?.some((m) => m.toLowerCase().includes(cb)) ||
          item.compatible_vehicles.some((v) => v.brand.toLowerCase().includes(cb)) ||
          item.description.toLowerCase().includes(cb),
      );
    }

    if (selectedModels.length > 0) {
      const lowerModels = selectedModels.map((m) => m.toLowerCase());
      list = list.filter((item) =>
        lowerModels.some(
          (cm) =>
            item.compatible_models?.some((m) => m.toLowerCase().includes(cm)) ||
            item.compatible_vehicles.some((v) => v.model.toLowerCase().includes(cm)) ||
            item.name.toLowerCase().includes(cm) ||
            item.description.toLowerCase().includes(cm),
        ),
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
    selectedCategories,
    searchQuery,
    selectedBrands,
    compatibleBrand,
    selectedModels,
    minPrice,
    maxPrice,
    inStockOnly,
    sortBy,
  ]);

  // ── Các hàm xử lý tích chọn (Toggle Checkboxes) ─────────────────────────────

  function handleToggleCategory(cat: string) {
    if (!cat) {
      setSelectedCategories([]);
      syncUrl({ categories: [] });
      return;
    }
    const next = selectedCategories.includes(cat)
      ? selectedCategories.filter((c) => c !== cat)
      : [...selectedCategories, cat];
    setSelectedCategories(next);
    syncUrl({ categories: next });
  }

  function handleToggleBrand(brand: string) {
    const next = selectedBrands.includes(brand)
      ? selectedBrands.filter((b) => b !== brand)
      : [...selectedBrands, brand];
    setSelectedBrands(next);
    syncUrl({ brands: next });
  }

  function handleToggleModel(model: string) {
    if (!model) {
      setSelectedModels([]);
      syncUrl({ models: [] });
      return;
    }
    const next = selectedModels.includes(model)
      ? selectedModels.filter((m) => m !== model)
      : [...selectedModels, model];
    setSelectedModels(next);
    syncUrl({ models: next });
  }

  function handleSelectPriceRange(min?: number, max?: number) {
    setMinPrice(min);
    setMaxPrice(max);
    setCustomMinInput(min !== undefined ? String(min) : '');
    setCustomMaxInput(max !== undefined ? String(max) : '');
    syncUrl({ min_price: min, max_price: max });
  }

  function handleApplyCustomPrice() {
    const parsedMin = customMinInput.trim() ? Number(customMinInput.replace(/\D/g, '')) : undefined;
    const parsedMax = customMaxInput.trim() ? Number(customMaxInput.replace(/\D/g, '')) : undefined;
    const finalMin = parsedMin && !Number.isNaN(parsedMin) ? parsedMin : undefined;
    const finalMax = parsedMax && !Number.isNaN(parsedMax) ? parsedMax : undefined;
    setMinPrice(finalMin);
    setMaxPrice(finalMax);
    syncUrl({ min_price: finalMin, max_price: finalMax });
  }

  function handleToggleInStock(checked: boolean) {
    setInStockOnly(checked);
    syncUrl({ in_stock: checked });
  }

  function handleChangeSort(val: string) {
    setSortBy(val);
    syncUrl({ sort: val });
  }

  function handleClearAllFilters() {
    setSelectedCategories([]);
    setSelectedBrands([]);
    setSelectedModels([]);
    setCompatibleBrand('');
    setMinPrice(undefined);
    setMaxPrice(undefined);
    setCustomMinInput('');
    setCustomMaxInput('');
    setInStockOnly(false);
    setSearchQuery('');
    setSortBy('popular');
    isInternalUpdateRef.current = true;
    lastExternalQueryRef.current = '';
    if (typeof window !== 'undefined') {
      window.history.replaceState(window.history.state, '', '/products');
    }
  }

  const activeFilterCount =
    selectedCategories.length +
    selectedBrands.length +
    selectedModels.length +
    (compatibleBrand ? 1 : 0) +
    (minPrice !== undefined || maxPrice !== undefined ? 1 : 0) +
    (inStockOnly ? 1 : 0) +
    (searchQuery.trim() ? 1 : 0);

  const hasActiveFilters = activeFilterCount > 0;

  const pageTitle = searchQuery.trim()
    ? `Kết quả tìm kiếm cho "${searchQuery.trim()}"`
    : selectedCategories.length === 1
      ? getCategoryLabel(selectedCategories[0])
      : selectedCategories.length > 1
        ? `Đang lọc ${selectedCategories.length} danh mục`
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
        {/* ── Sidebar: Lọc sản phẩm (tích chọn trực tiếp hoặc bấm mở bảng tích chọn lớn) ── */}
        <aside className="lg:w-72 flex-shrink-0">
          <div className="lg:sticky lg:top-20 bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
            {/* Nút Phễu Lọc sản phẩm — Ấn vào mở ngay Giao diện tích chọn lọc sản phẩm */}
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-gray-100">
              <button
                type="button"
                onClick={() => setIsFilterModalOpen(true)}
                className="flex-1 flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold shadow-md shadow-orange-500/20 transition-all cursor-pointer active:scale-[0.99]"
              >
                <span className="flex items-center gap-2">
                  <svg
                    className="w-4 h-4 text-white flex-shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                    />
                  </svg>
                  <span className="text-sm">Lọc sản phẩm</span>
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold bg-white/20 rounded-lg">
                  {activeFilterCount > 0 ? `Đã chọn ${activeFilterCount}` : 'Mở bảng chọn'}
                </span>
              </button>

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleClearAllFilters}
                  title="Bỏ tích chọn tất cả"
                  className="px-2.5 py-2.5 text-xs text-orange-600 hover:text-orange-700 bg-orange-50 hover:bg-orange-100 rounded-xl font-semibold transition-colors cursor-pointer flex-shrink-0"
                >
                  Đặt lại
                </button>
              )}
            </div>

            {/* Danh sách tích chọn nhanh ngay trên Sidebar */}
            <div className="mt-2">
              {/* 1. Tích chọn Danh mục */}
              <div className="pt-2">
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
                    <label
                      className={cn(
                        'flex items-center justify-between px-2.5 py-2 text-sm rounded-lg transition-colors cursor-pointer',
                        selectedCategories.length === 0
                          ? 'bg-orange-50 text-orange-700 font-semibold'
                          : 'text-gray-700 hover:bg-gray-50',
                      )}
                    >
                      <span className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={selectedCategories.length === 0}
                          onChange={() => handleToggleCategory('')}
                          className="w-4 h-4 text-orange-500 border-gray-300 rounded focus:ring-orange-400 cursor-pointer accent-orange-500"
                        />
                        <span>Tất cả danh mục</span>
                      </span>
                      <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                        {products.length}
                      </span>
                    </label>

                    {CATEGORIES.map((cat) => {
                      const isChecked = selectedCategories.includes(cat.value);
                      return (
                        <label
                          key={cat.value}
                          className={cn(
                            'flex items-center justify-between px-2.5 py-2 text-sm rounded-lg transition-colors cursor-pointer',
                            isChecked
                              ? 'bg-orange-50 text-orange-700 font-semibold'
                              : 'text-gray-700 hover:bg-gray-50',
                          )}
                        >
                          <span className="flex items-center gap-2.5">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleToggleCategory(cat.value)}
                              className="w-4 h-4 text-orange-500 border-gray-300 rounded focus:ring-orange-400 cursor-pointer accent-orange-500"
                            />
                            <span>{cat.label}</span>
                          </span>
                          <span
                            className={cn(
                              'text-xs px-1.5 py-0.5 rounded',
                              isChecked
                                ? 'bg-orange-500 text-white font-bold'
                                : 'text-gray-400 bg-gray-100',
                            )}
                          >
                            {categoryCounts[cat.value] ?? 0}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 2. Tích chọn Dòng xe tương thích */}
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
                  <div className="space-y-1 max-h-52 overflow-y-auto pr-1">
                    {POPULAR_MODELS.map((m) => {
                      const isChecked = selectedModels.includes(m.value);
                      return (
                        <label
                          key={m.value}
                          className={cn(
                            'flex items-center justify-between px-2.5 py-1.5 text-sm rounded-lg transition-colors cursor-pointer',
                            isChecked
                              ? 'bg-orange-50 text-orange-700 font-semibold'
                              : 'text-gray-700 hover:bg-gray-50',
                          )}
                        >
                          <span className="flex items-center gap-2.5">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleToggleModel(m.value)}
                              className="w-4 h-4 text-orange-500 border-gray-300 rounded focus:ring-orange-400 cursor-pointer accent-orange-500"
                            />
                            <span className="text-xs sm:text-sm">{m.label}</span>
                          </span>
                          <span className="text-xs text-gray-400">
                            {modelCounts[m.value] ?? 0}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 3. Tích chọn Khoảng giá */}
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
                      const isChecked = minPrice === range.min && maxPrice === range.max;
                      return (
                        <label
                          key={range.label}
                          className={cn(
                            'flex items-center gap-2.5 px-2.5 py-2 text-sm rounded-lg transition-colors cursor-pointer',
                            isChecked
                              ? 'bg-orange-50 text-orange-700 font-semibold'
                              : 'text-gray-700 hover:bg-gray-50',
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() =>
                              isChecked
                                ? handleSelectPriceRange(undefined, undefined)
                                : handleSelectPriceRange(range.min, range.max)
                            }
                            className="w-4 h-4 text-orange-500 border-gray-300 rounded focus:ring-orange-400 cursor-pointer accent-orange-500"
                          />
                          <span>{range.label}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 4. Tích chọn Thương hiệu */}
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
                  <div className="grid grid-cols-2 gap-1.5 max-h-52 overflow-y-auto pr-1">
                    {availableBrands.map((b) => {
                      const isChecked = selectedBrands.includes(b.name);
                      return (
                        <label
                          key={b.name}
                          className={cn(
                            'flex items-center gap-2 px-2 py-1.5 text-xs rounded-lg border transition-all cursor-pointer',
                            isChecked
                              ? 'bg-orange-50 text-orange-700 border-orange-300 font-semibold'
                              : 'bg-gray-50/70 text-gray-700 border-gray-200 hover:border-orange-300',
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleBrand(b.name)}
                            className="w-3.5 h-3.5 text-orange-500 border-gray-300 rounded focus:ring-orange-400 cursor-pointer accent-orange-500"
                          />
                          <span className="truncate">{b.name}</span>
                        </label>
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
                  <label className="flex items-center gap-2.5 px-2.5 py-2 cursor-pointer hover:bg-gray-50 rounded-lg transition-colors">
                    <input
                      type="checkbox"
                      checked={inStockOnly}
                      onChange={(e) => handleToggleInStock(e.target.checked)}
                      className="w-4 h-4 text-orange-500 border-gray-300 rounded focus:ring-orange-400 cursor-pointer accent-orange-500"
                    />
                    <span className="text-sm text-gray-700">Chỉ hiện sản phẩm còn hàng</span>
                  </label>
                )}
              </div>
            </div>
          </div>
        </aside>

        {/* ── Products Grid ────────────────────────────────────────────────── */}
        <div className="flex-1 min-w-0">
          {/* Header row */}
          <div className="flex flex-wrap items-center justify-between mb-5 gap-3">
            <div>
              <h1 className="text-xl font-bold text-gray-900">{pageTitle}</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                {filteredProducts.length > 0
                  ? `Hiển thị ${filteredProducts.length} / ${products.length} sản phẩm`
                  : 'Không tìm thấy sản phẩm nào'}
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              {/* Nút mở nhanh Bảng tích chọn lọc sản phẩm */}
              <button
                type="button"
                onClick={() => setIsFilterModalOpen(true)}
                className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-semibold rounded-xl border border-orange-200 bg-orange-50 text-orange-600 hover:bg-orange-500 hover:text-white transition-all cursor-pointer shadow-xs"
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
                <span>Bộ lọc tích chọn</span>
                {activeFilterCount > 0 && (
                  <span className="px-1.5 py-0.2 bg-orange-500 text-white text-xs rounded-full font-bold">
                    {activeFilterCount}
                  </span>
                )}
              </button>

              {/* Sort dropdown */}
              <select
                value={sortBy}
                onChange={(e) => handleChangeSort(e.target.value)}
                aria-label="Sắp xếp sản phẩm"
                className="text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 text-gray-700 cursor-pointer"
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Active filter badges */}
          {hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-2 mb-5 p-3 bg-orange-50/60 border border-orange-100 rounded-xl">
              <span className="text-xs font-semibold text-orange-800 mr-1">Đang tích chọn:</span>
              {selectedCategories.map((cat) => (
                <span
                  key={cat}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-white text-orange-700 border border-orange-200 shadow-xs"
                >
                  Danh mục: {cat}
                  <button
                    type="button"
                    onClick={() => handleToggleCategory(cat)}
                    className="hover:text-orange-900 font-bold cursor-pointer"
                  >
                    ✕
                  </button>
                </span>
              ))}
              {selectedBrands.map((brand) => (
                <span
                  key={brand}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-white text-orange-700 border border-orange-200 shadow-xs"
                >
                  Hãng: {brand}
                  <button
                    type="button"
                    onClick={() => handleToggleBrand(brand)}
                    className="hover:text-orange-900 font-bold cursor-pointer"
                  >
                    ✕
                  </button>
                </span>
              ))}
              {selectedModels.map((model) => (
                <span
                  key={model}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-white text-orange-700 border border-orange-200 shadow-xs"
                >
                  🏍️ Xe: {model}
                  <button
                    type="button"
                    onClick={() => handleToggleModel(model)}
                    className="hover:text-orange-900 font-bold cursor-pointer"
                  >
                    ✕
                  </button>
                </span>
              ))}
              {compatibleBrand && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-white text-orange-700 border border-orange-200 shadow-xs">
                  Hãng xe: {compatibleBrand}
                  <button
                    type="button"
                    onClick={() => {
                      setCompatibleBrand('');
                      syncUrl({ compatible_brand: '' });
                    }}
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
                Bỏ chọn tất cả
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
                Thử bỏ bớt các ô tích chọn hoặc nhấn nút bên dưới để xem toàn bộ sản phẩm
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

      {/* ── MODAL POPUP: Giao diện tích chọn lọc sản phẩm khi ấn vào "Lọc sản phẩm" ── */}
      {isFilterModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-3 sm:p-6 animate-in fade-in duration-150"
          onClick={() => setIsFilterModalOpen(false)}
        >
          <div
            className="bg-white w-full max-w-3xl max-h-[90vh] rounded-2xl shadow-2xl border border-gray-100 flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-orange-50/80 to-white">
              <div className="flex items-center gap-3">
                <span className="w-9 h-9 rounded-xl bg-orange-500 text-white flex items-center justify-center shadow-sm shadow-orange-500/30">
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                    />
                  </svg>
                </span>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-gray-900">
                    Tích Chọn Lọc Sản Phẩm
                  </h2>
                  <p className="text-xs text-gray-500">
                    Tích chọn một hoặc nhiều tiêu chí bên dưới để lọc chính xác phụ tùng bạn cần
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsFilterModalOpen(false)}
                className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center transition-colors cursor-pointer"
                aria-label="Đóng bảng lọc"
              >
                ✕
              </button>
            </div>

            {/* Modal Body — Các nhóm tích chọn */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {/* 1. Tích chọn Danh mục phụ tùng */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                    <span className="w-2 h-4 bg-orange-500 rounded-full" />
                    1. Chọn Danh Mục Phụ Tùng (có thể tích nhiều)
                  </h3>
                  {selectedCategories.length > 0 && (
                    <button
                      type="button"
                      onClick={() => handleToggleCategory('')}
                      className="text-xs text-orange-600 hover:underline font-medium cursor-pointer"
                    >
                      Bỏ chọn danh mục ({selectedCategories.length})
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {CATEGORIES.map((cat) => {
                    const isChecked = selectedCategories.includes(cat.value);
                    return (
                      <label
                        key={cat.value}
                        className={cn(
                          'flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all cursor-pointer select-none',
                          isChecked
                            ? 'bg-orange-50 border-orange-500 text-orange-800 font-semibold shadow-xs ring-1 ring-orange-500/30'
                            : 'bg-gray-50/60 border-gray-200 text-gray-700 hover:bg-white hover:border-orange-300',
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleCategory(cat.value)}
                          className="w-4 h-4 text-orange-500 border-gray-300 rounded focus:ring-orange-400 cursor-pointer accent-orange-500 flex-shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs sm:text-sm truncate">
                            {cat.icon} {cat.label}
                          </p>
                          <p className="text-[11px] text-gray-400">
                            {categoryCounts[cat.value] ?? 0} sản phẩm
                          </p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* 2. Tích chọn Dòng xe tương thích */}
              <div className="border-t border-gray-100 pt-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                    <span className="w-2 h-4 bg-orange-500 rounded-full" />
                    2. Chọn Dòng Xe Tương Thích (có thể tích nhiều)
                  </h3>
                  {selectedModels.length > 0 && (
                    <button
                      type="button"
                      onClick={() => handleToggleModel('')}
                      className="text-xs text-orange-600 hover:underline font-medium cursor-pointer"
                    >
                      Bỏ chọn dòng xe ({selectedModels.length})
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {POPULAR_MODELS.map((m) => {
                    const isChecked = selectedModels.includes(m.value);
                    return (
                      <label
                        key={m.value}
                        className={cn(
                          'flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border text-left transition-all cursor-pointer select-none',
                          isChecked
                            ? 'bg-orange-50 border-orange-500 text-orange-800 font-semibold shadow-xs ring-1 ring-orange-500/30'
                            : 'bg-gray-50/60 border-gray-200 text-gray-700 hover:bg-white hover:border-orange-300',
                        )}
                      >
                        <span className="flex items-center gap-2 min-w-0">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleModel(m.value)}
                            className="w-4 h-4 text-orange-500 border-gray-300 rounded focus:ring-orange-400 cursor-pointer accent-orange-500 flex-shrink-0"
                          />
                          <span className="text-xs sm:text-sm truncate">🏍️ {m.label}</span>
                        </span>
                        <span className="text-[11px] text-gray-400 flex-shrink-0">
                          ({modelCounts[m.value] ?? 0})
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* 3. Tích chọn Thương hiệu */}
              <div className="border-t border-gray-100 pt-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                    <span className="w-2 h-4 bg-orange-500 rounded-full" />
                    3. Chọn Thương Hiệu Phụ Tùng (có thể tích nhiều)
                  </h3>
                  {selectedBrands.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedBrands([]);
                        syncUrl({ brands: [] });
                      }}
                      className="text-xs text-orange-600 hover:underline font-medium cursor-pointer"
                    >
                      Bỏ chọn thương hiệu ({selectedBrands.length})
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2">
                  {availableBrands.map((b) => {
                    const isChecked = selectedBrands.includes(b.name);
                    return (
                      <label
                        key={b.name}
                        className={cn(
                          'flex items-center justify-between gap-1.5 px-3 py-2 rounded-xl border text-xs transition-all cursor-pointer select-none',
                          isChecked
                            ? 'bg-orange-50 border-orange-500 text-orange-800 font-semibold shadow-xs'
                            : 'bg-gray-50/60 border-gray-200 text-gray-700 hover:bg-white hover:border-orange-300',
                        )}
                      >
                        <span className="flex items-center gap-2 truncate">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleBrand(b.name)}
                            className="w-3.5 h-3.5 text-orange-500 border-gray-300 rounded focus:ring-orange-400 cursor-pointer accent-orange-500 flex-shrink-0"
                          />
                          <span className="truncate">{b.name}</span>
                        </span>
                        <span className="text-[10px] text-gray-400">({b.count})</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* 4. Khoảng giá & Tình trạng kho */}
              <div className="border-t border-gray-100 pt-5 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2 mb-3">
                    <span className="w-2 h-4 bg-orange-500 rounded-full" />
                    4. Chọn Mức Giá
                  </h3>
                  <div className="space-y-1.5">
                    {PRICE_RANGES.map((range) => {
                      const isChecked = minPrice === range.min && maxPrice === range.max;
                      return (
                        <label
                          key={range.label}
                          className={cn(
                            'flex items-center gap-2.5 px-3 py-2 rounded-xl border text-xs sm:text-sm transition-all cursor-pointer select-none',
                            isChecked
                              ? 'bg-orange-50 border-orange-500 text-orange-800 font-semibold'
                              : 'bg-gray-50/60 border-gray-200 text-gray-700 hover:bg-white hover:border-orange-300',
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() =>
                              isChecked
                                ? handleSelectPriceRange(undefined, undefined)
                                : handleSelectPriceRange(range.min, range.max)
                            }
                            className="w-4 h-4 text-orange-500 border-gray-300 rounded focus:ring-orange-400 cursor-pointer accent-orange-500"
                          />
                          <span>{range.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-5">
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2 mb-3">
                      <span className="w-2 h-4 bg-orange-500 rounded-full" />
                      5. Nhập Khoảng Giá Tùy Chọn (VNĐ)
                    </h3>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={customMinInput}
                        onChange={(e) => setCustomMinInput(e.target.value)}
                        onBlur={handleApplyCustomPrice}
                        placeholder="Giá từ (vd: 100000)"
                        className="w-1/2 px-3 py-2 text-xs sm:text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-400 text-gray-800"
                      />
                      <span className="text-gray-400">—</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={customMaxInput}
                        onChange={(e) => setCustomMaxInput(e.target.value)}
                        onBlur={handleApplyCustomPrice}
                        placeholder="Đến (vd: 1000000)"
                        className="w-1/2 px-3 py-2 text-xs sm:text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-400 text-gray-800"
                      />
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2 mb-3">
                      <span className="w-2 h-4 bg-orange-500 rounded-full" />
                      6. Tình Trạng & Sắp Xếp
                    </h3>
                    <label
                      className={cn(
                        'flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-xs sm:text-sm transition-all cursor-pointer select-none mb-2.5',
                        inStockOnly
                          ? 'bg-orange-50 border-orange-500 text-orange-800 font-semibold'
                          : 'bg-gray-50/60 border-gray-200 text-gray-700 hover:bg-white hover:border-orange-300',
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={inStockOnly}
                        onChange={(e) => handleToggleInStock(e.target.checked)}
                        className="w-4 h-4 text-orange-500 border-gray-300 rounded focus:ring-orange-400 cursor-pointer accent-orange-500"
                      />
                      <span>Chỉ hiển thị phụ tùng đang còn hàng</span>
                    </label>

                    <select
                      value={sortBy}
                      onChange={(e) => handleChangeSort(e.target.value)}
                      aria-label="Sắp xếp theo"
                      className="w-full px-3 py-2.5 text-xs sm:text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-400 text-gray-700 font-medium cursor-pointer"
                    >
                      {SORT_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          Sắp xếp: {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between gap-3 px-5 py-4 border-t border-gray-100 bg-gray-50">
              <button
                type="button"
                onClick={handleClearAllFilters}
                className="px-4 py-2.5 text-xs sm:text-sm font-semibold text-gray-700 bg-white hover:bg-gray-100 border border-gray-200 rounded-xl transition-colors cursor-pointer"
              >
                Bỏ tích chọn tất cả
              </button>

              <button
                type="button"
                onClick={() => {
                  handleApplyCustomPrice();
                  setIsFilterModalOpen(false);
                }}
                className="flex items-center gap-2 px-6 py-2.5 text-xs sm:text-sm font-bold text-white bg-orange-500 hover:bg-orange-600 rounded-xl shadow-lg shadow-orange-500/25 transition-all cursor-pointer"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span>Xem {filteredProducts.length} sản phẩm phù hợp</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
