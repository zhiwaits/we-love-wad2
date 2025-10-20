const axios = require('axios');

// TODO: It's recommended to move the API key to an environment variable for better security.
const GOOGLE_MAPS_API_KEY = 'your_google_maps_api_key_here';

exports.getTravelTime = async (req, res) => {
    const { origin, destination } = req.body;

    if (!origin || !destination) {
        return res.status(400).json({ error: 'Origin and destination are required' });
    }

    if (GOOGLE_MAPS_API_KEY === 'your_google_maps_api_key_here') {
        return res.status(500).json({ error: 'Google Maps API key not configured' });
    }

    try {
        const response = await axios.get('https://maps.googleapis.com/maps/api/distancematrix/json', {
            params: {
                origins: `${origin.lat},${origin.lng}`,
                destinations: `${destination.lat},${destination.lng}`,
                mode: 'driving',
                units: 'metric',
                key: GOOGLE_MAPS_API_KEY
            }
        });

        const data = response.data;

        if (data.status === 'OK' && data.rows[0].elements[0].status === 'OK') {
            const element = data.rows[0].elements[0];
            res.json({
                duration: element.duration.text,
                distance: element.distance.text,
                durationValue: element.duration.value, // in seconds
                distanceValue: element.distance.value  // in meters
            });
        } else {
            res.status(400).json({ error: 'Could not calculate travel time', status: data.status });
        }
    } catch (error) {
        console.error('Travel time calculation error:', error);
        res.status(500).json({ error: 'Server error calculating travel time', message: error.message });
    }
};
