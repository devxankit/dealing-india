import { useState, useEffect } from "react";
import { FiLayers } from "react-icons/fi";
import { motion } from "framer-motion";
import DataTable from "../../Admin/components/DataTable";
import { useVendorAuthStore } from "../store/vendorAuthStore";
import api from "../../../shared/utils/api";
import toast from "react-hot-toast";

const ProductAttributes = () => {
  const { vendor } = useVendorAuthStore();
  const [attributes, setAttributes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [attributeValuesMap, setAttributeValuesMap] = useState({});

  const vendorId = vendor?.id;

  useEffect(() => {
    if (!vendorId) return;
    fetchAttributes();
  }, [vendorId]);

  const fetchAttributes = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/attributes');
      if (response.success && response.data?.attributes) {
        const activeAttributes = response.data.attributes
          .filter((attr) => attr.status === 'active')
          .map((attr) => ({
            id: attr._id || attr.id,
            name: attr.name,
            type: attr.type,
            required: attr.required,
            status: attr.status,
          }));
        setAttributes(activeAttributes);

        // Fetch values for all attributes
        const valuesMap = {};
        await Promise.all(
          activeAttributes.map(async (attr) => {
            try {
              const valuesResponse = await api.get(
                `/attribute-values?attributeId=${attr.id}`
              );
              if (
                valuesResponse.success &&
                valuesResponse.data?.attributeValues
              ) {
                const activeValues = valuesResponse.data.attributeValues
                  .filter((val) => val.status === 'active')
                  .map((val) => val.value)
                  .sort();
                valuesMap[attr.id] = activeValues;
              }
            } catch (error) {
              console.error(
                `Error fetching values for attribute ${attr.id}:`,
                error
              );
            }
          })
        );
        setAttributeValuesMap(valuesMap);
      }
    } catch (error) {
      console.error('Error fetching attributes:', error);
      toast.error('Failed to load attributes');
      setAttributes([]);
    } finally {
      setIsLoading(false);
    }
  };

  const columns = [
    { key: "name", label: "Attribute Name", sortable: true },
    { key: "type", label: "Type", sortable: true },
    {
      key: "values",
      label: "Values",
      render: (value, row) => {
        const values = attributeValuesMap[row.id] || [];
        return values.length > 0 ? values.join(", ") : "No values";
      },
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      render: (value) => (
        <span
          className={`px-2 py-1 rounded text-xs font-semibold ${value === "active"
              ? "bg-green-100 text-green-800"
              : "bg-gray-100 text-gray-800"
            }`}>
          {value || "active"}
        </span>
      ),
    },
  ];

  if (!vendorId) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Please log in to view attributes</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="lg:hidden">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2 flex items-center gap-2">
            <FiLayers className="text-primary-600" />
            Product Attributes
          </h1>
          <p className="text-sm sm:text-base text-gray-600">
            View available product attributes and values (managed by admin)
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="bg-white rounded-xl p-12 shadow-sm border border-gray-200 text-center">
          <p className="text-gray-500">Loading attributes...</p>
        </div>
      ) : (
        <DataTable data={attributes} columns={columns} pagination={true} />
      )}
    </motion.div>
  );
};

export default ProductAttributes;
