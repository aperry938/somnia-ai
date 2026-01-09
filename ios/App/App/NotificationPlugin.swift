import Foundation
import Capacitor
import UserNotifications

/**
 * NotificationPlugin - Enhanced notification capabilities for iOS
 *
 * Provides:
 * - Critical alert authorization (bypasses DND)
 * - Time-sensitive notification support
 * - Alarm notification configuration
 *
 * Note: Critical alerts require Apple's approval. Apply at:
 * https://developer.apple.com/contact/request/notifications-critical-alerts-entitlement
 */
@objc(NotificationPlugin)
public class NotificationPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "NotificationPlugin"
    public let jsName = "CriticalNotifications"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "requestCriticalAuthorization", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "checkCriticalStatus", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "scheduleAlarmNotification", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "openNotificationSettings", returnType: CAPPluginReturnPromise),
    ]

    /**
     * Request authorization for critical alerts (DND bypass)
     * Also requests standard notification permissions
     */
    @objc func requestCriticalAuthorization(_ call: CAPPluginCall) {
        let center = UNUserNotificationCenter.current()

        // Request all notification permissions including critical alerts
        var options: UNAuthorizationOptions = [.alert, .sound, .badge, .provisional]

        // Add critical alert option (requires entitlement)
        if #available(iOS 12.0, *) {
            options.insert(.criticalAlert)
        }

        center.requestAuthorization(options: options) { granted, error in
            if let error = error {
                call.reject("Authorization failed: \(error.localizedDescription)")
                return
            }

            // Check if critical alerts specifically were granted
            center.getNotificationSettings { settings in
                var criticalGranted = false

                if #available(iOS 12.0, *) {
                    criticalGranted = settings.criticalAlertSetting == .enabled
                }

                call.resolve([
                    "granted": granted,
                    "criticalGranted": criticalGranted,
                    "alertSetting": self.settingToString(settings.alertSetting),
                    "soundSetting": self.settingToString(settings.soundSetting),
                ])
            }
        }
    }

    /**
     * Check current notification and critical alert status
     */
    @objc func checkCriticalStatus(_ call: CAPPluginCall) {
        let center = UNUserNotificationCenter.current()

        center.getNotificationSettings { settings in
            var criticalEnabled = false
            var timeSensitiveEnabled = false

            if #available(iOS 12.0, *) {
                criticalEnabled = settings.criticalAlertSetting == .enabled
            }

            if #available(iOS 15.0, *) {
                timeSensitiveEnabled = settings.timeSensitiveSetting == .enabled
            }

            call.resolve([
                "authorized": settings.authorizationStatus == .authorized,
                "criticalEnabled": criticalEnabled,
                "timeSensitiveEnabled": timeSensitiveEnabled,
                "alertSetting": self.settingToString(settings.alertSetting),
                "soundSetting": self.settingToString(settings.soundSetting),
                "badgeSetting": self.settingToString(settings.badgeSetting),
                "lockScreenSetting": self.settingToString(settings.lockScreenSetting),
            ])
        }
    }

    /**
     * Schedule an alarm notification with critical alert if available
     */
    @objc func scheduleAlarmNotification(_ call: CAPPluginCall) {
        guard let id = call.getString("id"),
              let title = call.getString("title"),
              let body = call.getString("body"),
              let timestamp = call.getDouble("timestamp") else {
            call.reject("Missing required parameters")
            return
        }

        let content = UNMutableNotificationContent()
        content.title = title
        content.body = body
        content.categoryIdentifier = "ALARM_CATEGORY"

        // Set sound (use custom or default alarm)
        if let soundName = call.getString("sound") {
            content.sound = UNNotificationSound(named: UNNotificationSoundName(rawValue: soundName))
        } else {
            content.sound = UNNotificationSound.defaultCritical
        }

        // Try to make it a critical alert
        if #available(iOS 12.0, *) {
            // Check if we have critical alert permission
            UNUserNotificationCenter.current().getNotificationSettings { settings in
                if settings.criticalAlertSetting == .enabled {
                    // Use critical alert sound (bypasses DND)
                    if let soundName = call.getString("sound") {
                        content.sound = UNNotificationSound.criticalSoundNamed(
                            UNNotificationSoundName(rawValue: soundName),
                            withAudioVolume: 1.0
                        )
                    } else {
                        content.sound = UNNotificationSound.defaultCriticalSound(withAudioVolume: 1.0)
                    }
                }
            }
        }

        // Add user info for handling
        content.userInfo = [
            "alarmId": id,
            "type": "alarm"
        ]

        // Create trigger from timestamp
        let date = Date(timeIntervalSince1970: timestamp / 1000)
        let dateComponents = Calendar.current.dateComponents(
            [.year, .month, .day, .hour, .minute, .second],
            from: date
        )
        let trigger = UNCalendarNotificationTrigger(dateMatching: dateComponents, repeats: false)

        // Create and schedule request
        let request = UNNotificationRequest(
            identifier: "alarm_\(id)",
            content: content,
            trigger: trigger
        )

        UNUserNotificationCenter.current().add(request) { error in
            if let error = error {
                call.reject("Failed to schedule: \(error.localizedDescription)")
            } else {
                call.resolve(["scheduled": true, "id": id])
            }
        }
    }

    /**
     * Open iOS notification settings for the app
     */
    @objc func openNotificationSettings(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            if let settingsUrl = URL(string: UIApplication.openSettingsURLString) {
                UIApplication.shared.open(settingsUrl)
                call.resolve()
            } else {
                call.reject("Cannot open settings")
            }
        }
    }

    // Helper to convert notification setting to string
    private func settingToString(_ setting: UNNotificationSetting) -> String {
        switch setting {
        case .enabled:
            return "enabled"
        case .disabled:
            return "disabled"
        case .notSupported:
            return "notSupported"
        @unknown default:
            return "unknown"
        }
    }
}
