import PlotForm from "../../components/PlotForm";
import SubscriptionGate from "../../components/SubscriptionGate";

const AddVilla = () => {
    return (
        <SubscriptionGate action="property">
            <PlotForm formType="Villa" />
        </SubscriptionGate>
    );
};

export default AddVilla;
