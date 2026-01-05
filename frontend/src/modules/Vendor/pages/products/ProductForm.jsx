import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FiSave, FiX, FiUpload, FiPlus, FiTrash2, FiCopy } from "react-icons/fi";
import { motion } from "framer-motion";
import { useVendorAuthStore } from "../../store/vendorAuthStore";
import { useCategoryStore } from "../../../../shared/store/categoryStore";
import { useBrandStore } from "../../../../shared/store/brandStore";
import CategorySelector from "../../../Admin/components/CategorySelector";
import AnimatedSelect from "../../../Admin/components/AnimatedSelect";
import TagInput from "../../components/TagInput";
import ColorPicker from "../../components/ColorPicker";
import { getVendorProductById, updateVendorProduct, createVendorProduct } from "../../services/productService";
import toast from "react-hot-toast";

const ProductForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { vendor } = useVendorAuthStore();
  const isEdit = id && id !== "new";

  const vendorId = vendor?.id;
  const vendorName = vendor?.storeName || vendor?.name || "Vendor";

  const { categories, initialize: initCategories } = useCategoryStore();
  const { brands, fetchBrands } = useBrandStore();

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
    isVisible: true,
    codAllowed: true,
    returnable: true,
    cancelable: true,
    taxIncluded: false,
    description: "",
    tags: [],
    hasSizes: true,
    productType: "standard",
    attributes: [], // [{ name: "", value: "", group: "", isRequired: false }]
    sizes: [], // Simple array of size strings
    variants: {
      sizes: [],
      colors: [],
      materials: [],
      prices: {},
      defaultVariant: {},
    },
    seoTitle: "",
    seoDescription: "",
    relatedProducts: [],
    isCouponEligible: false,
  });

  const [colorVariants, setColorVariants] = useState([]);

  useEffect(() => {
    initCategories();
    fetchBrands(); // Fetch brands from API
  }, [fetchBrands]);

  // Normalize category IDs to strings when categories are loaded (for edit mode)
  useEffect(() => {
    if (isEdit && categories.length > 0) {
      setFormData((prev) => ({
        ...prev,
        categoryId: prev.categoryId ? String(prev.categoryId) : null,
        subcategoryId: prev.subcategoryId ? String(prev.subcategoryId) : null,
        subSubCategoryId: prev.subSubCategoryId ? String(prev.subSubCategoryId) : null,
      }));
    }
  }, [isEdit, categories.length]);

  // Debug: Log when categoryId changes
  useEffect(() => {
    console.log('formData.categoryId changed to:', formData.categoryId);
  }, [formData.categoryId]);

  // Ensure brandId is properly formatted when brands are loaded (for edit mode)
  useEffect(() => {
    if (isEdit && formData.brandId && brands.length > 0) {
      // Normalize brandId to string format to match options
      const currentBrandId = String(formData.brandId);
      const brandExists = brands.some(brand => {
        const brandId = String(brand._id || brand.id || brand);
        return brandId === currentBrandId;
      });
      
      // If brand exists but format is different, normalize it
      if (brandExists) {
        const matchingBrand = brands.find(brand => {
          const brandId = String(brand._id || brand.id || brand);
          return brandId === currentBrandId;
        });
        
        if (matchingBrand) {
          const normalizedBrandId = String(matchingBrand._id || matchingBrand.id || matchingBrand);
          if (normalizedBrandId !== currentBrandId) {
            setFormData(prev => ({
              ...prev,
              brandId: normalizedBrandId
            }));
          }
        }
      }
    }
  }, [isEdit, brands, formData.brandId]);

  const [loading, setLoading] = useState(false);

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

  useEffect(() => {
    if (!vendorId) {
      toast.error("Please log in to edit products");
      navigate("/vendor/login");
      return;
    }

    if (isEdit && id) {
      loadProduct();
    }
  }, [isEdit, id, vendorId, navigate]);

  const loadProduct = async () => {
    if (!id || !vendorId) return;

    setLoading(true);
    try {
      const product = await getVendorProductById(id);

      // Map categories from the product - normalize to strings
      // Handle both populated objects and direct IDs
      let categoryId = null;
      if (product.categoryId) {
        if (typeof product.categoryId === 'object' && product.categoryId !== null) {
          categoryId = String(product.categoryId._id || product.categoryId.id || product.categoryId);
        } else {
          categoryId = String(product.categoryId);
        }
      }
      
      let subcategoryId = null;
      if (product.subcategoryId) {
        if (typeof product.subcategoryId === 'object' && product.subcategoryId !== null) {
          subcategoryId = String(product.subcategoryId._id || product.subcategoryId.id || product.subcategoryId);
        } else {
          subcategoryId = String(product.subcategoryId);
        }
      }
      
      let subSubCategoryId = null;
      if (product.subSubCategoryId) {
        if (typeof product.subSubCategoryId === 'object' && product.subSubCategoryId !== null) {
          subSubCategoryId = String(product.subSubCategoryId._id || product.subSubCategoryId.id || product.subSubCategoryId);
        } else {
          subSubCategoryId = String(product.subSubCategoryId);
        }
      }
      
      // Extract brandId - handle both populated object and direct ID
      let brandIdValue = null;
      if (product.brandId) {
        if (typeof product.brandId === 'object' && product.brandId !== null) {
          // Populated object - extract _id
          brandIdValue = (product.brandId._id || product.brandId.id || product.brandId).toString();
        } else {
          // Direct ID (string or ObjectId)
          brandIdValue = product.brandId.toString();
        }
      }

      setFormData({
        name: product.name || "",
        unit: product.unit || "",
        price: product.price || "",
        originalPrice: product.originalPrice || product.price || "",
        image: product.image || "",
        images: product.images || [],
        categoryId: categoryId,
        subcategoryId: subcategoryId,
        subSubCategoryId: subSubCategoryId,
        brandId: brandIdValue,
        stock: product.stock || "in_stock",
        stockQuantity: product.stockQuantity || "",
        totalAllowedQuantity: product.totalAllowedQuantity || "",
        minimumOrderQuantity: product.minimumOrderQuantity || "",
        warrantyPeriod: product.warrantyPeriod || "",
        guaranteePeriod: product.guaranteePeriod || "",
        hsnCode: product.hsnCode || "",
        flashSale: product.flashSale || false,
        isNew: product.isNew || false,
        isTrending: product.isTrending || false,
        isVisible: product.isVisible !== undefined ? product.isVisible : true,
        codAllowed: product.codAllowed !== undefined ? product.codAllowed : true,
        returnable: product.returnable !== undefined ? product.returnable : true,
        cancelable: product.cancelable !== undefined ? product.cancelable : true,
        taxIncluded: product.taxIncluded || false,
        description: product.description || "",
        tags: product.tags || [],
        hasSizes: product.hasSizes !== undefined ? product.hasSizes : true,
        productType: product.productType || "standard",
        attributes: (product.attributes || []).map(attr => ({
          name: attr.name || "",
          value: attr.value || "",
          group: attr.group || "",
          isRequired: attr.isRequired || false,
        })),
        sizes: product.sizes || [],
        variants: {
          sizes: product.variants?.sizes || [],
          colors: product.variants?.colors || [],
          materials: product.variants?.materials || [],
          prices: product.variants?.prices || {},
          defaultVariant: product.variants?.defaultVariant || {},
        },
        seoTitle: product.seoTitle || "",
        seoDescription: product.seoDescription || "",
        relatedProducts: product.relatedProducts || [],
      });

      // Initialize color variants
      if (product.variants?.colorVariants && product.variants.colorVariants.length > 0) {
        setColorVariants(product.variants.colorVariants.map(cv => ({
          ...cv,
          sizeVariants: cv.sizeVariants || []
        })));
      } else {
        setColorVariants([]);
      }
    } catch (error) {
      console.error("Error loading product:", error);
      toast.error("Failed to load product");
      navigate("/vendor/products/manage-products");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    // Handle category changes - ensure proper clearing of dependent categories
    if (name === "categoryId") {
      setFormData((prev) => ({
        ...prev,
        categoryId: value ? String(value) : null,
        // Clear subcategory and sub-subcategory when main category changes
        subcategoryId: null,
        subSubCategoryId: null,
      }));
    } else if (name === "subcategoryId") {
      setFormData((prev) => ({
        ...prev,
        subcategoryId: value ? String(value) : null,
        // Clear sub-subcategory when subcategory changes
        subSubCategoryId: null,
      }));
    } else if (name === "subSubCategoryId") {
      setFormData((prev) => ({
        ...prev,
        subSubCategoryId: value ? String(value) : null,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: type === "checkbox" ? checked : value,
      }));
    }
  };

  // Custom handler for category changes that properly handles batched updates
  // React 18 automatically batches synchronous setState calls, but we need to ensure
  // all three category fields are updated correctly
  const handleCategoryChange = (e) => {
    const { name, value } = e.target;
    const normalizedValue = value ? String(value) : null;
    
    console.log('Category change:', { name, value, normalizedValue }); // Debug log
    
    // Use functional update to ensure we always work with the latest state
    // React will batch multiple calls to setFormData, but each call will see
    // the result of the previous call in the same batch
    setFormData((prev) => {
      // Create a new object to ensure React detects the change
      const updates = { ...prev };
      
      if (name === "categoryId") {
        // When main category changes, update it and clear dependent categories
        updates.categoryId = normalizedValue;
        updates.subcategoryId = null;
        updates.subSubCategoryId = null;
        console.log('Updated categoryId to:', normalizedValue); // Debug log
      } else if (name === "subcategoryId") {
        // When subcategory changes, update it and clear sub-subcategory
        updates.subcategoryId = normalizedValue;
        updates.subSubCategoryId = null;
        // Keep existing categoryId
      } else if (name === "subSubCategoryId") {
        // When sub-subcategory changes, just update it
        updates.subSubCategoryId = normalizedValue;
        // Keep existing categoryId and subcategoryId
      }
      
      return updates;
    });
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

  const updateColorVariant = (index, updates) => {
    setColorVariants((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], ...updates };
      return updated;
    });
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

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!vendorId) {
      toast.error("Please log in to save products");
      return;
    }

    // Validation
    if (!formData.name || !formData.price || !formData.stockQuantity) {
      toast.error("Please fill in all required fields");
      return;
    }

    // Validate required custom attributes
    const missingRequired = formData.attributes.filter(
      (attr) => attr.isRequired && (!attr.name || !attr.value)
    );
    if (missingRequired.length > 0) {
      toast.error(`Please fill in required attribute: ${missingRequired[0].name || "Unnamed attribute"}`);
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
      // Validate required fields before submitting
      if (!formData.name || !formData.name.trim()) {
        toast.error('Product name is required');
        return;
      }

      if (!formData.price || isNaN(parseFloat(formData.price)) || parseFloat(formData.price) <= 0) {
        toast.error('Valid price is required');
        return;
      }

      if (formData.stockQuantity === '' || formData.stockQuantity === null || formData.stockQuantity === undefined) {
        toast.error('Stock quantity is required');
        return;
      }

      const parsedPrice = parseFloat(formData.price);
      const parsedStockQuantity = parseInt(formData.stockQuantity);

      if (isNaN(parsedPrice) || parsedPrice <= 0) {
        toast.error('Price must be a valid positive number');
        return;
      }

      if (isNaN(parsedStockQuantity) || parsedStockQuantity < 0) {
        toast.error('Stock quantity must be a valid non-negative number');
        return;
      }

      // Handle category/brand IDs - extract string ID if object
      const getCategoryId = (id) => {
        if (!id) return null;
        if (typeof id === 'object' && id !== null) {
          return id._id || id.id || id;
        }
        return id.toString();
      };

      // Final product data
      // Ensure category fields are always sent (even if null) in edit mode so backend knows to update them
      const productData = {
        ...formData,
        vendorId,
        vendorName,
        name: formData.name.trim(),
        price: parsedPrice,
        originalPrice: formData.originalPrice && String(formData.originalPrice).trim()
          ? (isNaN(parseFloat(formData.originalPrice)) ? null : parseFloat(formData.originalPrice))
          : null,
        stockQuantity: parsedStockQuantity,
        totalAllowedQuantity: formData.totalAllowedQuantity && String(formData.totalAllowedQuantity).trim()
          ? (isNaN(parseInt(formData.totalAllowedQuantity)) ? null : parseInt(formData.totalAllowedQuantity))
          : null,
        minimumOrderQuantity: formData.minimumOrderQuantity && String(formData.minimumOrderQuantity).trim()
          ? (isNaN(parseInt(formData.minimumOrderQuantity)) ? 1 : parseInt(formData.minimumOrderQuantity))
          : 1,
        // Always send category fields explicitly (even if null) so backend knows to update them
        categoryId: getCategoryId(formData.categoryId),
        subcategoryId: getCategoryId(formData.subcategoryId),
        subSubCategoryId: getCategoryId(formData.subSubCategoryId),
        brandId: getCategoryId(formData.brandId),
        variants: {
          ...formData.variants,
          colorVariants: colorVariants.map((cv) => ({
            ...cv,
            sizeVariants: cv.sizeVariants.map((sv) => ({
              ...sv,
              price: sv.price && !isNaN(parseFloat(sv.price)) ? parseFloat(sv.price) : null,
              originalPrice: sv.originalPrice && !isNaN(parseFloat(sv.originalPrice))
                ? parseFloat(sv.originalPrice)
                : null,
              stockQuantity: sv.stockQuantity && !isNaN(parseInt(sv.stockQuantity)) ? parseInt(sv.stockQuantity) : 0,
            })),
          })),
        },
      };

      if (isEdit) {
        await updateVendorProduct(id, productData);
        toast.success("Product updated successfully");
      } else {
        await createVendorProduct(productData);
        toast.success("Product created successfully");
      }

      navigate("/vendor/products/manage-products");
    } catch (error) {
      console.error("Error saving product:", error);
      toast.error(error.response?.data?.message || "Failed to save product");
    }
  };

  if (!vendorId) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Please log in to manage products</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-gray-500">Loading product...</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3">
      {/* Form */}
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-xl p-3 sm:p-4 shadow-sm border border-gray-200 space-y-4">
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
                key={`category-${formData.categoryId || 'none'}-${formData.subcategoryId || 'none'}-${formData.subSubCategoryId || 'none'}`}
                value={formData.categoryId ? String(formData.categoryId) : null}
                subcategoryId={formData.subcategoryId ? String(formData.subcategoryId) : null}
                subSubCategoryId={formData.subSubCategoryId ? String(formData.subSubCategoryId) : null}
                onChange={handleCategoryChange}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Brand
              </label>
              <AnimatedSelect
                name="brandId"
                value={formData.brandId ? String(formData.brandId) : ""}
                onChange={handleChange}
                placeholder="Select Brand"
                options={[
                  { value: "", label: "Select Brand" },
                  ...brands
                    .filter((brand) => brand.isActive !== false)
                    .map((brand) => {
                      const brandId = String(brand._id || brand.id || brand);
                      return { 
                        value: brandId, 
                        label: brand.name 
                      };
                    }),
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
                Stock Quantity <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="stockQuantity"
                value={formData.stockQuantity}
                onChange={handleChange}
                required
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                placeholder="0"
              />
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
                      value={attr.name || ""}
                      onChange={(e) => updateAttribute(index, "name", e.target.value)}
                      placeholder="e.g. Fragrance Notes"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                    />
                  </div>

                  <div className="md:col-span-1">
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Value</label>
                    <input
                      type="text"
                      value={attr.value || ""}
                      onChange={(e) => updateAttribute(index, "value", e.target.value)}
                      placeholder="e.g. Floral, Citrus"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                    />
                  </div>

                  <div className="md:col-span-1">
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Group</label>
                    <input
                      type="text"
                      value={attr.group || ""}
                      onChange={(e) => updateAttribute(index, "group", e.target.value)}
                      placeholder="e.g. Specifications"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                    />
                  </div>

                  <div className="md:col-span-1 flex items-center mt-5">
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={attr.isRequired || false}
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

        {/* Product Variants (Advanced) */}
        <div className="bg-gradient-to-br from-primary-50 to-white rounded-xl p-4 border-2 border-primary-100 shadow-md">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-gray-800">
                Product Variants
              </h2>
              <p className="text-xs text-gray-500">
                Add color options with size variants.
              </p>
            </div>
            <button
              type="button"
              onClick={addColorVariant}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-xs font-semibold shadow-sm">
              <FiPlus /> Add Color
            </button>
          </div>

          <div className="space-y-4">
            {colorVariants.map((colorVariant, colorIndex) => (
              <div
                key={colorIndex}
                className="border-2 border-primary-200 rounded-xl p-4 bg-white">
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
                      Color Selection <span className="text-red-500">*</span>
                    </label>
                    <ColorPicker
                      selectedColors={colorVariant.colorName ? [{ 
                        name: colorVariant.colorName, 
                        value: colorVariant.colorCode || colorVariant.colorName.toLowerCase() 
                      }] : []}
                      onChange={(colors) => {
                      const color = colors[colors.length - 1];
                      if (color) {
                        updateColorVariant(colorIndex, {
                          colorName: color.name,
                          colorCode: color.value
                        });
                      } else {
                        updateColorVariant(colorIndex, {
                          colorName: "",
                          colorCode: ""
                        });
                      }
                    }}
                    />
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

                {/* Size Variants */}
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

                  {/* Bulk Add Sizes */}
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
                          className="grid grid-cols-1 md:grid-cols-5 gap-2 p-3 bg-white border border-gray-200 rounded-lg shadow-sm">
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
                              placeholder="S, M, L"
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
                              className="w-full px-2 py-1.5 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                              placeholder="Base price"
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
                              className="w-full px-2 py-1.5 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                              required
                            />
                          </div>
                          <div className="flex items-end pb-1.5">
                            <button
                              type="button"
                              onClick={() => removeSizeVariant(colorIndex, sizeIndex)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors">
                              <FiTrash2 className="text-sm" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {colorVariants.length === 0 && (
              <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50">
                <p className="text-sm text-gray-500 mb-2">No variants added yet</p>
                <button
                  type="button"
                  onClick={addColorVariant}
                  className="inline-flex items-center gap-1.5 text-primary-600 font-semibold hover:text-primary-700 transition-colors">
                  <FiPlus /> Add your first color variant
                </button>
              </div>
            )}
          </div>
        </div>

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

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-3 border-t border-gray-200">
          <button
            type="button"
            onClick={() => navigate("/vendor/products/manage-products")}
            className="w-full sm:w-auto px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-semibold text-sm">
            Cancel
          </button>
          <button
            type="submit"
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 gradient-green text-white rounded-lg hover:shadow-glow-green transition-all font-semibold text-sm">
            <FiSave />
            {isEdit ? "Update Product" : "Create Product"}
          </button>
        </div>
      </form>
    </motion.div>
  );
};

export default ProductForm;

