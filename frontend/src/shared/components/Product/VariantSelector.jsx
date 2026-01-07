import { useState, useEffect } from 'react';
import { FiCheck } from 'react-icons/fi';
import { formatPrice } from '../../utils/helpers';

const VariantSelector = ({ variants, onVariantChange, currentPrice, primaryColorName, primaryColorCode }) => {
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [selectedColorIndex, setSelectedColorIndex] = useState(null);

  useEffect(() => {
    // Initialize with default variant if available
    if (variants) {
      // Prioritize explicit defaultVariant
      if (variants.defaultVariant) {
        setSelectedVariant(variants.defaultVariant);
      }
      // Do NOT auto-select first variant to allow main product details to be shown
    }
  }, [variants]);

  useEffect(() => {
    if (selectedVariant && onVariantChange) {
      onVariantChange(selectedVariant);
    }
  }, [selectedVariant, onVariantChange]);

  // Check if new colorVariants structure exists
  const hasColorVariants = variants?.colorVariants && variants.colorVariants.length > 0;

  if (!variants || (!hasColorVariants && !variants.sizes && !variants.colors)) {
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

  const handleSizeSelect = (sizeIndex) => {
    if (selectedColorIndex !== null) {
      const colorVariant = variants.colorVariants[selectedColorIndex];
      const sizeVariant = colorVariant.sizeVariants[sizeIndex];

      setSelectedVariant({
        color: colorVariant.colorName,
        colorIndex: selectedColorIndex,
        size: sizeVariant.size,
        sizeIndex,
      });
    } else {
      // Legacy size selection
      setSelectedVariant((prev) => ({
        ...prev,
        size: variants.sizes[sizeIndex],
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
    if (selectedColorIndex !== null && variants.colorVariants) {
      return variants.colorVariants[selectedColorIndex].sizeVariants || [];
    }
    return [];
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
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Color: <span className="font-normal text-gray-600">
                {selectedVariant?.color || 'Select color'}
              </span>
            </label>
            <div className="flex flex-wrap gap-3">
              {primaryColorName && (
                <button
                  onClick={handlePrimaryColorSelect}
                  className={`relative rounded-lg border-2 transition-all duration-300 overflow-hidden ${selectedColorIndex === null && selectedVariant?.color === primaryColorName
                    ? 'border-primary-600 scale-105 shadow-lg'
                    : 'border-gray-300 hover:border-primary-400 hover:scale-105'
                    }`}
                  title={primaryColorName}
                >
                  <div
                    className="w-16 h-16 flex items-center justify-center text-xs font-semibold text-gray-700"
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
                  {selectedColorIndex === null && selectedVariant?.color === primaryColorName && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary-600 rounded-full flex items-center justify-center">
                      <FiCheck className="text-white text-xs" />
                    </span>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs px-1 py-0.5 text-center truncate">
                    {primaryColorName}
                  </div>
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
                    className={`relative rounded-lg border-2 transition-all duration-300 overflow-hidden ${isSelected
                      ? 'border-primary-600 scale-105 shadow-lg'
                      : hasStock
                        ? 'border-gray-300 hover:border-primary-400 hover:scale-105'
                        : 'border-gray-200 opacity-50 cursor-not-allowed'
                      }`}
                    title={colorVariant.colorName}
                  >
                    {colorVariant.thumbnailImage ? (
                      <div className="w-16 h-16 relative">
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
                        className="w-16 h-16 flex items-center justify-center text-xs font-semibold text-gray-700"
                        style={
                          colorVariant.colorCode && /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(colorVariant.colorCode)
                            ? { backgroundColor: colorVariant.colorCode }
                            : { backgroundColor: '#f3f4f6' }
                        }
                      >
                        {colorVariant.colorName.charAt(0)}
                      </div>
                    )}
                    {isSelected && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary-600 rounded-full flex items-center justify-center">
                        <FiCheck className="text-white text-xs" />
                      </span>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs px-1 py-0.5 text-center truncate">
                      {colorVariant.colorName}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Size Selection (Dynamic based on selected color) */}
          {selectedColorIndex !== null && getSelectedSizeVariants().length > 0 && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Size: <span className="font-normal text-gray-600">
                  {selectedVariant?.size || 'Select size'}
                </span>
              </label>
              <div className="flex flex-wrap gap-3">
                {getSelectedSizeVariants().map((sizeVariant, index) => {
                  const isSelected = selectedVariant?.sizeIndex === index;
                  const isAvailable = isSizeAvailable(sizeVariant);

                  return (
                    <button
                      key={index}
                      onClick={() => handleSizeSelect(index)}
                      disabled={!isAvailable}
                      className={`relative px-6 py-3 rounded-xl font-semibold border-2 transition-all duration-300 ${isSelected
                        ? 'border-primary-600 bg-primary-50 text-primary-700'
                        : isAvailable
                          ? 'border-gray-200 hover:border-primary-400 bg-white text-gray-700'
                          : 'border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed opacity-50'
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
                        <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary-600 rounded-full flex items-center justify-center">
                          <FiCheck className="text-white text-xs" />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              {selectedVariant?.sizeIndex !== undefined && selectedColorIndex !== null && (
                <div className="mt-2">
                  <span className="text-xs font-semibold text-gray-700">
                    Available:{" "}
                    <span className="text-gray-900">
                      {variants.colorVariants[selectedColorIndex]?.sizeVariants?.[selectedVariant.sizeIndex]?.stockQuantity ?? 0}
                    </span>
                  </span>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Legacy Size Variants */}
      {!hasColorVariants && variants.sizes && variants.sizes.length > 0 && (
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            Size: <span className="font-normal text-gray-600">{selectedVariant?.size || 'Select size'}</span>
          </label>
          <div className="flex flex-wrap gap-3">
            {variants.sizes.map((size, index) => {
              const isSelected = selectedVariant?.size === size;
              const isAvailable = isVariantAvailable('size', size);

              return (
                <button
                  key={size}
                  onClick={() => handleSizeSelect(index)}
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

      {/* Price Display */}
      {getVariantPrice() !== currentPrice && (
        <div className="p-4 bg-primary-50 rounded-xl border border-primary-200">
          <p className="text-sm text-gray-600 mb-1">Selected variant price:</p>
          <p className="text-xl font-bold text-primary-700">{formatPrice(getVariantPrice())}</p>
        </div>
      )}
    </div>
  );
};

export default VariantSelector;
