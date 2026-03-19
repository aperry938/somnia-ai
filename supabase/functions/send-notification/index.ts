// Supabase Edge Function: Send Notification
// Sends email notifications (weekly digest, streak breaks, achievements)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DigestData {
    dreamCount: number;
    avgQuality: number;
    currentStreak: number;
    topThemes: string[];
}

function generateWeeklyDigestHtml(email: string, data: DigestData): string {
    const themes = data.topThemes.length > 0
        ? data.topThemes.map(t => `<li style="margin: 4px 0;">${t}</li>`).join('')
        : '<li style="margin: 4px 0;">No themes recorded yet</li>';

    return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f8f9fa;">
<div style="max-width:560px;margin:0 auto;padding:40px 20px;">
    <div style="background:white;border-radius:16px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
        <h1 style="font-size:24px;color:#1a1a2e;margin:0 0 8px;">Your Weekly Dream Digest</h1>
        <p style="color:#6b7280;font-size:14px;margin:0 0 24px;">Here's how your week looked, ${email.split('@')[0]}.</p>

        <div style="display:flex;gap:12px;margin-bottom:24px;">
            <div style="flex:1;background:#f0f4ff;border-radius:12px;padding:16px;text-align:center;">
                <div style="font-size:28px;font-weight:bold;color:#4f46e5;">${data.dreamCount}</div>
                <div style="font-size:12px;color:#6b7280;">Dreams</div>
            </div>
            <div style="flex:1;background:#fef3c7;border-radius:12px;padding:16px;text-align:center;">
                <div style="font-size:28px;font-weight:bold;color:#d97706;">${data.currentStreak}</div>
                <div style="font-size:12px;color:#6b7280;">Day Streak</div>
            </div>
            <div style="flex:1;background:#ecfdf5;border-radius:12px;padding:16px;text-align:center;">
                <div style="font-size:28px;font-weight:bold;color:#059669;">${data.avgQuality.toFixed(1)}</div>
                <div style="font-size:12px;color:#6b7280;">Avg Quality</div>
            </div>
        </div>

        <h3 style="font-size:16px;color:#1a1a2e;margin:0 0 8px;">Top Dream Themes</h3>
        <ul style="color:#4b5563;font-size:14px;padding-left:20px;margin:0 0 24px;">${themes}</ul>

        <p style="color:#9ca3af;font-size:12px;text-align:center;margin:24px 0 0;">
            Somnia — Your Dream Journal &amp; Sleep Companion<br>
            <a href="https://meridianlabs.us" style="color:#818cf8;">meridianlabs.us</a>
        </p>
    </div>
</div>
</body>
</html>`;
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    if (req.method !== 'POST') {
        return new Response(
            JSON.stringify({ error: 'Method not allowed' }),
            { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    try {
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            return new Response(
                JSON.stringify({ error: 'Missing authorization' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) {
            return new Response(
                JSON.stringify({ error: 'Invalid token' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const { type, data } = await req.json();

        if (type === 'weekly_digest') {
            const html = generateWeeklyDigestHtml(user.email || 'Dreamer', data as DigestData);

            // Use Supabase's built-in email (via Auth SMTP) or log for now
            // In production, integrate with Resend or similar
            console.log(`[SendNotification] Weekly digest generated for ${user.email}`);
            console.log(`[SendNotification] HTML length: ${html.length}`);

            // For MVP: return the generated HTML (admin can verify it looks correct)
            return new Response(
                JSON.stringify({ success: true, type: 'weekly_digest', htmlPreview: html.slice(0, 500) + '...' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        return new Response(
            JSON.stringify({ error: `Unknown notification type: ${type}` }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (err) {
        console.error('Send notification error:', err);
        return new Response(
            JSON.stringify({ error: 'Internal server error' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
