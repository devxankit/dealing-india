import { motion } from 'framer-motion';
import { FiShoppingBag, FiBriefcase, FiCheck } from 'react-icons/fi';

const VendorTypeSelector = ({ selected, onSelect }) => {
    const types = [
        {
            id: 'b2c',
            title: 'B2C Vendor (Retail)',
            description: 'Sell products directly to individual customers. Buy now / Add to cart functionality.',
            icon: FiShoppingBag,
            color: 'blue',
            badge: 'Direct Selling'
        },
        {
            id: 'b2b',
            title: 'B2B Vendor (Business)',
            description: 'Sell bulk quantities to other businesses. Inquiry and chat-based negotiation.',
            icon: FiBriefcase,
            color: 'primary',
            badge: 'Bulk Orders'
        }
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            {types.map((type) => (
                <motion.div
                    key={type.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => onSelect(type.id)}
                    className={`relative p-6 rounded-2xl border-2 cursor-pointer transition-all ${selected === type.id
                            ? `border-${type.color === 'primary' ? 'primary-600' : 'blue-600'} bg-${type.color === 'primary' ? 'primary-50' : 'blue-50'} shadow-md`
                            : 'border-gray-200 bg-white hover:border-gray-300'
                        }`}
                >
                    {selected === type.id && (
                        <div className={`absolute top-4 right-4 w-6 h-6 rounded-full bg-${type.color === 'primary' ? 'primary-600' : 'blue-600'} flex items-center justify-center`}>
                            <FiCheck className="text-white text-xs" />
                        </div>
                    )}

                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${type.id === 'b2b' ? 'from-primary-500 to-primary-600' : 'from-blue-500 to-blue-600'
                        } flex items-center justify-center mb-4 shadow-lg`}>
                        <type.icon className="text-white text-xl" />
                    </div>

                    <div className="mb-2">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${selected === type.id ? 'bg-white' : 'bg-gray-100'
                            } text-${type.color === 'primary' ? 'primary-600' : 'blue-600'}`}>
                            {type.badge}
                        </span>
                    </div>

                    <h3 className="text-lg font-bold text-gray-800 mb-1">{type.title}</h3>
                    <p className="text-sm text-gray-500 leading-relaxed">{type.description}</p>
                </motion.div>
            ))}
        </div>
    );
};

export default VendorTypeSelector;
