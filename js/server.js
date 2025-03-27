const express = require('express');
const cors = require('cors');
const axios = require('axios');
const app = express();
const port = process.env.PORT || 3000;

// Enable CORS for all routes
app.use(cors());

// Proxy endpoint for Places API
app.get('/api/places/nearby', async (req, res) => {
  try {
    const { lat, lng, radius, type, key } = req.query;
    const response = await axios.get(
      'https://maps.googleapis.com/maps/api/place/nearbysearch/json',
      {
        params: {
          location: `${lat},${lng}`,
          radius,
          type,
          key
        }
      }
    );
    res.json(response.data);
  } catch (error) {
    console.error('Error proxying Places API request:', error);
    res.status(500).json({ error: 'Failed to fetch places data' });
  }
});

// Proxy endpoint for Place Details API
app.get('/api/places/details', async (req, res) => {
  try {
    const { place_id, fields, key } = req.query;
    const response = await axios.get(
      'https://maps.googleapis.com/maps/api/place/details/json',
      {
        params: {
          place_id,
          fields,
          key
        }
      }
    );
    res.json(response.data);
  } catch (error) {
    console.error('Error proxying Place Details API request:', error);
    res.status(500).json({ error: 'Failed to fetch place details' });
  }
});

// Proxy endpoint for Place Photos API
app.get('/api/places/photo', async (req, res) => {
  try {
    const { photoreference, maxwidth, key } = req.query;
    const response = await axios.get(
      'https://maps.googleapis.com/maps/api/place/photo',
      {
        params: {
          photoreference,
          maxwidth,
          key
        },
        responseType: 'stream'
      }
    );
    
    // Forward content type header
    res.set('Content-Type', response.headers['content-type']);
    
    // Pipe the image data directly to the response
    response.data.pipe(res);
  } catch (error) {
    console.error('Error proxying Place Photo API request:', error);
    res.status(500).json({ error: 'Failed to fetch place photo' });
  }
});

app.listen(port, () => {
  console.log(`Proxy server running on port ${port}`);
}); 