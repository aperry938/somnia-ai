package ai.somnia.app;

import android.content.Intent;
import android.util.Log;

import androidx.activity.result.ActivityResultLauncher;
import androidx.health.connect.client.HealthConnectClient;
import androidx.health.connect.client.PermissionController;
import androidx.health.connect.client.permission.HealthPermission;
import androidx.health.connect.client.records.SleepSessionRecord;
import androidx.health.connect.client.records.HeartRateRecord;
import androidx.health.connect.client.request.ReadRecordsRequest;
import androidx.health.connect.client.time.TimeRangeFilter;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import kotlinx.coroutines.Dispatchers;
import kotlinx.coroutines.GlobalScope;

/**
 * HealthConnectPlugin - Capacitor plugin for Android Health Connect
 * Reads sleep data from Health Connect (Google's health platform)
 */
@CapacitorPlugin(name = "HealthConnect")
public class HealthConnectPlugin extends Plugin {
    private static final String TAG = "HealthConnectPlugin";
    private HealthConnectClient healthConnectClient;

    // Required permissions for sleep tracking
    private static final Set<String> PERMISSIONS = new HashSet<String>() {{
        add(HealthPermission.getReadPermission(SleepSessionRecord.class));
        add(HealthPermission.getReadPermission(HeartRateRecord.class));
    }};

    @Override
    public void load() {
        super.load();
        try {
            int availability = HealthConnectClient.getSdkStatus(getContext());
            if (availability == HealthConnectClient.SDK_AVAILABLE) {
                healthConnectClient = HealthConnectClient.getOrCreate(getContext());
                Log.d(TAG, "Health Connect available and initialized");
            } else {
                Log.w(TAG, "Health Connect not available: " + availability);
            }
        } catch (Exception e) {
            Log.e(TAG, "Failed to initialize Health Connect", e);
        }
    }

    /**
     * Check if Health Connect is available on this device
     */
    @PluginMethod
    public void isAvailable(PluginCall call) {
        JSObject result = new JSObject();
        try {
            int availability = HealthConnectClient.getSdkStatus(getContext());
            result.put("available", availability == HealthConnectClient.SDK_AVAILABLE);
            result.put("status", availability);
            call.resolve(result);
        } catch (Exception e) {
            result.put("available", false);
            result.put("error", e.getMessage());
            call.resolve(result);
        }
    }

    /**
     * Check if we have the necessary permissions
     */
    @PluginMethod
    public void checkPermissions(PluginCall call) {
        if (healthConnectClient == null) {
            JSObject result = new JSObject();
            result.put("granted", false);
            result.put("error", "Health Connect not available");
            call.resolve(result);
            return;
        }

        try {
            // This is a simplified check - in production, use coroutines properly
            JSObject result = new JSObject();
            result.put("granted", false); // Will be updated after permission check
            result.put("permissions", new JSArray(PERMISSIONS));
            call.resolve(result);
        } catch (Exception e) {
            Log.e(TAG, "Permission check failed", e);
            call.reject("Permission check failed: " + e.getMessage());
        }
    }

    /**
     * Request permissions to read health data
     */
    @PluginMethod
    public void requestPermissions(PluginCall call) {
        if (healthConnectClient == null) {
            call.reject("Health Connect not available");
            return;
        }

        try {
            // Create permission request intent
            Intent intent = PermissionController.createRequestPermissionResultContract()
                .createIntent(getContext(), PERMISSIONS);

            // Start activity for result
            getActivity().startActivityForResult(intent, 1001);

            // Note: In a full implementation, you'd handle the result callback
            JSObject result = new JSObject();
            result.put("requested", true);
            call.resolve(result);
        } catch (Exception e) {
            Log.e(TAG, "Permission request failed", e);
            call.reject("Permission request failed: " + e.getMessage());
        }
    }

    /**
     * Open Health Connect settings
     */
    @PluginMethod
    public void openHealthConnectSettings(PluginCall call) {
        try {
            Intent intent = new Intent();
            intent.setAction("androidx.health.ACTION_HEALTH_CONNECT_SETTINGS");
            getActivity().startActivity(intent);

            JSObject result = new JSObject();
            result.put("success", true);
            call.resolve(result);
        } catch (Exception e) {
            Log.e(TAG, "Failed to open Health Connect settings", e);
            call.reject("Failed to open settings: " + e.getMessage());
        }
    }

    /**
     * Read sleep sessions from Health Connect
     * Returns sleep data for the specified number of days
     */
    @PluginMethod
    public void readSleepSessions(PluginCall call) {
        if (healthConnectClient == null) {
            call.reject("Health Connect not available");
            return;
        }

        int days = call.getInt("days", 7);

        try {
            Instant endTime = Instant.now();
            Instant startTime = endTime.minus(days, ChronoUnit.DAYS);

            // Note: This is simplified - in production, use Kotlin coroutines
            // The actual Health Connect API is suspend-based

            JSObject result = new JSObject();
            JSArray sessions = new JSArray();

            // Placeholder for actual implementation
            // In a real implementation, you would:
            // 1. Create a ReadRecordsRequest for SleepSessionRecord
            // 2. Call healthConnectClient.readRecords(request)
            // 3. Map the results to JSObjects

            result.put("sessions", sessions);
            result.put("startDate", startTime.toString());
            result.put("endDate", endTime.toString());
            call.resolve(result);

        } catch (Exception e) {
            Log.e(TAG, "Failed to read sleep sessions", e);
            call.reject("Failed to read sleep data: " + e.getMessage());
        }
    }

    /**
     * Read heart rate samples from Health Connect
     */
    @PluginMethod
    public void readHeartRate(PluginCall call) {
        if (healthConnectClient == null) {
            call.reject("Health Connect not available");
            return;
        }

        int days = call.getInt("days", 7);

        try {
            Instant endTime = Instant.now();
            Instant startTime = endTime.minus(days, ChronoUnit.DAYS);

            JSObject result = new JSObject();
            JSArray samples = new JSArray();

            // Placeholder - similar to sleep sessions
            result.put("samples", samples);
            result.put("startDate", startTime.toString());
            result.put("endDate", endTime.toString());
            call.resolve(result);

        } catch (Exception e) {
            Log.e(TAG, "Failed to read heart rate", e);
            call.reject("Failed to read heart rate: " + e.getMessage());
        }
    }

    /**
     * Get aggregated sleep statistics
     */
    @PluginMethod
    public void getSleepStats(PluginCall call) {
        if (healthConnectClient == null) {
            call.reject("Health Connect not available");
            return;
        }

        int days = call.getInt("days", 30);

        try {
            JSObject result = new JSObject();

            // Placeholder stats
            result.put("averageDuration", 0);
            result.put("averageBedtime", "");
            result.put("averageWakeTime", "");
            result.put("totalNights", 0);

            call.resolve(result);

        } catch (Exception e) {
            Log.e(TAG, "Failed to get sleep stats", e);
            call.reject("Failed to get sleep stats: " + e.getMessage());
        }
    }
}
