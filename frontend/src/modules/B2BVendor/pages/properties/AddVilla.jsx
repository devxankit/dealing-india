import PlotForm from "../../components/PlotForm";
import SubscriptionGate from "../../components/SubscriptionGate";

const AddVilla = () => {
    return (
        <SubscriptionGate action="property">
            <PlotForm />
        </SubscriptionGate>
    );
};

export default AddVilla;
