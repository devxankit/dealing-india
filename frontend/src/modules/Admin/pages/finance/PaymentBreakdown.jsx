import { useState, useMemo } from "react";
import { FiCreditCard, FiDollarSign, FiSmartphone } from "react-icons/fi";
import { motion } from "framer-motion";
import PaymentBreakdownPieChart from "../../components/Analytics/PaymentBreakdownPieChart";
import { mockOrders } from "../../../../data/adminMockData";
import { formatPrice } from '../../../../shared/utils/helpers';

const PaymentBreakdown = () => {
  const [orders] = useState(mockOrders);

  const paymentBreakdown = useMemo(() => {
    const breakdown = {
      creditCard: { count: 0, total: 0 },
      debitCard: { count: 0, total: 0 },
      cash: { count: 0, total: 0 },
      wallet: { count: 0, total: 0 },
      upi: { count: 0, total: 0 },
    };

    orders.forEach((order) => {
      const method = order.paymentMethod || "creditCard";
      if (breakdown[method]) {
        breakdown[method].count++;
        breakdown[method].total += order.total;
      }
    });

    return breakdown;
  }, [orders]);

  const totalAmount = Object.values(paymentBreakdown).reduce(
    (sum, method) => sum + method.total,
    0
  );

  const getMethodIcon = (method) => {
    const icons = {
      creditCard: FiCreditCard,
      debitCard: FiCreditCard,
      cash: FiDollarSign,
      wallet: FiSmartphone,
      upi: FiSmartphone,
    };
    return icons[method] || FiCreditCard;
  };

  const getMethodLabel = (method) => {
    const labels = {
      creditCard: "Credit Card",
      debitCard: "Debit Card",
      cash: "Cash",
      wallet: "Digital Wallet",
      upi: "UPI",
    };
    return labels[method] || method;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6">
      <div className="lg:hidden">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">
          Payment Breakdown
        </h1>
        <p className="text-sm sm:text-base text-gray-600">
          Analyze payment methods and distribution
        </p>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <h3 className="text-lg font-bold text-gray-800 mb-4">
          Total Payments: {formatPrice(totalAmount)}
        </h3>
        <PaymentBreakdownPieChart paymentData={paymentBreakdown} />
      </div>
    </motion.div>
  );
};

export default PaymentBreakdown;
