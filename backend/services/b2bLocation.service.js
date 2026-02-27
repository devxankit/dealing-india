import Vendor from '../models/Vendor.model.js';
import Product from '../models/Product.model.js';
import { toTitleCase, normalizeState, normalizeCity } from '../utils/addressNormalizer.util.js';

/**
 * Get available B2B vendor locations (states and cities)
 * Returns only locations where vendors have active products
 * @param {Object} options - Filter options
 * @param {string} options.businessTypeFilter - 'include' or 'exclude'
 * @param {string[]} options.businessTypes - Array of business type names to include/exclude
 * @returns {Promise<Object>} { states: [{ name: string, cities: string[] }], areas: string[], markets: string[] }
 */
export const getB2BAvailableLocations = async (options = {}) => {
  try {
    const { businessTypeFilter, businessTypes = [] } = options;

    // Build vendor query with businessType filter
    const vendorQuery = {
      vendorType: 'b2b',
      isActive: true,
      status: 'approved',
    };

    if (businessTypeFilter === 'include' && businessTypes.length > 0) {
      vendorQuery.$or = businessTypes.map(bt => ({
        businessType: { $regex: `^${bt}$`, $options: 'i' }
      }));
    } else if (businessTypeFilter === 'exclude' && businessTypes.length > 0) {
      vendorQuery.$and = businessTypes.map(bt => ({
        businessType: { $not: { $regex: `^${bt}$`, $options: 'i' } }
      }));
    }

    // Get all active and approved B2B vendors
    const b2bVendors = await Vendor.find(vendorQuery)
      .select('_id address businessType')
      .lean();

    if (b2bVendors.length === 0) {
      return { states: [] };
    }

    // Use ALL approved vendors for location data (not just those with products)
    // This ensures cities from newly registered vendors also appear in the filter
    const vendorsWithActiveProducts = b2bVendors;

    // Extract unique states and cities
    const locationMap = new Map(); // state -> Set of cities
    const areasSet = new Set(); // Set of unique areas
    const marketsSet = new Set(); // Set of unique markets

    console.log(`📍 Processing ${vendorsWithActiveProducts.length} vendors with active products`);
    console.log(`📍 Full vendor addresses:`, vendorsWithActiveProducts.map(v => ({
      id: v._id,
      state: v.address?.state,
      city: v.address?.city,
      fullAddress: v.address
    })));

    vendorsWithActiveProducts.forEach(vendor => {
      const address = vendor.address;
      if (address && address.state && address.state.trim()) {
        console.log(`\n  🔍 Vendor ${vendor._id}: state="${address.state}", city="${address.city || 'NULL/EMPTY'}"`);
        // Clean state name - remove pincode if present (e.g., "Madhya Pradesh 450001" -> "Madhya Pradesh")
        // Also handle cases where only pincode is stored (e.g., "450001" -> skip)
        let state = address.state.trim();

        // Check if state is only a pincode (6 digits) - this means data is incorrectly stored
        if (/^\d{6}$/.test(state)) {
          console.log(`  ⚠️ State field contains pincode "${state}" - data is incorrectly stored`);
          // If state is only a pincode, try to extract full state name from city
          if (address.city && address.city.trim()) {
            const cityText = address.city.trim();
            // List of common Indian states to match against
            const commonStates = [
              'Madhya Pradesh', 'Uttar Pradesh', 'Andhra Pradesh', 'Arunachal Pradesh',
              'Himachal Pradesh', 'Jammu and Kashmir', 'Jharkhand', 'West Bengal',
              'Tamil Nadu', 'Uttarakhand', 'Maharashtra', 'Gujarat', 'Rajasthan',
              'Karnataka', 'Kerala', 'Punjab', 'Haryana', 'Bihar', 'Odisha',
              'Assam', 'Telangana', 'Goa', 'Manipur', 'Meghalaya', 'Mizoram',
              'Nagaland', 'Sikkim', 'Tripura'
            ];

            // Try to find a full state name in the city text
            const foundState = commonStates.find(fullState =>
              cityText.toLowerCase() === fullState.toLowerCase() || cityText.toLowerCase().includes(fullState.toLowerCase())
            );

            if (foundState) {
              console.log(`  ✅ Found state "${foundState}" in city field, using it`);
              state = foundState;
              // Also swap: use the pincode from state field as pincode, and use landmark or street as city if available
              // But for now, we'll use the state we found and try to get city from other fields
            } else {
              // If no full state found, skip this vendor
              console.log(`  ❌ Could not find state in city field, skipping vendor`);
              return;
            }
          } else {
            // Skip if no city and state is just pincode
            console.log(`  ❌ No city field available, skipping vendor`);
            return;
          }
        } else {
          // Remove pincode pattern (6 digits at the end)
          state = state.replace(/\s+\d{6}$/, '');
          // Remove any trailing numbers (pincodes) - be more specific
          state = state.replace(/\s+\d{5,6}$/, '').trim();
        }

        if (!state || /^\d+$/.test(state)) {
          // Skip if state is empty or only numbers after cleaning
          return;
        }

        // Check if state is a partial name (common suffixes that shouldn't be states by themselves)
        const stateSuffixes = ['Pradesh', 'Bengal', 'Nadu', 'Desh', 'Khand'];
        const stateWords = state.split(' ');
        if (stateWords.length === 1 && stateSuffixes.some(suffix => state === suffix)) {
          // Try to reconstruct full state name from city if available
          if (address.city && address.city.trim()) {
            const cityText = address.city.trim();
            const commonStates = [
              'Madhya Pradesh', 'Uttar Pradesh', 'Andhra Pradesh', 'Arunachal Pradesh',
              'Himachal Pradesh', 'West Bengal', 'Tamil Nadu', 'Uttarakhand'
            ];

            const foundState = commonStates.find(fullState => {
              const stateWords = fullState.split(' ');
              const lastWord = stateWords[stateWords.length - 1];
              return lastWord === state && cityText.toLowerCase().includes(fullState.toLowerCase());
            });

            if (foundState) {
              state = foundState;
            } else {
              // Skip if we can't reconstruct the full state name
              console.warn(`⚠️ Skipping partial state name: "${state}" for vendor ${vendor._id}`);
              return;
            }
          } else {
            // Skip partial state names if no city to reconstruct from
            console.warn(`⚠️ Skipping partial state name: "${state}" for vendor ${vendor._id}`);
            return;
          }
        }

        // Clean city name - remove state name if present (e.g., "Indore Madhya Pradesh" -> "Indore")
        // Also handle cases where state is stored in city field (incorrect data)
        let city = null;

        // Handle case where city field contains state name (incorrect data)
        // Try to get city from landmark or street if city is actually a state
        const commonStates = ['Madhya Pradesh', 'Uttar Pradesh', 'Maharashtra', 'Gujarat', 'Rajasthan',
          'Karnataka', 'Tamil Nadu', 'West Bengal', 'Bihar', 'Odisha', 'Andhra Pradesh',
          'Telangana', 'Kerala', 'Punjab', 'Haryana', 'Jharkhand', 'Assam', 'Himachal Pradesh'];

        if (address.city && address.city.trim()) {
          const originalCity = address.city.trim();
          city = originalCity;

          console.log(`  🔍 Processing city for vendor ${vendor._id}: "${originalCity}" in state "${state}"`);

          // Check if city is EXACTLY a state name (incorrect data storage)
          const isExactStateName = commonStates.some(s => city.toLowerCase() === s.toLowerCase());
          if (isExactStateName) {
            console.log(`  ⚠️ City field contains state name "${city}" - data is incorrectly stored`);
            console.log(`  🔄 Trying to get city from landmark or street fields...`);

            // Try to get city from landmark field
            if (address.landmark && address.landmark.trim() && !commonStates.some(s => address.landmark.trim().toLowerCase() === s.toLowerCase())) {
              city = address.landmark.trim();
              console.log(`  ✅ Using landmark as city: "${city}"`);
            }
            // Try to get city from street field (sometimes city is in street)
            else if (address.street && address.street.trim()) {
              const streetParts = address.street.trim().split(',').map(p => p.trim());
              // Check if any part of street is a valid city (not a state, not a pincode)
              const potentialCity = streetParts.find(part => {
                return part.length > 0 &&
                  !/^\d+$/.test(part) &&
                  !commonStates.some(s => part.toLowerCase() === s.toLowerCase());
              });
              if (potentialCity) {
                city = potentialCity;
                console.log(`  ✅ Using street part as city: "${city}"`);
              } else {
                console.log(`  ❌ Could not find valid city in street field`);
                city = null;
              }
            } else {
              console.log(`  ❌ No valid city found in landmark or street, skipping city`);
              city = null;
            }
          } else {
            // Remove state name from city if it appears at the END of city name
            // Only remove if state name appears as the last part of city name
            const stateWords = state.split(' ').filter(w => w.length > 2); // Filter out short words
            if (stateWords.length > 0) {
              const cityWords = city.split(' ');
              // Check if city ends with state name (last word or last few words match state)
              if (cityWords.length > 1) {
                // Check if last word matches any state word
                const lastWord = cityWords[cityWords.length - 1];
                const secondLastWord = cityWords.length > 2 ? cityWords[cityWords.length - 2] : null;

                // If last word matches a state word, remove it
                if (stateWords.some(sw => sw.toLowerCase() === lastWord.toLowerCase())) {
                  city = cityWords.slice(0, -1).join(' ').trim();
                }
                // If last two words match state (e.g., "City Madhya Pradesh" -> "City")
                else if (secondLastWord && stateWords.length >= 2) {
                  const lastTwoWords = `${secondLastWord} ${lastWord}`.toLowerCase();
                  const stateLower = state.toLowerCase();
                  if (stateLower.includes(lastTwoWords) || lastTwoWords === stateLower) {
                    city = cityWords.slice(0, -2).join(' ').trim();
                  }
                }
              }
            }

            // Remove pincode from city if present
            city = city.replace(/\s+\d{6}$/, '').replace(/\s+\d{5,6}$/, '').trim();

            // Skip if city becomes empty or is only numbers
            if (!city || /^\d+$/.test(city)) {
              console.log(`  ⚠️ Skipping city "${originalCity}" - became empty or only numbers after cleaning`);
              city = null;
            } else {
              console.log(`  ✅ City processed: "${originalCity}" -> "${city}"`);
            }
          }
        } else {
          console.log(`  ⚠️ No city for vendor ${vendor._id} - address.city is:`, address.city);
        }

        if (address && address.area && address.area.trim()) {
          const cleanArea = toTitleCase(address.area.trim());
          const areaCity = city ? normalizeCity(city) : null;
          if (cleanArea.length > 0 && !/^\d+$/.test(cleanArea)) {
            areasSet.add(JSON.stringify({ name: cleanArea, city: areaCity }));
          }
        }

        if (address && address.market && address.market.trim()) {
          const cleanMarket = address.market.trim();
          const marketCity = city ? normalizeCity(city) : null;
          if (cleanMarket.length > 0) {
            marketsSet.add(JSON.stringify({ name: cleanMarket, city: marketCity }));
          }
        } else {
          console.log(`  ⚠️ No market for vendor ${vendor._id}`);
        }

        // Normalize state name using alias map (handles misspellings, abbreviations)
        state = normalizeState(state);

        if (!locationMap.has(state)) {
          locationMap.set(state, new Set());
          console.log(`  📍 Created new state entry: "${state}"`);
        }

        if (city && city.length > 0) {
          // Normalize city using alias map (handles misspellings + title case)
          const normalizedCity = normalizeCity(city);
          locationMap.get(state).add(normalizedCity);
          console.log(`  ✅ Added city "${normalizedCity}" to state "${state}"`);
        } else {
          console.log(`  ❌ No city added for state "${state}" from vendor ${vendor._id}`);
          console.log(`     Reason: city is ${city === null ? 'null' : 'empty'}, original city was: "${address?.city || 'N/A'}"`);

          // If no city but we have a valid state, add a default city entry to ensure state shows up
          // This is a fallback - ideally vendors should have proper city data
          // But for now, we'll add the state name as a city so the dropdown isn't empty
          if (address && address.city === null || address.city === undefined || address.city.trim() === '') {
            console.log(`  🔄 Adding fallback: Using state name as city for vendor ${vendor._id}`);
            // Don't add state as city - that would be confusing
            // Instead, we'll just skip this vendor's city contribution
          }
        }
      }
    });

    // Convert to array format and sort
    const states = Array.from(locationMap.entries())
      .map(([stateName, citiesSet]) => ({
        name: stateName,
        cities: Array.from(citiesSet).sort((a, b) => a.localeCompare(b)),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    // Debug logging
    console.log('📍 B2B Locations - Total states:', states.length);
    states.forEach(state => {
      console.log(`  State: "${state.name}" - Cities: ${state.cities.length}`, state.cities.slice(0, 3));
    });

    const areas = Array.from(areasSet).map(s => JSON.parse(s)).sort((a, b) => a.name.localeCompare(b.name));
    const markets = Array.from(marketsSet).map(s => JSON.parse(s)).sort((a, b) => a.name.localeCompare(b.name));

    return { states, areas, markets };
  } catch (error) {
    console.error('Error fetching B2B locations:', error);
    throw error;
  }
};
