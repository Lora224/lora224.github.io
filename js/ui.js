// UI Service - Handles DOM manipulation and UI updates
const UI = {
    elements: {
        loadingSpinner: document.querySelector('.loading-spinner'),
        errorMessage: document.querySelector('.error-message'),
        cardContainer: document.querySelector('.card-container'),
        radiusSelect: document.getElementById('radius-select'),
        favoritesList: document.querySelector('.favorites-list'),
        favoritesItems: document.querySelector('.favorites-items'),
        cityInput: document.getElementById('city-input'),
        searchButton: document.getElementById('search-button'),
        useMyLocationButton: document.getElementById('use-my-location'),
        locationDisplay: document.createElement('div'), // We'll add this to the DOM
        filterDropdown: document.getElementById('filter-type'),
    },
    
    // Initialize UI elements that need to be created dynamically
    init: function() {
        // Create and add location display element
        this.elements.locationDisplay.className = 'location-display';
        document.querySelector('.search-controls').appendChild(this.elements.locationDisplay);
        
        // Initialize filter functionality
        this.initFilters();
    },
    
    // Initialize filter functionality
    initFilters: function() {
        this.elements.filterDropdown.addEventListener('change', () => {
            this.applyFilters();
        });
    },
    
    // Apply filters to the displayed restaurants
    applyFilters: function() {
        const filterValue = this.elements.filterDropdown.value;
        const allRestaurants = App.getCurrentRestaurants();
        
        if (!allRestaurants || allRestaurants.length === 0) {
            return;
        }
        
        if (filterValue === 'all') {
            this.displayRestaurants(allRestaurants);
            return;
        }
        
        // Filter restaurants based on their categories
        const filteredRestaurants = allRestaurants.filter(restaurant => {
            // Check if the restaurant has the selected category
            return restaurant.categories.includes(filterValue);
        });
        
        // Display filtered restaurants or show a message if none match
        if (filteredRestaurants.length === 0) {
            this.elements.cardContainer.innerHTML = `<p>No ${filterValue}s found in this area. Try a different filter or location.</p>`;
        } else {
            this.displayRestaurants(filteredRestaurants, true);
        }
    },
    
    // Update location display
    updateLocationDisplay: function(locationName) {
        this.elements.locationDisplay.textContent = `Showing restaurants in: ${locationName}`;
        this.elements.locationDisplay.style.display = 'block';
    },
    
    // Show loading spinner
    showLoading: function() {
        this.elements.loadingSpinner.style.display = 'flex';
        this.elements.cardContainer.style.display = 'none';
        this.elements.errorMessage.style.display = 'none';
    },
    
    // Hide loading spinner
    hideLoading: function() {
        this.elements.loadingSpinner.style.display = 'none';
        this.elements.cardContainer.style.display = 'grid';
    },
    
    // Show error message
    showError: function(message) {
        this.elements.errorMessage.textContent = message;
        this.elements.errorMessage.style.display = 'block';
        this.elements.loadingSpinner.style.display = 'none';
    },
    
    // Create restaurant card
    createRestaurantCard: function(restaurant) {
        const card = document.createElement('div');
        card.className = 'food-card';
        
        // Use the URL provided by the Places API
        const googleMapsUrl = restaurant.url || `https://www.google.com/maps/place/?q=place_id:${restaurant.id}`;
        
        // Check if this is a mock restaurant
        const isMock = restaurant.id.startsWith('mock-');
        
        card.innerHTML = `
            <img src="${restaurant.image}" alt="${restaurant.name}" class="food-image" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iODAwIiBoZWlnaHQ9IjQwMCIgZmlsbD0iI2VlZWVlZSIvPjx0ZXh0IHg9IjQwMCIgeT0iMjAwIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMzAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiM5OTk5OTkiPk5vIEltYWdlIEF2YWlsYWJsZTwvdGV4dD48L3N2Zz4='">
            <div class="food-content">
                <a href="${isMock ? '#' : googleMapsUrl}" class="food-title" target="${isMock ? '_self' : '_blank'}">${restaurant.name}</a>
                <p class="food-description">${restaurant.introduction}</p>
                <div class="restaurant-details">
                    <span>⭐ ${restaurant.rating}</span>
                    <span>📍 ${restaurant.distance} km away</span>
                    <div class="categories">
                        ${restaurant.categories.map(category => 
                            `<span class="category-tag">${category.replace('_', ' ')}</span>`
                        ).join('')}
                    </div>
                </div>
            </div>
            <button class="like-button ${this.getFavorites().some(fav => fav.id === restaurant.id) ? 'active' : ''}" data-id="${restaurant.id}">
                ❤
            </button>
        `;
        
        // Add event listener to like button
        const likeButton = card.querySelector('.like-button');
        likeButton.addEventListener('click', (e) => {
            e.stopPropagation();
            likeButton.classList.toggle('active');
            this.toggleFavorite(restaurant);
        });
        
        return card;
    },
    
    // Display restaurants
    displayRestaurants: function(restaurants, isFiltered = false) {
        this.elements.cardContainer.innerHTML = '';
        
        if (restaurants.length === 0) {
            this.elements.cardContainer.innerHTML = '<p>No restaurants found in this area. Try increasing the radius or searching for a different location.</p>';
            return;
        }
        
        restaurants.forEach(restaurant => {
            const card = this.createRestaurantCard(restaurant);
            this.elements.cardContainer.appendChild(card);
        });
        
        // Only hide loading if not filtering
        if (!isFiltered) {
            this.hideLoading();
        }
    },
    
    // Get favorites from localStorage
    getFavorites: function() {
        const favorites = localStorage.getItem('favorites');
        return favorites ? JSON.parse(favorites) : [];
    },
    
    // Save favorites to localStorage
    saveFavorites: function(favorites) {
        localStorage.setItem('favorites', JSON.stringify(favorites));
    },
    
    // Toggle favorite status
    toggleFavorite: function(restaurant) {
        const favorites = this.getFavorites();
        const index = favorites.findIndex(fav => fav.id === restaurant.id);
        
        if (index === -1) {
            favorites.push(restaurant);
        } else {
            favorites.splice(index, 1);
        }
        
        this.saveFavorites(favorites);
        this.updateFavoritesList();
    },
    
    // Update favorites list
    updateFavoritesList: function() {
        const favorites = this.getFavorites();
        this.elements.favoritesItems.innerHTML = '';
        
        if (favorites.length === 0) {
            this.elements.favoritesList.style.display = 'none';
            return;
        }
        
        favorites.forEach(favorite => {
            const item = document.createElement('div');
            item.className = 'favorites-item';
            item.textContent = favorite.name;
            this.elements.favoritesItems.appendChild(item);
        });
        
        this.elements.favoritesList.style.display = 'block';
    },
    
    // Show loading more indicator
    showLoadingMore: function() {
        // Create or show a loading indicator at the bottom of the list
        let loadingMore = document.querySelector('.loading-more');
        if (!loadingMore) {
            loadingMore = document.createElement('div');
            loadingMore.className = 'loading-more';
            loadingMore.innerHTML = '<div class="spinner"></div><p>Loading more restaurants...</p>';
            document.querySelector('main').appendChild(loadingMore);
        } else {
            loadingMore.style.display = 'flex';
        }
    },
    
    // Append more restaurants to the existing list
    appendRestaurants: function(restaurants) {
        if (restaurants.length === 0) {
            // Hide loading more indicator if no more restaurants
            const loadingMore = document.querySelector('.loading-more');
            if (loadingMore) {
                loadingMore.style.display = 'none';
            }
            return;
        }
        
        restaurants.forEach(restaurant => {
            const card = this.createRestaurantCard(restaurant);
            this.elements.cardContainer.appendChild(card);
        });
        
        // Hide loading more indicator
        const loadingMore = document.querySelector('.loading-more');
        if (loadingMore) {
            loadingMore.style.display = 'none';
        }
    }
};

// Initialize UI when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    UI.init();
});