/**
 * B2B Category Manager - Frontend utility for managing B2B categories
 * Stores categories with subcategories in localStorage
 */

const B2B_CATEGORIES_KEY = 'b2b_categories';

/**
 * Get all B2B categories
 * @returns {Array} Array of category objects with subcategories
 */
export const getB2BCategories = () => {
    try {
        const categories = localStorage.getItem(B2B_CATEGORIES_KEY);
        return categories ? JSON.parse(categories) : [];
    } catch (error) {
        console.error('Error getting B2B categories:', error);
        return [];
    }
};

/**
 * Save B2B categories
 * @param {Array} categories - Array of category objects
 */
export const setB2BCategories = (categories) => {
    try {
        localStorage.setItem(B2B_CATEGORIES_KEY, JSON.stringify(categories));
    } catch (error) {
        console.error('Error saving B2B categories:', error);
    }
};

/**
 * Add a new category
 * @param {string} categoryName - Name of the category
 * @param {string} subcategoryName - Name of the subcategory
 * @returns {Object} Created category object
 */
export const addB2BCategory = (categoryName, subcategoryName) => {
    const categories = getB2BCategories();
    const trimmedCategoryName = categoryName.trim();
    const trimmedSubcategoryName = subcategoryName.trim();

    // Find existing category
    let category = categories.find(cat => cat.name.toLowerCase() === trimmedCategoryName.toLowerCase());

    if (category) {
        // Category exists, add subcategory if it doesn't exist
        const subcategoryExists = category.subcategories.some(
            sub => sub.toLowerCase() === trimmedSubcategoryName.toLowerCase()
        );
        if (!subcategoryExists) {
            category.subcategories.push(trimmedSubcategoryName);
        }
    } else {
        // Create new category with subcategory
        category = {
            id: Date.now().toString(),
            name: trimmedCategoryName,
            subcategories: [trimmedSubcategoryName]
        };
        categories.push(category);
    }

    setB2BCategories(categories);
    return category;
};

/**
 * Update a category
 * @param {string} categoryId - ID of the category
 * @param {string} newName - New name for the category
 */
export const updateB2BCategory = (categoryId, newName) => {
    const categories = getB2BCategories();
    const category = categories.find(cat => cat.id === categoryId);
    if (category) {
        category.name = newName.trim();
        setB2BCategories(categories);
    }
};

/**
 * Delete a category
 * @param {string} categoryId - ID of the category to delete
 */
export const deleteB2BCategory = (categoryId) => {
    const categories = getB2BCategories();
    const filtered = categories.filter(cat => cat.id !== categoryId);
    setB2BCategories(filtered);
};

/**
 * Add subcategory to an existing category
 * @param {string} categoryId - ID of the category
 * @param {string} subcategoryName - Name of the subcategory
 */
export const addSubcategory = (categoryId, subcategoryName) => {
    const categories = getB2BCategories();
    const category = categories.find(cat => cat.id === categoryId);
    if (category) {
        const trimmedSubcategoryName = subcategoryName.trim();
        const subcategoryExists = category.subcategories.some(
            sub => sub.toLowerCase() === trimmedSubcategoryName.toLowerCase()
        );
        if (!subcategoryExists) {
            category.subcategories.push(trimmedSubcategoryName);
            setB2BCategories(categories);
        }
    }
};

/**
 * Delete a subcategory from a category
 * @param {string} categoryId - ID of the category
 * @param {string} subcategoryName - Name of the subcategory to delete
 */
export const deleteSubcategory = (categoryId, subcategoryName) => {
    const categories = getB2BCategories();
    const category = categories.find(cat => cat.id === categoryId);
    if (category) {
        category.subcategories = category.subcategories.filter(
            sub => sub.toLowerCase() !== subcategoryName.toLowerCase()
        );
        setB2BCategories(categories);
    }
};

/**
 * Initialize default categories if none exist
 */
export const initializeDefaultB2BCategories = () => {
    const categories = getB2BCategories();
    if (categories.length === 0) {
        const defaultCategories = [
            {
                id: '1',
                name: 'Electronics',
                subcategories: ['Smart Devices', 'Computer Accessories', 'Mobile Accessories', 'Audio Equipment']
            },
            {
                id: '2',
                name: 'Textiles',
                subcategories: ['Cotton Fabrics', 'Silk Materials', 'Synthetic Fabrics', 'Home Textiles']
            },
            {
                id: '3',
                name: 'Industrial',
                subcategories: ['Machinery', 'Tools', 'Safety Equipment', 'Raw Materials']
            },
            {
                id: '4',
                name: 'Chemicals',
                subcategories: ['Industrial Chemicals', 'Pharmaceuticals', 'Agrochemicals', 'Specialty Chemicals']
            },
            {
                id: '5',
                name: 'Handicrafts',
                subcategories: ['Wooden Crafts', 'Metal Crafts', 'Ceramic Products', 'Bamboo Products']
            }
        ];
        setB2BCategories(defaultCategories);
    }
};
