import { useState, useMemo, useEffect } from "react";
import { FiCreditCard, FiSmartphone } from "react-icons/fi";
import { IndianRupee } from "lucide-react";
import { motion } from "framer-motion";
import PaymentBreakdownPieChart from "../../components/Analytics/PaymentBreakdownPieChart";
import { formatPrice } from '../../../../shared/utils/helpers';
import * as analyticsService from "../../../../shared/services/analyticsService";
import toast from 'react-hot-toast';

const PaymentBreakdown = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);

  useEffect(() => {
    const fetchPaymentData = async () => {
      setLoading(true);
      try {
        const res = await analyticsService.getPaymentBreakdown("month");
        if (res.success) {
          setData(res.data);
        }
      } catch (error) {
        console.error('Error fetching payment breakdown:', error);
        toast.error('Failed to load payment data');
      } finally {
        setLoading(false);
      }
    };
    fetchPaymentData();
  }, []);

  const paymentBreakdown = useMemo(() => {
    const breakdown = {
      creditCard: { count: 0, total: 0 },
      debitCard: { count: 0, total: 0 },
      cash: { count: 0, total: 0 },
      wallet: { count: 0, total: 0 },
      upi: { count: 0, total: 0 },
      cod: { count: 0, total: 0 }
    };

    data.forEach((item) => {
      // Backend returns the exact enum values from Order.model.js
      const method = item.method;
      if (method && breakdown[method]) {
        breakdown[method].count = item.count;
        breakdown[method].total = item.amount;
      } else if (method === 'cash on delivery') {
        breakdown.cod.count = item.count;
        breakdown.cod.total = item.amount;
      }
    });

    return breakdown;
  }, [data]);

  const totalAmount = Object.values(paymentBreakdown).reduce(
    (sum, method) => sum + method.total,
    0
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const getMethodIcon = (method) => {
    const icons = {
      creditCard: FiCreditCard,
      debitCard: FiCreditCard,
      cash: IndianRupee,
      wallet: FiSmartphone,
      upi: FiSmartphone,
      cod: IndianRupee,
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
      cod: "Cash on Delivery",
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
