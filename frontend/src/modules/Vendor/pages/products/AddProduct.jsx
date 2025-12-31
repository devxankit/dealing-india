import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FiSave, FiUpload, FiX, FiPlus, FiTrash2, FiChevronRight, FiChevronLeft, FiCopy } from "react-icons/fi";
import { motion } from "framer-motion";
import { useVendorAuthStore } from "../../store/vendorAuthStore";
import { useCategoryStore } from "../../../../shared/store/categoryStore";
import { useBrandStore } from "../../../../shared/store/brandStore";
import CategorySelector from "../../../Admin/components/CategorySelector";
import AnimatedSelect from "../../../Admin/components/AnimatedSelect";
import { createVendorProduct } from "../../services/productService";
import toast from "react-hot-toast";
import api from "../../../../shared/utils/api";

const AddProduct = () => {
  const navigate = useNavigate();
  const { vendor } = useVendorAuthStore();
  const { categories, initialize: initCategories } = useCategoryStore();
  const { brands, initialize: initBrands, fetchBrands } = useBrandStore();

  const vendorId = vendor?.id;
  const vendorName = vendor?.storeName || vendor?.name || "Vendor";

  const [formData, setFormData] = useState({
    name: "",
    sku: "",
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
    isFeatured: false,
    isVisible: true,
    codAllowed: true,
    returnable: true,
    cancelable: true,
    taxIncluded: false,
    description: "",
    tags: [],
    attributes: [], // Array of { attributeId, attributeName, values: [valueId, ...] }
    seoTitle: "",
    seoDescription: "",
    relatedProducts: [],
  });

  const [availableAttributes, setAvailableAttributes] = useState([]);
  const [attributeValuesMap, setAttributeValuesMap] = useState({}); // { attributeId: [values] }
  const [loadingAttributes, setLoadingAttributes] = useState(false);

  // Multi-step form state
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 3; // Basic Info, Variations, Additional Details

  // Color variants state
  const [colorVariants, setColorVariants] = useState([]);

  useEffect(() => {
    initCategories();
    fetchBrands(); // Fetch brands from API
    fetchAttributes();
  }, [initCategories, fetchBrands]);

  // Fetch all active attributes
  const fetchAttributes = async () => {
    try {
      setLoadingAttributes(true);
      const response = await api.get('/attributes');
      if (response.success && response.data?.attributes) {
        const activeAttributes = response.data.attributes
          .filter(attr => attr.status === 'active')
          .map(attr => ({
            id: attr._id || attr.id,
            name: attr.name,
            type: attr.type,
            required: attr.required,
          }));
        setAvailableAttributes(activeAttributes);

        // Fetch values for all attributes
        await Promise.all(
          activeAttributes.map(async (attr) => {
            try {
              const valuesResponse = await api.get(`/attribute-values?attributeId=${attr.id}`);
              if (valuesResponse.success && valuesResponse.data?.attributeValues) {
                const activeValues = valuesResponse.data.attributeValues
                  .filter(val => val.status === 'active')
                  .map(val => ({
                    id: val._id || val.id,
                    value: val.value,
                    displayOrder: val.displayOrder || 0,
                  }))
                  .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
                setAttributeValuesMap(prev => ({
                  ...prev,
                  [attr.id]: activeValues,
                }));
              }
            } catch (error) {
              console.error(`Error fetching values for attribute ${attr.id}:`, error);
            }
          })
        );
      }
    } catch (error) {
      console.error('Error fetching attributes:', error);
      toast.error('Failed to load attributes');
    } finally {
      setLoadingAttributes(false);
    }
  };

  const [showAttributeSelector, setShowAttributeSelector] = useState(false);
  const [selectedAttributeToAdd, setSelectedAttributeToAdd] = useState('');

  // Get available attributes that haven't been added yet
  const getAvailableAttributesForSelection = () => {
    return availableAttributes.filter(
      attr => !formData.attributes.some(a =>
        (a.attributeId || a.attributeId?.toString()) === (attr.id || attr._id)?.toString()
      )
    );
  };

  // Add attribute to product
  const handleAddAttribute = () => {
    if (availableAttributes.length === 0) {
      toast.error('No attributes available');
      return;
    }

    const availableAttrs = getAvailableAttributesForSelection();
    if (availableAttrs.length === 0) {
      toast.error('All available attributes have been added');
      return;
    }

    setShowAttributeSelector(true);
  };

  // Confirm adding selected attribute
  const handleConfirmAddAttribute = () => {
    if (!selectedAttributeToAdd) {
      toast.error('Please select an attribute');
      return;
    }

    const selectedAttr = availableAttributes.find(
      attr => (attr.id || attr._id).toString() === selectedAttributeToAdd
    );

    if (!selectedAttr) {
      toast.error('Selected attribute not found');
      return;
    }

    setFormData({
      ...formData,
      attributes: [
        ...formData.attributes,
        {
          attributeId: selectedAttr.id || selectedAttr._id,
          attributeName: selectedAttr.name,
          values: [],
        },
      ],
    });

    setSelectedAttributeToAdd('');
    setShowAttributeSelector(false);
  };

  // Remove attribute from product
  const handleRemoveAttribute = (index) => {
    setFormData({
      ...formData,
      attributes: formData.attributes.filter((_, i) => i !== index),
    });
  };

  // Update attribute values
  const handleAttributeValueChange = (attributeIndex, selectedValues) => {
    const updatedAttributes = [...formData.attributes];
    updatedAttributes[attributeIndex].values = selectedValues;
    setFormData({
      ...formData,
      attributes: updatedAttributes,
    });
  };

  useEffect(() => {
    if (!vendorId) {
      toast.error("Please log in to add products");
      navigate("/vendor/login");
    }
  }, [vendorId, navigate]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    // Use functional update to ensure proper state batching
    // This fixes the issue where CategorySelector calls onChange twice
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
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
    setColorVariants([
      ...colorVariants,
      {
        colorName: "",
        colorCode: "",
        thumbnailImage: "",
        sizeVariants: [],
      },
    ]);
  };

  const removeColorVariant = (index) => {
    setColorVariants(colorVariants.filter((_, i) => i !== index));
  };

  const updateColorVariant = (index, field, value) => {
    const updated = [...colorVariants];
    updated[index] = { ...updated[index], [field]: value };
    setColorVariants(updated);
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
      updateColorVariant(index, "thumbnailImage", reader.result);
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
      for (let i = 0; i < colorVariants.length; i++) {
        const cv = colorVariants[i];
        if (!cv.colorName) {
          toast.error(`Color variant ${i + 1} must have a color name`);
          return;
        }
        if (cv.sizeVariants.length === 0) {
          toast.error(`Color variant "${cv.colorName}" must have at least one size`);
          return;
        }
        for (let j = 0; j < cv.sizeVariants.length; j++) {
          const sv = cv.sizeVariants[j];
          if (!sv.size || sv.stockQuantity === undefined) {
            toast.error(`Size variant ${j + 1} for "${cv.colorName}" is incomplete`);
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
        sku: formData.sku && formData.sku.trim() ? formData.sku.trim().toUpperCase() : null,
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
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-colors ${
                    currentStep === step
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
                    ? "Variations"
                    : "Additional"}
                </span>
              </div>
              {step < 3 && (
                <div
                  className={`h-1 flex-1 mx-2 ${
                    currentStep > step ? "bg-green-500" : "bg-gray-200"
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
                SKU (Stock Keeping Unit)
              </label>
              <input
                type="text"
                name="sku"
                value={formData.sku}
                onChange={(e) => {
                  // Auto-uppercase SKU and allow only alphanumeric, dash, underscore
                  const value = e.target.value.toUpperCase().replace(/[^A-Z0-9-_]/g, '');
                  setFormData({ ...formData, sku: value });
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                placeholder="PROD-001"
                maxLength={100}
              />
              <p className="text-xs text-gray-500 mt-1">
                Unique identifier for inventory tracking (optional)
              </p>
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
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Brand
              </label>
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
            Next: Variations
            <FiChevronRight />
          </button>
        </div>
          </>
        )}

        {/* Step 2: Color & Size Variations */}
        {currentStep === 2 && (
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
                    {/* Color Name */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Color Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={colorVariant.colorName}
                        onChange={(e) =>
                          updateColorVariant(colorIndex, "colorName", e.target.value)
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                        placeholder="e.g., Red, Blue, Black"
                        required
                      />
                    </div>

                    {/* Color Code with Hex Picker */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Color Code (Hex)
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={colorVariant.colorCode && /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(colorVariant.colorCode) 
                            ? colorVariant.colorCode 
                            : "#000000"}
                          onChange={(e) =>
                            updateColorVariant(colorIndex, "colorCode", e.target.value)
                          }
                          className="w-12 h-10 border border-gray-300 rounded-lg cursor-pointer"
                          title="Pick a color"
                        />
                        <input
                          type="text"
                          value={colorVariant.colorCode || ""}
                          onChange={(e) => {
                            let value = e.target.value;
                            // Validate hex color format
                            if (value === "" || /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(value)) {
                              updateColorVariant(colorIndex, "colorCode", value);
                            }
                          }}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                          placeholder="#FF0000"
                          pattern="^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$"
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Use color picker or enter hex code (e.g., #FF0000)
                      </p>
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
                        Size Variants
                      </h4>
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
                    </div>

                    {colorVariant.sizeVariants.length === 0 ? (
                      <div className="text-center py-4 border border-dashed border-gray-300 rounded-lg bg-gray-50">
                        <p className="text-xs text-gray-500">
                          No sizes added. Click "Add Size" to add size variants.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {colorVariant.sizeVariants.map((sizeVariant, sizeIndex) => (
                          <div
                            key={sizeIndex}
                            className="grid grid-cols-1 md:grid-cols-5 gap-2 p-3 bg-white border border-gray-200 rounded-lg">
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
                            <div>
                              <label className="block text-xs font-semibold text-gray-700 mb-1">
                                Price
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
                                className="w-full px-2 py-1.5 text-red-600 hover:bg-red-50 rounded transition-colors text-sm">
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
            Next: Additional Details
            <FiChevronRight />
          </button>
        </div>
          </>
        )}

        {/* Step 3: Additional Details */}
        {currentStep === 3 && (
          <>
        {/* Product Attributes */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-base font-bold text-gray-800">
              Product Attributes
            </h2>
            <button
              type="button"
              onClick={handleAddAttribute}
              disabled={loadingAttributes || getAvailableAttributesForSelection().length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed">
              <FiPlus className="text-sm" />
              Add Attribute
            </button>
          </div>

          {loadingAttributes ? (
            <div className="text-center py-4 text-sm text-gray-500">
              Loading attributes...
            </div>
          ) : (
            <>
              {/* Attribute Selector Modal */}
              {showAttributeSelector && (
                <div className="mb-3 p-3 border border-primary-300 rounded-lg bg-primary-50">
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-gray-700">
                      Select Attribute to Add
                    </label>
                    <AnimatedSelect
                      value={selectedAttributeToAdd}
                      onChange={(e) => setSelectedAttributeToAdd(e.target.value)}
                      placeholder="Choose an attribute"
                      options={[
                        { value: '', label: 'Choose an attribute' },
                        ...getAvailableAttributesForSelection().map(attr => ({
                          value: (attr.id || attr._id).toString(),
                          label: attr.name,
                        })),
                      ]}
                    />
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleConfirmAddAttribute}
                        disabled={!selectedAttributeToAdd}
                        className="px-3 py-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed">
                        Add
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowAttributeSelector(false);
                          setSelectedAttributeToAdd('');
                        }}
                        className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-xs font-semibold">
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {formData.attributes.length === 0 ? (
                <div className="text-center py-4 text-sm text-gray-500 border border-gray-200 rounded-lg bg-gray-50">
                  No attributes added. Click "Add Attribute" to select attributes.
                </div>
              ) : (
                <div className="space-y-3">
                  {formData.attributes.map((attr, index) => {
                    const attribute = availableAttributes.find(a =>
                      (a.id || a._id).toString() === (attr.attributeId || attr.attributeId?.toString())
                    );
                    const values = attributeValuesMap[attr.attributeId] || [];

                    return (
                      <div key={index} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-xs font-semibold text-gray-700">
                            {attr.attributeName}
                            {attribute?.required && <span className="text-red-500 ml-1">*</span>}
                          </label>
                          <button
                            type="button"
                            onClick={() => handleRemoveAttribute(index)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors">
                            <FiTrash2 className="text-sm" />
                          </button>
                        </div>

                        {values.length === 0 ? (
                          <p className="text-xs text-gray-500">No values available for this attribute</p>
                        ) : (
                          <div className="space-y-2">
                            {attribute?.type === 'select' ? (
                              <AnimatedSelect
                                value={attr.values[0] || ''}
                                onChange={(e) => {
                                  handleAttributeValueChange(index, e.target.value ? [e.target.value] : []);
                                }}
                                placeholder={`Select ${attr.attributeName}`}
                                options={[
                                  { value: '', label: `Select ${attr.attributeName}` },
                                  ...values.map(val => ({
                                    value: val.id.toString(),
                                    label: val.value,
                                  })),
                                ]}
                                required={attribute?.required}
                              />
                            ) : (
                              <div className="flex flex-wrap gap-2">
                                {values.map((val) => {
                                  const isSelected = attr.values.includes(val.id.toString());
                                  return (
                                    <button
                                      key={val.id}
                                      type="button"
                                      onClick={() => {
                                        const newValues = isSelected
                                          ? attr.values.filter(v => v !== val.id.toString())
                                          : [...attr.values, val.id.toString()];
                                        handleAttributeValueChange(index, newValues);
                                      }}
                                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${isSelected
                                        ? 'bg-primary-600 text-white hover:bg-primary-700'
                                        : 'bg-white text-gray-700 border border-gray-300 hover:border-primary-500 hover:bg-primary-50'
                                        }`}>
                                      {val.value}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                            {attr.values.length > 0 && (
                              <p className="text-xs text-gray-500">
                                Selected: {attr.values.length} value(s)
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

        {/* Tags */}
        <div>
          <h2 className="text-base font-bold text-gray-800 mb-2">Tags</h2>
          <div>
            <input
              type="text"
              value={(formData.tags || []).join(", ")}
              onChange={(e) => {
                const tags = e.target.value
                  .split(",")
                  .map((t) => t.trim())
                  .filter((t) => t);
                setFormData({ ...formData, tags });
              }}
              placeholder="tag1, tag2, tag3"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
            />
            <p className="mt-1 text-xs text-gray-500">
              Separate tags with commas
            </p>
          </div>
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

