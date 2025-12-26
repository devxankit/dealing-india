import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { FiX, FiSave, FiUpload, FiPackage, FiShoppingBag, FiStar, FiTag, FiZap, FiHeart, FiHome, FiGrid, FiBox, FiLayers, FiShoppingCart, FiTruck, FiGift, FiCoffee, FiMusic, FiCamera, FiBook, FiWatch, FiHeadphones, FiSmartphone, FiMonitor, FiCpu, FiBattery, FiWifi } from "react-icons/fi";
import { IoShirtOutline, IoBagHandleOutline, IoRestaurantOutline, IoFitnessOutline, IoCarOutline, IoHomeOutline, IoBookOutline, IoGameControllerOutline, IoMusicalNotesOutline, IoCameraOutline, IoPhonePortraitOutline, IoLaptopOutline, IoWatchOutline, IoHeadsetOutline } from "react-icons/io5";
import { LuFootprints, LuShirt, LuShoppingBag, LuUtensilsCrossed, LuDumbbell, LuCar, LuBookOpen, LuMusic, LuCamera, LuPhone, LuLaptop, LuWatch, LuHeadphones } from "react-icons/lu";
import { motion, AnimatePresence } from "framer-motion";
import { useCategoryStore } from "../../../../shared/store/categoryStore";
import AnimatedSelect from "../AnimatedSelect";
import toast from "react-hot-toast";
import Button from "../Button";

const CategoryForm = ({ category, parentId, onClose, onSave }) => {
  const location = useLocation();
  const isAppRoute = location.pathname.startsWith("/app");
  const { categories, createCategory, updateCategory, getCategoryById } =
    useCategoryStore();
  const isEdit = !!category;
  const isSubcategory = !isEdit && parentId !== null;
  const parentCategory = parentId
    ? getCategoryById(parentId)
    : category?.parentId
    ? getCategoryById(category.parentId)
    : null;

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    image: "",
    icon: "",
    parentId: null,
    isActive: true,
    order: 0,
  });

  // Available icons for selection
  const availableIcons = [
    { name: "Shirt", component: "IoShirtOutline", value: "IoShirtOutline" },
    { name: "Footwear", component: "LuFootprints", value: "LuFootprints" },
    { name: "Bag", component: "IoBagHandleOutline", value: "IoBagHandleOutline" },
    { name: "Star", component: "FiStar", value: "FiStar" },
    { name: "Tag", component: "FiTag", value: "FiTag" },
    { name: "Zap", component: "FiZap", value: "FiZap" },
    { name: "Package", component: "FiPackage", value: "FiPackage" },
    { name: "Shopping Bag", component: "FiShoppingBag", value: "FiShoppingBag" },
    { name: "Heart", component: "FiHeart", value: "FiHeart" },
    { name: "Home", component: "FiHome", value: "FiHome" },
    { name: "Grid", component: "FiGrid", value: "FiGrid" },
    { name: "Box", component: "FiBox", value: "FiBox" },
    { name: "Layers", component: "FiLayers", value: "FiLayers" },
    { name: "Shopping Cart", component: "FiShoppingCart", value: "FiShoppingCart" },
    { name: "Truck", component: "FiTruck", value: "FiTruck" },
    { name: "Gift", component: "FiGift", value: "FiGift" },
    { name: "Coffee", component: "FiCoffee", value: "FiCoffee" },
    { name: "Music", component: "FiMusic", value: "FiMusic" },
    { name: "Camera", component: "FiCamera", value: "FiCamera" },
    { name: "Book", component: "FiBook", value: "FiBook" },
    { name: "Watch", component: "FiWatch", value: "FiWatch" },
    { name: "Headphones", component: "FiHeadphones", value: "FiHeadphones" },
    { name: "Smartphone", component: "FiSmartphone", value: "FiSmartphone" },
    { name: "Monitor", component: "FiMonitor", value: "FiMonitor" },
    { name: "Cpu", component: "FiCpu", value: "FiCpu" },
    { name: "Battery", component: "FiBattery", value: "FiBattery" },
    { name: "Wifi", component: "FiWifi", value: "FiWifi" },
    { name: "Restaurant", component: "IoRestaurantOutline", value: "IoRestaurantOutline" },
    { name: "Fitness", component: "IoFitnessOutline", value: "IoFitnessOutline" },
    { name: "Car", component: "IoCarOutline", value: "IoCarOutline" },
    { name: "Home Outline", component: "IoHomeOutline", value: "IoHomeOutline" },
    { name: "Book Outline", component: "IoBookOutline", value: "IoBookOutline" },
    { name: "Game Controller", component: "IoGameControllerOutline", value: "IoGameControllerOutline" },
    { name: "Musical Notes", component: "IoMusicalNotesOutline", value: "IoMusicalNotesOutline" },
    { name: "Camera Outline", component: "IoCameraOutline", value: "IoCameraOutline" },
    { name: "Phone", component: "IoPhonePortraitOutline", value: "IoPhonePortraitOutline" },
    { name: "Laptop", component: "IoLaptopOutline", value: "IoLaptopOutline" },
    { name: "Watch Outline", component: "IoWatchOutline", value: "IoWatchOutline" },
    { name: "Headset", component: "IoHeadsetOutline", value: "IoHeadsetOutline" },
  ];

  // Icon component mapping
  const iconComponents = {
    IoShirtOutline,
    LuFootprints,
    IoBagHandleOutline,
    FiStar,
    FiTag,
    FiZap,
    FiPackage,
    FiShoppingBag,
    FiHeart,
    FiHome,
    FiGrid,
    FiBox,
    FiLayers,
    FiShoppingCart,
    FiTruck,
    FiGift,
    FiCoffee,
    FiMusic,
    FiCamera,
    FiBook,
    FiWatch,
    FiHeadphones,
    FiSmartphone,
    FiMonitor,
    FiCpu,
    FiBattery,
    FiWifi,
    IoRestaurantOutline,
    IoFitnessOutline,
    IoCarOutline,
    IoHomeOutline,
    IoBookOutline,
    IoGameControllerOutline,
    IoMusicalNotesOutline,
    IoCameraOutline,
    IoPhonePortraitOutline,
    IoLaptopOutline,
    IoWatchOutline,
    IoHeadsetOutline,
  };

  // Get icon component from value
  const getIconComponent = (iconValue) => {
    if (!iconValue) return null;
    return iconComponents[iconValue] || null;
  };

  useEffect(() => {
    if (category) {
      setFormData({
        name: category.name || "",
        description: category.description || "",
        image: category.image || "",
        icon: category.icon || "",
        parentId: category.parentId || null,
        isActive: category.isActive !== undefined ? category.isActive : true,
        order: category.order || 0,
      });
    } else if (parentId !== null) {
      setFormData({
        name: "",
        description: "",
        image: "",
        icon: "",
        parentId: parentId,
        isActive: true,
        order: 0,
      });
    }
  }, [category, parentId]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value === "" ? null : value,
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error("Category name is required");
      return;
    }

    try {
      if (isEdit) {
        updateCategory(category.id, formData);
      } else {
        createCategory(formData);
      }
      onSave?.();
      onClose();
    } catch (error) {
      // Error handled in store
    }
  };

  // Get available parent categories (exclude current category and its children)
  const getAvailableParents = () => {
    if (!isEdit) return categories.filter((cat) => cat.isActive);
    return categories.filter((cat) => cat.id !== category.id && cat.isActive);
  };

  return (
    <AnimatePresence>
      <>
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/50 z-[10000]"
        />

        {/* Modal Content - Mobile: Slide up from bottom, Desktop: Center with scale */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={`fixed inset-0 z-[10000] flex ${
            isAppRoute ? "items-start pt-[10px]" : "items-end"
          } sm:items-center justify-center p-4 pointer-events-none`}>
          <motion.div
            variants={{
              hidden: {
                y: isAppRoute ? "-100%" : "100%",
                scale: 0.95,
                opacity: 0,
              },
              visible: {
                y: 0,
                scale: 1,
                opacity: 1,
                transition: {
                  type: "spring",
                  damping: 22,
                  stiffness: 350,
                  mass: 0.7,
                },
              },
              exit: {
                y: isAppRoute ? "-100%" : "100%",
                scale: 0.95,
                opacity: 0,
                transition: {
                  type: "spring",
                  damping: 30,
                  stiffness: 400,
                },
              },
            }}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={(e) => e.stopPropagation()}
            className={`bg-white ${
              isAppRoute ? "rounded-b-3xl" : "rounded-t-3xl"
            } sm:rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto scrollbar-admin pointer-events-auto`}
            style={{ willChange: "transform" }}>
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between z-10">
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-800">
                  {isEdit
                    ? "Edit Category"
                    : isSubcategory
                    ? "Create Subcategory"
                    : "Create Category"}
                </h2>
                {isSubcategory && parentCategory && (
                  <p className="text-sm text-gray-600 mt-1">
                    Parent:{" "}
                    <span className="font-semibold text-gray-800">
                      {parentCategory.name}
                    </span>
                  </p>
                )}
                {isEdit && parentCategory && (
                  <p className="text-sm text-gray-600 mt-1">
                    Parent:{" "}
                    <span className="font-semibold text-gray-800">
                      {parentCategory.name}
                    </span>
                  </p>
                )}
              </div>
              <Button
                onClick={onClose}
                variant="icon"
                icon={FiX}
                className="text-gray-600"
              />
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Basic Information */}
              <div>
                <h3 className="text-lg font-bold text-gray-800 mb-4">
                  Basic Information
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Category Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="e.g., Clothing, Electronics"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Description
                    </label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="Category description..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Parent Category
                    </label>
                    {isSubcategory || (isEdit && category.parentId) ? (
                      <div className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-700 font-medium">
                            {parentCategory ? parentCategory.name : "None"}
                          </span>
                          {isSubcategory && (
                            <span className="text-xs text-gray-500">
                              (Cannot be changed)
                            </span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <AnimatedSelect
                        name="parentId"
                        value={formData.parentId || ""}
                        onChange={handleChange}
                        placeholder="None (Root Category)"
                        options={[
                          { value: "", label: "None (Root Category)" },
                          ...getAvailableParents().map((cat) => ({
                            value: String(cat.id),
                            label: cat.name,
                          })),
                        ]}
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* Icon Selection */}
              <div>
                <h3 className="text-lg font-bold text-gray-800 mb-4">
                  Category Icon
                </h3>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Select Icon
                  </label>
                  <div className="grid grid-cols-6 sm:grid-cols-8 gap-3 max-h-64 overflow-y-auto p-2 border border-gray-300 rounded-lg">
                    {availableIcons.map((icon) => {
                      const IconComponent = iconComponents[icon.value];
                      const isSelected = formData.icon === icon.value;
                      return (
                        <button
                          key={icon.value}
                          type="button"
                          onClick={() => {
                            setFormData({ ...formData, icon: icon.value });
                          }}
                          className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all ${
                            isSelected
                              ? "border-primary-500 bg-primary-50"
                              : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                          }`}
                          title={icon.name}>
                          {IconComponent && (
                            <IconComponent
                              className={`text-xl ${
                                isSelected ? "text-primary-600" : "text-gray-600"
                              }`}
                            />
                          )}
                          <span
                            className={`text-[10px] mt-1 text-center ${
                              isSelected ? "text-primary-600" : "text-gray-500"
                            }`}>
                            {icon.name}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  {formData.icon && (
                    <div className="mt-4 flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm font-semibold text-gray-700">
                        Selected Icon:
                      </span>
                      {getIconComponent(formData.icon) && (
                        <div className="flex items-center gap-2">
                          {(() => {
                            const SelectedIcon = getIconComponent(formData.icon);
                            return <SelectedIcon className="text-2xl text-primary-600" />;
                          })()}
                          <span className="text-sm text-gray-600">
                            {availableIcons.find((i) => i.value === formData.icon)?.name}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Image */}
              <div>
                <h3 className="text-lg font-bold text-gray-800 mb-4">
                  Category Image
                </h3>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Image URL
                  </label>
                  <input
                    type="text"
                    name="image"
                    value={formData.image}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="data/categories/category.png"
                  />
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
                    </div>
                  )}
                </div>
              </div>

              {/* Settings */}
              <div>
                <h3 className="text-lg font-bold text-gray-800 mb-4">
                  Settings
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Display Order
                    </label>
                    <input
                      type="number"
                      name="order"
                      value={formData.order}
                      onChange={handleChange}
                      min="0"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>

                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      name="isActive"
                      checked={formData.isActive}
                      onChange={handleChange}
                      className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                    />
                    <span className="text-sm font-semibold text-gray-700">
                      Active
                    </span>
                  </label>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-4 pt-4 border-t border-gray-200">
                <Button type="button" onClick={onClose} variant="secondary">
                  Cancel
                </Button>
                <Button type="submit" variant="primary" icon={FiSave}>
                  {isEdit ? "Update Category" : "Create Category"}
                </Button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      </>
    </AnimatePresence>
  );
};

export default CategoryForm;
