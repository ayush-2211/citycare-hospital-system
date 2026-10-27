# Running the React Native app on the Android emulator

The mobile app is the **patient** app: log in or register, book appointments, view appointments, prescriptions and notifications, edit the profile. Doctors and the admin office use the web portal (the app tells them so if they try to log in).

## One-time setup
1. Install **Android Studio** (developer.android.com/studio). During setup keep "Android Virtual Device" ticked.
2. Open Android Studio, then **More Actions > Virtual Device Manager > Create device**. Choose a Pixel phone and a recent system image, finish, and press the play button to start the emulator. Wait until the home screen appears.
3. Make sure Node.js is installed (`node -v`).

## Create the Expo project and add the app code
Run in PowerShell from the project root (the folder that contains `client`, `server` and `mobile`):

```powershell
Rename-Item mobile mobile-source
npx create-expo-app@latest mobile --template blank
Copy-Item mobile-source\src mobile\src -Recurse
Copy-Item mobile-source\App.js mobile\App.js -Force
Remove-Item mobile-source -Recurse -Force
```

`create-expo-app` installs the newest compatible versions of React Native and Expo, and the commands copy the app's own files on top. If the new project also contains an `App.tsx`, delete it.

## Start everything
1. The API must be running: `cd server`, `npm run dev` (it prints `API running on http://localhost:5000`).
2. Start the mobile app:
```powershell
cd mobile
npx expo start
```
3. With the emulator already running, press **a** in that terminal. Expo opens the app on the emulator (the first time it installs Expo Go automatically; this can take a few minutes).
4. Log in as `ayush@citycare.in` / `Patient@123`.

## How the app finds the API
`mobile/src/config.js` points the Android emulator at `http://10.0.2.2:5000/api`. On the emulator, `10.0.2.2` means "the PC the emulator runs on", so `localhost:5000` of your PC is reached that way.
To use a real phone on the same Wi-Fi instead, change the URL to your PC's IP address (for example `http://192.168.1.5:5000/api`) and allow port 5000 in Windows Firewall.

## Common problems
- **"Cannot reach the server"**: the API is not running, MySQL is down, or the URL in `src/config.js` is wrong.
- **Emulator not detected when pressing `a`**: start the emulator first and wait for its home screen; if it still fails, open `adb devices` in a terminal and check that the emulator is listed.
- **Changes not showing**: press `r` in the Expo terminal to reload.
