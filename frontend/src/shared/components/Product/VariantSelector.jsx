import { useState, useEffect } from 'react';
import { FiCheck } from 'react-icons/fi';
import { formatPrice } from '../../utils/helpers';

const SIZE_ORDER = {
  'XXS': 1,
  'XS': 2,
  'S': 3,
  'M': 4,
  'L': 5,
  'XL': 6,
  'XXL': 7,
  '2XL': 7,
  'XXXL': 8,
  '3XL': 8,
  '4XL': 9,
  '5XL': 10
};

const sortSizeVariants = (variants) => {
  if (!variants || !Array.isArray(variants)) return [];
  return [...variants].sort((a, b) => {
    const sizeA = (a.size || a).toString().toUpperCase();
    const sizeB = (b.size || b).toString().toUpperCase();

    const orderA = SIZE_ORDER[sizeA] || 99;
    const orderB = SIZE_ORDER[sizeB] || 99;

    if (orderA !== orderB) return orderA - orderB;
    return sizeA.localeCompare(sizeB, undefined, { numeric: true });
  });
};

const VariantSelector = ({ variants, onVariantChange, currentPrice, primaryColorName, primaryColorCode, primaryThumbnail, sizeVariants = [], initialVariant = null }) => {
  const [selectedVariant, setSelectedVariant] = useState(initialVariant);
  const [selectedColorIndex, setSelectedColorIndex] = useState(initialVariant?.colorIndex ?? null);

  useEffect(() => {
    // If initialVariant is provided, use it
    if (initialVariant && Object.keys(initialVariant).length > 0) {
      setSelectedVariant(initialVariant);
      setSelectedColorIndex(initialVariant.colorIndex ?? null);
      return;
    }

    // Initialize with default variant if available
    if (variants?.defaultVariant && Object.keys(variants.defaultVariant).length > 0) {
      setSelectedVariant(variants.defaultVariant);
      setSelectedColorIndex(variants.defaultVariant.colorIndex ?? null);
      return;
    }

    // Auto-select first available size variant (Root Size Variants)
    if (sizeVariants && sizeVariants.length > 0) {
      const firstAvailable = sizeVariants.find(sv => sv.stockQuantity > 0) || sizeVariants[0];
      const originalIndex = sizeVariants.indexOf(firstAvailable);

      setSelectedVariant({
        size: firstAvailable.size,
        sizeIndex: originalIndex,
        isRootSize: true,
        color: null,
        colorIndex: null
      });
      return;
    }

    // Auto-select first available color and its first available size
    if (variants?.colorVariants && variants.colorVariants.length > 0) {
      const firstAvailableColorIndex = variants.colorVariants.findIndex(cv =>
        cv.sizeVariants?.some(sv => sv.stockQuantity > 0)
      );

      const colorIndex = firstAvailableColorIndex !== -1 ? firstAvailableColorIndex : 0;
      const colorVariant = variants.colorVariants[colorIndex];
      setSelectedColorIndex(colorIndex);

      if (colorVariant.sizeVariants && colorVariant.sizeVariants.length > 0) {
        const firstAvailableSize = colorVariant.sizeVariants.find(sv => sv.stockQuantity > 0) || colorVariant.sizeVariants[0];

        setSelectedVariant({
          color: colorVariant.colorName,
          colorIndex,
          size: firstAvailableSize.size,
          sizeIndex: colorVariant.sizeVariants.indexOf(firstAvailableSize),
        });
      } else {
        setSelectedVariant({
          color: colorVariant.colorName,
          colorIndex,
        });
      }
    }
  }, [variants, sizeVariants]);

  useEffect(() => {
    if (selectedVariant && onVariantChange) {
      onVariantChange(selectedVariant);
    }
  }, [selectedVariant, onVariantChange]);

  // Check if new colorVariants structure exists
  const hasColorVariants = variants?.colorVariants && variants.colorVariants.length > 0;
  const hasRootSizeVariants = sizeVariants && sizeVariants.length > 0;

  // Return null only if there are no variants at all
  if (!variants && !hasRootSizeVariants) {
    return null;
  }
  if (variants && !hasColorVariants && !variants.sizes && !variants.colors && !hasRootSizeVariants) {
    return null;
  }

  const handleColorSelect = (colorIndexOrColor) => {
    // New colorVariants structure
    if (typeof colorIndexOrColor === 'number' && variants.colorVariants) {
      const colorIndex = colorIndexOrColor;
      const colorVariant = variants.colorVariants[colorIndex];
      setSelectedColorIndex(colorIndex);

      // Auto-select first available size for the color
      if (colorVariant.sizeVariants && colorVariant.sizeVariants.length > 0) {
        const firstAvailableSize = colorVariant.sizeVariants.find(
          (sv) => sv.stockQuantity > 0
        ) || colorVariant.sizeVariants[0];

        setSelectedVariant({
          color: colorVariant.colorName,
          colorIndex,
          size: firstAvailableSize.size,
          sizeIndex: colorVariant.sizeVariants.indexOf(firstAvailableSize),
        });
      } else {
        setSelectedVariant({
          color: colorVariant.colorName,
          colorIndex,
        });
      }
    } else {
      // Legacy color selection
      setSelectedVariant((prev) => ({
        ...prev,
        color: colorIndexOrColor,
      }));
    }
  };

  const handlePrimaryColorSelect = () => {
    setSelectedColorIndex(null);
    setSelectedVariant({
      color: primaryColorName,
      colorIndex: null,
    });
  };

  const handleSizeSelect = (sizeValueOrVariant) => {
    if (selectedColorIndex !== null) {
      const colorVariant = variants.colorVariants[selectedColorIndex];
      const sizeVariant = typeof sizeValueOrVariant === 'object'
        ? sizeValueOrVariant
        : colorVariant.sizeVariants.find(sv => sv.size === sizeValueOrVariant);

      const originalIndex = colorVariant.sizeVariants.indexOf(sizeVariant);

      setSelectedVariant({
        color: colorVariant.colorName,
        colorIndex: selectedColorIndex,
        size: sizeVariant?.size || sizeValueOrVariant,
        sizeIndex: originalIndex !== -1 ? originalIndex : undefined,
      });
    } else if (sizeVariants && sizeVariants.length > 0) {
      // Root size selection
      const sizeVariant = typeof sizeValueOrVariant === 'object'
        ? sizeValueOrVariant
        : sizeVariants.find(sv => sv.size === sizeValueOrVariant);

      const originalIndex = sizeVariants.indexOf(sizeVariant);

      setSelectedVariant({
        size: sizeVariant?.size || sizeValueOrVariant,
        sizeIndex: originalIndex !== -1 ? originalIndex : undefined,
        isRootSize: true,
        color: null,
        colorIndex: null
      });
    } else {
      // Legacy size selection
      setSelectedVariant((prev) => ({
        ...prev,
        size: typeof sizeValueOrVariant === 'object' ? sizeValueOrVariant.size : sizeValueOrVariant,
      }));
    }
  };

  const getVariantPrice = () => {
    if (!selectedVariant) return currentPrice;

    // New colorVariants structure
    if (selectedColorIndex !== null && selectedVariant.sizeIndex !== undefined) {
      const colorVariant = variants.colorVariants[selectedColorIndex];
      const sizeVariant = colorVariant.sizeVariants[selectedVariant.sizeIndex];
      if (sizeVariant && sizeVariant.price !== null && sizeVariant.price !== undefined) {
        return sizeVariant.price;
      }
    }

    // Root sizeVariants structure
    if (selectedVariant.isRootSize && sizeVariants[selectedVariant.sizeIndex]) {
      const sv = sizeVariants[selectedVariant.sizeIndex];
      if (sv.price !== null && sv.price !== undefined) {
        return sv.price;
      }
    }

    // Legacy structure
    if (variants.prices) {
      if (selectedVariant.size && variants.prices[selectedVariant.size]) {
        return variants.prices[selectedVariant.size];
      }
      if (selectedVariant.color && variants.prices[selectedVariant.color]) {
        return variants.prices[selectedVariant.color];
      }
    }

    return currentPrice;
  };

  const getSelectedSizeVariants = () => {
    let list = [];
    if (selectedColorIndex !== null && variants.colorVariants) {
      list = variants.colorVariants[selectedColorIndex].sizeVariants || [];
    } else if (sizeVariants && sizeVariants.length > 0) {
      list = sizeVariants;
    }
    return sortSizeVariants(list);
  };

  const isSizeAvailable = (sizeVariant) => {
    return sizeVariant.stockQuantity > 0 && sizeVariant.stockStatus !== 'out_of_stock';
  };

  // Legacy support functions
  const isVariantAvailable = (variantType, value) => {
    if (!variants.stock) return true;
    const key = variantType === 'size' ? `size_${value}` : `color_${value}`;
    return variants.stock[key] !== undefined && variants.stock[key] > 0;
  };

  return (
    <div className="space-y-6">
      {/* New Color Variants Structure */}
      {hasColorVariants && (
        <>
          {/* Color Selection */}
          <div>
            <label className="block text-sm font-bold text-gray-800 mb-3">
              Selected Color: <span className="font-normal text-gray-500 ml-1">
                {selectedVariant?.color || 'Select color'}
              </span>
            </label>
            <div className="flex flex-wrap gap-3">
              {primaryColorName && (
                <button
                  onClick={handlePrimaryColorSelect}
                  className={`relative rounded-xl border-2 transition-all duration-300 overflow-hidden ${selectedColorIndex === null && selectedVariant?.color === primaryColorName
                    ? 'border-gray-900 scale-100'
                    : 'border-gray-200 hover:border-gray-300'
                    }`}
                  title={primaryColorName}
                >
                  {primaryThumbnail ? (
                    <div className="w-20 h-24 relative">
                      <img
                        src={primaryThumbnail}
                        alt={primaryColorName}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                      <div
                        className="w-full h-full hidden items-center justify-center text-xs font-semibold text-gray-700"
                        style={
                          primaryColorCode && /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(primaryColorCode)
                            ? { backgroundColor: primaryColorCode }
                            : { backgroundColor: '#f3f4f6' }
                        }
                      >
                        {primaryColorName.charAt(0)}
                      </div>
                    </div>
                  ) : (
                    <div
                      className="w-20 h-24 flex items-center justify-center text-xs font-semibold text-gray-700"
                      style={
                        primaryColorCode && /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(primaryColorCode)
                          ? { backgroundColor: primaryColorCode }
                          : { backgroundColor: '#f3f4f6' }
                      }
                    >
                      {(!primaryColorCode || !/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(primaryColorCode)) && (
                        <span className="text-xs font-semibold text-gray-700">{primaryColorName.charAt(0)}</span>
                      )}
                    </div>
                  )}
                </button>
              )}
              {variants.colorVariants.map((colorVariant, index) => {
                const isSelected = selectedColorIndex === index;
                const hasStock = colorVariant.sizeVariants?.some(sv => sv.stockQuantity > 0);

                return (
                  <button
                    key={index}
                    onClick={() => handleColorSelect(index)}
                    disabled={!hasStock}
                    className={`relative rounded-xl border-2 transition-all duration-300 overflow-hidden ${isSelected
                      ? 'border-gray-900 scale-100'
                      : hasStock
                        ? 'border-gray-200 hover:border-gray-300'
                        : 'border-gray-100 opacity-50 cursor-not-allowed'
                      }`}
                    title={colorVariant.colorName}
                  >
                    {colorVariant.thumbnailImage ? (
                      <div className="w-20 h-24 relative">
                        <img
                          src={colorVariant.thumbnailImage}
                          alt={colorVariant.colorName}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                          }}
                        />
                        <div
                          className="w-full h-full hidden items-center justify-center text-xs font-semibold text-gray-700"
                          style={
                            colorVariant.colorCode && /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(colorVariant.colorCode)
                              ? { backgroundColor: colorVariant.colorCode }
                              : { backgroundColor: '#f3f4f6' }
                          }
                        >
                          {colorVariant.colorName.charAt(0)}
                        </div>
                      </div>
                    ) : (
                      <div
                        className="w-20 h-24 flex items-center justify-center text-xs font-semibold text-gray-700"
                        style={
                          colorVariant.colorCode && /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(colorVariant.colorCode)
                            ? { backgroundColor: colorVariant.colorCode }
                            : { backgroundColor: '#f3f4f6' }
                        }
                      >
                        {colorVariant.colorName.charAt(0)}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Size Selection (Dynamic based on selected color) */}
          {selectedColorIndex !== null && getSelectedSizeVariants().length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-bold text-gray-800">
                  Select Size
                </label>
                <button className="text-blue-600 text-xs font-bold hover:underline">
                  Size Chart
                </button>
              </div>
              <div className="flex flex-wrap gap-3">
                {getSelectedSizeVariants().map((sizeVariant, index) => {
                  const isSelected = selectedVariant?.size === sizeVariant.size;
                  const isAvailable = isSizeAvailable(sizeVariant);

                  return (
                    <button
                      key={index}
                      onClick={() => handleSizeSelect(sizeVariant)}
                      disabled={!isAvailable}
                      className={`relative px-5 py-3 min-w-[3.5rem] rounded-xl font-bold border-2 transition-all duration-300 ${isSelected
                        ? 'border-gray-900 bg-white text-gray-900'
                        : isAvailable
                          ? 'border-gray-200 bg-white text-gray-700'
                          : 'border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed'
                        }`}
                      title={`Stock: ${sizeVariant.stockQuantity}`}
                    >
                      {sizeVariant.size}
                      {sizeVariant.stockQuantity <= 10 && sizeVariant.stockQuantity > 0 && (
                        <span className="absolute -top-1 -left-1 text-xs bg-yellow-500 text-white px-1 rounded">
                          Low
                        </span>
                      )}
                      {isSelected && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-gray-900 rounded-full flex items-center justify-center opacity-0">
                          <FiCheck className="text-white text-[8px]" />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* Root Size Variants (When no color selected or no color variants exist) */}
      {selectedColorIndex === null && sizeVariants && sizeVariants.length > 0 && (
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            Size: <span className="font-normal text-gray-600">
              {selectedVariant?.size || 'Select size'}
            </span>
          </label>
          <div className="flex flex-wrap gap-3">
            {sortSizeVariants(sizeVariants).map((sv, index) => {
              const isSelected = selectedVariant?.isRootSize && selectedVariant?.size === sv.size;
              const isAvailable = isSizeAvailable(sv);

              return (
                <button
                  key={index}
                  onClick={() => handleSizeSelect(sv)}
                  disabled={!isAvailable}
                  className={`relative px-6 py-3 rounded-xl font-semibold border-2 transition-all duration-300 ${isSelected
                    ? 'border-primary-600 bg-primary-50 text-primary-700'
                    : isAvailable
                      ? 'border-gray-200 hover:border-primary-400 bg-white text-gray-700'
                      : 'border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed opacity-50'
                    }`}
                  title={`Stock: ${sv.stockQuantity}`}
                >
                  {sv.size}
                  {sv.stockQuantity <= 10 && sv.stockQuantity > 0 && (
                    <span className="absolute -top-1 -left-1 text-xs bg-yellow-500 text-white px-1 rounded">
                      Low
                    </span>
                  )}
                  {isSelected && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary-600 rounded-full flex items-center justify-center">
                      <FiCheck className="text-white text-xs" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Legacy Size Variants */}
      {!hasColorVariants && variants.sizes && variants.sizes.length > 0 && (
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            Size: <span className="font-normal text-gray-600">{selectedVariant?.size || 'Select size'}</span>
          </label>
          <div className="flex flex-wrap gap-3">
            {sortSizeVariants(variants.sizes).map((size, index) => {
              const isSelected = selectedVariant?.size === size;
              const isAvailable = isVariantAvailable('size', size);

              return (
                <button
                  key={size}
                  onClick={() => handleSizeSelect(size)}
                  disabled={!isAvailable}
                  className={`relative px-6 py-3 rounded-xl font-semibold border-2 transition-all duration-300 ${isSelected
                    ? 'border-primary-600 bg-primary-50 text-primary-700'
                    : isAvailable
                      ? 'border-gray-200 hover:border-primary-400 bg-white text-gray-700'
                      : 'border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed opacity-50'
                    }`}
                >
                  {size}
                  {isSelected && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary-600 rounded-full flex items-center justify-center">
                      <FiCheck className="text-white text-xs" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Legacy Color Variants */}
      {!hasColorVariants && variants.colors && variants.colors.length > 0 && (
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            Color: <span className="font-normal text-gray-600">{selectedVariant?.color || 'Select color'}</span>
          </label>
          <div className="flex flex-wrap gap-3">
            {variants.colors.map((color) => {
              const isSelected = selectedVariant?.color === color;
              const isAvailable = isVariantAvailable('color', color);

              // Check if color is a hex code or color name
              const isHexColor = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);

              return (
                <button
                  key={color}
                  onClick={() => handleColorSelect(color)}
                  disabled={!isAvailable}
                  className={`relative w-12 h-12 rounded-full border-2 transition-all duration-300 ${isSelected
                    ? 'border-primary-600 scale-110 shadow-lg'
                    : isAvailable
                      ? 'border-gray-300 hover:border-primary-400 hover:scale-105'
                      : 'border-gray-200 opacity-50 cursor-not-allowed'
                    }`}
                  style={
                    isHexColor
                      ? {
                        backgroundColor: color,
                      }
                      : {}
                  }
                  title={color}
                >
                  {!isHexColor && (
                    <span className="text-xs font-semibold text-gray-700">{color.charAt(0)}</span>
                  )}
                  {isSelected && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary-600 rounded-full flex items-center justify-center">
                      <FiCheck className="text-white text-xs" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
};

export default VariantSelector;
