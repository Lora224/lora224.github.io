// Restaurant Service - Handles API calls and data processing

const RestaurantService = {
    // Google API Key - In production, this should be secured by:
    // 1. Restricting the key to your domain in Google Cloud Console
    // 2. Moving API calls to a backend service
    // 3. Using environment variables for the key
    GOOGLE_API_KEY: 'AIzaSyAGa8enCteAGCx_yZnSxphWNz_NI4O0cHM',
    
    // Store all fetched restaurants to avoid duplicates
    allFetchedRestaurants: [],
    
    // Store remaining restaurants for pagination
    remainingRestaurants: [],
    
    // Current filter type
    currentFilter: 'all',
    
    // Set filter type
    setFilter: function(filterType) {
        this.currentFilter = filterType;
    },
    
    // Get current filter
    getFilter: function() {
        return this.currentFilter;
    },
    
    // Get nearby restaurants based on location and distance
    getNearbyRestaurants: async function(latitude, longitude, distance, isLoadMore = false) {
        return new Promise(async (resolve, reject) => {
            try {
                // If loading more and we have remaining restaurants, just return those
                if (isLoadMore && this.remainingRestaurants.length > 0) {
                    const nextBatch = this.getFilteredBatch(this.remainingRestaurants.splice(0, 5));
                    resolve(nextBatch);
                    return;
                }
                
                // Reset if not loading more
                if (!isLoadMore) {
                    this.allFetchedRestaurants = [];
                    this.remainingRestaurants = [];
                }
                
                console.log("Loading restaurant data...");
                
                // First try to use mock data immediately to show something to the user
                const mockRestaurants = this.getMockRestaurants(latitude, longitude);
                
                // Try to load Google Maps API in parallel
                LocationService.ensureGoogleMapsLoaded()
                    .then(async () => {
                        try {
                            // Try to use Google Maps Places API directly with a shorter timeout
                            const placesPromise = this.searchNearbyPlaces(latitude, longitude, distance);
                            const timeoutPromise = new Promise((_, reject) => 
                                setTimeout(() => reject(new Error("Places API request timed out")), 8000)
                            );
                            
                            const restaurants = await Promise.race([placesPromise, timeoutPromise]);
                            
                            if (restaurants && restaurants.length > 0) {
                                // Shuffle all restaurants
                                const shuffledRestaurants = restaurants.sort(() => Math.random() - 0.5);
                                
                                // Take first 5 for current batch
                                const currentBatch = this.getFilteredBatch(shuffledRestaurants.slice(0, 5));
                                
                                // Store the rest for later
                                this.remainingRestaurants = shuffledRestaurants.slice(5);
                                
                                // Add current batch to all fetched restaurants
                                this.allFetchedRestaurants = [...this.allFetchedRestaurants, ...currentBatch];
                                
                                // Replace the mock data with real data
                                resolve(currentBatch);
                            }
                        } catch (error) {
                            console.error("Error using Places API:", error);
                            // We already resolved with mock data, so no need to do anything here
                        }
                    })
                    .catch(error => {
                        console.error("Error loading Google Maps API:", error);
                        // We already resolved with mock data, so no need to do anything here
                    });
                
                // Immediately resolve with mock data while we try to load real data
                resolve(this.getFilteredBatch(mockRestaurants));
                
            } catch (error) {
                console.error('Error fetching nearby restaurants:', error);
                // Always provide some results even on error
                const mockRestaurants = this.getMockRestaurants(latitude, longitude);
                resolve(this.getFilteredBatch(mockRestaurants));
            }
        });
    },
    
    // Filter a batch of restaurants based on current filter
    getFilteredBatch: function(restaurants) {
        if (this.currentFilter === 'all') {
            return restaurants;
        }
        
        return restaurants.filter(restaurant => 
            restaurant.categories.includes(this.currentFilter)
        );
    },
    
    // Search for nearby places using Google Maps Places library
    searchNearbyPlaces: function(latitude, longitude, distance) {
        return new Promise((resolve, reject) => {
            try {
                // Check if Google Maps is available
                if (typeof google === 'undefined' || !google.maps || !google.maps.places) {
                    throw new Error("Google Maps API not available");
                }
                
                // Create a dedicated element for the PlacesService
                let placesDiv = document.getElementById('places-service');
                if (!placesDiv) {
                    placesDiv = document.createElement('div');
                    placesDiv.id = 'places-service';
                    placesDiv.style.display = 'none';
                    document.body.appendChild(placesDiv);
                }
                
                const location = new google.maps.LatLng(latitude, longitude);
                const placesService = new google.maps.places.PlacesService(placesDiv);
                
                const request = {
                    location: location,
                    radius: distance * 1000, // Convert km to meters
                    type: ['restaurant', 'cafe', 'bar'] // Include all three types
                };
                
                // Set a timeout for the Places API request
                const requestTimeout = setTimeout(() => {
                    console.warn("Places API request timed out");
                    resolve([]);
                }, 5000);
                
                placesService.nearbySearch(request, (results, status) => {
                    clearTimeout(requestTimeout);
                    
                    if (status === google.maps.places.PlacesServiceStatus.OK && results) {
                        // Process each restaurant to get more details
                        this.processPlacesResults(results, latitude, longitude, resolve, reject);
                    } else {
                        console.warn("Places API returned status:", status);
                        resolve([]);
                    }
                });
            } catch (error) {
                console.error("Error in searchNearbyPlaces:", error);
                resolve([]);
            }
        });
    },
    
    // Process places results to get more details
    processPlacesResults: function(results, latitude, longitude, resolve, reject) {
        try {
            // Check if Google Maps is available
            if (typeof google === 'undefined' || !google.maps || !google.maps.places) {
                throw new Error("Google Maps API not available");
            }
            
            // Create a dedicated element for the PlacesService
            let detailsDiv = document.getElementById('details-service');
            if (!detailsDiv) {
                detailsDiv = document.createElement('div');
                detailsDiv.id = 'details-service';
                detailsDiv.style.display = 'none';
                document.body.appendChild(detailsDiv);
            }
            
            const placesService = new google.maps.places.PlacesService(detailsDiv);
            const processedResults = [];
            
            // Limit to 15 results to avoid too many API calls
            const limitedResults = results.slice(0, 15);
            let pendingRequests = limitedResults.length;
            
            // If no results, resolve with empty array
            if (limitedResults.length === 0) {
                resolve([]);
                return;
            }
            
            // Set a timeout for all details requests
            const detailsTimeout = setTimeout(() => {
                console.warn("Some details requests timed out, returning partial results");
                if (processedResults.length > 0) {
                    resolve(processedResults);
                } else {
                    resolve([]);
                }
            }, 8000);
            
            limitedResults.forEach((place) => {
                // Calculate distance
                const placeLocation = place.geometry.location;
                const distance = this.calculateDistance(
                    latitude,
                    longitude,
                    placeLocation.lat(),
                    placeLocation.lng()
                );
                
                // Request additional details
                const request = {
                    placeId: place.place_id,
                    fields: ['name', 'rating', 'formatted_address', 'photos', 'types', 'editorial_summary', 'url', 'website', 'formatted_phone_number', 'reviews']
                };
                
                // Set a timeout for each individual details request
                const individualTimeout = setTimeout(() => {
                    pendingRequests--;
                    if (pendingRequests === 0) {
                        clearTimeout(detailsTimeout);
                        resolve(processedResults);
                    }
                }, 3000);
                
                placesService.getDetails(request, (placeDetails, status) => {
                    clearTimeout(individualTimeout);
                    pendingRequests--;
                    
                    if (status === google.maps.places.PlacesServiceStatus.OK && placeDetails) {
                        // Get a good description from various sources
                        let description = '';
                        
                        // Try to get description from editorial summary
                        if (placeDetails.editorial_summary && placeDetails.editorial_summary.overview) {
                            description = placeDetails.editorial_summary.overview;
                        } 
                        // Try to get description from first review
                        else if (placeDetails.reviews && placeDetails.reviews.length > 0) {
                            description = placeDetails.reviews[0].text.substring(0, 150) + '...';
                        } 
                        // Fallback description based on place type
                        else {
                            if (place.types.includes('restaurant')) {
                                description = `${placeDetails.name || place.name} is a restaurant located in the area. Click the title to view more details.`;
                            } else if (place.types.includes('cafe')) {
                                description = `${placeDetails.name || place.name} is a cafe located in the area. Click the title to view more details.`;
                            } else if (place.types.includes('bar')) {
                                description = `${placeDetails.name || place.name} is a bar located in the area. Click the title to view more details.`;
                            } else {
                                description = `${placeDetails.name || place.name} is a popular place in the area. Click the title to view more details.`;
                            }
                        }
                        
                        // Create restaurant object
                        const restaurant = {
                            id: place.place_id,
                            name: placeDetails.name || place.name,
                            introduction: description,
                            rating: placeDetails.rating || place.rating || 'Not rated',
                            image: placeDetails.photos && placeDetails.photos.length > 0 ? 
                                placeDetails.photos[0].getUrl({ maxWidth: 800, maxHeight: 400 }) : 
                                'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iODAwIiBoZWlnaHQ9IjQwMCIgZmlsbD0iI2YyZjJmMiIvPjx0ZXh0IHg9IjQwMCIgeT0iMjAwIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMzAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiM2NjY2NjYiPk5vIEltYWdlIEF2YWlsYWJsZTwvdGV4dD48L3N2Zz4=',
                            categories: placeDetails.types ? 
                                placeDetails.types.filter(type => type !== 'establishment' && type !== 'food' && type !== 'point_of_interest') : 
                                place.types.filter(type => type !== 'establishment' && type !== 'food' && type !== 'point_of_interest'),
                            distance: distance.toFixed(2), // in km
                            url: placeDetails.url || `https://www.google.com/maps/place/?q=place_id:${place.place_id}`
                        };
                        
                        processedResults.push(restaurant);
                    }
                    
                    // When all requests are done, resolve with results
                    if (pendingRequests === 0) {
                        clearTimeout(detailsTimeout);
                        resolve(processedResults);
                    }
                });
            });
        } catch (error) {
            console.error("Error in processPlacesResults:", error);
            resolve([]);
        }
    },
    
    // Generate mock restaurant data for fallback
    getMockRestaurants: function(latitude, longitude) {
        const mockData = [
            {
                name: 'Delicious Bistro',
                categories: ['restaurant', 'french'],
                description: 'A cozy bistro with a variety of delicious French dishes. Known for their excellent wine selection and intimate atmosphere. Perfect for a romantic dinner.',
                type: 'restaurant'
            },
            {
                name: 'Tasty Corner Cafe',
                categories: ['cafe', 'breakfast'],
                description: 'Family-friendly cafe with something for everyone. Their breakfast menu is available all day and features freshly baked pastries and organic coffee.',
                type: 'cafe'
            },
            {
                name: 'Gourmet Palace',
                categories: ['restaurant', 'fine_dining'],
                description: 'Upscale dining experience with innovative cuisine. The chef creates seasonal menus using locally sourced ingredients. Reservations recommended.',
                type: 'restaurant'
            },
            {
                name: 'Flavor Haven',
                categories: ['restaurant', 'asian'],
                description: 'Quick and tasty Asian fusion meals in a casual atmosphere. Their signature dishes include spicy noodle bowls and creative sushi rolls.',
                type: 'restaurant'
            },
            {
                name: 'The Local Bar',
                categories: ['bar', 'pub'],
                description: 'Great drinks and atmosphere for evening entertainment. Features craft beers on tap, classic cocktails, and live music on weekends.',
                type: 'bar'
            },
            {
                name: 'Morning Brew',
                categories: ['cafe', 'coffee'],
                description: 'Perfect spot for your morning coffee and pastry. They roast their own beans and offer a variety of brewing methods. Try their famous cinnamon rolls!',
                type: 'cafe'
            },
            {
                name: 'Culinary Delight',
                categories: ['restaurant', 'italian'],
                description: 'Fresh ingredients and creative Italian recipes await you. Their homemade pasta and wood-fired pizzas are customer favorites. Family-owned for over 20 years.',
                type: 'restaurant'
            },
            {
                name: 'Cocktail Lounge',
                categories: ['bar', 'lounge'],
                description: 'Sophisticated cocktails in an elegant setting. Their mixologists create both classic and innovative drinks. Enjoy the relaxed ambiance and occasional jazz performances.',
                type: 'bar'
            },
            {
                name: 'Sunrise Bakery & Cafe',
                categories: ['cafe', 'bakery'],
                description: 'Artisanal bakery and cafe serving freshly baked bread, pastries, and light meals. Everything is made in-house daily. Their sourdough is legendary in the neighborhood.',
                type: 'cafe'
            },
            {
                name: 'Spice Route',
                categories: ['restaurant', 'indian'],
                description: 'Authentic Indian cuisine with dishes from various regions. Their extensive menu features both vegetarian and meat options with customizable spice levels.',
                type: 'restaurant'
            }
        ];
        
        // Base64 encoded SVG images for each mock restaurant type
        const mockImages = {
            restaurant: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iODAwIiBoZWlnaHQ9IjQwMCIgZmlsbD0iI2YyZjJmMiIvPjx0ZXh0IHg9IjQwMCIgeT0iMjAwIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMzAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiM2NjY2NjYiPlJlc3RhdXJhbnQ8L3RleHQ+PC9zdmc+',
            cafe: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iODAwIiBoZWlnaHQ9IjQwMCIgZmlsbD0iI2YyZjJmMiIvPjx0ZXh0IHg9IjQwMCIgeT0iMjAwIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMzAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiM2NjY2NjYiPkNhZmU8L3RleHQ+PC9zdmc+',
            bar: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iODAwIiBoZWlnaHQ9IjQwMCIgZmlsbD0iI2YyZjJmMiIvPjx0ZXh0IHg9IjQwMCIgeT0iMjAwIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMzAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiM2NjY2NjYiPkJhcjwvdGV4dD48L3N2Zz4='
        };
        
        // Shuffle and take random places
        const shuffled = mockData.sort(() => Math.random() - 0.5);
        
        return shuffled.map((place, index) => {
            // Generate random coordinates nearby
            const lat = latitude + (Math.random() - 0.5) * 0.01;
            const lng = longitude + (Math.random() - 0.5) * 0.01;
            
            // Calculate mock distance
            const distance = this.calculateDistance(latitude, longitude, lat, lng);
            
            return {
                id: `mock-${index}`,
                name: place.name,
                introduction: place.description,
                rating: (3 + Math.random() * 2).toFixed(1),
                image: mockImages[place.type],
                categories: place.categories,
                distance: distance.toFixed(2),
                url: '#'
            };
        });
    },
    
    // Check if more restaurants are available
    hasMoreRestaurants: function() {
        if (this.currentFilter === 'all') {
            return this.remainingRestaurants.length > 0;
        }
        
        // Check if there are any restaurants matching the current filter
        return this.remainingRestaurants.some(restaurant => 
            restaurant.categories.includes(this.currentFilter)
        );
    },
    
    // Helper function to calculate distance between two points using Haversine formula
    calculateDistance: function(lat1, lon1, lat2, lon2) {
        const R = 6371; // Earth's radius in kilometers
        const dLat = this.toRad(lat2 - lat1);
        const dLon = this.toRad(lon2 - lon1);
        const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) * 
            Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    },
    
    toRad: function(degrees) {
        return degrees * (Math.PI/180);
    },
    
    // Update this property in RestaurantService
    PROXY_URL: 'https://lora224.github.io',
};