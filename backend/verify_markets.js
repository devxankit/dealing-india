import axios from 'axios';

async function checkMarkets() {
    console.log("Checking WITH filter:");
    try {
        const response = await axios.get('http://localhost:5000/api/public/b2b-locations', {
            params: {
                businessTypeFilter: 'exclude',
                businessTypes: ['Developer', 'Property Broker']
            }
        });

        console.log('Success:', response.data.success);
        console.log('Markets:', response.data.data.markets);
        console.log('States count:', response.data.data.states.length);
    } catch (error) {
        console.error('Error:', error.message);
    }

    console.log("\nChecking WITHOUT filter:");
    try {
        const response = await axios.get('http://localhost:5000/api/public/b2b-locations');

        console.log('Success:', response.data.success);
        console.log('Markets:', response.data.data.markets);
        console.log('States count:', response.data.data.states.length);
    } catch (error) {
        console.error('Error:', error.message);
    }
}

checkMarkets();
