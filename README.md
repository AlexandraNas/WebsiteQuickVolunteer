# QuickVolunteer website (front end)

QuickVolunteer connects neighbours who need a little help with people who have a little time to give. Every task takes 15 to 60 minutes and can be done in person or from home.

This repository is the front end only: plain HTML, CSS and JavaScript, with no frameworks and no Jinja. The back end (Python Flask) and the MySQL database are built separately.

Live site: https://alexandranas.github.io/WebsiteQuickVolunteer/

## How to open
Open `index.html` in a browser, or use the Live Server extension in VS Code. After uploading new files, press Cmd + Shift + R (Ctrl + Shift + R on Windows) to clear the cached version.

## Trying the prototype
- **Member:** sign up with any first name, last name and email. The password needs at least 12 characters and both password boxes must match.
- **Administrator:** log in with an email that starts with `admin` (for example `admin@example.com`) to open the admin page.
- **Start again:** log out, or clear the site data in the browser, to reset the demo.

## Pages
| Page | What it does | User story |
|---|---|---|
| `index.html` | Homepage | |
| `signup.html` | One account for everyone: first and last name, email, password of 12 or more characters with a match check | US-01 |
| `login.html` | One login for members and the administrator | US-01 |
| `forgot-password.html` | Request a password reset link | US-01 |
| `onboarding.html` | Optional set up: area, ask or give help, skills. Skipping sets the account type to "both" | US-16 |
| `dashboard.html` | Main page; adapts to ask, give or both | |
| `find-a-task.html` | Search and filter by help mode, type of help and duration. "Matches my skills" only appears once skills are saved | US-05, US-13 |
| `task.html?id=1` | Task details and Offer to help | US-06 |
| `post-request.html` | Post a help request with a "Complete by" deadline | US-04 |
| `my-requests.html` | My requests: filter, edit, close | US-09 |
| `request.html?id=1` | One request: accept or decline volunteer offers | US-07 |
| `my-tasks.html` | Upcoming tasks, offers, hours and activity history | US-08, US-14 |
| `review.html?task=2` | Confirm a task is completed and leave a review. A task only counts as completed when both people confirm | US-10, US-15 |
| `profile.html` | Edit first and last name, area, skills and availability; see reviews | US-02 (US-03 merged) |
| `report.html?task=5` | Report a concern | US-12 |
| `admin.html` | Admin: verify accounts, review concerns, suspend and reactivate accounts, hide and restore reviews | US-11, US-12, US-15 |
| `about.html`, `impact.html`, `volunteer-guide.html`, `faqs.html`, `contact.html`, `privacy.html`, `terms.html` | Information pages | |

## How some features behave
- **Ask for Help:** logged out visitors go to sign up with a short note, and "Log in" returns them to the request form. Logged in members go straight to `post-request.html`.
- **Header:** every page shows Log in and Sign up when logged out, and notifications, the member's name and Log out when logged in.
- **Task completion:** the volunteer and the requester both confirm. Until then the task shows "Waiting for ... to confirm".
- **Skill matching:** the "Matches your skills" label and filter are shown only when the member has saved skills. Members who skip onboarding see all tasks normally.

## Folders
- `css/styles.css` all styles
- `js/main.js` all behaviour
- `assets/icons/` icons and logo
- `assets/images/` photos

## Notes for the back end
- The pages use demo data. In `js/main.js`, `DEMO_TASKS`, `DEMO_REQUESTS` and the `localStorage` keys `qv_profile` (the member) and `qv_confirmations` (who has confirmed each task) stand in for the API.
- Each function in `main.js` has a comment naming the request that should replace it, for example `POST /api/tasks`, `POST /api/offers/<id>/accept`, `POST /api/reports`, `PATCH /api/reviews/<id>`.
- Task suggestions based on skills will be finished once the front end is connected to the back end.
- Forms only check input in the browser; Flask must validate everything again on the server.
