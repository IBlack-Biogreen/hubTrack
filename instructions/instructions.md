HubTrack PRD (Product Requirements Document)

# Project Overview

HubTrack by BioGreen360 is a food waste tracking platform designed for use in commercial kitchens. It captures weight, feed type, and user data via an interactive cart with a touchscreen interface and uploads the data to a cloud backend. It supports offline functionality and includes robust features for onboarding, auditing, system setup, and analytics.

# Core Functional Goals

Track food waste entries with weight, image, user, and feed type

Sync collected data to MongoDB Atlas when online

Store images in S3 and link them in MongoDB

Allow for local-only use with deferred sync

Provide multilingual, visual user experience

Enable easy commissioning and setup of carts

Audit and manage available feed types per site

Handle software updates, offline storage, and long-term scale

# Tech Stack

## Hardware

Load Cell + Amplifier (0–10V or 4–20mA)

USB DAQ: LabJack U3

USB Webcam

Touchscreen PC: Windows-based (OnLogic or similar)

## Software

Frontend: Electron app

Backend: Node.js with Python helpers

Database: MongoDB Atlas (with local MongoDB mirror)

Image Storage: Amazon S3

Deployment:  Electron app with auto-updater for version management

Data Flow Summary

User logs in with PIN

Places food waste bin on scale

System records weight from DAQ

User selects feed type

System takes a picture with USB webcam

Data written to local MongoDB with sync flags

Image saved locally and uploaded to S3 when online

Example MongoDB Documents

Feed Entry (localFeeds collection)

{
  "timestamp": "2025-04-22T14:00:00Z",
  "userId": "Connor Gillette",
  "feedTypeId": "661d998bd405559ece18417d",
  "weight": 4.6,
  "imageFilename": "bgtrack_61_20250422_140000.jpg",
  "imageStatus": "pending",  // pending, uploaded, error
  "syncStatus": "pending",   // pending, uploaded, error
  "deviceLabel": "bgtrack_61"
}

User Document (localUsers)

{
  "userId": "cgillette",
  "FIRST": "Connor",
  "LAST": "Gillette",
  "title": "Assistant F&B Director",
  "cell": "7035088475",
  "email": "cgillette@thealidahotel.com",
  "LANGUAGE": "en",
  "userDept": "Food & Beverage",
  "CODE": "1939",
  "status": "active",
  "siteChampion": true,
  "feedPermissions": true,
  "residualPermissions": true,
  "trainingPermissions": true
}

Cart Document (globalMachines)

{
  "serialNumber": "61",
  "currentDeviceLabel": "bgtrack_61",
  "loadCellTare": 6.4,
  "loadCellScale": 24.5,
  "commissionComplete": false,
  "ipAddress": "",
  "macAddress": "",
  "programVersion": "0.0.1"
}

Key Tabs and Features

1. Home Tab

Centered PIN pad for login

Stats panel: today, this week, last week, month, year

Leaderboard: weekly reset, top contributors

2. Tracking Sequence

Validate user PIN (CODE field)

Capture weight, image, and feed type

Store data locally with sync flags

Upload when internet is live

3. Users Tab

Add/Edit users with mock onboarding sequence

CODE entry: must be unique and not common patterns

CODE hidden by default, revealed on tap

No deletions; users marked inactive and CODE removed

4. Setup Tab

Select cart via serial number from globalCarts

Load values like tare, scaling, and deviceLabel

Tare button, scaling value editor

Live webcam preview

Write commissionComplete: true on finish to both globalCarts and globalMachines

Service-only password protected mode for re-entry

5. Audit Tab

SiteChampions access only (PIN entry)

View and toggle feedType status (active/inactive)

Add new feedTypes locally

6. Settings Tab

Dark mode toggle

Screen timeout and waking hours (e.g., 6am–11pm)

Connection status (internet, DB)

MAC/IP address display for network setup

No access restrictions

Multilingual Support

LANGUAGE field in user document sets UI language

Initial support: Spanish, Portuguese, Vietnamese, Arabic, French

Design prioritizes pictorial, intuitive UX

Easy translation updates for new languages

Offline Mode and Sync

Full frontend works offline

Sync only when internet is available

Sync flags in each feed document:

syncStatus: pending, uploaded, error

imageStatus: pending, uploaded, error

Avoids deletions or overwriting global DBs

Image Storage & Cleanup

Images saved locally first

Uploaded to S3

Local images retained for 30 days

Cleanup script checks timestamps and deletes expired files

Kiosk Mode & Deployment

Running as Electron app in kiosk mode

Fullscreen, restricted OS access

Electron will manage automatic app updates

Docker optional for isolated deployment

Future management strategy needed for:

Software versioning

Logging

System diagnostics

Remote updates at scale

Open Items / TBD

Final decision on Docker vs bare install

Central dashboard for managing devices and logs

Hardware provisioning automation

Offline-to-cloud data reconciliation tooling

Brand & UI Guidelines

Base color: white

Highlights: muted greens

Alerts: orange

Branding: HubTrack by BioGreen360

UI should allow for future white-labeling