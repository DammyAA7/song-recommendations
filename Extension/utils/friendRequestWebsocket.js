class SecureSupabaseClient {
    constructor() {
        this.supabaseUrl = "https://gooepfzjehynozjqzuxl.supabase.co";
        this.supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdvb2VwZnpqZWh5bm96anF6dXhsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg0NjE4NjYsImV4cCI6MjA2NDAzNzg2Nn0.0sgu_2i1VJTueHOJTq-mUpQwu8fi55T6GO2hEOHCLKA";
        this.supabase = supabase.createClient(this.supabaseUrl, this.supabaseKey);
        this.eventHandlers = new Map();
    }

    // Generic event subscription system
    subscribe(table, event, filter, callback) {
        const subscriptionConfig = { 
            event: event, 
            schema: 'public', 
            table: table
        };

        // Only add filter if it's provided and not null
        if (filter) {
            subscriptionConfig.filter = filter;
        }

        const channel = this.supabase
            .channel(`${table}_${event}_changes_${Date.now()}`) // Make channel names unique
            .on('postgres_changes', subscriptionConfig, (payload) => {
                console.log(`${event} event received:`, payload); // Debug log
                callback({
                    new: payload.new,
                    old: payload.old,
                    eventType: payload.eventType
                });
            })
            .subscribe();
        
        const key = `${table}_${event}_${filter || 'no_filter'}`;
        this.eventHandlers.set(key, channel);
        return channel;
    }

    unsubscribe(table, events) {
        const key = `${table}_${events}`;
        const channel = this.eventHandlers.get(key);
        if (channel) {
            channel.unsubscribe();
            this.eventHandlers.delete(key);
        }
    }

    getClient() {
        return this.supabase;
    }

    from(table) {
        return this.supabase.from(table);
    }
}

window.secureSupabaseClient = new SecureSupabaseClient();