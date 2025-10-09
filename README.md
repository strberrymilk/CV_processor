# CV_processor
JavaScript script with Google API's that reads your Gmail inbox, detects CV's with and extracts information within threads (attached files and body) with openAI, fills a Google sheet and sends a cute confirmation email.

## How to use it?
### Prerrequisites:
- Google account
- CV database in Google Sheets
- CV folder in Google Drive
- (optional) Trash folder in Google Drive
- GIF database in Google Sheets
### Instructions
1. Go to your CV database
2. Clic on "Extensions"
3. Clic on "Apps Script"
4. Copy and paste this code
5. Add the corresponding URL's
6. Modify the code as needed
7. Clic on the left menu option called "activators" (clock icon)
8. Clic on "Add an activator"
9. Select "processCVsFromGmail" function, activation "Based on time", "Cronometer by minute", and "Every 15 minutes" (you can change the timing)
10. Enjoy your automated hiring process!
