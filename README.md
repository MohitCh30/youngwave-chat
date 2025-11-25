# YoungWave Chat App

### A real time, Firebase powered chat platform built using HTML, CSS and Vanilla JavaScript. Designed as a clean, modern and fast community chatroom system for Gen Z users. The app supports text messages, image uploads, reactions, room based permissions, anonymous users, and a full room admin panel.

### Live Demo: https://young-wave-0904.web.app/

## Features
Real Time Chat

Messages update instantly using Firebase Firestore listeners. Supports:

Text messages

Images

Edit and delete actions

Message reactions

## Room Based System

Users can create unique rooms with:

Custom room rules

Role assignment (owner, moderator, member, guest)

Guest join requests with approval and rejection

Kick and ban actions

## User Roles and Permissions

Owners can delete rooms, promote or demote moderators, kick and ban members

Moderators can delete messages of members or guests

Members can chat normally

Guests must request access unless approved

## Presence Indicators

Firebase Realtime Database tracks:

Online and offline status

Automatic offline update on disconnect

## Direct Messaging (DM)

Private one on one chat channel created automatically between two authenticated users.

## Image Uploads

Uses Firebase Storage for image messages with previews before sending.

## Room Rules Renderer

Room rules stored in Firestore are rendered as a clean ordered list for better readability.

## Disclaimer Popup

A mandatory user agreement modal appears on login. Acceptance is stored locally. Disagreeing logs the user out.

## Modern UI

Custom gradient background, rounded cards, clean spacing and a simple sidebar menu system.

## Tech Stack

### Frontend

HTML

CSS

Vanilla JavaScript

### Firebase Services

Firebase Authentication (Google + Anonymous)

Firestore Database

Firebase Storage

Realtime Database (presence)

Firebase Hosting

## Hosting

The entire project is deployed on Firebase Hosting with a fast global CDN. No backend server is required. All real time logic is handled through Firebase.

## Screenshots

<img width="1920" height="864" alt="Screenshot (843)" src="https://github.com/user-attachments/assets/d6abe339-16bc-4f40-8bc9-7ee82408807d" />

<img width="1767" height="875" alt="Screenshot (844)" src="https://github.com/user-attachments/assets/a62ea9cc-c584-48ed-83fb-5b4def878801" />

<img width="1507" height="850" alt="Screenshot (845)" src="https://github.com/user-attachments/assets/2d83ae21-3d7f-445e-afde-5ab2fb20ddf9" />


## How It Works With Firebase

### Authentication

The app uses Google Auth Provider and Anonymous Auth. Auth state is tracked in real time using onAuthStateChanged.

### Firestore

Used for:

Rooms collection

Messages subcollections

Members with roles and bans

Join requests

Typing indicators

Reactions

Firestore listeners like onSnapshot make all chat events instant.

### Realtime Database

Used only for presence:

Stores online or offline status

Updated automatically with onDisconnect

### Storage

Used to upload and retrieve images with file preview.

### Hosting

The site is deployed using Firebase Hosting:

firebase deploy

## Local Setup 

### Clone the repository
git clone https://github.com/MohitCh30/youngwave-chat.git
cd youngwave-chat

### Install Firebase CLI
npm install -g firebase-tools

### Run local server
firebase serve

### Deploy
firebase deploy

## What I Learned

Designing real time chat logic using Firestore listeners

Implementing role based access systems

Handling image uploads and previews

Structuring chatrooms and direct messages

UI improvements and responsive layout decisions

Using Firebase Hosting for fast deployment

Fixing race conditions in permissions and rule rendering

Creating a working full stack style project without a Node backend

## Future Improvements

Typing indicator for DMs

Better mobile responsiveness

Improved admin dashboard UI

Dark and light themes

Read receipts

A proper backend with Node and Express for advanced features
