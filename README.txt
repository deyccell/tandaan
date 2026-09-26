Tandaan v10

Features in this build:
- Offline-first Todo, Shopping, and Purchases data using localStorage.
- Create, read, update, and delete for tasks, shopping items, and purchases.
- Task due date and optional due time.
- Quick Add task details for due date/time.
- Task edit modal with due date/time.
- Calendar reminder export (.ics) with a 1-day-before VALARM.
- In-app upcoming reminder notice when Tandaan is opened or returned to the foreground.
- Voice capture, voice focus, and local transcription foundation from v9.
- Automatic language handling/parser foundation.

Important reminder behavior:
A PWA can store due dates locally, but it cannot reliably schedule a native iPhone alarm for a future time while the app is completely closed using only local/offline JavaScript. For a dependable lock-screen alert, this build provides a Calendar reminder file that includes a 1-day-before alarm; after the event is added to Apple Calendar, Calendar can deliver the alert independently of Tandaan. iOS Home Screen web apps support Web Push on iOS/iPadOS 16.4+, but push requires a server/device subscription and an internet path, so that is a later optional feature rather than part of the offline-only core.
