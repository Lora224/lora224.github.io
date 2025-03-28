// Main Application Logic
const App = {
    // Current location
    location: null,
    
    // Selected radius in km
    radius: 5,
    
    // Loading state
    isLoading: false,
    
    // Current restaurants
    currentRestaurants: [],
    
    // Initialize the application
    init: async function() {
        try {
            // Set up event listeners
            if (UI.elements.radiusSelect) {
                UI.elements.radiusSelect.addEventListener('change', this.handleRadiusChange.bind(this));
            }
            
            if (UI.elements.searchButton) {
                UI.elements.searchButton.addEventListener('click', this.handleCitySearch.bind(this));
            }
            
            if (UI.elements.cityInput) {
                UI.elements.cityInput.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        this.handleCitySearch();
                    }
                });
            }
            
            if (UI.elements.useMyLocationButton) {
                UI.elements.useMyLocationButton.addEventListener('click', this.handleUseMyLocation.bind(this));
            }
            
            if (UI.elements.categoryFilter) {
                UI.elements.categoryFilter.addEventListener('change', this.handleCategoryChange.bind(this));
            }
            
            if (UI.elements.loadMoreBtn) {
                UI.elements.loadMoreBtn.addEventListener('click', () => this.loadMoreRestaurants());
            }
            
            // Add scroll event listener for infinite scrolling
            window.addEventListener('scroll', this.handleScroll.bind(this));
            
            // Show loading state
            UI.showLoading();
            
            // Get user's location
            await this.handleUseMyLocation();
            
            // Load favorites
            UI.updateFavoritesList();
            
            // Initialize UI filters
            UI.initFilters();
            
            // Initialize the favorites panel
            UI.initFavoritesPanel();
            
        } catch (error) {
            console.error('Error initializing app:', error);
            UI.showError(`Error: ${error.message}`);
        }
    },
    
    // Handle radius change
    handleRadiusChange: function(event) {
        this.radius = parseInt(event.target.value);
        this.loadRestaurants(false); // false means not loading more, but starting fresh
    },
    
    // Handle category change
    handleCategoryChange: function(event) {
        const filterValue = event.target.value;
        RestaurantService.setFilter(filterValue);
        UI.applyFilters();
    },
    
    // Handle city search
    handleCitySearch: async function() {
        try {
            const cityName = UI.elements.cityInput.value.trim();
            
            if (!cityName) {
                UI.showError('Please enter a city name');
                return;
            }
            
            UI.showLoading();
            this.isLoading = true;
            
            // Get location from city name
            this.location = await LocationService.getLocationFromCity(cityName);
            
            // Update UI to show which city is being searched
            UI.updateLocationDisplay(this.location.cityName || cityName);
            
            // Load restaurants for this location
            await this.loadRestaurants(false);
            
        } catch (error) {
            console.error('Error searching for city:', error);
            UI.showError(`Error: ${error.message}`);
        } finally {
            this.isLoading = false;
        }
    },
    
    // Handle "Use My Location" button
    handleUseMyLocation: async function() {
        try {
            UI.showLoading();
            this.isLoading = true;
            
            // Get user's location
            this.location = await LocationService.getCurrentLocation();
            
            // Update UI to show that we're using the user's location
            UI.updateLocationDisplay('Your Current Location');
            
            // Load restaurants for this location
            await this.loadRestaurants(false);
            
        } catch (error) {
            console.error('Error getting current location:', error);
            UI.showError(`Error: ${error.message}. Please try searching for a city instead.`);
        } finally {
            this.isLoading = false;
        }
    },
    
    // Handle scroll event for infinite scrolling
    handleScroll: function() {
        // Check if we're near the bottom of the page (300px from bottom)
        if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 300) {
            // Check if we're not already loading and if there are more restaurants
            if (!this.isLoading && RestaurantService.hasMoreRestaurants()) {
                this.loadMoreRestaurants();
            }
        }
    },
    
    // Load restaurants based on current location and radius
    loadRestaurants: async function(isLoadMore = false) {
        try {
            if (!this.location) {
                UI.showError('Location not available. Please try again.');
                return;
            }
            
            if (!isLoadMore) {
                UI.showLoading();
            } else {
                UI.showLoadingMore();
            }
            
            this.isLoading = true;
            
            const { latitude, longitude } = this.location;
            const restaurants = await RestaurantService.getNearbyRestaurants(
                latitude, 
                longitude, 
                this.radius,
                isLoadMore
            );
            
            if (!isLoadMore) {
                this.currentRestaurants = restaurants;
                UI.displayRestaurants(restaurants);
                
                // Populate category filter with available categories
                UI.populateCategoryFilter(restaurants);
            } else {
                this.currentRestaurants = [...this.currentRestaurants, ...restaurants];
                UI.appendRestaurants(restaurants);
            }
            
            // Show/hide load more button
            if (UI.elements.loadMoreContainer) {
                UI.elements.loadMoreContainer.style.display = 
                    RestaurantService.hasMoreRestaurants() ? 'flex' : 'none';
            }
            
        } catch (error) {
            console.error('Error loading restaurants:', error);
            UI.showError(`Error loading restaurants: ${error.message}`);
        } finally {
            this.isLoading = false;
        }
    },
    
    // Load more restaurants when scrolling or clicking load more
    loadMoreRestaurants: function() {
        if (!this.isLoading && RestaurantService.hasMoreRestaurants()) {
            this.loadRestaurants(true);
        }
    },
    
    // Get current restaurants
    getCurrentRestaurants: function() {
        return this.currentRestaurants;
    }
};

// Initialize the app when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
