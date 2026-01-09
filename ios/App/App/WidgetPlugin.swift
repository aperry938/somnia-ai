import Foundation
import Capacitor
import WidgetKit

/**
 * WidgetPlugin - Capacitor plugin to update iOS widgets from JavaScript
 *
 * Uses App Groups to share data between the main app and widget extension.
 * Call updateWidget() whenever alarm or sleep data changes to sync the widget.
 *
 * SETUP REQUIRED:
 * 1. Add App Group "group.ai.somnia.app" to main app capabilities
 * 2. Create Widget Extension with same App Group
 */
@objc(WidgetPlugin)
public class WidgetPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "WidgetPlugin"
    public let jsName = "Widget"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "updateWidget", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "refresh", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "isSupported", returnType: CAPPluginReturnPromise),
    ]

    // App Group identifier - must match widget extension
    private let appGroupID = "group.ai.somnia.app"

    /**
     * Update widget with current alarm and sleep data
     */
    @objc func updateWidget(_ call: CAPPluginCall) {
        guard let userDefaults = UserDefaults(suiteName: appGroupID) else {
            call.reject("Failed to access App Group")
            return
        }

        // Get parameters
        let alarmTime = call.getString("alarmTime")
        let alarmLabel = call.getString("alarmLabel") ?? "Alarm"
        let avgSleep = call.getFloat("avgSleep") ?? 0
        let sleepScore = call.getInt("sleepScore") ?? 0
        let streak = call.getInt("streak") ?? 0

        // Save to shared UserDefaults
        userDefaults.set(alarmTime, forKey: "nextAlarmTime")
        userDefaults.set(alarmLabel, forKey: "nextAlarmLabel")
        userDefaults.set(Double(avgSleep), forKey: "avgSleepHours")
        userDefaults.set(sleepScore, forKey: "sleepScore")
        userDefaults.set(streak, forKey: "streak")
        userDefaults.synchronize()

        // Trigger widget refresh
        if #available(iOS 14.0, *) {
            WidgetCenter.shared.reloadAllTimelines()
        }

        call.resolve()
    }

    /**
     * Force refresh all widgets
     */
    @objc func refresh(_ call: CAPPluginCall) {
        if #available(iOS 14.0, *) {
            WidgetCenter.shared.reloadAllTimelines()
        }
        call.resolve()
    }

    /**
     * Check if widgets are supported on this device
     */
    @objc func isSupported(_ call: CAPPluginCall) {
        // WidgetKit is available on iOS 14+
        var supported = false
        if #available(iOS 14.0, *) {
            supported = true
        }

        call.resolve([
            "supported": supported
        ])
    }
}
