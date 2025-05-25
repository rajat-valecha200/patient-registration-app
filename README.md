# Patient Registration App

A lightweight client-side application to register, manage, and query patient data using **React** and **PGlite** (SQLite in the browser with IndexedDB). It includes multi-tab synchronization using `BroadcastChannel` and `localStorage`.

---

## Features

* Register new patients with details like name, age, gender, contact, and address.
* Store data locally in the browser using PGlite (persistent IndexedDB).
* View all registered patients in a sortable table.
* SQL query interface for running custom read queries.
* Sync data across multiple tabs using BroadcastChannel and localStorage.
* Error and loading states handled gracefully.

---

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/rajat-valecha200/patient-registration-app.git
cd patient-registration-app
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Start the Development Server

```bash
npm start
```


## Project Structure

```
/public
  └── pglite.wasm         

/src
  ├── App.js              
  └── Styles.css          
```
