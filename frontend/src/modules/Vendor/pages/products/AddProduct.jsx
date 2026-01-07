import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { FiSave, FiUpload, FiX, FiPlus, FiTrash2, FiChevronRight, FiChevronLeft, FiCopy } from "react-icons/fi";
import { motion } from "framer-motion";
import { useVendorAuthStore } from "../../store/vendorAuthStore";
import { useCategoryStore } from "../../../../shared/store/categoryStore";
import { useBrandStore } from "../../../../shared/store/brandStore";
import CategorySelector from "../../../Admin/components/CategorySelector";
import AnimatedSelect from "../../../Admin/components/AnimatedSelect";
import TagInput from "../../components/TagInput";
import ColorPicker from "../../components/ColorPicker";
import { createVendorProduct, getActiveCoupons } from "../../services/productService";
import toast from "react-hot-toast";

const AddProduct = () => {
  const navigate = useNavigate();
  const { vendor } = useVendorAuthStore();
  const { categories, initialize: initCategories } = useCategoryStore();
  const { brands, initialize: initBrands, fetchBrands } = useBrandStore();

  const vendorId = vendor?.id;
  const vendorName = vendor?.storeName || vendor?.name || "Vendor";

  const [formData, setFormData] = useState({
    name: "",
    unit: "",
    price: "",
    originalPrice: "",
    image: "",
    images: [],
    categoryId: null,
    subcategoryId: null,
    subSubCategoryId: null,
    brandId: null,
    stock: "in_stock",
    stockQuantity: "",
    totalAllowedQuantity: "",
    minimumOrderQuantity: "",
    warrantyPeriod: "",
    guaranteePeriod: "",
    hsnCode: "",
    flashSale: false,
    isNew: false,
    isTrending: false,
    isFeatured: false,
    isVisible: true,
    codAllowed: true,
    returnable: true,
    cancelable: true,
    taxIncluded: false,
    description: "",
    tags: [],
    hasSizes: true,
    productType: "standard",
    attributes: [],
    sizes: [], // Simple array of size strings (e.g., ["S", "M", "L", "XL"])
    seoTitle: "",
    seoDescription: "",
    relatedProducts: [],
    isCouponEligible: false,
    applicableCoupons: [],
    brandName: "",
    isManualBrand: false,
  });


  // Multi-step form state
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 3; // Basic Info, Variations, Additional Details

  // Color variants state
  const [colorVariants, setColorVariants] = useState([]);
  const [activeCoupons, setActiveCoupons] = useState([]);

  useEffect(() => {
    initCategories();
    fetchBrands(); // Fetch brands from API
    fetchActiveCoupons();
  }, [initCategories, fetchBrands]);

  const fetchActiveCoupons = async () => {
    try {
      const response = await getActiveCoupons();
      setActiveCoupons(response || []);
    } catch (error) {
      console.error("Error fetching active coupons:", error);
      // Don't show error toast on mount to avoid annoyance if feature not used
    }
  };


  useEffect(() => {
    // Only check vendorId on mount, not on every change
    // This prevents unnecessary redirects when state updates
    if (!vendorId && vendor === null) {
      // Only redirect if vendor is actually null (not just loading)
      const token = localStorage.getItem('vendor-token');
      if (!token) {
        toast.error("Please log in to add products");
        navigate("/vendor/login");
      }
    }
  }, []); // Empty dependency array - only run on mount

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (name === "hasSizes" && type === "checkbox") {
      // If toggling hasSizes, we might want to reset or adjust colorVariants
      // For simplicity, we'll just update the state and the user can adjust
      // But we should ensure at least one size variant exists for each color if toggled OFF
      if (!checked) {
        setColorVariants(prev => prev.map(cv => ({
          ...cv,
          sizeVariants: cv.sizeVariants.length > 0 ? [cv.sizeVariants[0]] : [{
            size: "Regular",
            price: formData.price ? parseFloat(formData.price) : null,
            originalPrice: formData.originalPrice ? parseFloat(formData.originalPrice) : null,
            stockQuantity: formData.stockQuantity ? parseInt(formData.stockQuantity) : 0,
          }]
        })));
      }
    }

    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleCategoryChange = ({ categoryId, subcategoryId, subSubCategoryId }) => {
    setFormData((prev) => ({
      ...prev,
      categoryId,
      subcategoryId,
      subSubCategoryId,
    }));
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        toast.error("Please select an image file");
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image size should be less than 5MB");
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({
          ...formData,
          image: reader.result,
        });
      };
      reader.onerror = () => {
        toast.error("Error reading image file");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGalleryUpload = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    const validFiles = files.filter((file) => {
      if (!file.type.startsWith("image/")) {
        toast.error(`${file.name} is not an image file`);
        return false;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} size should be less than 5MB`);
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;

    const readers = validFiles.map((file) => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    });

    Promise.all(readers)
      .then((results) => {
        setFormData({
          ...formData,
          images: [...formData.images, ...results],
        });
        toast.success(`${validFiles.length} image(s) added to gallery`);
      })
      .catch(() => {
        toast.error("Error reading image files");
      });
  };

  const removeGalleryImage = (index) => {
    setFormData({
      ...formData,
      images: formData.images.filter((_, i) => i !== index),
    });
  };

  // Color variant management functions
  const addColorVariant = () => {
    const newVariant = {
      colorName: "",
      colorCode: "",
      thumbnailImage: "",
      sizeVariants: [],
    };

    // If sizes are disabled, automatically add one size variant for price/stock
    if (!formData.hasSizes) {
      newVariant.sizeVariants.push({
        size: "Regular", // Default size label for non-sized products
        price: formData.price ? parseFloat(formData.price) : null,
        originalPrice: formData.originalPrice ? parseFloat(formData.originalPrice) : null,
        stockQuantity: formData.stockQuantity ? parseInt(formData.stockQuantity) : 0,
      });
    }

    setColorVariants([
      ...colorVariants,
      newVariant,
    ]);
  };

  const removeColorVariant = (index) => {
    setColorVariants(colorVariants.filter((_, i) => i !== index));
  };

  const updateColorVariant = (index, updates) => {
    try {
      setColorVariants((prev) => {
        if (!prev || !prev[index]) {
          console.warn('Invalid color variant index:', index);
          return prev;
        }
        const updated = [...prev];
        updated[index] = { ...updated[index], ...updates };
        return updated;
      });
    } catch (error) {
      console.error('Error updating color variant:', error);
      toast.error('Failed to update color variant');
    }
  };

  const handleColorThumbnailUpload = (index, file) => {
    if (!file || !file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size should be less than 5MB");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      updateColorVariant(index, { thumbnailImage: reader.result });
    };
    reader.onerror = () => {
      toast.error("Error reading image file");
    };
    reader.readAsDataURL(file);
  };

  // Size variant management functions
  const addSizeVariant = (colorIndex) => {
    const updated = [...colorVariants];
    updated[colorIndex].sizeVariants = [
      ...updated[colorIndex].sizeVariants,
      {
        size: "",
        price: null,
        originalPrice: null,
        stockQuantity: 0,
      },
    ];
    setColorVariants(updated);
  };

  const removeSizeVariant = (colorIndex, sizeIndex) => {
    const updated = [...colorVariants];
    updated[colorIndex].sizeVariants = updated[colorIndex].sizeVariants.filter(
      (_, i) => i !== sizeIndex
    );
    setColorVariants(updated);
  };

  const updateSizeVariant = (colorIndex, sizeIndex, field, value) => {
    const updated = [...colorVariants];
    updated[colorIndex].sizeVariants[sizeIndex] = {
      ...updated[colorIndex].sizeVariants[sizeIndex],
      [field]: value,
    };
    setColorVariants(updated);
  };

  // Custom attribute management
  const addAttribute = () => {
    setFormData((prev) => ({
      ...prev,
      attributes: [
        ...prev.attributes,
        { name: "", value: "", group: "", isRequired: false },
      ],
    }));
  };

  const removeAttribute = (index) => {
    setFormData((prev) => ({
      ...prev,
      attributes: prev.attributes.filter((_, i) => i !== index),
    }));
  };

  const updateAttribute = (index, field, value) => {
    setFormData((prev) => {
      const updated = [...prev.attributes];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, attributes: updated };
    });
  };

  // Bulk editing functions
  const bulkEditSizes = (colorIndex, sizes) => {
    const updated = [...colorVariants];
    const existingSizes = updated[colorIndex].sizeVariants.map((sv) => sv.size);
    const newSizes = sizes.filter((s) => !existingSizes.includes(s));

    newSizes.forEach((size) => {
      updated[colorIndex].sizeVariants.push({
        size,
        price: null,
        originalPrice: null,
        stockQuantity: 0,
      });
    });

    setColorVariants(updated);
  };

  const copySizeVariantsFromColor = (fromColorIndex, toColorIndex) => {
    const updated = [...colorVariants];
    const sourceSizes = updated[fromColorIndex].sizeVariants;
    updated[toColorIndex].sizeVariants = sourceSizes.map((sv) => ({
      ...sv,
      stockQuantity: 0, // Reset stock for new color
    }));
    setColorVariants(updated);
    toast.success("Size variants copied successfully");
  };

  // Step navigation
  const nextStep = () => {
    if (currentStep === 1) {
      // Validate basic info
      if (!formData.name || !formData.price || !formData.categoryId) {
        toast.error("Please fill in all required fields");
        return;
      }
    }

    if (currentStep === 2) {
      // Validate required custom attributes
      const missingRequired = formData.attributes.filter(
        (attr) => attr.isRequired && (!attr.name || !attr.value)
      );
      if (missingRequired.length > 0) {
        toast.error(`Please fill in required attribute: ${missingRequired[0].name || "Unnamed attribute"}`);
        return;
      }
    }
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!vendorId) {
      toast.error("Please log in to add products");
      return;
    }

    // Validation
    if (!formData.name || !formData.price) {
      toast.error("Please fill in all required fields");
      return;
    }


    // Validate color variants if provided
    if (colorVariants.length > 0) {
      console.log('Validating color variants:', colorVariants);
      for (let i = 0; i < colorVariants.length; i++) {
        const cv = colorVariants[i];
        console.log(`Checking color variant ${i + 1}:`, cv);
        if (!cv.colorName || cv.colorName.trim() === '') {
          toast.error(`Color variant ${i + 1} must have a color name`);
          return;
        }
        if (formData.hasSizes && cv.sizeVariants.length === 0) {
          toast.error(`Color variant "${cv.colorName}" must have at least one size`);
          return;
        }
        if (!formData.hasSizes && cv.sizeVariants.length === 0) {
          toast.error(`Color variant "${cv.colorName}" must have price and stock configuration`);
          return;
        }
        for (let j = 0; j < cv.sizeVariants.length; j++) {
          const sv = cv.sizeVariants[j];
          if (formData.hasSizes && !sv.size) {
            toast.error(`Size variant ${j + 1} for "${cv.colorName}" is missing size name`);
            return;
          }
          if (sv.price === null || sv.price === undefined || sv.price === "") {
            toast.error(`Price for ${formData.hasSizes ? `size "${sv.size}"` : "variant"} of "${cv.colorName}" is required`);
            return;
          }
          if (sv.stockQuantity === undefined || sv.stockQuantity === null || sv.stockQuantity === "") {
            toast.error(`Stock quantity for ${formData.hasSizes ? `size "${sv.size}"` : "variant"} of "${cv.colorName}" is required`);
            return;
          }
        }
      }
    }

    try {
      // Calculate total stock from variants if provided
      let totalStock = 0;
      if (colorVariants.length > 0) {
        colorVariants.forEach((cv) => {
          cv.sizeVariants.forEach((sv) => {
            totalStock += parseInt(sv.stockQuantity) || 0;
          });
        });
      } else {
        totalStock = parseInt(formData.stockQuantity) || 0;
      }

      // Prepare product data
      const productData = {
        ...formData,
        price: parseFloat(formData.price),
        originalPrice: formData.originalPrice
          ? parseFloat(formData.originalPrice)
          : null,
        stockQuantity: totalStock,
        totalAllowedQuantity: formData.totalAllowedQuantity
          ? parseInt(formData.totalAllowedQuantity)
          : null,
        minimumOrderQuantity: formData.minimumOrderQuantity
          ? parseInt(formData.minimumOrderQuantity)
          : null,
        categoryId: formData.categoryId ? formData.categoryId : null,
        subcategoryId: formData.subcategoryId ? formData.subcategoryId : null,
        subSubCategoryId: formData.subSubCategoryId ? formData.subSubCategoryId : null,
        brandId: formData.brandId ? formData.brandId : null,
        brandName: formData.brandName ? formData.brandName : null,
        hasSizes: formData.hasSizes,
        productType: formData.productType,
        attributes: formData.attributes, // Correctly set attributes
        sizes: formData.hasSizes ? (formData.sizes || []) : [],
        variants: {
          ...(formData.variants || {}),
          colorVariants: colorVariants.length > 0 ? colorVariants : undefined,
        },
      };

      await createVendorProduct(productData);
      toast.success("Product created successfully");
      navigate("/vendor/products/manage-products");
    } catch (error) {
      console.error("Error creating product:", error);
      toast.error(error.response?.data?.message || "Failed to create product");
    }
  };

  if (!vendorId) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Please log in to add products</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3">
      {/* Step Indicator */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
        <div className="flex items-center justify-between">
          {[1, 2, 3].map((step) => (
            <div key={step} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-colors ${currentStep === step
                    ? "bg-primary-600 text-white"
                    : currentStep > step
                      ? "bg-green-500 text-white"
                      : "bg-gray-200 text-gray-600"
                    }`}>
                  {currentStep > step ? "✓" : step}
                </div>
                <span className="text-xs mt-1 text-gray-600">
                  {step === 1
                    ? "Basic Info"
                    : step === 2
                      ? "Additional"
                      : "Variations"}
                </span>
              </div>
              {step < 3 && (
                <div
                  className={`h-1 flex-1 mx-2 ${currentStep > step ? "bg-green-500" : "bg-gray-200"
                    }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-xl p-3 sm:p-4 shadow-sm border border-gray-200 space-y-4">
        {/* Step 1: Basic Information */}
        {currentStep === 1 && (
          <>
            <div className="space-y-6">
              {/* Product Type & Guidance */}
              <div className="bg-primary-50 p-4 rounded-xl border border-primary-100">
                <h3 className="text-sm font-bold text-primary-800 mb-1 flex items-center">
                  Product Configuration
                  <span className="ml-2 px-2 py-0.5 bg-primary-200 text-primary-700 text-[10px] rounded-full uppercase">New</span>
                </h3>
                <p className="text-xs text-primary-700 mb-3">
                  Select the type of product you're adding. For products like perfumes or sunglasses that don't need size variations, uncheck "Enable Sizes".
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Product Type
                    </label>
                    <AnimatedSelect
                      name="productType"
                      value={formData.productType}
                      onChange={handleChange}
                      options={[
                        { value: "standard", label: "Standard Product (Physical)" },
                        { value: "digital", label: "Digital Product (Downloadable)" },
                        { value: "service", label: "Service (Non-physical)" },
                      ]}
                    />
                  </div>
                  <div className="flex items-center mt-6">
                    <label className="flex items-center cursor-pointer group">
                      <input
                        type="checkbox"
                        name="hasSizes"
                        checked={formData.hasSizes}
                        onChange={handleChange}
                        className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                      />
                      <div className="ml-3">
                        <span className="block text-sm font-bold text-gray-700 group-hover:text-primary-600 transition-colors">
                          Enable Sizes
                        </span>
                        <span className="block text-[10px] text-gray-500">
                          Uncheck if this product doesn't have size attributes (e.g. Perfumes)
                        </span>
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              {/* Basic Information */}
              <div>
                <h2 className="text-base font-bold text-gray-800 mb-2">
                  Basic Information
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Product Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                      placeholder="Enter product name"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Unit
                    </label>
                    <AnimatedSelect
                      name="unit"
                      value={formData.unit}
                      onChange={handleChange}
                      placeholder="Select Unit"
                      options={[
                        { value: "", label: "Select Unit" },
                        { value: "pieces", label: "Pieces" },
                        { value: "pcs", label: "PCS" },
                        { value: "nos", label: "NOS" },
                        { value: "kg", label: "Kilogram (Kg)" },
                        { value: "gram", label: "Gram (g)" },
                        { value: "ton", label: "Ton" },
                        { value: "meter", label: "Meter (m)" },
                        { value: "cm", label: "Centimeter (cm)" },
                        { value: "feet", label: "Feet (ft)" },
                        { value: "yard", label: "Yard" },
                        { value: "litre", label: "Litre (L)" },
                        { value: "ml", label: "Milliliter (ml)" },
                        { value: "gallon", label: "Gallon" },
                        { value: "box", label: "Box" },
                        { value: "pack", label: "Pack" },
                        { value: "set", label: "Set" },
                        { value: "pair", label: "Pair" },
                        { value: "dozen", label: "Dozen" },
                        { value: "carton", label: "Carton" },
                        { value: "bundle", label: "Bundle" },
                        { value: "roll", label: "Roll" },
                        { value: "sheet", label: "Sheet" },
                        { value: "sqft", label: "Square Feet (sqft)" },
                        { value: "sqm", label: "Square Meter (sqm)" },
                      ]}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Category <span className="text-red-500">*</span>
                    </label>
                    <CategorySelector
                      value={formData.categoryId}
                      subcategoryId={formData.subcategoryId}
                      subSubCategoryId={formData.subSubCategoryId}
                      onChange={handleChange}
                      onCategoryChange={handleCategoryChange}
                      required
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-xs font-semibold text-gray-700">
                        Brand
                      </label>
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, isManualBrand: !prev.isManualBrand, brandId: null, brandName: '' }))}
                        className="text-[10px] text-primary-600 hover:text-primary-800 underline focus:outline-none"
                      >
                        {formData.isManualBrand ? "Select from list" : "Brand not listed?"}
                      </button>
                    </div>
                    {formData.isManualBrand ? (
                      <input
                        type="text"
                        name="brandName"
                        value={formData.brandName || ""}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                        placeholder="Enter brand name manually"
                      />
                    ) : (
                      <AnimatedSelect
                        name="brandId"
                        value={formData.brandId || ""}
                        onChange={handleChange}
                        placeholder="Select Brand"
                        options={[
                          { value: "", label: "Select Brand" },
                          ...brands
                            .filter((brand) => brand.isActive !== false)
                            .map((brand) => ({ value: String(brand.id), label: brand.name })),
                        ]}
                      />
                    )}
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                      placeholder="Enter product description..."
                    />
                  </div>
                </div>
              </div>

              {/* Pricing */}
              <div>
                <h2 className="text-base font-bold text-gray-800 mb-2">Pricing</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Price <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      name="price"
                      value={formData.price}
                      onChange={handleChange}
                      required
                      min="0"
                      step="0.01"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Original Price (for discount)
                    </label>
                    <input
                      type="number"
                      name="originalPrice"
                      value={formData.originalPrice}
                      onChange={handleChange}
                      min="0"
                      step="0.01"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>

              {/* Promotions */}
              <div>
                <h2 className="text-base font-bold text-gray-800 mb-2">Promotions</h2>
                <div className="space-y-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      name="isCouponEligible"
                      checked={formData.isCouponEligible}
                      onChange={handleChange}
                      className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                    />
                    <span className="text-sm font-semibold text-gray-700">
                      Eligible for Coupon Codes
                    </span>
                  </label>

                  {formData.isCouponEligible && activeCoupons.length > 0 && (
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                      <label className="block text-xs font-semibold text-gray-700 mb-2">
                        Select Applicable Coupons
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {activeCoupons.map((coupon) => (
                          <label key={coupon._id} className="flex items-center gap-2 p-2 bg-white rounded-lg border border-gray-200 cursor-pointer hover:border-primary-300 transition-colors">
                            <input
                              type="checkbox"
                              checked={formData.applicableCoupons.includes(coupon._id)}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                setFormData(prev => {
                                  const current = prev.applicableCoupons || [];
                                  if (checked) {
                                    return { ...prev, applicableCoupons: [...current, coupon._id] };
                                  } else {
                                    return { ...prev, applicableCoupons: current.filter(id => id !== coupon._id) };
                                  }
                                });
                              }}
                              className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                            />
                            <div>
                              <span className="block text-sm font-bold text-gray-800">{coupon.code}</span>
                              <span className="block text-xs text-gray-500">{coupon.name} - {coupon.type === 'percentage' ? `${coupon.value}% OFF` : `₹${coupon.value} OFF`}</span>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {formData.isCouponEligible && activeCoupons.length === 0 && (
                    <p className="text-xs text-gray-500 italic">No active coupons available at the moment.</p>
                  )}
                </div>
              </div>

              {/* Product Media */}
              <div className="bg-gradient-to-br from-primary-50 to-primary-100 rounded-xl p-3 sm:p-4 border-2 border-primary-200 shadow-lg">
                <h2 className="text-base font-bold text-primary-800 mb-3 flex items-center gap-2">
                  <FiUpload className="text-lg" />
                  Product Media
                </h2>

                <div className="space-y-3">
                  {/* Main Image */}
                  <div className="bg-white rounded-lg p-3 border border-primary-200">
                    <h3 className="text-sm font-semibold text-gray-800 mb-2">
                      Main Image
                    </h3>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Upload Main Image
                      </label>
                      <div className="relative">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                          id="main-image-upload"
                        />
                        <label
                          htmlFor="main-image-upload"
                          className="flex items-center justify-center gap-2 w-full px-3 py-2 border-2 border-dashed border-primary-300 rounded-lg cursor-pointer hover:border-primary-500 hover:bg-primary-50 transition-colors bg-white">
                          <FiUpload className="text-base text-primary-600" />
                          <span className="text-xs font-medium text-gray-700">
                            {formData.image
                              ? "Change Main Image"
                              : "Choose Main Image"}
                          </span>
                        </label>
                      </div>
                      {formData.image && (
                        <div className="mt-2 flex items-start gap-3">
                          <img
                            src={formData.image}
                            alt="Main Preview"
                            className="w-24 h-24 object-cover rounded-lg border-2 border-primary-300 shadow-md"
                            onError={(e) => {
                              e.target.style.display = "none";
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => setFormData({ ...formData, image: "" })}
                            className="mt-1 px-3 py-1.5 text-xs text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors font-medium">
                            Remove Image
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Product Gallery */}
                  <div className="bg-white rounded-lg p-3 border border-primary-200">
                    <h3 className="text-sm font-semibold text-gray-800 mb-2">
                      Product Gallery
                    </h3>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Upload Gallery Images (Multiple)
                      </label>
                      <div className="relative">
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handleGalleryUpload}
                          className="hidden"
                          id="gallery-upload"
                        />
                        <label
                          htmlFor="gallery-upload"
                          className="flex items-center justify-center gap-2 w-full px-3 py-2 border-2 border-dashed border-primary-300 rounded-lg cursor-pointer hover:border-primary-500 hover:bg-primary-50 transition-colors bg-white">
                          <FiUpload className="text-base text-primary-600" />
                          <span className="text-xs font-medium text-gray-700">
                            Choose Gallery Images
                          </span>
                        </label>
                      </div>
                      {formData.images && formData.images.length > 0 && (
                        <div className="mt-2">
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                            {formData.images.map((img, index) => (
                              <div key={index} className="relative group">
                                <img
                                  src={img}
                                  alt={`Gallery ${index + 1}`}
                                  className="w-full h-24 object-cover rounded-lg border-2 border-primary-300 shadow-md"
                                  onError={(e) => {
                                    e.target.style.display = "none";
                                  }}
                                />
                                <button
                                  type="button"
                                  onClick={() => removeGalleryImage(index)}
                                  className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                                  title="Remove image">
                                  <FiX className="text-xs" />
                                </button>
                              </div>
                            ))}
                          </div>
                          <p className="mt-1 text-xs text-gray-500">
                            {formData.images.length} image(s) in gallery
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Inventory */}
              <div>
                <h2 className="text-base font-bold text-gray-800 mb-2">Inventory</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Stock Quantity {colorVariants.length === 0 && <span className="text-red-500">*</span>}
                    </label>
                    <input
                      type="number"
                      name="stockQuantity"
                      value={formData.stockQuantity}
                      onChange={handleChange}
                      required={colorVariants.length === 0}
                      min="0"
                      disabled={colorVariants.length > 0}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                      placeholder="0"
                    />
                    {colorVariants.length > 0 && (
                      <p className="text-xs text-gray-500 mt-1">
                        Stock will be calculated from color/size variants
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Stock Status
                    </label>
                    <AnimatedSelect
                      name="stock"
                      value={formData.stock}
                      onChange={handleChange}
                      options={[
                        { value: 'in_stock', label: 'In Stock' },
                        { value: 'low_stock', label: 'Low Stock' },
                        { value: 'out_of_stock', label: 'Out of Stock' },
                      ]}
                    />
                  </div>
                </div>
              </div>

            </div>

            {/* Step Navigation for Step 1 */}
            <div className="flex justify-end gap-2 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={() => navigate("/vendor/products/manage-products")}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-semibold text-sm">
                Cancel
              </button>
              <button
                type="button"
                onClick={nextStep}
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-semibold text-sm">
                Next: Additional
                <FiChevronRight />
              </button>
            </div>
          </>
        )}

        {/* Step 2: Additional Details */}
        {currentStep === 2 && (
          <>
            <div className="space-y-6">
              {/* Flexible Attribute System */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h2 className="text-base font-bold text-gray-800">Custom Attributes</h2>
                    <p className="text-xs text-gray-500">Add specific details like fragrance notes, lens type, or material</p>
                  </div>
                  <button
                    type="button"
                    onClick={addAttribute}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-50 text-primary-600 rounded-lg text-xs font-bold hover:bg-primary-100 transition-colors"
                  >
                    <FiPlus className="w-3.5 h-3.5" />
                    Add Attribute
                  </button>
                </div>

                {formData.attributes.length > 0 ? (
                  <div className="space-y-3">
                    {formData.attributes.map((attr, index) => (
                      <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200 relative group">
                        <button
                          type="button"
                          onClick={() => removeAttribute(index)}
                          className="absolute -top-2 -right-2 w-6 h-6 bg-white text-red-500 rounded-full border border-gray-200 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm z-10"
                        >
                          <FiTrash2 className="w-3 h-3" />
                        </button>

                        <div className="md:col-span-1">
                          <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Name</label>
                          <input
                            type="text"
                            value={attr.name}
                            onChange={(e) => updateAttribute(index, "name", e.target.value)}
                            placeholder="e.g. Fragrance Notes"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                          />
                        </div>

                        <div className="md:col-span-1">
                          <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Value</label>
                          <input
                            type="text"
                            value={attr.value}
                            onChange={(e) => updateAttribute(index, "value", e.target.value)}
                            placeholder="e.g. Floral, Citrus"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                          />
                        </div>

                        <div className="md:col-span-1">
                          <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Group</label>
                          <input
                            type="text"
                            value={attr.group}
                            onChange={(e) => updateAttribute(index, "group", e.target.value)}
                            placeholder="e.g. Specifications"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                          />
                        </div>

                        <div className="md:col-span-1 flex items-center mt-5">
                          <label className="flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={attr.isRequired}
                              onChange={(e) => updateAttribute(index, "isRequired", e.target.checked)}
                              className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                            />
                            <span className="ml-2 text-xs font-semibold text-gray-700">Required</span>
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                    <p className="text-xs text-gray-500">No custom attributes added yet.</p>
                  </div>
                )}
              </div>

              {/* Product Sizes */}
              {formData.hasSizes && (
                <div>
                  <h2 className="text-base font-bold text-gray-800 mb-2">
                    Product Sizes
                  </h2>
                  <p className="text-sm text-gray-600 mb-3">
                    Add available sizes for this product (e.g., S, M, L, XL). Type and press Enter to add each size.
                  </p>
                  <TagInput
                    tags={formData.sizes || []}
                    onChange={(sizes) => setFormData({ ...formData, sizes })}
                    placeholder="Add sizes (e.g. S, M, L, XL)"
                    label="Available Sizes"
                  />
                </div>
              )}

              {/* Tags */}
              <div>
                <h2 className="text-base font-bold text-gray-800 mb-2">Tags</h2>
                <TagInput
                  tags={formData.tags || []}
                  onChange={(tags) => setFormData({ ...formData, tags })}
                  placeholder="Add tags (e.g. Cotton, Summer, Blue)"
                />
              </div>

              {/* Options */}
              <div>
                <h2 className="text-base font-bold text-gray-800 mb-2">
                  Product Options
                </h2>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      name="flashSale"
                      checked={formData.flashSale}
                      onChange={handleChange}
                      className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                    />
                    <span className="text-xs font-semibold text-gray-700">
                      Flash Sale
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      name="isNew"
                      checked={formData.isNew}
                      onChange={handleChange}
                      className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                    />
                    <span className="text-xs font-semibold text-gray-700">
                      New Arrival
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      name="isTrending"
                      checked={formData.isTrending}
                      onChange={handleChange}
                      className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                    />
                    <span className="text-xs font-semibold text-gray-700">
                      Trending Now
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      name="isFeatured"
                      checked={formData.isFeatured}
                      onChange={handleChange}
                      className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                    />
                    <span className="text-xs font-semibold text-gray-700">
                      Featured Product
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      name="isVisible"
                      checked={formData.isVisible}
                      onChange={handleChange}
                      className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                    />
                    <span className="text-xs font-semibold text-gray-700">
                      Visible to Customers
                    </span>
                  </label>
                </div>
              </div>
            </div>

            {/* Step Navigation for Step 2 */}
            <div className="flex justify-between gap-2 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={prevStep}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-semibold text-sm">
                <FiChevronLeft />
                Previous
              </button>
              <button
                type="button"
                onClick={nextStep}
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-semibold text-sm">
                Next: Variations
                <FiChevronRight />
              </button>
            </div>
          </>
        )}

        {/* Step 3: Color & Size Variations */}
        {currentStep === 3 && (
          <>
            <div>
              <h2 className="text-base font-bold text-gray-800 mb-3">
                Product Variations
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                Add color options with size variants. Each color can have different sizes with individual pricing and inventory.
              </p>

              {/* Add Color Variant Button */}
              <div className="mb-4">
                <button
                  type="button"
                  onClick={addColorVariant}
                  className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-semibold text-sm">
                  <FiPlus />
                  Add Color Variant
                </button>
              </div>

              {/* Color Variants List */}
              {colorVariants.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
                  <p className="text-sm text-gray-600 mb-2">No color variants added</p>
                  <p className="text-xs text-gray-500">
                    Click "Add Color Variant" to start adding product variations
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {colorVariants.map((colorVariant, colorIndex) => (
                    <div
                      key={colorIndex}
                      className="border-2 border-primary-200 rounded-xl p-4 bg-gradient-to-br from-primary-50 to-white">
                      <div className="flex items-start justify-between mb-4">
                        <h3 className="text-sm font-bold text-gray-800">
                          Color Variant {colorIndex + 1}
                        </h3>
                        <button
                          type="button"
                          onClick={() => removeColorVariant(colorIndex)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors">
                          <FiTrash2 className="text-sm" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                        {/* Color Selection */}
                        <div className="md:col-span-2">
                          <label className="block text-xs font-semibold text-gray-700 mb-2">
                            {formData.hasSizes ? "Color Selection *" : "Variant Name *"}
                          </label>
                          {formData.hasSizes ? (
                            <ColorPicker
                              selectedColors={colorVariant.colorName ? [{
                                name: colorVariant.colorName,
                                value: colorVariant.colorCode || colorVariant.colorName.toLowerCase()
                              }] : []}
                              onChange={(colors) => {
                                try {
                                  const color = colors && colors.length > 0 ? colors[colors.length - 1] : null;
                                  if (color && color.name) {
                                    updateColorVariant(colorIndex, {
                                      colorName: color.name,
                                      colorCode: color.value || color.name.toLowerCase().replace(/\s+/g, '-')
                                    });
                                  } else {
                                    updateColorVariant(colorIndex, {
                                      colorName: "",
                                      colorCode: ""
                                    });
                                  }
                                } catch (error) {
                                  console.error('Error handling color change:', error);
                                }
                              }}
                            />
                          ) : (
                            <input
                              type="text"
                              value={colorVariant.colorName}
                              onChange={(e) => updateColorVariant(colorIndex, { colorName: e.target.value })}
                              placeholder="e.g. 50ml, 100ml, Polarized"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                            />
                          )}
                        </div>

                        {/* Thumbnail Image */}
                        <div className="md:col-span-2">
                          <label className="block text-xs font-semibold text-gray-700 mb-1">
                            Thumbnail Image
                          </label>
                          <div className="flex items-center gap-3">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) =>
                                handleColorThumbnailUpload(
                                  colorIndex,
                                  e.target.files[0]
                                )
                              }
                              className="hidden"
                              id={`color-thumbnail-${colorIndex}`}
                            />
                            <label
                              htmlFor={`color-thumbnail-${colorIndex}`}
                              className="flex items-center justify-center gap-2 px-3 py-2 border-2 border-dashed border-primary-300 rounded-lg cursor-pointer hover:border-primary-500 hover:bg-primary-50 transition-colors bg-white text-sm">
                              <FiUpload className="text-base text-primary-600" />
                              <span className="text-xs font-medium text-gray-700">
                                {colorVariant.thumbnailImage
                                  ? "Change Thumbnail"
                                  : "Upload Thumbnail"}
                              </span>
                            </label>
                            {colorVariant.thumbnailImage && (
                              <img
                                src={colorVariant.thumbnailImage}
                                alt="Thumbnail"
                                className="w-16 h-16 object-cover rounded-lg border-2 border-primary-300"
                              />
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Size Variants for this Color */}
                      <div className="mt-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-sm font-semibold text-gray-700">
                            {formData.hasSizes ? "Size Variants" : "Price & Stock Configuration"}
                          </h4>
                          {formData.hasSizes && (
                            <div className="flex items-center gap-2">
                              {colorIndex > 0 && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    copySizeVariantsFromColor(0, colorIndex)
                                  }
                                  className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors">
                                  <FiCopy className="text-xs" />
                                  Copy from First
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => addSizeVariant(colorIndex)}
                                className="flex items-center gap-1 px-2 py-1 text-xs bg-primary-600 text-white rounded hover:bg-primary-700 transition-colors">
                                <FiPlus className="text-xs" />
                                Add Size
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Bulk Add Sizes - Only show if sizes are enabled */}
                        {formData.hasSizes && (
                          <div className="mb-4 p-3 bg-primary-50/50 rounded-lg border border-primary-100">
                            <label className="block text-[10px] font-bold text-primary-700 uppercase tracking-wider mb-2">
                              Bulk Add Sizes (Type and press Enter)
                            </label>
                            <TagInput
                              tags={[]}
                              onChange={(sizes) => bulkEditSizes(colorIndex, sizes)}
                              placeholder="e.g. S, M, L, XL"
                            />
                          </div>
                        )}

                        {colorVariant.sizeVariants.length === 0 ? (
                          <div className="text-center py-4 border border-dashed border-gray-300 rounded-lg bg-gray-50">
                            <p className="text-xs text-gray-500">
                              {formData.hasSizes
                                ? "No sizes added. Click \"Add Size\" to add size variants."
                                : "No price/stock set. Click \"Add Configuration\" to set price and stock."}
                            </p>
                            {!formData.hasSizes && (
                              <button
                                type="button"
                                onClick={() => addSizeVariant(colorIndex)}
                                className="mt-2 flex items-center gap-1 mx-auto px-3 py-1 text-xs bg-primary-600 text-white rounded hover:bg-primary-700 transition-colors">
                                <FiPlus className="text-xs" />
                                Add Configuration
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {colorVariant.sizeVariants.map((sizeVariant, sizeIndex) => (
                              <div
                                key={sizeIndex}
                                className={`grid grid-cols-1 ${formData.hasSizes ? 'md:grid-cols-5' : 'md:grid-cols-4'} gap-2 p-3 bg-white border border-gray-200 rounded-lg`}>
                                {formData.hasSizes && (
                                  <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                                      Size <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                      type="text"
                                      value={sizeVariant.size}
                                      onChange={(e) =>
                                        updateSizeVariant(
                                          colorIndex,
                                          sizeIndex,
                                          "size",
                                          e.target.value
                                        )
                                      }
                                      className="w-full px-2 py-1.5 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                                      placeholder="S, M, L, XL"
                                      required
                                    />
                                  </div>
                                )}
                                <div>
                                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                                    Price <span className="text-red-500">*</span>
                                  </label>
                                  <input
                                    type="number"
                                    value={sizeVariant.price || ""}
                                    onChange={(e) =>
                                      updateSizeVariant(
                                        colorIndex,
                                        sizeIndex,
                                        "price",
                                        e.target.value ? parseFloat(e.target.value) : null
                                      )
                                    }
                                    min="0"
                                    step="0.01"
                                    className="w-full px-2 py-1.5 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                                    placeholder="Base price"
                                    required
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                                    Original Price
                                  </label>
                                  <input
                                    type="number"
                                    value={sizeVariant.originalPrice || ""}
                                    onChange={(e) =>
                                      updateSizeVariant(
                                        colorIndex,
                                        sizeIndex,
                                        "originalPrice",
                                        e.target.value ? parseFloat(e.target.value) : null
                                      )
                                    }
                                    min="0"
                                    step="0.01"
                                    className="w-full px-2 py-1.5 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                                    placeholder="Original"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                                    Stock <span className="text-red-500">*</span>
                                  </label>
                                  <input
                                    type="number"
                                    value={sizeVariant.stockQuantity}
                                    onChange={(e) =>
                                      updateSizeVariant(
                                        colorIndex,
                                        sizeIndex,
                                        "stockQuantity",
                                        parseInt(e.target.value) || 0
                                      )
                                    }
                                    min="0"
                                    className="w-full px-2 py-1.5 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                                    required
                                  />
                                </div>
                                <div className="flex items-end">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      removeSizeVariant(colorIndex, sizeIndex)
                                    }
                                    className={`w-full px-2 py-1.5 text-red-600 hover:bg-red-50 rounded transition-colors text-sm ${!formData.hasSizes && colorVariant.sizeVariants.length === 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    disabled={!formData.hasSizes && colorVariant.sizeVariants.length === 1}>
                                    <FiTrash2 className="mx-auto" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Step Navigation for Step 3 */}
            <div className="flex justify-between gap-2 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={prevStep}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-semibold text-sm">
                <FiChevronLeft />
                Previous
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => navigate("/vendor/products/manage-products")}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-semibold text-sm">
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center justify-center gap-2 px-4 py-2 gradient-green text-white rounded-lg hover:shadow-glow-green transition-all font-semibold text-sm">
                  <FiSave />
                  Create Product
                </button>
              </div>
            </div>
          </>
        )}
      </form>
    </motion.div>
  );
};

export default AddProduct;

