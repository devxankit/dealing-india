import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FiSave, FiX, FiUpload, FiPlus, FiTrash2 } from "react-icons/fi";
import { motion } from "framer-motion";
import { useVendorAuthStore } from "../../store/vendorAuthStore";
import { useCategoryStore } from "../../../../shared/store/categoryStore";
import { useBrandStore } from "../../../../shared/store/brandStore";
import CategorySelector from "../../../Admin/components/CategorySelector";
import AnimatedSelect from "../../../Admin/components/AnimatedSelect";
import { getVendorProductById, updateVendorProduct, createVendorProduct } from "../../services/productService";
import api from "../../../../shared/utils/api";
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
  });

  const [availableAttributes, setAvailableAttributes] = useState([]);
  const [attributeValuesMap, setAttributeValuesMap] = useState({});
  const [loadingAttributes, setLoadingAttributes] = useState(false);
  const [showAttributeSelector, setShowAttributeSelector] = useState(false);
  const [selectedAttributeToAdd, setSelectedAttributeToAdd] = useState('');

  useEffect(() => {
    initCategories();
    fetchBrands(); // Fetch brands from API
    fetchAttributes();
  }, [fetchBrands]);

  const [loading, setLoading] = useState(false);

  // Fetch all active attributes
  const fetchAttributes = async () => {
    try {
      setLoadingAttributes(true);
      const response = await api.get('/admin/attributes');
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
              const valuesResponse = await api.get(`/admin/attribute-values?attributeId=${attr.id}`);
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
    } finally {
      setLoadingAttributes(false);
    }
  };

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

      // Determine if categoryId is a subcategory
      const category = categories.find(
        (cat) => cat.id === product.categoryId?.toString()
      );
      const isSubcategory = category && category.parentId;

      setFormData({
        name: product.name || "",
        unit: product.unit || "",
        price: product.price || "",
        originalPrice: product.originalPrice || product.price || "",
        image: product.image || "",
        images: product.images || [],
        categoryId: isSubcategory
          ? category.parentId
          : product.categoryId?.toString() || null,
        subcategoryId: isSubcategory
          ? product.categoryId?.toString()
          : product.subcategoryId?.toString() || null,
        brandId: product.brandId?.toString() || null,
        stock: product.stock || "in_stock",
        stockQuantity: product.stockQuantity || "",
        totalAllowedQuantity: product.totalAllowedQuantity || "",
        minimumOrderQuantity: product.minimumOrderQuantity || "",
        warrantyPeriod: product.warrantyPeriod || "",
        guaranteePeriod: product.guaranteePeriod || "",
        hsnCode: product.hsnCode || "",
        flashSale: product.flashSale || false,
        isNew: product.isNew || false,
        isFeatured: product.isFeatured || false,
        isVisible: product.isVisible !== undefined ? product.isVisible : true,
        codAllowed: product.codAllowed !== undefined ? product.codAllowed : true,
        returnable: product.returnable !== undefined ? product.returnable : true,
        cancelable: product.cancelable !== undefined ? product.cancelable : true,
        taxIncluded: product.taxIncluded || false,
        description: product.description || "",
        tags: product.tags || [],
        attributes: (product.attributes || []).map(attr => ({
          attributeId: attr.attributeId?._id || attr.attributeId || attr.attributeId,
          attributeName: attr.attributeName || attr.attributeId?.name || '',
          values: (attr.values || []).map(val => val._id?.toString() || val.toString() || val),
        })),
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
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
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

    try {
      // Prepare product data
      const productData = {
        ...formData,
        price: parseFloat(formData.price),
        originalPrice: formData.originalPrice
          ? parseFloat(formData.originalPrice)
          : null,
        stockQuantity: parseInt(formData.stockQuantity),
        totalAllowedQuantity: formData.totalAllowedQuantity
          ? parseInt(formData.totalAllowedQuantity)
          : null,
        minimumOrderQuantity: formData.minimumOrderQuantity
          ? parseInt(formData.minimumOrderQuantity)
          : null,
        categoryId: formData.categoryId ? formData.categoryId : null,
        subcategoryId: formData.subcategoryId ? formData.subcategoryId : null,
        brandId: formData.brandId ? formData.brandId : null,
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
                value={formData.categoryId}
                subcategoryId={formData.subcategoryId}
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
                                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                        isSelected
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

        {/* Product Variants */}
        <div>
          <h2 className="text-base font-bold text-gray-800 mb-2">
            Product Variants
          </h2>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Sizes (comma-separated)
              </label>
              <input
                type="text"
                value={(formData.variants?.sizes || []).join(", ")}
                onChange={(e) => {
                  const sizes = e.target.value
                    .split(",")
                    .map((s) => s.trim())
                    .filter((s) => s);
                  setFormData({
                    ...formData,
                    variants: { ...formData.variants, sizes },
                  });
                }}
                placeholder="S, M, L, XL"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Colors (comma-separated)
              </label>
              <input
                type="text"
                value={(formData.variants?.colors || []).join(", ")}
                onChange={(e) => {
                  const colors = e.target.value
                    .split(",")
                    .map((c) => c.trim())
                    .filter((c) => c);
                  setFormData({
                    ...formData,
                    variants: { ...formData.variants, colors },
                  });
                }}
                placeholder="Red, Blue, Green, Black"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
              />
            </div>
          </div>
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

