// frontend/src/features/catalogue/components/CategorySlider.tsx
import React from 'react';
import { Category } from '../types';

interface CategorySliderProps {
  categories: Category[];
  selectedCategory?: string;
  onSelectCategory: (slug?: string) => void;
}

export const CategorySlider: React.FC<CategorySliderProps> = ({
  categories,
  selectedCategory,
  onSelectCategory,
}) => {
  return (
    <div className="w-full overflow-x-auto no-scrollbar py-2">
      <div className="flex items-center gap-2.5 min-w-max px-1">
        {/* All categories option */}
        <button
          onClick={() => onSelectCategory(undefined)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition duration-200 border shadow-xs ${
            !selectedCategory
              ? 'bg-emerald-600 text-white border-emerald-600 shadow-emerald-500/20'
              : 'bg-white text-gray-700 border-gray-200 hover:border-emerald-300 hover:bg-emerald-50/50'
          }`}
        >
          <span className="text-base">✨</span>
          <span>Tous les paniers</span>
        </button>

        {/* Categories */}
        {categories.map((cat) => {
          const isSelected = selectedCategory === cat.slug;
          return (
            <button
              key={cat.id}
              onClick={() => onSelectCategory(isSelected ? undefined : cat.slug)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition duration-200 border shadow-xs ${
                isSelected
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-emerald-500/20'
                  : 'bg-white text-gray-700 border-gray-200 hover:border-emerald-300 hover:bg-emerald-50/50'
              }`}
            >
              <span className="text-base">{cat.icon || '🛍️'}</span>
              <span>{cat.nameFr}</span>
              <span className="text-[10px] opacity-75 font-normal">({cat.nameAr})</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
