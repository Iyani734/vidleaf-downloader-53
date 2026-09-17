# VidLeaf Downloader

Develop only the frontend for a modern video download web application called “VidLeaf.”

Do not build a backend, server, database, media-processing service, or real download engine. Use realistic mock data and simulated interactions. Structure the code so real APIs can be connected later.

Technology:

React with TypeScript

Tailwind CSS

Lucide icons

Reusable, well-organized components

Local storage for download history

Mock asynchronous functions for video analysis and downloads

Branding and design:

Create a polished, professional green-and-white interface.

Color palette:

Primary green: #16A34A

Dark green: #166534

Light-green background: #F0FDF4

White: #FFFFFF

Main text: #17211A

Muted text: #647067

Border: #DDE8E0

Error: #DC2626

Use:

A clean SaaS-style layout

Generous whitespace

Rounded cards and controls

Soft shadows

Subtle borders

Smooth transitions and micro-interactions

Clear typography and visual hierarchy

A simple leaf-and-download icon in the VidLeaf logo

No advertisements, misleading buttons, or distracting pop-ups

Navigation:

Create a sticky, responsive navigation bar containing:

VidLeaf logo

Downloader

My Downloads

How It Works

FAQ

Mobile menu button

Hero section:

Heading:

“Download Videos in the Quality You Want”

Supporting text:

“Paste a public video link, choose your preferred quality, and download it in just a few steps.”

Include:

A large URL input

Placeholder: “Paste a public video link here…”

Clear-input button

Prominent “Get Video” button

URL validation message

Example-link option

Simulate a short analyzing state when “Get Video” is clicked. Then display a realistic video result using mock data.

Video result:

Show:

Large thumbnail

Video title

Creator or channel name

Video duration

Upload date

Views, when available

Create a quality selector with:

Best Quality — selected and recommended by default

4K / 2160p

2K / 1440p

Full HD / 1080p

HD / 720p

480p

360p

240p

144p

Audio only

For each option, display:

Resolution

File format

Estimated file size

FPS where relevant

Video or audio icon

Availability

“Recommended” badge where appropriate

Allow MP4, WebM, MP3, and M4A to appear as mock format choices.

Download summary:

Before downloading, show a compact summary containing:

Selected quality

Format

Estimated file size

Estimated download time

Include an optional internet-speed selector:

Slow — 5 Mbps

Average — 20 Mbps

Fast — 50 Mbps

Very fast — 100 Mbps

Custom speed

Calculate the estimated time in the browser using:

estimated time = file size in bits ÷ internet speed in bits per second

Add approximately 10% overhead and display friendly estimates such as:

“Less than 1 minute”

“About 2 minutes”

“About 8 minutes”

Add a large green “Download Video” button.

My Downloads section:

Create two tabs:

Downloading

Download History

Show a badge containing the number of active downloads.

Downloading tab:

Display active downloads as responsive cards containing:

Thumbnail

Video title

Selected resolution

File format

Downloaded size and total size

Current speed

Percentage completed

Animated progress bar

Estimated time remaining

Current status

Pause or resume button

Cancel button

Retry button for failed downloads

Simulate realistic download progress in the frontend. Cycle through statuses such as:

Preparing

Downloading

Processing

Ready

Allow several simulated downloads to run simultaneously.

Download History tab:

Display completed downloads with:

Thumbnail

Video title

Creator name

Quality

Format

File size

Video duration

Date and time downloaded

Total download time

Download-again button

Copy-link button

Remove button

Three-dot actions menu

Add:

Search by title

Filter by video or audio

Filter by resolution

Sort by newest, oldest, largest, or smallest

Clear-history button with a confirmation modal

Attractive empty state

Pagination or “Load More” behavior

Save mock download history in local storage so it remains after refreshing the page.

Additional sections:

How It Works:

Create three illustrated steps:

Paste a Link

Choose Quality

Download

FAQ:

Add an accessible accordion covering:

Supported formats

Available resolutions

Estimated download times

Download history

Mobile compatibility

Footer:

Include:

VidLeaf logo

Short product description

Downloader link

FAQ link

Terms

Privacy

Copyright notice

A short reminder to download only content the user is permitted to use

Responsive requirements:

Use a mobile-first approach.

Support screens from 320px to large desktops.

Stack all content vertically on mobile.

Make major buttons full-width on small screens.

Display video information and quality selection side by side on desktop.

Convert history rows into mobile-friendly cards.

Prevent horizontal scrolling.

Use a slide-out mobile navigation menu.

Ensure touch targets are large and easy to use.

Application states:

Create polished designs for:

Initial state

Invalid URL

Analyzing

Video found

No formats available

Preparing download

Active download

Paused download

Cancelled download

Failed download

Completed download

Empty history

Offline state

Accessibility:

Use semantic HTML.

Add accessible labels to every control.

Provide visible keyboard focus states.

Ensure sufficient color contrast.

Support keyboard navigation.

Use screen-reader-friendly live status messages.

Respect reduced-motion preferences.

Frontend architecture:

Create reusable components such as:

Navbar

HeroDownloader

URLInput

VideoPreview

QualitySelector

DownloadSummary

DownloadTabs

ActiveDownloadCard

DownloadHistory

HistoryCard

SpeedSelector

HowItWorks

FAQ

ConfirmationModal

Toast

Footer

Keep mock data in a separate file and place all simulated API functions behind a clear service interface. Add concise comments showing where future analysis, progress, and download API endpoints should be connected.

The final result should look and behave like a complete, deployment-ready frontend rather than a basic mockup. Every button, tab, filter, dropdown, modal, progress indicator, mobile menu, and empty state should work.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/44ea8c83-ec0f-4b24-9815-4f2a0f2305bc).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
