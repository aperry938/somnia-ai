package ai.somnia.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.widget.RemoteViews;
import android.util.Log;

import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Locale;

/**
 * SomniaWidgetProvider - Home screen widget showing alarm and sleep data
 * Updates every 30 minutes and on alarm changes
 */
public class SomniaWidgetProvider extends AppWidgetProvider {
    private static final String TAG = "SomniaWidget";
    private static final String PREFS_NAME = "SomniaWidgetPrefs";
    private static final String ACTION_OPEN_ALARM = "ai.somnia.app.ACTION_OPEN_ALARM";
    private static final String ACTION_OPEN_SLEEP = "ai.somnia.app.ACTION_OPEN_SLEEP";
    private static final String ACTION_OPEN_STATS = "ai.somnia.app.ACTION_OPEN_STATS";
    public static final String ACTION_UPDATE_WIDGET = "ai.somnia.app.ACTION_UPDATE_WIDGET";

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
            case ACTION_OPEN_ALARM:
                openAppWithRoute(context, "/alarm");
                break;
            case ACTION_OPEN_SLEEP:
                openAppWithRoute(context, "/sleep");
                break;
            case ACTION_OPEN_STATS:
                openAppWithRoute(context, "/stats");
                break;
            case ACTION_UPDATE_WIDGET:
                // Force update all widgets
                AppWidgetManager manager = AppWidgetManager.getInstance(context);
                int[] ids = manager.getAppWidgetIds(
                    new ComponentName(context, SomniaWidgetProvider.class)
                );
                onUpdate(context, manager, ids);
                break;
        }
    }

    private void openAppWithRoute(Context context, String route) {
        Intent intent = new Intent(context, MainActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        intent.putExtra("route", route);
        context.startActivity(intent);
    }

    private void updateWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_somnia);

        // Load saved data from SharedPreferences
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);

        // Update alarm time
        String alarmTime = prefs.getString("nextAlarmTime", null);
        String alarmLabel = prefs.getString("nextAlarmLabel", "No alarm set");

        if (alarmTime != null && !alarmTime.isEmpty()) {
            views.setTextViewText(R.id.widget_alarm_time, alarmTime);
            views.setTextViewText(R.id.widget_alarm_label, alarmLabel);
        } else {
            views.setTextViewText(R.id.widget_alarm_time, "--:--");
            views.setTextViewText(R.id.widget_alarm_label, "No alarm set");
        }

        // Update sleep stats
        float avgSleep = prefs.getFloat("avgSleepHours", 0);
        int sleepScore = prefs.getInt("sleepScore", 0);
        int streak = prefs.getInt("streak", 0);

        if (avgSleep > 0) {
            int hours = (int) avgSleep;
            int minutes = (int) ((avgSleep - hours) * 60);
            views.setTextViewText(R.id.widget_avg_sleep, String.format(Locale.US, "%dh %dm", hours, minutes));
        } else {
            views.setTextViewText(R.id.widget_avg_sleep, "--h --m");
        }

        if (sleepScore > 0) {
            views.setTextViewText(R.id.widget_sleep_score, String.valueOf(sleepScore));
        } else {
            views.setTextViewText(R.id.widget_sleep_score, "--");
        }

        if (streak > 0) {
            views.setTextViewText(R.id.widget_streak, streak + " days");
        } else {
            views.setTextViewText(R.id.widget_streak, "-- days");
        }

        // Set up click handlers
        views.setOnClickPendingIntent(R.id.widget_container, createPendingIntent(context, ACTION_OPEN_ALARM, 0));
        views.setOnClickPendingIntent(R.id.widget_btn_alarm, createPendingIntent(context, ACTION_OPEN_ALARM, 1));
        views.setOnClickPendingIntent(R.id.widget_btn_sleep, createPendingIntent(context, ACTION_OPEN_SLEEP, 2));
        views.setOnClickPendingIntent(R.id.widget_btn_stats, createPendingIntent(context, ACTION_OPEN_STATS, 3));

        // Update the widget
        appWidgetManager.updateAppWidget(appWidgetId, views);
        Log.d(TAG, "Widget updated: " + appWidgetId);
    }

    private PendingIntent createPendingIntent(Context context, String action, int requestCode) {
        Intent intent = new Intent(context, SomniaWidgetProvider.class);
        intent.setAction(action);
        return PendingIntent.getBroadcast(
            context,
            requestCode,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
    }

    @Override
    public void onEnabled(Context context) {
        super.onEnabled(context);
        Log.d(TAG, "Widget enabled");
    }

    @Override
    public void onDisabled(Context context) {
        super.onDisabled(context);
        Log.d(TAG, "Widget disabled");
    }

    /**
     * Static method to update widget data from the app
     * Call this when alarm or sleep data changes
     */
    public static void updateWidgetData(Context context, String alarmTime, String alarmLabel,
                                         float avgSleep, int sleepScore, int streak) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        SharedPreferences.Editor editor = prefs.edit();

        editor.putString("nextAlarmTime", alarmTime);
        editor.putString("nextAlarmLabel", alarmLabel);
        editor.putFloat("avgSleepHours", avgSleep);
        editor.putInt("sleepScore", sleepScore);
        editor.putInt("streak", streak);
        editor.apply();

        // Trigger widget update
        Intent updateIntent = new Intent(context, SomniaWidgetProvider.class);
        updateIntent.setAction(ACTION_UPDATE_WIDGET);
        context.sendBroadcast(updateIntent);
    }

    /**
     * Convenience method to request widget refresh
     */
    public static void requestUpdate(Context context) {
        Intent updateIntent = new Intent(context, SomniaWidgetProvider.class);
        updateIntent.setAction(ACTION_UPDATE_WIDGET);
        context.sendBroadcast(updateIntent);
    }
}
