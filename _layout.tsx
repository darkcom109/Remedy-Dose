import "@/utils/notifications";
import { Inter_400Regular, useFonts } from "@expo-google-fonts/inter";
import { FontAwesome5, Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import React from 'react';
import { SafeAreaProvider } from "react-native-safe-area-context";

export default function _layout() {
  
    const [fontsLoaded] = useFonts({
        Inter_400Regular,
      })
    
      if (!fontsLoaded){
        return null;
      }

    return (
    <SafeAreaProvider style={{flex: 1}}>
        <Tabs screenOptions={{headerShown: false,
                              tabBarActiveTintColor: "red",
                              tabBarLabelStyle: {fontFamily: "Inter_400Regular"}
        }}>
            <Tabs.Screen name="index" 
                         options={{tabBarLabel: "Home", tabBarIcon: ({ color, size }) => (<Ionicons name="home" size={size} color={color}/>)}}/>
            <Tabs.Screen name="medication"
                         options={{tabBarLabel: "Add Medication", tabBarIcon: ({color, size}) => (<Ionicons name="medkit-outline" size={size} color={color}/>)}}/>
            <Tabs.Screen name="medichat" 
                         options={{tabBarLabel: "MediChat", tabBarIcon: ({color, size}) => (<FontAwesome5 name="robot" size={size} color={color}/>)}}/>
        </Tabs>
    </SafeAreaProvider>
  )
}