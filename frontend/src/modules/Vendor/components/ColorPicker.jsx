import React, { useState, useEffect, useRef } from "react";

const ColorPicker = ({ selectedColors = [], onChange, label, error }) => {
  const [inputValue, setInputValue] = useState(selectedColors.length > 0 ? selectedColors[0].name : "");

  const inputRef = useRef(null);

  // Sync internal state with prop if prop changes externally
  useEffect(() => {
    const propValue = selectedColors.length > 0 ? selectedColors[0].name : "";
    if (propValue !== inputValue && document.activeElement !== inputRef.current) {
      setInputValue(propValue);
    }
  }, [selectedColors]);

  const handleInputChange = (e) => {
    const value = e.target.value;
    console.log('Color input change:', value);
    setInputValue(value);
    
    // Notify parent of the change
    if (value) {
      const colorData = [{
        name: value,
        value: value.toLowerCase().replace(/\s+/g, '-') // Better value for colors
      }];
      console.log('Notifying parent with color data:', colorData);
      onChange(colorData);
    } else {
      console.log('Notifying parent with empty color data');
      onChange([]);
    }
  };

  return (
    <div className="space-y-1.5 color-input-wrapper">
      {label && (
        <label className="block text-xs font-semibold text-gray-700">
          {label}
        </label>
      )}
      
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          placeholder="Enter color name (e.g. Red, Blue, Maroon)..."
          className={`w-full px-3 py-2 text-sm border-2 rounded-lg transition-all focus:outline-none ${
            error 
              ? "border-red-300 focus:border-red-500 shadow-sm" 
              : "border-gray-200 focus:border-primary-500 hover:border-gray-300"
          }`}
        />
        {inputValue && (
          <div 
            className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border border-gray-200 shadow-sm transition-colors"
            style={{ 
              backgroundColor: inputValue.toLowerCase().trim(),
              // No fallback needed, browser will just not show a color if invalid
            }}
          />
        )}
      </div>

      {error && <p className="text-[10px] text-red-500 mt-0.5 font-medium">{error}</p>}
    </div>
  );
};

export default ColorPicker;
