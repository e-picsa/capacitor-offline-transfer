// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "PicsaCapacitorOfflineTransfer",
    platforms: [.iOS(.v15)],
    products: [
        .library(
            name: "PicsaCapacitorOfflineTransfer",
            targets: ["CapacitorOfflineTransferPlugin"])
    ],
    dependencies: [
        .package(url: "https://github.com/ionic-team/capacitor-swift-pm.git", from: "8.0.0")
    ],
    targets: [
        .target(
            name: "CapacitorOfflineTransferPlugin",
            dependencies: [
                .product(name: "Capacitor", package: "capacitor-swift-pm"),
                .product(name: "Cordova", package: "capacitor-swift-pm")
            ],
            path: "ios/Sources/CapacitorOfflineTransferPlugin"),
        .testTarget(
            name: "CapacitorOfflineTransferPluginTests",
            dependencies: ["CapacitorOfflineTransferPlugin"],
            path: "ios/Tests/CapacitorOfflineTransferPluginTests")
    ]
)