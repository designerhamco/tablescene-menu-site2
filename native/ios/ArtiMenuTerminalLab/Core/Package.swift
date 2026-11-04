// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "TerminalCore",
    platforms: [.iOS(.v17), .macOS(.v13)],
    products: [.library(name: "TerminalCore", targets: ["TerminalCore"])],
    targets: [
        .target(name: "TerminalCore"),
        .testTarget(name: "TerminalCoreTests", dependencies: ["TerminalCore"]),
        .executableTarget(name: "TerminalCoreChecks", dependencies: ["TerminalCore"], path: "Checks")
    ]
)
