- [ ] Update core capacitor 8 (min sdk 24 -> 7.0)
- [ ] Fallback for older devices API 24-30 (>=7, <12), using hotspot

## IOS

- [ ] Testing current methods
- [ ] Consider implementing [Nearby Connections](https://developers.google.com/nearby/connections/swift/get-started) for swift to allow cross-compat with Android. May want split discovery to decide whether to use Multipeer or Nearby connection depending on whether peers are ios or android (or maybe in-app toggle?)

Add TransferManager class to orchestrate tiers
Add tier selection to definitions.ts
Implement fallback: try Tier 1 → fail → try Tier 2 → fail → try Tier 3

## UI (client)

- Would you like to send or receive
- Receive
  - Device compatibility check
  - Share advise with sender (or visual confirmation)
- Send
  - Specify protocol/method (explain older/newer device options)
  - Select what to share
