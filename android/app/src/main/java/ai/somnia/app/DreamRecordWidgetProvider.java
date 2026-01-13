package ai.somnia.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Build;
import android.widget.RemoteViews;
import android.util.Log;
import android.view.View;

/**
 * DreamRecordWidgetProvider - Quick dream recording widget for lock screen
 *
 * Purpose:
 * - Provides instant access to dream recording when user wakes up
 * - Works from lock screen (Android 4.2+) or home screen
 * - Large tap target designed for groggy users
 * - Single tap launches app directly to voice recording
 *
 * Lock Screen Setup (for users):
 * - Android 12+: Add widget from lock screen customization
 * - Android 4.2-11: Long press lock screen > Widgets > Somnia Dream
 *
 * Required Permissions:
 * - BIND_APPWIDGET (automatic via manifest)
 * - For full-screen over lock: USE_FULL_SCREEN_INTENT
 */
public class DreamRecordWidgetProvider extends AppWidgetProvider {
    private static final String TAG = "DreamRecordWidget";
    private static final String PREFS_NAME = "SomniaWidgetPrefs";
    private static final String ACTION_RECORD_DREAM = "ai.somnia.app.ACTION_RECORD_DREAM";
    public static final String ACTION_UPDATE_DREAM_WIDGET = "ai.somnia.app.ACTION_UPDATE_DREAM_WIDGET";

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateWidget(context, appWidgetManager, appWidgetId);
        }
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);

        String action = intent.getAction();
        if (action == null) return;

        switch (action) {
            case ACTION_RECORD_DREAM:
                openDreamRecording(context);
                break;
            case ACTION_UPDATE_DREAM_WIDGET:
                // Force update all dream widgets
                AppWidgetManager manager = AppWidgetManager.getInstance(context);
                int[] ids = manager.getAppWidgetIds(
                    new ComponentName(context, DreamRecordWidgetProvider.class)
                );
                onUpdate(context, manager, ids);
                break;
        }
    }

    /**
     * Opens the app directly to dream recording mode
     * Uses deep link for seamless navigation
     */
    private void openDreamRecording(Context context) {
        Log.d(TAG, "Opening dream recording from widget");

        // Primary method: Deep link
        Intent deepLinkIntent = new Intent(Intent.ACTION_VIEW);
        deepLinkIntent.setData(Uri.parse("somnia://journal/new"));
        deepLinkIntent.setPackage(context.getPackageName());
        deepLinkIntent.setFlags(
            Intent.FLAG_ACTIVITY_NEW_TASK |
            Intent.FLAG_ACTIVITY_CLEAR_TOP |
            Intent.FLAG_ACTIVITY_SINGLE_TOP
        );

        // Add flags to show over lock screen (Android 8.0+)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            deepLinkIntent.addFlags(Intent.FLAG_ACTIVITY_REORDER_TO_FRONT);
        }

        try {
            context.startActivity(deepLinkIntent);
        } catch (Exception e) {
            Log.e(TAG, "Failed to open via deep link, trying fallback", e);

            // Fallback: Direct activity launch with route extra
            Intent fallbackIntent = new Intent(context, MainActivity.class);
            fallbackIntent.setFlags(
                Intent.FLAG_ACTIVITY_NEW_TASK |
                Intent.FLAG_ACTIVITY_CLEAR_TOP
            );
            fallbackIntent.putExtra("route", "/journal/new");
            fallbackIntent.putExtra("openScribe", true);
            context.startActivity(fallbackIntent);
        }
    }

    private void updateWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_dream_record);

        // Load sleep tracking state
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        boolean isSleepTracking = prefs.getBoolean("isSleepTracking", false);

        // Show/hide sleep indicator
        views.setViewVisibility(
            R.id.dream_widget_sleep_indicator,
            isSleepTracking ? View.VISIBLE : View.GONE
        );

        // Set up click handler for entire widget
        PendingIntent recordIntent = createRecordPendingIntent(context);
        views.setOnClickPendingIntent(R.id.dream_widget_container, recordIntent);

        // Update the widget
        appWidgetManager.updateAppWidget(appWidgetId, views);
        Log.d(TAG, "Dream widget updated: " + appWidgetId + ", sleepTracking: " + isSleepTracking);
    }

    private PendingIntent createRecordPendingIntent(Context context) {
        Intent intent = new Intent(context, DreamRecordWidgetProvider.class);
        intent.setAction(ACTION_RECORD_DREAM);
        return PendingIntent.getBroadcast(
            context,
            100, // Unique request code for dream widget
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
    }

    @Override
    public void onEnabled(Context context) {
        super.onEnabled(context);
        Log.d(TAG, "Dream recording widget enabled");
    }

    @Override
    public void onDisabled(Context context) {
        super.onDisabled(context);
        Log.d(TAG, "Dream recording widget disabled");
    }

    /**
     * Update sleep tracking state for all dream widgets
     * Call when user starts/stops sleep tracking
     */
    public static void updateSleepTrackingState(Context context, boolean isSleepTracking) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        prefs.edit().putBoolean("isSleepTracking", isSleepTracking).apply();

        // Trigger widget update
        Intent updateIntent = new Intent(context, DreamRecordWidgetProvider.class);
        updateIntent.setAction(ACTION_UPDATE_DREAM_WIDGET);
        context.sendBroadcast(updateIntent);
    }

    /**
     * Request refresh of all dream recording widgets
     */
    public static void requestUpdate(Context context) {
        Intent updateIntent = new Intent(context, DreamRecordWidgetProvider.class);
        updateIntent.setAction(ACTION_UPDATE_DREAM_WIDGET);
        context.sendBroadcast(updateIntent);
    }
}
