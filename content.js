import { useState, useEffect } from 'react';

// Custom hook for getting nearby restaurants
const useNearbyRestaurants = (latitude, longitude, distance) => {
  const [restaurants, setRestaurants] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchRestaurants = async () => {
      try {
        setLoading(true);
        const GOOGLE_API_KEY = 'AIzaSyDUtYddk1p1L-8fUg3DKTpW6Df4CMpvwws'; // Replace with your Google API key
        const radius = distance * 1000; // Convert km to meters
        
        // First, get nearby restaurants
        const placesEndpoint = `https://maps.googleapis.com/maps/api/place/nearbysearch/json`;
        const params = new URLSearchParams({
          location: `${latitude},${longitude}`,
          radius: radius,
          type: 'restaurant',
          key: GOOGLE_API_KEY
        });

        const response = await fetch(`${placesEndpoint}?${params}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch restaurants');
        }

        const data = await response.json();
        
        // Randomly select 5 restaurants from the results
        const randomRestaurants = data.results
          .sort(() => Math.random() - 0.5)
          .slice(0, 5);

        // Get detailed information for each selected restaurant
        const detailedRestaurants = await Promise.all(
          randomRestaurants.map(async (restaurant) => {
            const detailsEndpoint = 'https://maps.googleapis.com/maps/api/place/details/json';
            const detailParams = new URLSearchParams({
              place_id: restaurant.place_id,
              fields: 'name,rating,formatted_address,photos,types,editorial_summary',
              key: GOOGLE_API_KEY
            });

            const detailResponse = await fetch(`${detailsEndpoint}?${detailParams}`);
            const detailData = await detailResponse.json();
            const place = detailData.result;

            // Calculate distance using the Haversine formula
            const distance = calculateDistance(
              latitude,
              longitude,
              restaurant.geometry.location.lat,
              restaurant.geometry.location.lng
            );

            return {
              name: place.name,
              introduction: place.editorial_summary?.overview || 'No description available',
              rating: place.rating || 'Not rated',
              image: place.photos ? 
                `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${place.photos[0].photo_reference}&key=${GOOGLE_API_KEY}` 
                : 'default-restaurant-image.jpg',
              categories: place.types.filter(type => type !== 'restaurant' && type !== 'establishment'),
              distance: distance.toFixed(2) // in km
            };
          })
        );

        setRestaurants(detailedRestaurants);

      } catch (error) {
        setError(error);
        console.error('Error fetching nearby restaurants:', error);
      } finally {
        setLoading(false);
      }
    };

    if (latitude && longitude) {
      fetchRestaurants();
    }
  }, [latitude, longitude, distance]);

  return { restaurants, loading, error };
};

// Helper function to calculate distance between two points using Haversine formula
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

const toRad = (degrees) => {
  return degrees * (Math.PI/180);
};

// Custom hook for getting user's current location
const useCurrentLocation = () => {
  const [location, setLocation] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const getCurrentLocation = async () => {
      try {
        setLoading(true);
        if (!navigator.geolocation) {
          throw new Error('Geolocation is not supported by your browser');
        }

        const position = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject);
        });

        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    getCurrentLocation();
  }, []);

  return { location, loading, error };
};

// Example usage in a React component:
/*
const RestaurantFinder = () => {
  const { location, loading: locationLoading, error: locationError } = useCurrentLocation();
  const { restaurants, loading: restaurantsLoading, error: restaurantsError } = 
    useNearbyRestaurants(location?.latitude, location?.longitude, 5);

  if (locationLoading || restaurantsLoading) return <div>Loading...</div>;
  if (locationError || restaurantsError) return <div>Error occurred</div>;
  
  return (
    <div>
      {restaurants.map(restaurant => (
        <div key={restaurant.name}>
          <h2>{restaurant.name}</h2>
          <p>{restaurant.introduction}</p>
        </div>
      ))}
    </div>
  );
};
*/
