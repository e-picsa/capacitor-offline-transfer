- [ ] Live reload app web content
- [ ] Automated testing for older devices
- [ ] Update core capacitor 8 (min sdk 24 -> 7.0)
- [ ] Fallback for older devices API 24-30 (>=7, <12), using hotspot

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
