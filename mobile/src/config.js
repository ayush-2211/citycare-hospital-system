import { Platform } from 'react-native';

// Where the Express API runs.
//  - Android emulator: the emulator reaches your PC as 10.0.2.2
//  - iOS simulator / web: localhost works
//  - A real phone on the same Wi-Fi: use your PC's IP address, for example http://192.168.1.5:5000/api
export const API_URL = Platform.OS === 'android' ? 'http://10.0.2.2:5000/api' : 'http://localhost:5000/api';
