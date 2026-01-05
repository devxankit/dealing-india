import { Fragment, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { FiStar, FiX } from 'react-icons/fi';
import { motion } from 'framer-motion';

const ReviewModal = ({ isOpen, onClose, onSubmit, isSubmitting, product }) => {
    const [rating, setRating] = useState(5);
    const [hoverRating, setHoverRating] = useState(0);
    const [comment, setComment] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit({ rating, comment });
    };

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={onClose}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4 text-center">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                                <div className="flex justify-between items-center mb-4">
                                    <Dialog.Title
                                        as="h3"
                                        className="text-lg font-bold leading-6 text-gray-900"
                                    >
                                        Rate & Review
                                    </Dialog.Title>
                                    <button
                                        onClick={onClose}
                                        className="p-1 rounded-full hover:bg-gray-100 transition-colors"
                                    >
                                        <FiX className="text-xl text-gray-500" />
                                    </button>
                                </div>

                                {product && (
                                    <div className="flex items-center gap-3 mb-6 p-3 bg-gray-50 rounded-lg">
                                        {product.image ? (
                                            <img
                                                src={product.image}
                                                alt={product.name}
                                                className="w-12 h-12 object-cover rounded-md"
                                            />
                                        ) : (
                                            <div className="w-12 h-12 bg-gray-200 rounded-md"></div>
                                        )}
                                        <p className="text-sm font-medium text-gray-800 line-clamp-2">
                                            {product.name}
                                        </p>
                                    </div>
                                )}

                                <form onSubmit={handleSubmit} className="space-y-4">
                                    {/* Star Rating */}
                                    <div className="flex flex-col items-center gap-2 mb-2">
                                        <p className="text-sm text-gray-500 font-medium">
                                            How would you rate this product?
                                        </p>
                                        <div className="flex gap-1">
                                            {[1, 2, 3, 4, 5].map((star) => (
                                                <button
                                                    key={star}
                                                    type="button"
                                                    className="p-1 focus:outline-none transition-transform hover:scale-110"
                                                    onMouseEnter={() => setHoverRating(star)}
                                                    onMouseLeave={() => setHoverRating(0)}
                                                    onClick={() => setRating(star)}
                                                >
                                                    <FiStar
                                                        className={`text-3xl ${star <= (hoverRating || rating)
                                                                ? 'fill-yellow-400 text-yellow-400'
                                                                : 'text-gray-300'
                                                            }`}
                                                    />
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Comment */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Write a review (optional)
                                        </label>
                                        <textarea
                                            rows={4}
                                            value={comment}
                                            onChange={(e) => setComment(e.target.value)}
                                            placeholder="What did you like or dislike?"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-sm resize-none"
                                        />
                                    </div>

                                    {/* Submit */}
                                    <div className="mt-6">
                                        <button
                                            type="submit"
                                            disabled={isSubmitting}
                                            className="w-full inline-flex justify-center rounded-lg border border-transparent bg-primary-600 px-4 py-3 text-sm font-semibold text-white hover:bg-primary-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:opacity-70 disabled:cursor-not-allowed"
                                        >
                                            {isSubmitting ? 'Submitting...' : 'Submit Review'}
                                        </button>
                                    </div>
                                </form>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
};

export default ReviewModal;
