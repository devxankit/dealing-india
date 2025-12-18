import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FiSave, FiX, FiUpload, FiPlus, FiTrash2 } from "react-icons/fi";
import { motion } from "framer-motion";
import { products as initialProducts } from "../../../data/products";
import { useCategoryStore } from "../../../shared/store/categoryStore";
import { useBrandStore } from "../../../shared/store/brandStore";
import CategorySelector from "../components/CategorySelector";
import AnimatedSelect from "../components/AnimatedSelect";
import toast from "react-hot-toast";

const ProductForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = id && id !== "new";

  const productsPath = "/admin/products";

  const { categories, initialize: initCategories } = useCategoryStore();
  const { brands, initialize: initBrands } = useBrandStore();

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
    flashSale: false,
    isNew: false,
    isFeatured: false,
    isVisible: true,
    description: "",
    tags: [],
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

  useEffect(() => {
    initCategories();
    initBrands();
  }, []);

  useEffect(() => {
    if (isEdit && categories.length > 0) {
      const savedProducts = localStorage.getItem("admin-products");
      const products = savedProducts
        ? JSON.parse(savedProducts)
        : initialProducts;
      const product = products.find((p) => p.id === parseInt(id));

      if (product) {
        // Determine if categoryId is a subcategory
        const category = categories.find(
          (cat) => cat.id === product.categoryId
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
            : product.categoryId || null,
          subcategoryId: isSubcategory
            ? product.categoryId
            : product.subcategoryId || null,
          brandId: product.brandId || null,
          stock: product.stock || "in_stock",
          stockQuantity: product.stockQuantity || "",
          flashSale: product.flashSale || false,
          isNew: product.isNew || false,
          isFeatured: product.isFeatured || false,
          isVisible: product.isVisible !== undefined ? product.isVisible : true,
          description: product.description || "",
          tags: product.tags || [],
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
      } else {
        toast.error("Product not found");
        navigate(productsPath);
      }
    }
  }, [id, isEdit, navigate, categories, productsPath]);

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
      // Check if file is an image
      if (!file.type.startsWith("image/")) {
        toast.error("Please select an image file");
        return;
      }

      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image size should be less than 5MB");
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({
          ...formData,
          image: reader.result, // Base64 data URL
        });
      };
      reader.onerror = () => {
        toast.error("Error reading image file");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Validation
    if (!formData.name || !formData.price || !formData.stockQuantity) {
      toast.error("Please fill in all required fields");
      return;
    }

    const savedProducts = localStorage.getItem("admin-products");
    const products = savedProducts
      ? JSON.parse(savedProducts)
      : initialProducts;

    // Determine final categoryId - use subcategoryId if selected, otherwise categoryId
    const finalCategoryId = formData.subcategoryId
      ? parseInt(formData.subcategoryId)
      : formData.categoryId
      ? parseInt(formData.categoryId)
      : null;

    if (isEdit) {
      // Update existing product
      const updatedProducts = products.map((p) =>
        p.id === parseInt(id)
          ? {
              ...p,
              ...formData,
              id: parseInt(id),
              price: parseFloat(formData.price),
              originalPrice: formData.originalPrice
                ? parseFloat(formData.originalPrice)
                : null,
              stockQuantity: parseInt(formData.stockQuantity),
              categoryId: finalCategoryId,
              subcategoryId: formData.subcategoryId
                ? parseInt(formData.subcategoryId)
                : null,
              brandId: formData.brandId ? parseInt(formData.brandId) : null,
            }
          : p
      );
      localStorage.setItem("admin-products", JSON.stringify(updatedProducts));
      toast.success("Product updated successfully");
    } else {
      // Create new product
      const newId = Math.max(...products.map((p) => p.id), 0) + 1;
      const newProduct = {
        id: newId,
        ...formData,
        price: parseFloat(formData.price),
        originalPrice: formData.originalPrice
          ? parseFloat(formData.originalPrice)
          : null,
        stockQuantity: parseInt(formData.stockQuantity),
        categoryId: finalCategoryId,
        subcategoryId: formData.subcategoryId
          ? parseInt(formData.subcategoryId)
          : null,
        brandId: formData.brandId ? parseInt(formData.brandId) : null,
        rating: 0,
        reviewCount: 0,
      };
      const updatedProducts = [...products, newProduct];
      localStorage.setItem("admin-products", JSON.stringify(updatedProducts));
      toast.success("Product created successfully");
    }

    navigate(productsPath);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-800 mb-1 md:text-2xl md:font-bold md:mb-2">
            {isEdit ? "Edit Product" : "Create Product"}
          </h1>
          <p className="text-xs text-gray-600 md:text-sm">
            {isEdit
              ? "Update product information"
              : "Add a new product to your catalog"}
          </p>
        </div>
        <button
          onClick={() => navigate(productsPath)}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <FiX className="text-xl text-gray-600" />
        </button>
      </div>

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 space-y-6">
        {/* Basic Information */}
        <div>
          <h2 className="text-lg font-bold text-gray-800 mb-4">
            Basic Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Product Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Unit
              </label>
              <input
                type="text"
                name="unit"
                value={formData.unit}
                onChange={handleChange}
                placeholder="e.g., Piece, Kilogram, Gram"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
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
              <label className="block text-sm font-semibold text-gray-700 mb-2">
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
                    .map((brand) => ({
                      value: String(brand.id),
                      label: brand.name,
                    })),
                ]}
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Product description..."
              />
            </div>
          </div>
        </div>

        {/* Pricing */}
        <div>
          <h2 className="text-lg font-bold text-gray-800 mb-4">Pricing</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
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
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Original Price (for discount)
              </label>
              <input
                type="number"
                name="originalPrice"
                value={formData.originalPrice}
                onChange={handleChange}
                min="0"
                step="0.01"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>
        </div>

        {/* Image */}
        <div>
          <h2 className="text-lg font-bold text-gray-800 mb-4">Image</h2>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Upload Image
            </label>
            <div className="relative">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                id="image-upload"
              />
              <label
                htmlFor="image-upload"
                className="flex items-center justify-center gap-2 w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-primary-500 hover:bg-primary-50 transition-colors">
                <FiUpload className="text-xl text-gray-600" />
                <span className="text-sm font-medium text-gray-700">
                  {formData.image ? "Change Image" : "Choose Image to Upload"}
                </span>
              </label>
            </div>
            {formData.image && (
              <div className="mt-4">
                <img
                  src={formData.image}
                  alt="Preview"
                  className="w-32 h-32 object-cover rounded-lg border border-gray-200"
                  onError={(e) => {
                    e.target.style.display = "none";
                  }}
                />
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, image: "" })}
                  className="mt-2 text-sm text-red-600 hover:text-red-700 font-medium">
                  Remove Image
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Inventory */}
        <div>
          <h2 className="text-lg font-bold text-gray-800 mb-4">Inventory</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Stock Quantity <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="stockQuantity"
                value={formData.stockQuantity}
                onChange={handleChange}
                required
                min="0"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Stock Status
              </label>
              <AnimatedSelect
                name="stock"
                value={formData.stock}
                onChange={handleChange}
                options={[
                  { value: "in_stock", label: "In Stock" },
                  { value: "low_stock", label: "Low Stock" },
                  { value: "out_of_stock", label: "Out of Stock" },
                ]}
              />
            </div>
          </div>
        </div>

        {/* Product Variants */}
        <div>
          <h2 className="text-lg font-bold text-gray-800 mb-4">
            Product Variants
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
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
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
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
                placeholder="Red, Blue, Green"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>
        </div>

        {/* Tags */}
        <div>
          <h2 className="text-lg font-bold text-gray-800 mb-4">Tags</h2>
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
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        {/* SEO */}
        <div>
          <h2 className="text-lg font-bold text-gray-800 mb-4">SEO Settings</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                SEO Title
              </label>
              <input
                type="text"
                name="seoTitle"
                value={formData.seoTitle}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="SEO optimized title"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                SEO Description
              </label>
              <textarea
                name="seoDescription"
                value={formData.seoDescription}
                onChange={handleChange}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="SEO meta description"
              />
            </div>
          </div>
        </div>

        {/* Options */}
        <div>
          <h2 className="text-lg font-bold text-gray-800 mb-4">Options</h2>
          <div className="space-y-2">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                name="flashSale"
                checked={formData.flashSale}
                onChange={handleChange}
                className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
              />
              <span className="text-sm font-semibold text-gray-700">
                Flash Sale
              </span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                name="isNew"
                checked={formData.isNew}
                onChange={handleChange}
                className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
              />
              <span className="text-sm font-semibold text-gray-700">
                New Arrival
              </span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                name="isFeatured"
                checked={formData.isFeatured}
                onChange={handleChange}
                className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
              />
              <span className="text-sm font-semibold text-gray-700">
                Featured Product
              </span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                name="isVisible"
                checked={formData.isVisible}
                onChange={handleChange}
                className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
              />
              <span className="text-sm font-semibold text-gray-700">
                Visible to Customers
              </span>
            </label>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-4 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={() => navigate(productsPath)}
            className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-semibold">
            Cancel
          </button>
          <button
            type="submit"
            className="flex items-center gap-2 px-6 py-2 gradient-green text-white rounded-lg hover:shadow-glow-green transition-all font-semibold">
            <FiSave />
            {isEdit ? "Update Product" : "Create Product"}
          </button>
        </div>
      </form>
    </motion.div>
  );
};

export default ProductForm;
