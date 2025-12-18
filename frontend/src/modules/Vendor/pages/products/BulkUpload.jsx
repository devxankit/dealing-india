
import { useState } from 'react';
import { FiUpload, FiDownload, FiFile, FiCheckCircle, FiXCircle, FiInfo } from 'react-icons/fi';
import { motion } from 'framer-motion';
import { useVendorAuthStore } from "../../store/vendorAuthStore";
import { products as initialProducts } from "../../../../data/products";
import toast from 'react-hot-toast';

const BulkUpload = () => {
  const { vendor } = useVendorAuthStore();
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResults, setUploadResults] = useState(null);

  const vendorId = vendor?.id;
  const vendorName = vendor?.storeName || vendor?.name || "Vendor";

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (selectedFile.type === 'text/csv' || selectedFile.name.endsWith('.csv')) {
        setFile(selectedFile);
      } else {
        toast.error('Please select a CSV file');
      }
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error('Please select a file first');
      return;
    }

    if (!vendorId) {
      toast.error('Please log in to upload products');
      return;
    }

    setUploading(true);

    // Simulate upload process
    setTimeout(() => {
      const success = Math.random() > 0.2; // 80% success rate
      if (success) {
        const results = {
          total: 150,
          success: 145,
          failed: 5,
          errors: [
            { row: 12, error: 'Missing required field: name' },
            { row: 34, error: 'Invalid price format' },
            { row: 67, error: 'Category not found' },
            { row: 89, error: 'Duplicate SKU' },
            { row: 112, error: 'Invalid image URL' },
          ],
        };
        setUploadResults(results);
        toast.success(`Successfully uploaded ${results.success} products`);
      } else {
        toast.error('Upload failed. Please try again.');
      }
      setUploading(false);
    }, 2000);
  };

  const downloadTemplate = () => {
    const template = `Name, Description, Price, Original Price, Stock, Category, Brand, Unit, Image URL
Sample Product, Product description, 99.99, 129.99, 100, 1, 1, Piece, https://example.com/image.jpg`;

    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'vendor_product_upload_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Template downloaded');
  };

  if (!vendorId) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Please log in to upload products</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 mt-6"
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="lg:hidden">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">Bulk Upload</h1>
          <p className="text-sm sm:text-base text-gray-600">Upload multiple products via CSV file</p>
        </div>
      </div>

      {/* Bulk Upload Instructions */}
      <div className="bg-blue-50 border-l-4 border-blue-500 rounded-lg p-3 shadow-sm">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-start gap-2 flex-1">
            <FiInfo className="text-blue-600 text-base flex-shrink-0 mt-0.5" />
            <h3 className="text-sm font-semibold text-blue-900">
              Bulk Upload Instructions:
            </h3>
          </div>
          <button
            onClick={downloadTemplate}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold text-xs flex-shrink-0"
          >
            <FiDownload className="text-sm" />
            <span>Download Template</span>
          </button>
        </div>
        <ul className="space-y-1 text-xs text-blue-800 ml-6">
          <li className="flex items-start gap-1.5">
            <span>•</span>
            <span>Download the CSV template and fill in your product information</span>
          </li>
          <li className="flex items-start gap-1.5">
            <span>•</span>
            <span>All products will be automatically assigned to your store ({vendorName})</span>
          </li>
          <li className="flex items-start gap-1.5">
            <span>•</span>
            <span>Required fields: Name, Price, Stock, Category</span>
          </li>
          <li className="flex items-start gap-1.5">
            <span>•</span>
            <span>Maximum file size: 10MB</span>
          </li>
        </ul>
      </div>

      {/* Upload Section */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <div className="space-y-6">
          {/* File Upload */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Select CSV File
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-primary-500 transition-colors">
              <input
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="hidden"
                id="csv-upload"
              />
              <label
                htmlFor="csv-upload"
                className="cursor-pointer flex flex-col items-center gap-3"
              >
                <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center">
                  <FiUpload className="text-primary-600 text-2xl" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">
                    {file ? file.name : 'Click to upload or drag and drop'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">CSV file only (max 10MB)</p>
                </div>
              </label>
            </div>
          </div>

          {/* Upload Button */}
          <div className="flex justify-end">
            <button
              onClick={handleUpload}
              disabled={!file || uploading}
              className="px-6 py-3 gradient-green text-white rounded-lg hover:shadow-glow-green transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {uploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <FiUpload />
                  Upload Products
                </>
              )}
            </button>
          </div>

          {/* Upload Results */}
          {uploadResults && (
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <h3 className="text-sm font-semibold text-gray-800 mb-3">Upload Results</h3>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-800">{uploadResults.total}</p>
                  <p className="text-xs text-gray-600">Total</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">{uploadResults.success}</p>
                  <p className="text-xs text-gray-600">Success</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-red-600">{uploadResults.failed}</p>
                  <p className="text-xs text-gray-600">Failed</p>
                </div>
              </div>

              {uploadResults.errors && uploadResults.errors.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-xs font-semibold text-gray-700 mb-2">Errors:</h4>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {uploadResults.errors.map((error, index) => (
                      <div key={index} className="flex items-start gap-2 text-xs text-red-600">
                        <FiXCircle className="flex-shrink-0 mt-0.5" />
                        <span>Row {error.row}: {error.error}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default BulkUpload;

