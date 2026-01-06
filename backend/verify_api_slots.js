import axios from 'axios';

const verify = async () => {
    try {
        const url = 'http://localhost:5000/api/vendor/hero-banners/slots';
        console.log(`Fetching slots from: ${url}`);

        // We might need a vendor token if the endpoint is protected?
        // checking `backend/routes/vendor/heroBanner.routes.js` or similar would verify.
        // Assuming it might be public or I need to fake a token?
        // Let's first try without token.

        const response = await axios.get(url, { validateStatus: false });
        console.log('Status:', response.status);

        if (response.status === 200) {
            const slots = response.data.data.slots;
            const settings = response.data.data.settings;

            console.log('--- SETTINGS ---');
            console.log(JSON.stringify(settings, null, 2));

            console.log('--- SLOTS ---');
            slots.forEach(s => {
                console.log(`Slot ${s.slotNumber}: Price=${s.price}`);
            });
        } else {
            console.log('Response body:', JSON.stringify(response.data, null, 2));
        }

    } catch (error) {
        console.error('Error fetching API:', error.message);
        if (error.response) {
            console.error('Response data:', error.response.data);
        }
    }
};

verify();
