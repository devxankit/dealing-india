import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../../../../shared/utils/api";
import PropertyForm from "../../components/PropertyForm";

const EditProperty = () => {
    const { id } = useParams();
    const [loading, setLoading] = useState(true);
    const [propertyData, setPropertyData] = useState(null);

    useEffect(() => {
        fetchProperty();
    }, [id]);

    const fetchProperty = async () => {
        try {
            const response = await api.get(`/property/details/${id}`);
            if (response.success) {
                setPropertyData(response.data);
            }
        } catch (error) {
            toast.error('Failed to load property details');
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="text-center py-20 font-bold text-gray-400">Loading details...</div>;

    if (!propertyData) return <div className="text-center py-20 font-bold text-gray-400">Property not found</div>;

    return <PropertyForm initialData={propertyData} isEdit={true} />;
};

export default EditProperty;
