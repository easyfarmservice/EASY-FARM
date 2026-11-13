import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Colors } from '../src/constants/theme';
import { AuthProvider } from '../src/context/AuthContext';
import { CartProvider } from '../src/context/CartContext';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <CartProvider>
          <StatusBar style="light" />
          <Stack
            screenOptions={{
              headerStyle: {
                backgroundColor: Colors.primary,
              },
              headerTintColor: Colors.textOnPrimary,
              headerTitleStyle: {
                fontWeight: '800',
                fontSize: 18,
              },
              contentStyle: {
                backgroundColor: Colors.background,
              },
            }}
          >
            <Stack.Screen
              name="(tabs)"
              options={{
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="location"
              options={{
                title: 'Where should we deliver?',
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="confirm-map"
              options={{
                title: 'Confirm Delivery Location',
                headerShown: true,
                headerBackTitle: 'Back',
              }}
            />
            <Stack.Screen
              name="address-details"
              options={{
                title: 'Address Details',
                headerShown: true,
                headerBackTitle: 'Back',
              }}
            />
            <Stack.Screen
              name="checkout"
              options={{
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="order-success"
              options={{
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="auth-login"
              options={{
                headerShown: false,
              }}
            />
          </Stack>
        </CartProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
