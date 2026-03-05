import PlotForm from "../../components/PlotForm";
import SubscriptionGate from "../../components/SubscriptionGate";

const AddPlot = () => {
    return (
        <SubscriptionGate action="property">
            <PlotForm formType="Plot" />
        </SubscriptionGate>
    );
};

export default AddPlot;
