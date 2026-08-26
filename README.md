# CityCare Mobile

CityCare Mobile serves as the operational mobile application of the **CityCare – Smart Civic Issue Management Platform**. It is being designed specifically for the Unit Officers and Field Officers by enabling them with real time field operations, management of issue lifecycle, on-ground evidence submission, live location verification and SLA monitoring.

---

## About the Application
The mobile application will be acting as the operational counterpart of the CityCare web version. While all the administrative oversight and citizen reporting and issue tracking occurs across the [web version](https://github.com/sagnikdey45/CityCare---Smart-Civic-Issue-Management-Platform), CityCare Mobile mainly focuses on streamlining all the remote and on-ground workflows for the civic issue department staffs. 

The **Unit Officers** will be using the application in order to manage the administrative issue verifications, assigning and reassiging Field Officers, SLA management, escalating issues and reviewing submitted issue resolution by Field Officers. 

The **Field Officers** will be relying on the mobile device's hardware which includes the GPS location services and camera integratoins which will be helping them in navigating to the issue locations, record progress, capturing any mandatory before and after evidences and submitting the complete issue resolution work for review by the Unit Officer. 

---

## User Roles & Workflow

* **Unit Officer:-** Responsible for reviewing incoming civic complaints, verifying valid issues, rejecting invalid reports, assigning or reassigning Field Officers, monitoring SLA compliance, extending deadlines, escalating critical failures, reviewing submitted resolution work, requesting rework, approving completed resolutions and reopening issues when necessary.
* **Field Officer:-** Responsible for viewing assigned tasks, initiating work, navigating to reported issue sites, executing physical repair activities, capturing before-and-after photographic evidence, recording live GPS coordinates, attaching resolution notes, submitting work for Unit Officer verification and addressing rework requests.

---

## Key Features

* **Unit Officer Features:-** The Unit Officer can securely log into their dashboard with the mandatory password change on first login. They will be able to review and search all the reported issues of their specific department and city, apply the necessary filters, recieve important in-app notifications, verify or reject complaints, assigning or reassigning Field Officers, managaing breached SLA deadlines, handling escalations, reviewing the submitted resolution evidence by the Field Officer, requesting for rework, approving the completed issue resolution and reopening issues (if required).

* **Field Officer Features:-** The Field Officer can securely log into their dashboard with the mandatory password change on first login. They will be able to view all the assigned issues with the SLA deadline tracker, can start the work, capture the before and after evidence image using either the camera or gallery, recording live location after each before and after image update, add completed issue resolution notes, submit the completed work for Unit Officer review, recieve in-app notifications and respond to rework requests of the Unit Officer if some corrections are required. 

---

## Issue Workflow

### Primary Lifecycle
`Pending` → `Verified` → `Assigned` → `In Progress` → `Pending UO Verification` → `Resolved / Closed`

### Secondary & Exception States
* `Rejected`: Issues deemed invalid, out-of-scope, or insufficient evidence during Unit Officer verification.
* `Rework Required`: Issues sent back to the assigned Field Officer when submitted work is unsatisfactory.
* `Reopened`: Resolved issues reopened by citizens due to recurring or incomplete resolution.
* `Escalated`: Issues escalated to City/System Administrators due to SLA breach or operational blockers.
* `Withdrawn`: Issues withdrawn by the reporting citizen prior to verification.

---

## SLA and Location Verification

### SLA Monitoring

System SLA deadlines are monitored dynamically using the formula:

$$\text{Remaining SLA Time} = \text{SLA Deadline} - \text{Current Time}$$

Issues are categorized into three distinct operational states:

* **On Track:** Substantial time remaining before the SLA deadline.
* **Due Soon:** Resolution deadline approaching within 24–48 hours.
* **Overdue:** Current time has exceeded the SLA deadline, triggering breach indicators and escalation options.

### Location Verification

To ensure on-ground accountability, the application uses the Haversine distance formula to calculate the geographical separation between the citizen's reported issue coordinates $(\text{lat}_1, \text{lon}_1)$ and the Field Officer's live submission coordinates $(\text{lat}_2, \text{lon}_2)$:

$$
a = \sin^2\left(\frac{\Delta \phi}{2}\right) + \cos(\phi_1) \cdot \cos(\phi_2) \cdot \sin^2\left(\frac{\Delta \lambda}{2}\right)
$$

$$
c = 2 \cdot \mathrm{atan2}\left(\sqrt{a}, \sqrt{1-a}\right)
$$

$$
d = R \cdot c
$$

where $\phi$ is latitude in radians, $\lambda$ is longitude in radians, and $R = 6{,}371\,\mathrm{km}$.

This distance metric provides Unit Officers with empirical verification that the Field Officer was physically present at the site during work submission.

---

## Getting Started

### Prerequisites

Ensure the following tools are installed on your development machine:

* **Node.js**
* **npm**
* **Git**
* **Expo CLI**
* **Android Studio** (if running application using Android Emulator)
* **Xcode** (macOS only, if running application using iOS Simulator)

### Clone Repository

```bash
git clone https://github.com/sagnikdey45/CityCareMobile
```
```bash
cd CityCareMobile
```

### Install Dependencies

```bash
npm install
```

---

## Environment Configuration

Create a `.env.local` file in the root directory of the project and configure the required backend service endpoints:

```env
EXPO_PUBLIC_CONVEX_URL=your_convex_deployment_url
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
```

> **Note:** Sensitive deployment credentials and API keys must remain in environment configuration files and should never be committed directly to version control.

---

## Running the Application

### 1. Start Convex Backend Services

If running or syncing with local/cloud Convex backend functions:

```bash
npx convex dev
```

### 2. Start Expo Development Server

In a separate terminal window, start the Expo bundler:

```bash
npm run start
```

Alternatively, you can also run:

```bash
npx expo start
```

---

## Running on Android

1. Launch the **Android Studio**.
2. Open the **Device Manager** and start an existing **Android Virtual Device (AVD)** or create a new Android Virtual Device if not already created.
3. Start the Expo development server (using `npm run start`).
4. Press `a` in the terminal to automatically build and launch the app on the running Android emulator.

---

## Running on iOS

*(Requires macOS and Xcode)*

1. Ensure that the Xcode and the iOS Simulator components are successfully installed.
2. Start the Expo development server (using `npm run start`).
3. Press `Shift + i` in the terminal and select the preferred iPhone as per preference to open the iOS Simulator and launch the application.

---

## Physical Device Testing

To test CityCare Mobile on a physical Android or iOS device:-

1. Install the **Expo Go** application from Google Play Store or Apple App Store.
2. Make sure that your mobile device is connected to the same Wi-Fi network as your computer's.
3. Start the Expo development server (using `npm run start`).
4. Scan the QR code that is being displayed in the terminal using your device camera (iOS) or the Expo Go app (Android).

---

## Required Device Permissions

The application will be requesting the following runtime permissions during operation:-

* **Camera Permission:** Required for Field Officers to capture live before-and-after photographs of civic issues.
* **Photo Library / Storage Permission:** Required to select existing evidence photos from device storage.
* **Location Permission (GPS):** Required to capture precise location coordinates during resolution submission for Haversine verification.
