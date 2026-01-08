import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FiSave, FiX, FiUpload, FiVideo, FiPackage, FiImage } from "react-icons/fi";
import { motion } from "framer-motion";
import { useVendorAuthStore } from "../../store/vendorAuthStore";
import { getVendorReelById, updateVendorReel } from "../../services/reelService";
import { getVendorProducts } from "../../services/productService";
import AnimatedSelect from "../../../../modules/Admin/components/AnimatedSelect";
import { formatVideoUrl } from "../../../../shared/utils/helpers";
import toast from "react-hot-toast";

const EditReel = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { vendor } = useVendorAuthStore();
  const [loading, setLoading] = useState(false);
  const [loadingReel, setLoadingReel] = useState(false);
  const [vendorProducts, setVendorProducts] = useState([]);
  const [videoFile, setVideoFile] = useState(null);
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [videoPreview, setVideoPreview] = useState("");
  const [thumbnailPreview, setThumbnailPreview] = useState("");
  const [formData, setFormData] = useState({
    productId: "",
    productName: "",
    productPrice: "",
    vendorName: vendor?.storeName || vendor?.name || "",
    vendorId: vendor?.id || null,
    status: "draft",
    likes: 0,
    comments: 0,
    shares: 0,
    views: 0,
  });

  useEffect(() => {
    if (vendor?.id) {
      loadVendorProducts();
    }
  }, [vendor?.id]);

  useEffect(() => {
    if (id && vendor?.id) {
      loadReel();
    }
  }, [id, vendor?.id]);

  const loadVendorProducts = async () => {
    try {
      const response = await getVendorProducts({ limit: 1000 });
      // Handle both response structures
      if (response?.data?.products) {
        setVendorProducts(response.data.products);
      } else if (response?.products) {
        setVendorProducts(response.products);
      } else if (Array.isArray(response)) {
        setVendorProducts(response);
      }
    } catch (error) {
      console.error("Error loading products:", error);
    }
  };

  const loadReel = async () => {
    if (!id) return;

    setLoadingReel(true);
    try {
      const reel = await getVendorReelById(id);
      setFormData({
        productId: reel.productId?.toString() || "",
        productName: reel.productName || "",
        productPrice: reel.productPrice?.toString() || "",
        vendorName: reel.vendorName || vendor?.storeName || vendor?.name || "",
        vendorId: reel.vendorId?.toString() || vendor?.id || null,
        status: reel.status || "draft",
        likes: reel.likes || 0,
        comments: reel.comments || 0,
        shares: reel.shares || 0,
        views: reel.views || 0,
      });
      // Set previews from existing URLs
      if (reel.videoUrl) {
        setVideoPreview(reel.videoUrl);
      }
      if (reel.thumbnail) {
        setThumbnailPreview(reel.thumbnail);
      }
    } catch (error) {
      console.error("Error loading reel:", error);
      toast.error("Failed to load reel");
      navigate("/vendor/reels/all-reels");
    } finally {
      setLoadingReel(false);
    }
  };

  useEffect(() => {
    if (formData.productId) {
      const product = vendorProducts.find((p) => (p._id || p.id)?.toString() === formData.productId);
      if (product) {
        setFormData((prev) => ({
          ...prev,
          productName: product.name,
          productPrice: product.price,
        }));
        // Set thumbnail preview from product image if no thumbnail file or existing thumbnail
        if (!thumbnailFile && !thumbnailPreview && product.image) {
          setThumbnailPreview(product.image);
        }
      }
    }
  }, [formData.productId, vendorProducts, thumbnailFile, thumbnailPreview]);

  // Handle video file selection
  const handleVideoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      const validTypes = ['video/mp4', 'video/mov', 'video/avi', 'video/wmv', 'video/flv', 'video/webm', 'video/mkv'];
      const validExtensions = ['.mp4', '.mov', '.avi', '.wmv', '.flv', '.webm', '.mkv'];
      const fileExtension = '.' + file.name.split('.').pop().toLowerCase();

      if (!validTypes.includes(file.type) && !validExtensions.includes(fileExtension)) {
        toast.error('Please select a valid video file (mp4, mov, avi, wmv, flv, webm, mkv)');
        return;
      }

      // Validate file size (100MB)
      if (file.size > 100 * 1024 * 1024) {
        toast.error('Video file size should be less than 100MB');
        return;
      }

      setVideoFile(file);
      const previewUrl = URL.createObjectURL(file);
      setVideoPreview(previewUrl);
    }
  };

  // Handle thumbnail file selection
  const handleThumbnailChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        toast.error('Please select a valid image file (jpeg, jpg, png, gif, webp)');
        return;
      }

      // Validate file size (5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Thumbnail file size should be less than 5MB');
        return;
      }

      setThumbnailFile(file);
      const previewUrl = URL.createObjectURL(file);
      setThumbnailPreview(previewUrl);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!videoFile && !videoPreview) {
        toast.error("Please upload a video file or keep existing video");
        setLoading(false);
        return;
      }

      if (!formData.productId) {
        toast.error("Please select a product");
        setLoading(false);
        return;
      }

      // Create FormData for file upload
      const formDataToSend = new FormData();
      if (videoFile) {
        formDataToSend.append('video', videoFile);
      } else if (videoPreview && !videoPreview.startsWith('blob:')) {
        // If existing video URL (not a blob), send it as videoUrl in body
        // Note: When sending URL, we need to send as regular form data
        // But since we're using FormData, we'll append it
        formDataToSend.append('videoUrl', videoPreview);
      }
      if (thumbnailFile) {
        formDataToSend.append('thumbnail', thumbnailFile);
      } else if (thumbnailPreview && !thumbnailPreview.startsWith('blob:')) {
        // If existing thumbnail URL (not a blob), send it as thumbnail
        formDataToSend.append('thumbnail', thumbnailPreview);
      }
      formDataToSend.append('productId', formData.productId);
      formDataToSend.append('status', formData.status);
      formDataToSend.append('likes', formData.likes);
      formDataToSend.append('comments', formData.comments);
      formDataToSend.append('shares', formData.shares);
      formDataToSend.append('views', formData.views);

      await updateVendorReel(id, formDataToSend);
      toast.success("Reel updated successfully!");
      navigate("/vendor/reels/all-reels");
    } catch (error) {
      console.error("Error updating reel:", error);
      toast.error(error.response?.data?.message || "Failed to update reel. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (loadingReel) {
    return (
      <div className="text-center py-12">
        <div className="inline-block w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-gray-500">Loading reel...</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-5 sm:space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
            Edit Reel
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Update reel information and content
          </p>
        </div>
        <button
          onClick={() => navigate("/vendor/reels/all-reels")}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
        >
          <FiX className="text-xl text-gray-600 dark:text-gray-400" />
        </button>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-6">
          {/* Product Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Select Product <span className="text-red-500">*</span>
            </label>
            <AnimatedSelect
              value={formData.productId}
              onChange={(e) => setFormData((prev) => ({ ...prev, productId: e.target.value }))}
              options={[
                { value: "", label: "Select a product" },
                ...vendorProducts.map((product) => ({
                  value: (product._id || product.id).toString(),
                  label: `${product.name} - ₹${product.price}`,
                })),
              ]}
            />
            {formData.productId && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                Selected: {formData.productName}
              </p>
            )}
          </div>

          {/* Video Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Upload Video <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="file"
                accept="video/mp4,video/mov,video/avi,video/wmv,video/flv,video/webm,video/mkv"
                onChange={handleVideoChange}
                className="hidden"
                id="video-upload-edit"
              />
              <label
                htmlFor="video-upload-edit"
                className="flex items-center gap-3 w-full px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
              >
                <FiVideo className="text-gray-400 text-xl" />
                <span className="flex-1 text-sm">
                  {videoFile ? videoFile.name : videoPreview ? "Change video (current video will be replaced)" : "Choose video file (max 100MB)"}
                </span>
                <FiUpload className="text-gray-400" />
              </label>
            </div>
            {videoFile && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Selected: {videoFile.name} ({(videoFile.size / (1024 * 1024)).toFixed(2)} MB)
              </p>
            )}
            {videoPreview && (
              <video
                src={formatVideoUrl(videoPreview)}
                controls
                loop
                onEnded={(e) => {
                  e.target.currentTime = 0;
                  e.target.play().catch(() => { });
                }}
                className="mt-2 w-full max-w-md rounded-lg border border-gray-200 dark:border-gray-700"
                onError={(e) => {
                  const video = e.target;
                  if (!video.getAttribute('src')) return;
                  if (video.error) {
                    if (video.error.code === 4 && (!video.src || video.src === window.location.href)) return;
                    console.error("Edit Preview Video Error:", video.error);
                    video.style.display = "none";
                  }
                }}
              />
            )}
          </div>

          {/* Thumbnail Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Upload Thumbnail (Optional)
            </label>
            <div className="relative">
              <input
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                onChange={handleThumbnailChange}
                className="hidden"
                id="thumbnail-upload-edit"
              />
              <label
                htmlFor="thumbnail-upload-edit"
                className="flex items-center gap-3 w-full px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
              >
                <FiImage className="text-gray-400 text-xl" />
                <span className="flex-1 text-sm">
                  {thumbnailFile ? thumbnailFile.name : thumbnailPreview ? "Change thumbnail (current thumbnail will be replaced)" : "Choose thumbnail (max 5MB)"}
                </span>
                <FiUpload className="text-gray-400" />
              </label>
            </div>
            {thumbnailFile && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Selected: {thumbnailFile.name} ({(thumbnailFile.size / (1024 * 1024)).toFixed(2)} MB)
              </p>
            )}
            {thumbnailPreview && (
              <img
                src={thumbnailPreview}
                alt="Thumbnail preview"
                className="mt-2 w-32 h-32 object-cover rounded-lg border border-gray-200 dark:border-gray-700"
                onError={(e) => {
                  e.target.style.display = "none";
                }}
              />
            )}
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Status
            </label>
            <AnimatedSelect
              value={formData.status}
              onChange={(e) => setFormData((prev) => ({ ...prev, status: e.target.value }))}
              options={[
                { value: "draft", label: "Draft" },
                { value: "active", label: "Active" },
                { value: "archived", label: "Archived" },
              ]}
            />
          </div>

          {/* Engagement Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Likes
              </label>
              <input
                type="number"
                name="likes"
                value={formData.likes}
                onChange={handleChange}
                min="0"
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Comments
              </label>
              <input
                type="number"
                name="comments"
                value={formData.comments}
                onChange={handleChange}
                min="0"
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Shares
              </label>
              <input
                type="number"
                name="shares"
                value={formData.shares}
                onChange={handleChange}
                min="0"
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-4">
          <button
            type="button"
            onClick={() => navigate("/vendor/reels/all-reels")}
            className="px-6 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <FiSave className="text-lg" />
            {loading ? "Updating..." : "Update Reel"}
          </button>
        </div>
      </form>
    </motion.div>
  );
};

export default EditReel;

