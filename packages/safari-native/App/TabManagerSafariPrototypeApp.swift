import AppKit
import SafariServices
import SwiftUI

@main
struct TabManagerSafariPrototypeApp: App {
    var body: some Scene {
        Window("Tab Manager for Safari", id: "setup") {
            SafariSetupView()
                .onOpenURL { _ in NSApplication.shared.activate(ignoringOtherApps: true) }
        }
        .defaultSize(width: 560, height: 400)
    }
}

private struct SafariSetupView: View {
    @State private var error: String?
    var body: some View {
        VStack(alignment: .leading, spacing: 20) {
            Label("Tab Manager for Safari", systemImage: "rectangle.3.group")
                .font(.title.bold())
            Text("Your tabs, inside Safari.").font(.title2)
            Text("1. Enable Tab Manager v2 — Safari Prototype in Safari Settings → Extensions for the profile you want to manage.")
            Text("2. Click the Tab Manager icon in Safari’s toolbar. Allow website access for tabs whose titles and URLs you want to see.")
            Text("3. Use Control+W for the popup, Control+T for a separate window, or Control+O for a browser tab. Option+B switches recently used tabs.")
            Text("Only active tab groups in the current profile are available. Private windows are excluded. Tab data stays on this Mac.")
                .font(.caption).foregroundStyle(.secondary)
            if let error { Text(error).font(.caption).foregroundStyle(.red) }
            HStack {
                Button("Open Safari Extension Settings") {
                    Task {
                        do { try await SFSafariApplication.showPreferencesForExtension(withIdentifier: BridgeFiles.extensionID) }
                        catch { self.error = error.localizedDescription }
                    }
                }.keyboardShortcut(.defaultAction)
                Spacer()
                Text("Prototype").font(.caption).foregroundStyle(.secondary)
            }
        }.padding(28).frame(minWidth: 520, minHeight: 380)
    }
}
