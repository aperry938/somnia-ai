import Foundation
import Capacitor
import HealthKit

/**
 * HealthKitPlugin - Capacitor plugin for iOS HealthKit
 * Reads sleep data and heart rate from Apple Health
 */
@objc(HealthKitPlugin)
public class HealthKitPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "HealthKitPlugin"
    public let jsName = "HealthKit"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "isAvailable", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "requestAuthorization", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "checkAuthorization", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "readSleepAnalysis", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "readHeartRate", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getSleepStats", returnType: CAPPluginReturnPromise),
    ]

    private let healthStore = HKHealthStore()

    // Types we want to read
    private var readTypes: Set<HKObjectType> {
        var types = Set<HKObjectType>()

        if let sleepType = HKObjectType.categoryType(forIdentifier: .sleepAnalysis) {
            types.insert(sleepType)
        }
        if let heartRateType = HKObjectType.quantityType(forIdentifier: .heartRate) {
            types.insert(heartRateType)
        }
        if let hrvType = HKObjectType.quantityType(forIdentifier: .heartRateVariabilitySDNN) {
            types.insert(hrvType)
        }
        if let respiratoryType = HKObjectType.quantityType(forIdentifier: .respiratoryRate) {
            types.insert(respiratoryType)
        }

        return types
    }

    /**
     * Check if HealthKit is available on this device
     */
    @objc func isAvailable(_ call: CAPPluginCall) {
        let available = HKHealthStore.isHealthDataAvailable()
        call.resolve([
            "available": available
        ])
    }

    /**
     * Request authorization to read health data
     */
    @objc func requestAuthorization(_ call: CAPPluginCall) {
        guard HKHealthStore.isHealthDataAvailable() else {
            call.reject("HealthKit not available on this device")
            return
        }

        healthStore.requestAuthorization(toShare: nil, read: readTypes) { success, error in
            if let error = error {
                call.reject("Authorization failed: \(error.localizedDescription)")
                return
            }

            call.resolve([
                "authorized": success
            ])
        }
    }

    /**
     * Check current authorization status
     */
    @objc func checkAuthorization(_ call: CAPPluginCall) {
        guard HKHealthStore.isHealthDataAvailable() else {
            call.resolve([
                "authorized": false,
                "status": "unavailable"
            ])
            return
        }

        // Check sleep analysis authorization
        guard let sleepType = HKObjectType.categoryType(forIdentifier: .sleepAnalysis) else {
            call.resolve([
                "authorized": false,
                "status": "unknown"
            ])
            return
        }

        let status = healthStore.authorizationStatus(for: sleepType)

        call.resolve([
            "authorized": status == .sharingAuthorized,
            "status": statusToString(status)
        ])
    }

    /**
     * Read sleep analysis data from HealthKit
     */
    @objc func readSleepAnalysis(_ call: CAPPluginCall) {
        guard HKHealthStore.isHealthDataAvailable() else {
            call.reject("HealthKit not available")
            return
        }

        guard let sleepType = HKObjectType.categoryType(forIdentifier: .sleepAnalysis) else {
            call.reject("Sleep analysis not available")
            return
        }

        let days = call.getInt("days") ?? 7
        let calendar = Calendar.current
        let endDate = Date()
        guard let startDate = calendar.date(byAdding: .day, value: -days, to: endDate) else {
            call.reject("Invalid date range")
            return
        }

        let predicate = HKQuery.predicateForSamples(withStart: startDate, end: endDate, options: .strictStartDate)
        let sortDescriptor = NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: false)

        let query = HKSampleQuery(
            sampleType: sleepType,
            predicate: predicate,
            limit: HKObjectQueryNoLimit,
            sortDescriptors: [sortDescriptor]
        ) { _, samples, error in
            if let error = error {
                call.reject("Query failed: \(error.localizedDescription)")
                return
            }

            var sessions: [[String: Any]] = []

            if let sleepSamples = samples as? [HKCategorySample] {
                for sample in sleepSamples {
                    let session: [String: Any] = [
                        "uuid": sample.uuid.uuidString,
                        "startDate": ISO8601DateFormatter().string(from: sample.startDate),
                        "endDate": ISO8601DateFormatter().string(from: sample.endDate),
                        "value": sample.value, // 0=InBed, 1=AsleepUnspecified, 2=Awake, 3=Core, 4=Deep, 5=REM
                        "sourceName": sample.sourceRevision.source.name,
                        "sourceBundle": sample.sourceRevision.source.bundleIdentifier,
                        "duration": sample.endDate.timeIntervalSince(sample.startDate) / 60 // minutes
                    ]
                    sessions.append(session)
                }
            }

            call.resolve([
                "sessions": sessions,
                "startDate": ISO8601DateFormatter().string(from: startDate),
                "endDate": ISO8601DateFormatter().string(from: endDate),
                "count": sessions.count
            ])
        }

        healthStore.execute(query)
    }

    /**
     * Read heart rate samples from HealthKit
     */
    @objc func readHeartRate(_ call: CAPPluginCall) {
        guard HKHealthStore.isHealthDataAvailable() else {
            call.reject("HealthKit not available")
            return
        }

        guard let heartRateType = HKObjectType.quantityType(forIdentifier: .heartRate) else {
            call.reject("Heart rate not available")
            return
        }

        let days = call.getInt("days") ?? 7
        let calendar = Calendar.current
        let endDate = Date()
        guard let startDate = calendar.date(byAdding: .day, value: -days, to: endDate) else {
            call.reject("Invalid date range")
            return
        }

        let predicate = HKQuery.predicateForSamples(withStart: startDate, end: endDate, options: .strictStartDate)
        let sortDescriptor = NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: false)

        let query = HKSampleQuery(
            sampleType: heartRateType,
            predicate: predicate,
            limit: 1000, // Limit to avoid memory issues
            sortDescriptors: [sortDescriptor]
        ) { _, samples, error in
            if let error = error {
                call.reject("Query failed: \(error.localizedDescription)")
                return
            }

            var hrSamples: [[String: Any]] = []

            if let quantitySamples = samples as? [HKQuantitySample] {
                let unit = HKUnit.count().unitDivided(by: .minute())

                for sample in quantitySamples {
                    let hr: [String: Any] = [
                        "uuid": sample.uuid.uuidString,
                        "date": ISO8601DateFormatter().string(from: sample.startDate),
                        "value": sample.quantity.doubleValue(for: unit),
                        "sourceName": sample.sourceRevision.source.name
                    ]
                    hrSamples.append(hr)
                }
            }

            call.resolve([
                "samples": hrSamples,
                "startDate": ISO8601DateFormatter().string(from: startDate),
                "endDate": ISO8601DateFormatter().string(from: endDate),
                "count": hrSamples.count
            ])
        }

        healthStore.execute(query)
    }

    /**
     * Get aggregated sleep statistics
     */
    @objc func getSleepStats(_ call: CAPPluginCall) {
        guard HKHealthStore.isHealthDataAvailable() else {
            call.reject("HealthKit not available")
            return
        }

        guard let sleepType = HKObjectType.categoryType(forIdentifier: .sleepAnalysis) else {
            call.reject("Sleep analysis not available")
            return
        }

        let days = call.getInt("days") ?? 30
        let calendar = Calendar.current
        let endDate = Date()
        guard let startDate = calendar.date(byAdding: .day, value: -days, to: endDate) else {
            call.reject("Invalid date range")
            return
        }

        let predicate = HKQuery.predicateForSamples(withStart: startDate, end: endDate, options: .strictStartDate)
        let sortDescriptor = NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: false)

        let query = HKSampleQuery(
            sampleType: sleepType,
            predicate: predicate,
            limit: HKObjectQueryNoLimit,
            sortDescriptors: [sortDescriptor]
        ) { _, samples, error in
            if let error = error {
                call.reject("Query failed: \(error.localizedDescription)")
                return
            }

            var totalSleepMinutes: Double = 0
            var sleepNights: Set<String> = []
            var bedtimes: [Int] = []
            var waketimes: [Int] = []

            let dateFormatter = DateFormatter()
            dateFormatter.dateFormat = "yyyy-MM-dd"

            if let sleepSamples = samples as? [HKCategorySample] {
                for sample in sleepSamples {
                    // Count only actual sleep (not just in bed)
                    // Values: 0=InBed, 1=AsleepUnspecified, 2=Awake, 3=Core, 4=Deep, 5=REM
                    if sample.value >= 1 && sample.value != 2 {
                        let duration = sample.endDate.timeIntervalSince(sample.startDate) / 60
                        totalSleepMinutes += duration

                        let nightKey = dateFormatter.string(from: sample.startDate)
                        sleepNights.insert(nightKey)

                        // Track bedtime (hour * 60 + minute)
                        let bedtimeComponents = calendar.dateComponents([.hour, .minute], from: sample.startDate)
                        if let hour = bedtimeComponents.hour, let minute = bedtimeComponents.minute {
                            bedtimes.append(hour * 60 + minute)
                        }

                        // Track wake time
                        let wakeComponents = calendar.dateComponents([.hour, .minute], from: sample.endDate)
                        if let hour = wakeComponents.hour, let minute = wakeComponents.minute {
                            waketimes.append(hour * 60 + minute)
                        }
                    }
                }
            }

            let avgSleepHours = sleepNights.isEmpty ? 0 : (totalSleepMinutes / Double(sleepNights.count)) / 60
            let avgBedtimeMinutes = bedtimes.isEmpty ? 0 : bedtimes.reduce(0, +) / bedtimes.count
            let avgWaketimeMinutes = waketimes.isEmpty ? 0 : waketimes.reduce(0, +) / waketimes.count

            call.resolve([
                "averageDuration": avgSleepHours,
                "averageBedtime": self.minutesToTimeString(avgBedtimeMinutes),
                "averageWakeTime": self.minutesToTimeString(avgWaketimeMinutes),
                "totalNights": sleepNights.count,
                "totalSleepMinutes": totalSleepMinutes
            ])
        }

        healthStore.execute(query)
    }

    // Helper functions
    private func statusToString(_ status: HKAuthorizationStatus) -> String {
        switch status {
        case .notDetermined:
            return "notDetermined"
        case .sharingDenied:
            return "denied"
        case .sharingAuthorized:
            return "authorized"
        @unknown default:
            return "unknown"
        }
    }

    private func minutesToTimeString(_ minutes: Int) -> String {
        let hours = minutes / 60
        let mins = minutes % 60
        return String(format: "%02d:%02d", hours, mins)
    }
}
