import { useState } from 'react';
import { FiUpload, FiDownload, FiFile, FiCheckCircle, FiXCircle, FiInfo } from 'react-icons/fi';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

const BulkUpload = () => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResults, setUploadResults] = useState(null);

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
    const template = `ID,Name,Description,Price,Stock,Category,Brand,SKU,Image URL
1,Sample Product,Product description,99.99,100,Electronics,Apple,SKU-001,https://example.com/image.jpg`;
    
    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'product_upload_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Template downloaded');
  };

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
      <div className="bg-blue-50 border-l-4 border-blue-500 rounded-lg p-3 shadow-sm -mt-5">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-start gap-2 flex-1">
            <FiInfo className="text-blue-600 text-base flex-shrink-0 mt-0.5" />
            <h3 className="text-sm font-semibold text-blue-900">
              Bulk Upload Instruction:
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
            <span className="text-blue-600 font-semibold">•</span>
            <span>Read and follow instructions carefully while preparing data</span>
          </li>
          <li className="flex items-start gap-1.5">
            <span className="text-blue-600 font-semibold">•</span>
            <span>Download and save the sample file to reduce errors</span>
          </li>
          <li className="flex items-start gap-1.5">
            <span className="text-blue-600 font-semibold">•</span>
            <span>For adding bulk Product file should be .csv format</span>
          </li>
          <li className="flex items-start gap-1.5">
            <span className="text-blue-600 font-semibold">•</span>
            <span>You can copy image path from media section</span>
          </li>
          <li className="flex items-start gap-1.5">
            <span className="text-blue-600 font-semibold">•</span>
            <span>Make sure you entered valid data as per instructions before proceed</span>
          </li>
        </ul>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Upload CSV File</h3>
            <p className="text-sm text-gray-600 mb-4">
              Select a CSV file containing product data. Make sure it follows the template format.
            </p>
            
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-primary-500 transition-colors">
              <input
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="cursor-pointer flex flex-col items-center gap-4"
              >
                <FiUpload className="text-4xl text-gray-400" />
                {file ? (
                  <div className="flex items-center gap-2 text-primary-600">
                    <FiFile />
                    <span className="font-medium">{file.name}</span>
                  </div>
                ) : (
                  <div>
                    <p className="text-gray-600 font-medium">Click to select CSV file</p>
                    <p className="text-sm text-gray-500 mt-1">or drag and drop</p>
                  </div>
                )}
              </label>
            </div>

            {file && (
              <div className="mt-4 flex justify-end">
                <button
                  onClick={handleUpload}
                  disabled={uploading}
                  className="px-6 py-3 gradient-green text-white rounded-lg hover:shadow-glow-green transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploading ? 'Uploading...' : 'Upload Products'}
                </button>
              </div>
            )}
          </div>

          {uploadResults && (
            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Upload Results</h3>
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600">Total</p>
                  <p className="text-2xl font-bold text-gray-800">{uploadResults.total}</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600">Success</p>
                  <p className="text-2xl font-bold text-green-600">{uploadResults.success}</p>
                </div>
                <div className="bg-red-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600">Failed</p>
                  <p className="text-2xl font-bold text-red-600">{uploadResults.failed}</p>
                </div>
              </div>

              {uploadResults.errors.length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-800 mb-2">Errors:</h4>
                  <div className="space-y-2">
                    {uploadResults.errors.map((error, index) => (
                      <div key={index} className="flex items-start gap-2 p-3 bg-red-50 rounded-lg">
                        <FiXCircle className="text-red-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-red-800">Row {error.row}</p>
                          <p className="text-xs text-red-600">{error.error}</p>
                        </div>
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

