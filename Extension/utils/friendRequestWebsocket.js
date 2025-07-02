class SecureSupabaseClient {
    constructor(){
        this.supabase = null;
        this.supabaseUrl = "https://gooepfzjehynozjqzuxl.supabase.co";
        this.supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdvb2VwZnpqZWh5bm96anF6dXhsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg0NjE4NjYsImV4cCI6MjA2NDAzNzg2Nn0.0sgu_2i1VJTueHOJTq-mUpQwu8fi55T6GO2hEOHCLKA";
        this.supabase = supabase.createClient(this.supabaseUrl, this.supabaseKey);
        this.subscription = null;

        console.log('SecureSupabaseClient initialized');

        this.setupFriendRequestListener();

    }

    async setupFriendRequestListener(){
        try {
            if(this.subscription) {
                await this.subscription.unsubscribe();
            }
            this.subscription = this.supabase
                .channel('requests')
                .on('postgres_changes', 
                    { 
                        event: 'INSERT', 
                        schema: 'public', 
                        table: 'requests' 
                    }, 
                    (payload) => {
                        console.log('New friend request received:', payload);
                    }
                )
                .subscribe((status) => {
                    if (status === 'SUBSCRIBED') {
                        console.log('Successfully subscribed to friend request updates');
                    } else if (status === 'CHANNEL_ERROR') {
                        showMessage('Real-time connection error');
                    }
                });
        } catch (error) {
            console.error("Error removing existing subscription:", error);
        }
    }
}

window.secureSupabaseClient = new SecureSupabaseClient();