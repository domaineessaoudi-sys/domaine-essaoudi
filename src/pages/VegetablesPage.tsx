import React, { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { ProductCard } from '../components/ProductCard';

export function VegetablesPage() {
  const { t, products, productsLoading } = useApp();
  const [filter, setFilter] = useState<string>('all');

  const vegetableProducts = useMemo(
    () => products.filter((p) => p.category === 'vegetables'),
    [products]
  );

  const filtered = useMemo(() => {
    if (filter === 'all') return vegetableProducts;
    return vegetableProducts.filter((p) => p.subcategory === filter);
  }, [vegetableProducts, filter]);

  const filters = [
    { key: 'all', label: t.vegetables.all },
    { key: 'tomatoes', label: t.vegetables.tomatoes },
    { key: 'potatoes', label: t.vegetables.potatoes },
    { key: 'onions', label: t.vegetables.onions },
    { key: 'carrots', label: t.vegetables.carrots },
    { key: 'peppers', label: t.vegetables.peppers },
    { key: 'seasonal', label: t.vegetables.seasonal },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16 space-y-10">
      <div className="max-w-3xl space-y-3">
        <span className="inline-flex items-center px-3 py-1 rounded-full bg-[#EDF5EF] border border-[#CFE0D4] text-xs font-bold text-[#1B6B3A]">
          {t.home.heroOrigin}
        </span>
        <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-[#0F2418]">
          {t.vegetables.title}
        </h1>
        <p className="text-base text-[#4A5D52] leading-relaxed">{t.vegetables.subtitle}</p>
      </div>

      {/* Category Filter Buttons */}
      <div
        role="group"
        aria-label="Vegetable categories"
        className="flex flex-wrap items-center gap-2 p-2 bg-white rounded-2xl border border-[#DCE8DF] w-fit shadow-2xs"
      >
        {filters.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setFilter(item.key)}
            className={`px-4 py-2 text-xs sm:text-sm font-semibold rounded-full transition-colors whitespace-nowrap shrink-0 ${
              filter === item.key
                ? 'bg-[#0E3B22] text-white'
                : 'bg-[#F3F8F4] text-[#4A5D52] hover:bg-[#E5F0E8] hover:text-[#0F2418]'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {productsLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-96 rounded-2xl bg-[#EBF3ED] animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#DCE8DF] p-12 text-center text-sm text-[#516358]">
          {t.vegetables.empty}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
