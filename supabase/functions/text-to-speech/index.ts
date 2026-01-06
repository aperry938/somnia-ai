// supabase/functions/text-to-speech/index.ts
// AI-powered text-to-speech using Google Cloud TTS
// Premium feature only - provides natural-sounding voices

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Google Cloud TTS voices optimized for sleep/meditation apps
const VOICE_OPTIONS = {
    soothing: {
        languageCode: 'en-US',
        name: 'en-US-Journey-F', // Warm, calming female voice
        ssmlGender: 'FEMALE',
    },
    calm: {
        languageCode: 'en-US',
        name: 'en-US-Journey-D', // Calm male voice
        ssmlGender: 'MALE',
    },
    gentle: {
        languageCode: 'en-US',
        name: 'en-US-Studio-O', // Gentle, soft female voice
        ssmlGender: 'FEMALE',
    },
    warm: {
        languageCode: 'en-US',
        name: 'en-US-Studio-M', // Warm male voice
        ssmlGender: 'MALE',
    },
} as const;

type VoiceType = keyof typeof VOICE_OPTIONS;

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        // Get auth token from header
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            return new Response(
                JSON.stringify({ error: 'Missing authorization header' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Initialize Supabase client to verify user
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: authHeader } } }
        );

        // Verify user is authenticated
        const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
        if (userError || !user) {
            return new Response(
                JSON.stringify({ error: 'Invalid token' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Verify user has premium subscription
        const { data: subscription } = await supabaseClient
            .from('subscriptions')
            .select('tier, status')
            .eq('user_id', user.id)
            .single();

        const isPremium = subscription?.tier === 'premium' &&
            (subscription?.status === 'active' || subscription?.status === 'trialing');

        if (!isPremium) {
            return new Response(
                JSON.stringify({ error: 'Premium subscription required for AI voice' }),
                { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Parse request body
        const { text, voice = 'soothing' } = await req.json();

        if (!text || typeof text !== 'string') {
            return new Response(
                JSON.stringify({ error: 'Text is required' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Limit text length to control costs
        const maxLength = 1000;
        const truncatedText = text.slice(0, maxLength);

        // Get Google Cloud TTS API key
        const googleApiKey = Deno.env.get('GOOGLE_CLOUD_API_KEY');
        if (!googleApiKey) {
            return new Response(
                JSON.stringify({ error: 'TTS service not configured' }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Select voice configuration
        const voiceConfig = VOICE_OPTIONS[voice as VoiceType] || VOICE_OPTIONS.soothing;

        // Call Google Cloud TTS API
        const ttsResponse = await fetch(
            `https://texttospeech.googleapis.com/v1/text:synthesize?key=${googleApiKey}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    input: { text: truncatedText },
                    voice: voiceConfig,
                    audioConfig: {
                        audioEncoding: 'MP3',
                        speakingRate: 0.9, // Slightly slower for calmness
                        pitch: 0, // Neutral pitch
                        volumeGainDb: 0,
                    },
                }),
            }
        );

        if (!ttsResponse.ok) {
            const errorData = await ttsResponse.json();
            console.error('Google TTS error:', errorData);
            return new Response(
                JSON.stringify({ error: 'Voice synthesis failed' }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const ttsData = await ttsResponse.json();

        // Return base64 encoded audio
        return new Response(
            JSON.stringify({
                audioContent: ttsData.audioContent,
                format: 'mp3',
            }),
            {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
        );
    } catch (error) {
        console.error('TTS error:', error);
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
