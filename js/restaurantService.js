// Restaurant Service - Handles API calls and data processing

const RestaurantService = {
    // Google API Key
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
                
                // Check if Google Maps API is loaded
                if (typeof google === 'undefined' || typeof google.maps === 'undefined' || 
                    typeof google.maps.places === 'undefined') {
                    console.log("Google Maps API not loaded yet, using mock data");
                    const mockRestaurants = this.getMockRestaurants(latitude, longitude);
                    resolve(this.getFilteredBatch(mockRestaurants));
                    return;
                }
                
                // Try to use Google Maps Places API
                try {
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
                    
                    // Try different types of places to get more results
                    const placeTypes = ['restaurant', 'cafe', 'bar'];
                    let allResults = [];
                    
                    // Use a timeout to prevent hanging
                    const timeoutId = setTimeout(() => {
                        console.log("Places API request timed out, using mock data");
                        if (allResults.length === 0) {
                            const mockRestaurants = this.getMockRestaurants(latitude, longitude);
                            resolve(this.getFilteredBatch(mockRestaurants));
                        } else {
                            // Process whatever results we have
                            this.processPlacesResults(allResults, placesService, latitude, longitude)
                                .then(restaurants => {
                                    if (restaurants.length > 0) {
                                        // Take first 5 for current batch
                                        const currentBatch = this.getFilteredBatch(restaurants.slice(0, 5));
                                        // Store the rest for later
                                        this.remainingRestaurants = restaurants.slice(5);
                                        resolve(currentBatch);
                                    } else {
                                        const mockRestaurants = this.getMockRestaurants(latitude, longitude);
                                        resolve(this.getFilteredBatch(mockRestaurants));
                                    }
                                });
                        }
                    }, 8000);
                    
                    // Try to search for restaurants first
                    const request = {
                        location: location,
                        radius: distance * 1000, // Convert km to meters
                        type: 'restaurant'
                    };
                    
                    console.log("Searching for restaurants near", latitude, longitude);
                    
                    // Use mock data immediately to show something to the user
                    const mockRestaurants = this.getMockRestaurants(latitude, longitude);
                    
                    // Try to perform the nearby search
                    try {
                        placesService.nearbySearch(request, (results, status) => {
                            console.log("Places API returned status:", status);
                            
                            if (status === google.maps.places.PlacesServiceStatus.OK && results && results.length > 0) {
                                console.log("Found restaurants:", results.length);
                                allResults = [...results];
                                
                                // Process the results
                                clearTimeout(timeoutId);
                                this.processPlacesResults(allResults, placesService, latitude, longitude)
                                    .then(restaurants => {
                                        if (restaurants.length > 0) {
                                            // Shuffle all restaurants
                                            const shuffledRestaurants = restaurants.sort(() => Math.random() - 0.5);
                                            
                                            // Take first 5 for current batch
                                            const currentBatch = this.getFilteredBatch(shuffledRestaurants.slice(0, 5));
                                            
                                            // Store the rest for later
                                            this.remainingRestaurants = shuffledRestaurants.slice(5);
                                            
                                            // Add current batch to all fetched restaurants
                                            this.allFetchedRestaurants = [...this.allFetchedRestaurants, ...currentBatch];
                                            
                                            resolve(currentBatch);
                                        } else {
                                            resolve(this.getFilteredBatch(mockRestaurants));
                                        }
                                    })
                                    .catch(error => {
                                        console.error("Error processing places results:", error);
                                        resolve(this.getFilteredBatch(mockRestaurants));
                                    });
                            } else {
                                console.warn("Places API returned status:", status);
                                resolve(this.getFilteredBatch(mockRestaurants));
                            }
                        });
                    } catch (error) {
                        console.error("Error in nearbySearch:", error);
                        clearTimeout(timeoutId);
                        resolve(this.getFilteredBatch(mockRestaurants));
                    }
                } catch (error) {
                    console.error("Error setting up Places API:", error);
                    const mockRestaurants = this.getMockRestaurants(latitude, longitude);
                    resolve(this.getFilteredBatch(mockRestaurants));
                }
            } catch (error) {
                console.error('Error in getNearbyRestaurants:', error);
                // Always provide some results even on error
                const mockRestaurants = this.getMockRestaurants(latitude, longitude);
                resolve(this.getFilteredBatch(mockRestaurants));
            }
        });
    },
    
    // Process the results from the Places API
    processPlacesResults: function(results, placesService, latitude, longitude) {
        return new Promise((resolve) => {
            const processedResults = [];
            let pendingRequests = Math.min(results.length, 15); // Limit to 15 places
            
            if (pendingRequests === 0) {
                resolve([]);
                return;
            }
            
            // Set a timeout for all details requests
            const timeoutId = setTimeout(() => {
                console.log("Place details requests timed out");
                resolve(processedResults);
            }, 8000);
            
            // Process each place
            results.slice(0, 15).forEach((place) => {
                const request = {
                    placeId: place.place_id,
                    fields: ['name', 'rating', 'formatted_address', 'photos', 'types', 
                             'editorial_summary', 'url', 'website', 'formatted_phone_number', 'reviews']
                };
                
                // Get details for each place
                try {
                    placesService.getDetails(request, (placeDetails, status) => {
                        pendingRequests--;
                        
                        if (status === google.maps.places.PlacesServiceStatus.OK && placeDetails) {
                            try {
                                // Calculate distance
                                const distance = this.calculateDistance(
                                    latitude, 
                                    longitude, 
                                    place.geometry.location.lat(), 
                                    place.geometry.location.lng()
                                );
                                
                                // Get a good description
                                let description = 'A popular place in the area.';
                                if (placeDetails.editorial_summary && placeDetails.editorial_summary.overview) {
                                    description = placeDetails.editorial_summary.overview;
                                } else if (placeDetails.reviews && placeDetails.reviews.length > 0) {
                                    description = placeDetails.reviews[0].text.substring(0, 150) + '...';
                                }
                                
                                // Get photo URL
                                let photoUrl = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iODAwIiBoZWlnaHQ9IjQwMCIgZmlsbD0iI2YyZjJmMiIvPjx0ZXh0IHg9IjQwMCIgeT0iMjAwIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMzAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiM2NjY2NjYiPk5vIEltYWdlIEF2YWlsYWJsZTwvdGV4dD48L3N2Zz4=';
                                if (placeDetails.photos && placeDetails.photos.length > 0) {
                                    try {
                                        photoUrl = placeDetails.photos[0].getUrl({ maxWidth: 800, maxHeight: 400 });
                                    } catch (photoError) {
                                        console.error("Error getting photo URL:", photoError);
                                    }
                                }
                                
                                // Create restaurant object
                                const restaurant = {
                                    id: place.place_id,
                                    name: placeDetails.name || place.name,
                                    introduction: description,
                                    rating: placeDetails.rating || place.rating || 'Not rated',
                                    image: photoUrl,
                                    categories: placeDetails.types ? 
                                        placeDetails.types.filter(type => type !== 'establishment' && type !== 'food') : 
                                        [],
                                    distance: distance.toFixed(2), // in km
                                    url: placeDetails.url || `https://www.google.com/maps/place/?q=place_id:${place.place_id}`
                                };
                                
                                processedResults.push(restaurant);
                            } catch (error) {
                                console.error("Error processing place details:", error);
                            }
                        } else {
                            console.warn("Place details API returned status:", status, "for place:", place.place_id);
                        }
                        
                        // When all requests are done, resolve with results
                        if (pendingRequests === 0) {
                            clearTimeout(timeoutId);
                            resolve(processedResults);
                        }
                    });
                } catch (error) {
                    console.error("Error in getDetails:", error);
                    pendingRequests--;
                    if (pendingRequests === 0) {
                        clearTimeout(timeoutId);
                        resolve(processedResults);
                    }
                }
            });
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
    
    // Get mock restaurants for testing
    getMockRestaurants: function(latitude, longitude) {
        const mockData = [
            {
                name: 'Delicious Bistro',
                categories: ['restaurant', 'french'],
                description: 'A cozy spot with a variety of delicious dishes. Their signature dish is the coq au vin, and they offer an extensive wine list featuring local and imported selections.',
                type: 'restaurant'
            },
            {
                name: 'Tasty Corner',
                categories: ['restaurant', 'american'],
                description: 'Family-friendly restaurant with something for everyone. Known for their generous portions and friendly service. Don\'t miss their famous apple pie for dessert!',
                type: 'restaurant'
            },
            {
                name: 'Espresso Express',
                categories: ['cafe', 'coffee'],
                description: 'Great coffee and pastries in a relaxed atmosphere. They roast their beans in-house and offer a variety of brewing methods. The outdoor seating area is perfect on sunny days.',
                type: 'cafe'
            },
            {
                name: 'Pub & Grub',
                categories: ['bar', 'pub'],
                description: 'Classic pub fare and a wide selection of beers. Their trivia nights on Thursdays are popular with locals. The fish and chips are a customer favorite.',
                type: 'bar'
            },
            {
                name: 'Sushi Spot',
                categories: ['restaurant', 'japanese'],
                description: 'Fresh sushi and Japanese specialties. The chef\'s omakase menu offers a unique dining experience with the freshest seasonal ingredients.',
                type: 'restaurant'
            },
            {
                name: 'Morning Brew',
                categories: ['cafe', 'breakfast'],
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
    }
};

console.log("RestaurantService loaded successfully");