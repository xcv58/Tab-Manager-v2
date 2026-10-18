import Foundation
import SafariServices

final class SafariWebExtensionHandler: NSObject, NSExtensionRequestHandling {
    private static let writeLock = NSLock()

    func beginRequest(with context: NSExtensionContext) {
        guard let item = context.inputItems.first as? NSExtensionItem,
              let message = item.userInfo?[SFExtensionMessageKey] as? [String: Any],
              message["kind"] as? String == "snapshot",
              var payload = message["snapshot"] as? [String: Any]
        else {
            complete(context, ["ok": false, "error": "Expected a snapshot from the Safari bridge."])
            return
        }
        let rawProfile = item.userInfo?[SFExtensionProfileKey]
        let profileID: String
        if let uuid = rawProfile as? UUID { profileID = uuid.uuidString }
        else if let string = rawProfile as? String, let uuid = UUID(uuidString: string) {
            profileID = uuid.uuidString
        } else if rawProfile == nil { profileID = "default" }
        else {
            complete(context, ["ok": false, "error": "Unsupported Safari profile identifier."])
            return
        }
        // Pin schema/profile to trusted native metadata; never trust JS to
        // choose a file or replace another profile's cached workspace.
        payload["schemaVersion"] = 1
        payload["profileID"] = profileID
        do {
            let data = try JSONSerialization.data(withJSONObject: payload)
            let decoded = try JSONDecoder().decode(SafariSnapshot.self, from: data)
            let now = Date()
            try decoded.validate(for: profileID, at: now)
            Self.writeLock.lock()
            defer { Self.writeLock.unlock() }
            let url = try BridgeFiles.url(profileID: profileID)
            var previous = try? JSONDecoder().decode(SafariSnapshot.self, from: Data(contentsOf: url))
            if let old = previous, (try? old.validate(for: profileID, at: now)) == nil { previous = nil }
            if decoded.shouldReplace(previous) {
                try data.write(to: url, options: .atomic)
            }
            complete(context, ["ok": true, "profileID": profileID])
        } catch {
            complete(context, ["ok": false, "error": error.localizedDescription])
        }
    }

    private func complete(_ context: NSExtensionContext, _ message: [String: Any]) {
        let response = NSExtensionItem()
        response.userInfo = [SFExtensionMessageKey: message]
        context.completeRequest(returningItems: [response], completionHandler: nil)
    }
}
