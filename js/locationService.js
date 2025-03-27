// Location Service - Handles geolocation functionality
const LocationService = {
    // Google API Key reference from RestaurantService
    get GOOGLE_API_KEY() {
        return RestaurantService.GOOGLE_API_KEY;
    },
    
    // Get the user's current location
    getCurrentLocation: function() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Geolocation is not supported by your browser'));
                return;
            }

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    resolve({
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                        source: 'geolocation'
                    });
                },
                (error) => {
                    reject(error);
                }
            );
        });
    },
    
    // Get location from city name using Google Geocoding API
    getLocationFromCity: function(cityName) {
        return new Promise(async (resolve, reject) => {
            try {
                console.log("Getting location for city:", cityName);
                
                // Ensure Google Maps API is loaded
                await this.ensureGoogleMapsLoaded();
                
                const geocoder = new google.maps.Geocoder();
                
                geocoder.geocode({ address: cityName }, (results, status) => {
                    if (status === google.maps.GeocoderStatus.OK && results && results.length > 0) {
                        const location = results[0].geometry.location;
                        resolve({
                            latitude: location.lat(),
                            longitude: location.lng(),
                            source: 'city',
                            cityName: results[0].formatted_address
                        });
                    } else {
                        reject(new Error(`Could not find location for "${cityName}"`));
                    }
                });
            } catch (error) {
                console.error("Error getting location from city:", error);
                reject(error);
            }
        });
    },
    
    // Ensure Google Maps API is loaded using the new approach
    ensureGoogleMapsLoaded: function() {
        return new Promise(async (resolve, reject) => {
            console.log("Loading Google Maps API...");
            
            try {
                // Check if the API is already loaded
                if (window.google && window.google.maps && window.google.maps.Geocoder) {
                    console.log("Google Maps API already loaded");
                    resolve();
                    return;
                }
                
                // Add the script to load the API using the new approach
                if (!document.querySelector('script#google-maps-loader')) {
                    const script = document.createElement('script');
                    script.id = 'google-maps-loader';
                    script.textContent = `
                        (g=>{var h,a,k,p="The Google Maps JavaScript API",c="google",l="importLibrary",q="__ib__",m=document,b=window;b=b[c]||(b[c]={});var d=b.maps||(b.maps={}),r=new Set,e=new URLSearchParams,u=()=>h||(h=new Promise(async(f,n)=>{await (a=m.createElement("script"));e.set("libraries",[...r]+"");for(k in g)e.set(k.replace(/[A-Z]/g,t=>"_"+t[0].toLowerCase()),g[k]);e.set("callback",c+".maps."+q);a.src=\`https://maps.\${c}apis.com/maps/api/js?\`+e;d[q]=f;a.onerror=()=>h=n(Error(p+" could not load."));a.nonce=m.querySelector("script[nonce]")?.nonce||"";m.head.append(a)}));d[l]?console.warn(p+" only loads once. Ignoring:",g):d[l]=(f,...n)=>r.add(f)&&u().then(()=>d[l](f,...n))})({
                            key: "${this.GOOGLE_API_KEY}",
                            v: "weekly"
                        });
                    `;
                    document.head.appendChild(script);
                }
                
                // Load the required libraries
                await google.maps.importLibrary("places");
                const { Geocoder } = await google.maps.importLibrary("geocoding");
                
                console.log("Google Maps API loaded successfully");
                resolve();
            } catch (error) {
                console.error("Failed to load Google Maps API:", error);
                reject(new Error('Failed to load Google Maps API'));
            }
        });
    }
};