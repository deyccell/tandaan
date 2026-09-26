Tandaan v13

Updates:
- Manual task creation now asks for a due date immediately when no date is present. Quick choices: Today, Tomorrow, Pick date & time, or No due date.
- Due date and time use one combined picker; time is optional via Date only mode.
- Edit Task uses the same combined due-date control, with Remove due date.
- Enter/Return in Quick Add submits the same way as the Add button.
- Smarter intent handling keeps future wording such as “I will buy egg 200 pesos” as a task, while “Buy egg” remains Shopping and “Egg 1 tray 400” / “I bought egg 1 tray 400” can become Purchases without saying pesos.
- Bare numeric-only inputs are not treated as purchases.
- Removed automatic voice-model download when the app opens. The voice model is now lazy-loaded only when the user first taps Speak, in the background while recording starts. No separate Prepare Offline Voice step or download progress UI is shown.
- Voice recordings continue to use microphone noise suppression, echo cancellation, auto gain control, and local audio processing.

Reminder note:
- Tandaan stores due dates locally and provides Calendar export, but a reliable lock-screen alert while the PWA is closed still requires a Web Push service. That backend is not included in this build.

Update GitHub:
  git add .
  git commit -m "Improve task scheduling, purchase intent, and silent voice loading"
  git push
