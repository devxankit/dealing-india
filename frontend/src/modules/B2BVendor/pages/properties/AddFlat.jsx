import FlatForm from "../../components/FlatForm";
import SubscriptionGate from "../../components/SubscriptionGate";

const AddFlat = () => {
    return (
        <SubscriptionGate action="property">
            <FlatForm />
        </SubscriptionGate>
    );
};

export default AddFlat;
