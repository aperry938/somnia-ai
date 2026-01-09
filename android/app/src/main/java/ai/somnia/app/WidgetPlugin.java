package ai.somnia.app;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * WidgetPlugin - Capacitor plugin to update home screen widget from JavaScript
 */
@CapacitorPlugin(name = "Widget")
public class WidgetPlugin extends Plugin {

    /**
     * Update widget with current alarm and sleep data
     */
    @PluginMethod
    public void updateWidget(PluginCall call) {
        String alarmTime = call.getString("alarmTime", null);
        String alarmLabel = call.getString("alarmLabel", "Alarm");
        float avgSleep = call.getFloat("avgSleep", 0f);
        int sleepScore = call.getInt("sleepScore", 0);
        int streak = call.getInt("streak", 0);

        SomniaWidgetProvider.updateWidgetData(
            getContext(),
            alarmTime,
            alarmLabel,
            avgSleep,
            sleepScore,
            streak
        );

        call.resolve();
    }

    /**
     * Request a widget refresh
     */
    @PluginMethod
    public void refresh(PluginCall call) {
        SomniaWidgetProvider.requestUpdate(getContext());
        call.resolve();
    }

    /**
     * Check if widgets are supported on this device
     */
    @PluginMethod
    public void isSupported(PluginCall call) {
        JSObject result = new JSObject();
        result.put("supported", true);
        call.resolve(result);
    }
}
