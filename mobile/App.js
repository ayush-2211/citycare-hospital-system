import React from 'react';
import { StatusBar, View } from 'react-native';
import { AuthProvider, useAuth } from './src/AuthContext';
import AuthScreen from './src/screens/AuthScreen';
import Main from './src/Main';

// Shows the login screen until a patient is signed in, then the main app
function Root() {
  const { user } = useAuth();
  return <View style={{ flex: 1 }}>{user ? <Main /> : <AuthScreen />}</View>;
}

export default function App() {
  return (
    <AuthProvider>
      <StatusBar barStyle="dark-content" />
      <Root />
    </AuthProvider>
  );
}
