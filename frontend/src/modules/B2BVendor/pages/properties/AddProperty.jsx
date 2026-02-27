import PropertyForm from "../../components/PropertyForm";
import SubscriptionGate from "../../components/SubscriptionGate";

const AddProperty = () => {
    return (
        <SubscriptionGate action="property">
            <PropertyForm />
        </SubscriptionGate>
    );
};

export default AddProperty;
