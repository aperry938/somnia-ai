// Supabase Edge Function: Dream Sync API
// Receives dream submissions and stores them in the database for global trends

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Support both formats: client sends actionId/actionType, legacy sends id/type
interface SyncAction {
    id?: string;
    actionId?: string;
    type?: 'ADD_DREAM' | 'UPDATE_DREAM' | 'DELETE_DREAM';
    actionType?: 'ADD_DREAM' | 'UPDATE_DREAM' | 'DELETE_DREAM';
    payload: DreamPayload;
    timestamp: number;
}

interface DreamPayload {
    id: number;
    timestamp: string;
    dreamText: string;
    sleepQuality: number | null;
    title: string;
    tags?: string[];
    mood?: string;
    sleepEntryId?: number; // Link to parent sleep entry
    shareInGlobalTrends?: boolean;
    userRegion?: string;
    userCountry?: string;
}

interface SyncResponse {
    success: boolean;
    processed: number;
    errors?: string[];
}

Deno.serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    if (req.method !== 'POST') {
        return new Response(
            JSON.stringify({ success: false, error: 'Method not allowed' }),
            { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    try {
        // Get authorization header
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            return new Response(
                JSON.stringify({ success: false, error: 'Missing authorization header' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Initialize Supabase client
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // Verify the user token and get user ID
        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) {
            return new Response(
                JSON.stringify({ success: false, error: 'Invalid or expired token' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const userId = user.id;

        // Parse request body
        const body = await req.json();
        const actions: SyncAction[] = Array.isArray(body) ? body : [body];

        let processed = 0;
        const errors: string[] = [];

        for (const action of actions) {
            // Support both field name formats
            const actionType = action.type || action.actionType;

            try {
                switch (actionType) {
                    case 'ADD_DREAM':
                        await handleAddDream(supabase, userId, action.payload);
                        processed++;
                        break;
                    case 'UPDATE_DREAM':
                        await handleUpdateDream(supabase, userId, action.payload);
                        processed++;
                        break;
                    case 'DELETE_DREAM':
                        await handleDeleteDream(supabase, userId, action.payload.id);
                        processed++;
                        break;
                    default:
                        errors.push(`Unknown action type: ${actionType}`);
                }
            } catch (err) {
                errors.push(`Failed to process ${actionType}: ${(err as Error).message}`);
            }
        }

        const response: SyncResponse = {
            success: errors.length === 0,
            processed,
            ...(errors.length > 0 && { errors }),
        };

        return new Response(
            JSON.stringify(response),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (err) {
        console.error('Sync error:', err);
        return new Response(
            JSON.stringify({ success: false, error: 'Internal server error' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});

// Insert a new dream into the database
async function handleAddDream(
    supabase: ReturnType<typeof createClient>,
    userId: string,
    dream: DreamPayload
) {
    const { error } = await supabase.from('dreams').insert({
        id: dream.id,
        user_id: userId,
        timestamp: dream.timestamp,
        dream_text: dream.dreamText,
        sleep_quality: dream.sleepQuality,
        title: dream.title,
        tags: dream.tags || [],
        mood: dream.mood,
        sleep_entry_id: dream.sleepEntryId || null,
        share_in_global_trends: dream.shareInGlobalTrends || false,
        user_region: dream.userRegion,
        user_country: dream.userCountry,
    });

    if (error) {
        console.error('Insert dream error:', error);
        throw new Error(error.message);
    }
}

// Update an existing dream
async function handleUpdateDream(
    supabase: ReturnType<typeof createClient>,
    userId: string,
    dream: Partial<DreamPayload> & { id: number }
) {
    const updateData: Record<string, unknown> = {};

    if (dream.dreamText !== undefined) updateData.dream_text = dream.dreamText;
    if (dream.sleepQuality !== undefined) updateData.sleep_quality = dream.sleepQuality;
    if (dream.title !== undefined) updateData.title = dream.title;
    if (dream.tags !== undefined) updateData.tags = dream.tags;
    if (dream.mood !== undefined) updateData.mood = dream.mood;
    if (dream.sleepEntryId !== undefined) updateData.sleep_entry_id = dream.sleepEntryId;
    if (dream.shareInGlobalTrends !== undefined) updateData.share_in_global_trends = dream.shareInGlobalTrends;
    if (dream.userRegion !== undefined) updateData.user_region = dream.userRegion;
    if (dream.userCountry !== undefined) updateData.user_country = dream.userCountry;

    const { error } = await supabase
        .from('dreams')
        .update(updateData)
        .eq('id', dream.id)
        .eq('user_id', userId);

    if (error) {
        console.error('Update dream error:', error);
        throw new Error(error.message);
    }
}

// Delete a dream
async function handleDeleteDream(
    supabase: ReturnType<typeof createClient>,
    userId: string,
    dreamId: number
) {
    const { error } = await supabase
        .from('dreams')
        .delete()
        .eq('id', dreamId)
        .eq('user_id', userId);

    if (error) {
        console.error('Delete dream error:', error);
        throw new Error(error.message);
    }
}
