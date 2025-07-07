class UserIDUtils {
    async fetchAndStoreUserId() {
        try {
            const response = await fetch('https://recspot-e6585868d70b.herokuapp.com/get_user_id', {
                method: 'GET',
                credentials: 'include', // Include cookies for session
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            if (data.user_id) {
                // Store user ID in localStorage
                localStorage.setItem('currentUserId', data.user_id);
                console.log('User ID stored:', data.user_id);
                return data.user_id;
            } else {
                console.error('No user_id in response');
                return null;
            }
        } catch (error) {
            console.error('Error fetching user ID:', error);
            return null;
        }
    }
    getCurrentUserId() {
        const userId = localStorage.getItem('currentUserId');
        if (!userId) {
            console.warn('No user ID found in localStorage. Call fetchAndStoreUserId() first.');
            return null;
        }
        return userId;
    }
    clearUserId() {
        localStorage.removeItem('currentUserId');
        console.log('User ID cleared from localStorage');
    }
    async ensureUserId() {
        let userId = getCurrentUserId();
        if (!userId) {
            userId = await fetchAndStoreUserId();
        }
        return userId;
    }
}

window.UserIDUtils = new UserIDUtils();