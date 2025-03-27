// UI Service - Handles DOM manipulation and UI updates
const UI = {
    elements: {
        loadingSpinner: document.getElementById('loading-spinner'),
        errorMessage: document.getElementById('error-message'),
        cardContainer: document.getElementById('card-container'),
        radiusSelect: document.getElementById('radius-select'),
        cityInput: document.getElementById('city-input'),
        searchButton: document.getElementById('search-button'),
        useMyLocationButton: document.getElementById('use-my-location-button'),
        locationDisplay: document.getElementById('location-display'),
        categoryFilter: document.getElementById('category-filter'),
        loadMoreBtn: document.getElementById('load-more-btn'),
        loadMoreContainer: document.getElementById('load-more-container'),
        emptyState: document.getElementById('empty-state'),
        favoritesPanel: null,
        favoritesToggle: null,
        favoritesContainer: null,
        favoritesCount: null,
    },
    
    // Initialize UI elements that need to be created dynamically
    init: function() {
        // Initialize the favorites panel
        this.initFavoritesPanel();
        
        // Initialize filter functionality
        this.initFilters();
    },
    
    // Initialize filter functionality
    initFilters: function() {
        if (this.elements.categoryFilter) {
            this.elements.categoryFilter.addEventListener('change', () => {
                this.applyFilters();
            });
        }
    },
    
    // Apply filters to the displayed restaurants
    applyFilters: function() {
        if (!this.elements.categoryFilter) return;
        
        const filterValue = this.elements.categoryFilter.value;
        const allRestaurants = App.getCurrentRestaurants();
        
        if (!allRestaurants || allRestaurants.length === 0) {
            return;
        }
        
        if (filterValue === 'all') {
            this.displayRestaurants(allRestaurants);
            
            // Show/hide load more button based on whether there are more restaurants
            if (this.elements.loadMoreContainer) {
                this.elements.loadMoreContainer.style.display = 
                    RestaurantService.hasMoreRestaurants() ? 'flex' : 'none';
            }
            return;
        }
        
        // Filter restaurants by category
        const filteredRestaurants = allRestaurants.filter(restaurant => 
            restaurant.categories.some(category => category === filterValue)
        );
        
        this.displayRestaurants(filteredRestaurants, true);
        
        // Hide load more button when filtering
        if (this.elements.loadMoreContainer) {
            this.elements.loadMoreContainer.style.display = 'none';
        }
        
        // Show empty state if no results
        if (filteredRestaurants.length === 0 && this.elements.emptyState) {
            this.elements.emptyState.style.display = 'block';
        }
    },
    
    // Initialize the favorites panel
    initFavoritesPanel: function() {
        // Create the panel if it doesn't exist
        if (!document.getElementById('favorites-panel')) {
            const panel = document.createElement('div');
            panel.id = 'favorites-panel';
            panel.className = 'favorites-panel collapsed';
            
            const toggle = document.createElement('button');
            toggle.id = 'favorites-toggle';
            toggle.className = 'favorites-toggle';
            toggle.innerHTML = '<span id="favorites-count" class="favorites-count">0</span> Favorites <span class="toggle-icon">▲</span>';
            
            const container = document.createElement('div');
            container.id = 'favorites-container';
            container.className = 'favorites-container';
            
            panel.appendChild(toggle);
            panel.appendChild(container);
            document.body.appendChild(panel);
            
            this.elements.favoritesPanel = panel;
            this.elements.favoritesToggle = toggle;
            this.elements.favoritesContainer = container;
            this.elements.favoritesCount = document.getElementById('favorites-count');
            
            // Add event listener for toggling
            toggle.addEventListener('click', () => {
                panel.classList.toggle('collapsed');
                const icon = toggle.querySelector('.toggle-icon');
                icon.textContent = panel.classList.contains('collapsed') ? '▲' : '▼';
            });
        }
        
        // Update favorites count and content
        this.updateFavoritesList();
    },
    
    // Show loading state
    showLoading: function() {
        if (this.elements.loadingSpinner) {
            this.elements.loadingSpinner.style.display = 'flex';
        }
        if (this.elements.errorMessage) {
            this.elements.errorMessage.style.display = 'none';
        }
        if (this.elements.cardContainer) {
            this.elements.cardContainer.innerHTML = '';
        }
        if (this.elements.loadMoreContainer) {
            this.elements.loadMoreContainer.style.display = 'none';
        }
        if (this.elements.emptyState) {
            this.elements.emptyState.style.display = 'none';
        }
    },
    
    // Hide loading state
    hideLoading: function() {
        if (this.elements.loadingSpinner) {
            this.elements.loadingSpinner.style.display = 'none';
        }
    },
    
    // Show error message
    showError: function(message) {
        if (this.elements.errorMessage) {
            this.elements.errorMessage.textContent = message;
            this.elements.errorMessage.style.display = 'block';
        }
        if (this.elements.loadingSpinner) {
            this.elements.loadingSpinner.style.display = 'none';
        }
    },
    
    // Update location display
    updateLocationDisplay: function(locationName) {
        if (this.elements.locationDisplay) {
            this.elements.locationDisplay.textContent = `Showing places near: ${locationName}`;
            this.elements.locationDisplay.style.display = 'block';
        }
    },
    
    // Display restaurants
    displayRestaurants: function(restaurants, hideLoadMore = false) {
        if (!this.elements.cardContainer) return;
        
        this.hideLoading();
        this.elements.cardContainer.innerHTML = '';
        
        if (restaurants.length === 0) {
            if (this.elements.emptyState) {
                this.elements.emptyState.style.display = 'block';
            }
            if (this.elements.loadMoreContainer) {
                this.elements.loadMoreContainer.style.display = 'none';
            }
            return;
        }
        
        restaurants.forEach(restaurant => {
            const card = this.createRestaurantCard(restaurant);
            this.elements.cardContainer.appendChild(card);
        });
        
        // Show load more button if there are more restaurants
        if (!hideLoadMore && this.elements.loadMoreContainer && RestaurantService.hasMoreRestaurants()) {
            this.elements.loadMoreContainer.style.display = 'flex';
        } else if (this.elements.loadMoreContainer) {
            this.elements.loadMoreContainer.style.display = 'none';
        }
    },
    
    // Create restaurant card
    createRestaurantCard: function(restaurant) {
        const card = document.createElement('div');
        card.className = 'card';
        
        // Check if this restaurant is in favorites
        const favorites = this.getFavorites();
        const isFavorite = favorites.some(fav => fav.id === restaurant.id);
        
        // Format categories to be more readable
        const formattedCategories = restaurant.categories.map(category => 
            category.replace(/_/g, ' ')
        );
        
        // Limit the number of categories displayed
        const displayCategories = formattedCategories.slice(0, 4);
        
        // Truncate description if too long
        const truncatedDescription = restaurant.introduction.length > 150 
            ? restaurant.introduction.substring(0, 150) + '...' 
            : restaurant.introduction;
        
        card.innerHTML = `
            <div class="card-img-container">
                <img src="${restaurant.image}" alt="${restaurant.name}" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iODAwIiBoZWlnaHQ9IjQwMCIgZmlsbD0iIzMzMzMzMyIvPjx0ZXh0IHg9IjQwMCIgeT0iMjAwIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMzAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiNlZWVlZWUiPk5vIEltYWdlIEF2YWlsYWJsZTwvdGV4dD48L3N2Zz4='">
            </div>
            <div class="card-content">
                <div class="card-rating">${restaurant.rating}</div>
                <h3 class="card-title">${restaurant.name}</h3>
                <p class="card-description">${truncatedDescription}</p>
                <div class="card-distance">${restaurant.distance} km away</div>
                <div class="card-categories">
                    ${displayCategories.map(category => 
                        `<span class="category-tag">${category}</span>`
                    ).join('')}
                    ${formattedCategories.length > 4 ? `<span class="category-tag">+${formattedCategories.length - 4}</span>` : ''}
                </div>
                <div class="card-actions">
                    <button class="favorite-btn ${isFavorite ? 'active' : ''}" data-id="${restaurant.id}" aria-label="Add to favorites">
                        ❤
                    </button>
                    <a href="${restaurant.url}" target="_blank" class="view-btn">View Details</a>
                </div>
            </div>
        `;
        
        // Add event listener for favorite button
        const favoriteBtn = card.querySelector('.favorite-btn');
        favoriteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            favoriteBtn.classList.toggle('active');
            this.toggleFavorite(restaurant);
        });
        
        // Make the entire card clickable
        card.addEventListener('click', (e) => {
            if (!e.target.closest('.favorite-btn') && !e.target.closest('.view-btn')) {
                window.open(restaurant.url, '_blank');
            }
        });
        
        return card;
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
            // Add to favorites
            favorites.push(restaurant);
        } else {
            // Remove from favorites
            favorites.splice(index, 1);
        }
        
        this.saveFavorites(favorites);
        this.updateFavoritesList();
    },
    
    // Update the favorites list
    updateFavoritesList: function() {
        const favorites = this.getFavorites();
        
        if (this.elements.favoritesCount) {
            this.elements.favoritesCount.textContent = favorites.length;
        }
        
        if (!this.elements.favoritesContainer) return;
        
        this.elements.favoritesContainer.innerHTML = '';
        
        if (favorites.length === 0) {
            this.elements.favoritesContainer.innerHTML = '<p class="no-favorites">No favorites yet</p>';
            return;
        }
        
        favorites.forEach(restaurant => {
            const favItem = document.createElement('div');
            favItem.className = 'favorite-item';
            
            favItem.innerHTML = `
                <div class="fav-img">
                    <img src="${restaurant.image}" alt="${restaurant.name}" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iODAwIiBoZWlnaHQ9IjQwMCIgZmlsbD0iIzMzMzMzMyIvPjx0ZXh0IHg9IjQwMCIgeT0iMjAwIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMzAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiNlZWVlZWUiPk5vIEltYWdlIEF2YWlsYWJsZTwvdGV4dD48L3N2Zz4='">
                </div>
                <div class="fav-info">
                    <h4>${restaurant.name}</h4>
                    <div class="fav-meta">
                        <div class="fav-rating">${restaurant.rating}</div>
                        <div class="fav-distance">${restaurant.distance} km</div>
                    </div>
                </div>
                <button class="fav-remove" data-id="${restaurant.id}">×</button>
            `;
            
            this.elements.favoritesContainer.appendChild(favItem);
            
            // Add event listener for remove button
            const removeBtn = favItem.querySelector('.fav-remove');
            removeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = removeBtn.getAttribute('data-id');
                this.removeFavorite(id);
            });
            
            // Add event listener for clicking on the favorite item
            favItem.addEventListener('click', () => {
                window.open(restaurant.url, '_blank');
            });
        });
    },
    
    // Remove a restaurant from favorites
    removeFavorite: function(id) {
        const favorites = this.getFavorites();
        const updatedFavorites = favorites.filter(fav => fav.id !== id);
        this.saveFavorites(updatedFavorites);
        this.updateFavoritesList();
        
        // Also update any heart icons in the current view
        const heartIcon = document.querySelector(`.favorite-btn[data-id="${id}"]`);
        if (heartIcon) {
            heartIcon.classList.remove('active');
        }
    },
    
    // Show loading more indicator
    showLoadingMore: function() {
        if (this.elements.loadMoreBtn && this.elements.loadMoreContainer) {
            this.elements.loadMoreBtn.textContent = 'Loading...';
            this.elements.loadMoreBtn.disabled = true;
            this.elements.loadMoreContainer.style.display = 'flex';
        }
    },
    
    // Hide loading more indicator
    hideLoadingMore: function() {
        if (this.elements.loadMoreBtn && this.elements.loadMoreContainer) {
            this.elements.loadMoreBtn.textContent = 'Load More';
            this.elements.loadMoreBtn.disabled = false;
        }
    },
    
    // Append more restaurants to the existing list
    appendRestaurants: function(restaurants) {
        this.hideLoadingMore();
        
        if (!this.elements.cardContainer) return;
        
        if (restaurants.length === 0) {
            if (this.elements.loadMoreContainer) {
                this.elements.loadMoreContainer.style.display = 'none';
            }
            return;
        }
        
        restaurants.forEach(restaurant => {
            const card = this.createRestaurantCard(restaurant);
            this.elements.cardContainer.appendChild(card);
        });
        
        // Show/hide load more button based on whether there are more restaurants
        if (this.elements.loadMoreContainer) {
            this.elements.loadMoreContainer.style.display = 
                RestaurantService.hasMoreRestaurants() ? 'flex' : 'none';
        }
    },
    
    // Add this method to the UI object to populate categories
    populateCategoryFilter: function(restaurants) {
        if (!this.elements.categoryFilter) return;
        
        // Clear existing options except the "All Categories" option
        while (this.elements.categoryFilter.options.length > 1) {
            this.elements.categoryFilter.remove(1);
        }
        
        // Extract all unique categories from restaurants
        const allCategories = new Set();
        restaurants.forEach(restaurant => {
            restaurant.categories.forEach(category => {
                // Format category for display (replace underscores with spaces and capitalize)
                const formattedCategory = category
                    .replace(/_/g, ' ')
                    .replace(/\b\w/g, c => c.toUpperCase());
                
                allCategories.add(JSON.stringify({
                    value: category,
                    label: formattedCategory
                }));
            });
        });
        
        // Convert to array and sort alphabetically
        const sortedCategories = Array.from(allCategories)
            .map(cat => JSON.parse(cat))
            .sort((a, b) => a.label.localeCompare(b.label));
        
        // Add options to the dropdown
        sortedCategories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.value;
            option.textContent = category.label;
            this.elements.categoryFilter.appendChild(option);
        });
        
        // Add event listener for category filter changes
        if (!this.elements.categoryFilter.hasEventListener) {
            this.elements.categoryFilter.addEventListener('change', () => {
                this.applyFilters();
            });
            this.elements.categoryFilter.hasEventListener = true;
        }
    }
};

// Initialize UI when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    UI.init();
});