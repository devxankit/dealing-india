import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export const useReviewsStore = create(
  persist(
    (set, get) => ({
      reviews: {},
      votes: {},

      // Add review for a product
      addReview: (productId, review) => {
        set((state) => {
          const productReviews = state.reviews[productId] || [];
          const newReview = {
            ...review,
            id: Date.now().toString(),
            helpfulCount: 0,
            notHelpfulCount: 0,
          };
          return {
            reviews: {
              ...state.reviews,
              [productId]: [...productReviews, newReview],
            },
          };
        });
      },

      // Get reviews for a product
      getReviews: (productId) => {
        const state = get();
        return state.reviews[productId] || [];
      },

      // Vote on review helpfulness
      voteHelpful: (productId, reviewId) => {
        set((state) => {
          const voteKey = `${productId}_${reviewId}`;
          if (state.votes[voteKey]) {
            return state; // Already voted
          }

          const productReviews = state.reviews[productId] || [];
          const updatedReviews = productReviews.map((review) =>
            review.id === reviewId
              ? { ...review, helpfulCount: (review.helpfulCount || 0) + 1 }
              : review
          );

          return {
            reviews: {
              ...state.reviews,
              [productId]: updatedReviews,
            },
            votes: {
              ...state.votes,
              [voteKey]: 'helpful',
            },
          };
        });
      },

      // Vote on review not helpful
      voteNotHelpful: (productId, reviewId) => {
        set((state) => {
          const voteKey = `${productId}_${reviewId}`;
          if (state.votes[voteKey]) {
            return state; // Already voted
          }

          const productReviews = state.reviews[productId] || [];
          const updatedReviews = productReviews.map((review) =>
            review.id === reviewId
              ? { ...review, notHelpfulCount: (review.notHelpfulCount || 0) + 1 }
              : review
          );

          return {
            reviews: {
              ...state.reviews,
              [productId]: updatedReviews,
            },
            votes: {
              ...state.votes,
              [voteKey]: 'not-helpful',
            },
          };
        });
      },

      // Check if user has voted on a review
      hasVoted: (productId, reviewId) => {
        const state = get();
        const voteKey = `${productId}_${reviewId}`;
        return !!state.votes[voteKey];
      },

      // Sort reviews
      sortReviews: (productId, sortBy) => {
        const state = get();
        const reviews = state.reviews[productId] || [];
        let sorted = [...reviews];

        switch (sortBy) {
          case 'newest':
            sorted.sort((a, b) => new Date(b.date) - new Date(a.date));
            break;
          case 'oldest':
            sorted.sort((a, b) => new Date(a.date) - new Date(b.date));
            break;
          case 'most-helpful':
            sorted.sort(
              (a, b) =>
                (b.helpfulCount || 0) - (a.helpfulCount || 0) ||
                (a.notHelpfulCount || 0) - (b.notHelpfulCount || 0)
            );
            break;
          case 'highest-rating':
            sorted.sort((a, b) => b.rating - a.rating);
            break;
          case 'lowest-rating':
            sorted.sort((a, b) => a.rating - b.rating);
            break;
          default:
            break;
        }

        return sorted;
      },
    }),
    {
      name: 'reviews-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

