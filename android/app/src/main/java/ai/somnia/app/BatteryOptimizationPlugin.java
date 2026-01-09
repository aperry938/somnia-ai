package ai.somnia.app;

import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
import android.provider.Settings;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Battery Optimization Plugin
 *
 * Helps ensure alarms work reliably by requesting exemption from
 * Android's Doze mode and battery optimization.
 */
@CapacitorPlugin(name = "BatteryOptimization")
public class BatteryOptimizationPlugin extends Plugin {

    /**
     * Check if the app is exempt from battery optimization
     */
    @PluginMethod
    public void isIgnoringBatteryOptimizations(PluginCall call) {
        Context context = getContext();
        PowerManager pm = (PowerManager) context.getSystemService(Context.POWER_SERVICE);

        boolean isIgnoring = false;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && pm != null) {
            isIgnoring = pm.isIgnoringBatteryOptimizations(context.getPackageName());
        }

        JSObject ret = new JSObject();
        ret.put("isIgnoring", isIgnoring);
        call.resolve(ret);
    }

    /**
     * Request the user to disable battery optimization for this app
     */
    @PluginMethod
    public void requestIgnoreBatteryOptimizations(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            try {
                Intent intent = new Intent();
                String packageName = getContext().getPackageName();
                PowerManager pm = (PowerManager) getContext().getSystemService(Context.POWER_SERVICE);

                if (pm != null && !pm.isIgnoringBatteryOptimizations(packageName)) {
                    intent.setAction(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
                    intent.setData(Uri.parse("package:" + packageName));
                    getActivity().startActivity(intent);
                }

                JSObject ret = new JSObject();
                ret.put("success", true);
                call.resolve(ret);
            } catch (Exception e) {
                JSObject ret = new JSObject();
                ret.put("success", false);
                call.resolve(ret);
            }
        } else {
            JSObject ret = new JSObject();
            ret.put("success", true); // Not needed on older Android
            call.resolve(ret);
        }
    }

    /**
     * Open battery optimization settings directly
     */
    @PluginMethod
    public void openBatteryOptimizationSettings(PluginCall call) {
        try {
            Intent intent = new Intent();
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                intent.setAction(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS);
            } else {
                intent.setAction(Settings.ACTION_SETTINGS);
            }
            getActivity().startActivity(intent);

            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            JSObject ret = new JSObject();
            ret.put("success", false);
            call.resolve(ret);
        }
    }

    /**
     * Check if the device manufacturer has aggressive battery management
     */
    @PluginMethod
    public void hasAggressiveBatteryManagement(PluginCall call) {
        String manufacturer = Build.MANUFACTURER.toLowerCase();

        // List of manufacturers known for aggressive battery management
        boolean hasAggressive = manufacturer.contains("samsung") ||
                manufacturer.contains("xiaomi") ||
                manufacturer.contains("redmi") ||
                manufacturer.contains("poco") ||
                manufacturer.contains("huawei") ||
                manufacturer.contains("honor") ||
                manufacturer.contains("oneplus") ||
                manufacturer.contains("oppo") ||
                manufacturer.contains("realme") ||
                manufacturer.contains("vivo") ||
                manufacturer.contains("meizu") ||
                manufacturer.contains("asus") ||
                manufacturer.contains("nokia");

        JSObject ret = new JSObject();
        ret.put("hasAggressive", hasAggressive);
        ret.put("manufacturer", Build.MANUFACTURER);
        call.resolve(ret);
    }

    /**
     * Open manufacturer-specific battery settings
     */
    @PluginMethod
    public void openManufacturerBatterySettings(PluginCall call) {
        String manufacturer = Build.MANUFACTURER.toLowerCase();
        Intent intent = null;

        try {
            if (manufacturer.contains("samsung")) {
                // Samsung Device Maintenance / Device Care
                intent = new Intent();
                intent.setClassName("com.samsung.android.lool",
                        "com.samsung.android.sm.ui.battery.BatteryActivity");
            } else if (manufacturer.contains("xiaomi") || manufacturer.contains("redmi") || manufacturer.contains("poco")) {
                // Xiaomi Security app
                intent = new Intent();
                intent.setClassName("com.miui.securitycenter",
                        "com.miui.permcenter.autostart.AutoStartManagementActivity");
            } else if (manufacturer.contains("huawei") || manufacturer.contains("honor")) {
                // Huawei Power Manager
                intent = new Intent();
                intent.setClassName("com.huawei.systemmanager",
                        "com.huawei.systemmanager.optimize.process.ProtectActivity");
            } else if (manufacturer.contains("oppo") || manufacturer.contains("realme")) {
                // OPPO/Realme Battery
                intent = new Intent();
                intent.setClassName("com.coloros.safecenter",
                        "com.coloros.safecenter.permission.startup.StartupAppListActivity");
            } else if (manufacturer.contains("vivo")) {
                // Vivo iManager
                intent = new Intent();
                intent.setClassName("com.vivo.permissionmanager",
                        "com.vivo.permissionmanager.activity.BgStartUpManagerActivity");
            } else if (manufacturer.contains("oneplus")) {
                // OnePlus Battery settings
                intent = new Intent();
                intent.setAction(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
                intent.setData(Uri.parse("package:" + getContext().getPackageName()));
            }

            if (intent != null) {
                // Check if the intent can be resolved
                PackageManager pm = getContext().getPackageManager();
                if (intent.resolveActivity(pm) != null) {
                    getActivity().startActivity(intent);
                    JSObject ret = new JSObject();
                    ret.put("success", true);
                    ret.put("manufacturer", Build.MANUFACTURER);
                    call.resolve(ret);
                    return;
                }
            }

            // Fallback to standard battery settings
            Intent fallbackIntent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
            fallbackIntent.setData(Uri.parse("package:" + getContext().getPackageName()));
            getActivity().startActivity(fallbackIntent);

            JSObject ret = new JSObject();
            ret.put("success", true);
            ret.put("manufacturer", Build.MANUFACTURER);
            call.resolve(ret);

        } catch (Exception e) {
            // Fallback to app settings
            try {
                Intent fallbackIntent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
                fallbackIntent.setData(Uri.parse("package:" + getContext().getPackageName()));
                getActivity().startActivity(fallbackIntent);

                JSObject ret = new JSObject();
                ret.put("success", true);
                ret.put("manufacturer", Build.MANUFACTURER);
                call.resolve(ret);
            } catch (Exception e2) {
                JSObject ret = new JSObject();
                ret.put("success", false);
                ret.put("manufacturer", Build.MANUFACTURER);
                call.resolve(ret);
            }
        }
    }
}
