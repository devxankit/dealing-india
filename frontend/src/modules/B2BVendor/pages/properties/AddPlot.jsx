import PlotForm from "../../components/PlotForm";
import SubscriptionGate from "../../components/SubscriptionGate";

const AddPlot = () => {
    return (
        <SubscriptionGate action="property">
            <PlotForm />
        </SubscriptionGate>
    );
};

export default AddPlot;
