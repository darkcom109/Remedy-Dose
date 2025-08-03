import { databases } from '@/appwrite';
import { getDeviceId } from '@/utils/getDevice';
import { queryChatMessage } from '@/utils/hugChat';
import { scheduleMedicationNotification } from "@/utils/notifications";
import { Inter_400Regular, Inter_600SemiBold, useFonts } from "@expo-google-fonts/inter";
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import { ID } from 'appwrite';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from "react-native-safe-area-context";

const DATABASE_ID = process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID!;
const COLLECTION_ID = process.env.EXPO_PUBLIC_APPWRITE_COLLECTION_ID!;

export default function MediChat() {
  const [userInput, setUserInput] = useState("");
  const [messages, setMessages] = useState<Array<{text: string, isUser: boolean}>>([]);
  const [loading, setLoading] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
  });

  useEffect(() => {
    if (messages.length > 0) {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }
  }, [messages]);

  if (!fontsLoaded) {
    return null;
  }

  function isValidTimeFormat(time: string): boolean {
    const timeRegex = /^([01]?\d|2[0-3]):([0-5]\d)$/;
    return timeRegex.test(time);
  }

  const handleReminder = async () => {
    const userInputParse = userInput.split(' ');

    if (userInputParse.length < 6) {
      alert("Invalid reminder format. Use: remind [medication] [dosage] [time] [quantity] [day]");
      return;
    }

    const medicationName = userInputParse[1];
    let dosage = userInputParse[2];
    let time = userInputParse[3];
    const quantity = userInputParse[4];
    const day = userInputParse[5];

    if (isNaN(Number(quantity.trim()))) {
      alert("Invalid quantity. Please provide a number.");
      return;
    }

    if (!isValidTimeFormat(time.trim())) {
      alert("Invalid time format. Please use HH:MM (00:00 to 23:59)");
      return;
    }

    const validDays = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday", "all"];
    if(!validDays.includes(day.toLowerCase())){
      alert("Invalid Day")
      return;
    }

    let [hours, minutes] = time.split(':');
    hours = hours.toString().padStart(2, "0");
    minutes = minutes.toString().padStart(2, "0");
    time = `${hours}:${minutes}`;

    const userId = await getDeviceId();

    const newMedication = {
                medicationName: medicationName.trim().charAt(0).toUpperCase() + medicationName.trim().toLowerCase().slice(1),
                dosage: dosage.trim(),
                time: time.trim(),
                quantity: Number(quantity),
                day: day.trim().charAt(0).toUpperCase() + day.trim().toLowerCase().slice(1),
                userId: userId
            }
            try {
                const documentId = ID.unique()
                await databases.createDocument(
                    DATABASE_ID,
                    COLLECTION_ID,
                    documentId,
                    newMedication
                );

                await scheduleMedicationNotification(newMedication.medicationName, newMedication.time, String(newMedication.quantity), day, documentId)
                setMessages(prev => [...prev, {text: `Your Reminder Was Added! ⏰`, isUser: false}]);
                setUserInput("");
            }
            catch(error){
                console.error("Error saving medication:", error);
                alert("Failed to save medication. Try again later");
                return;
            }
                
  }

  const handleSend = async () => {
    setUserInput(""); // clear input after send
    if (!userInput.trim()) return;
    
    // Add user message to chat
    setMessages(prev => [...prev, {text: userInput, isUser: true}]);
    
    if (userInput.startsWith('r')) {
      setLoading(true);
      await handleReminder();
      setLoading(false);
      return
    }
    setLoading(true);
    const reply = await queryChatMessage(userInput);
    setMessages(prev => [...prev, {text: reply, isUser: false}]);
    setLoading(false);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoiding}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <Text style={styles.title}>MediChat</Text>

        <View style={styles.chatContainer}>
          <ScrollView
            ref={scrollViewRef}
            contentContainerStyle={styles.scrollViewContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {messages.length > 0 ? (
              messages.map((message, index) => (
                <View key={index} style={[
                  styles.messageBubble,
                  message.isUser ? styles.userBubble : styles.botBubble
                ]}>
                  {!message.isUser && (
                    <FontAwesome5 name="robot" size={16} color="#6366F1" style={styles.botIcon}/>
                  )}
                  <Text style={[
                    styles.messageText,
                    message.isUser ? styles.userText : styles.botText
                  ]}>
                    {message.text}
                  </Text>
                </View>
              ))
            ) : (
              <View style={styles.placeholderContainer}>
                <Text style={styles.placeholderText}>Ask MediChat Anything Medical Related...</Text>
              </View>
            )}
            
            {loading && (
              <View style={styles.loadingBubble}>
                <ActivityIndicator size="small" color="#64748B"/>
                <Text style={styles.loadingText}>Thinking...</Text>
              </View>
            )}
          </ScrollView>
        </View>

        <View style={styles.inputContainer}>
          <TextInput
            placeholder="Type your question..."
            placeholderTextColor="#94A3B8"
            value={userInput}
            onChangeText={setUserInput}
            style={styles.input}
            multiline={true}
            maxLength={500}
          />

          <TouchableOpacity 
            style={[styles.sendButton, (!userInput.trim() || loading) && styles.sendButtonDisabled]} 
            onPress={handleSend}
            disabled={!userInput.trim() || loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF"/>
            ) : (
              <Ionicons name="send" size={18} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8FAFC", // Consistent background
  },
  keyboardAvoiding: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  title: {
    fontSize: 25,
    fontFamily: "Inter_600SemiBold", // Consistent font
    color: "#1E293B", // Consistent text color
    textAlign: "center",
    marginBottom: 10,
    marginTop: 10,
  },
  chatContainer: {
    flex: 1,
    backgroundColor: "#FFFFFF", // Consistent card background
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
    borderWidth: 1, // Consistent border
    borderColor: '#F1F5F9', // Consistent border color
  },
  scrollViewContent: {
    flexGrow: 1,
    paddingBottom: 10,
  },
  messageBubble: {
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    maxWidth: '85%',
  },
  userBubble: {
    backgroundColor: "#6366F1", // Consistent primary blue
    alignSelf: "flex-end",
  },
  botBubble: {
    backgroundColor: "#F1F5F9", // Light gray for bot messages
    alignSelf: "flex-start",
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  botIcon: {
    marginRight: 8,
    marginTop: 2,
  },
  messageText: {
    fontSize: 16,
    fontFamily: "Inter_400Regular", // Consistent font
  },
  userText: {
    color: "#FFFFFF", // White text on primary blue
  },
  botText: {
    color: "#1E293B", // Dark text on light background
    flex: 1,
  },
  placeholderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 16,
    fontFamily: "Inter_400Regular", // Consistent font
    color: "#64748B", // Consistent text color
    textAlign: 'center',
    marginBottom: 5,
  },
  reminderHint: {
    fontSize: 14,
    fontFamily: "Inter_400Regular", // Consistent font
    color: '#94A3B8', // Consistent text color
    textAlign: 'center',
    marginBottom: 8,
  },
  exampleText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular", // Consistent font
    color: '#CBD5E1', // Consistent text color
    textAlign: 'center',
    fontStyle: 'italic',
  },
  loadingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: "#E2E8F0", // Consistent light gray
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    alignSelf: "flex-start",
  },
  loadingText: {
    fontSize: 16,
    fontFamily: "Inter_400Regular", // Consistent font
    color: "#64748B", // Consistent text color
    marginLeft: 8,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    backgroundColor: "#FFFFFF", // Consistent card background
    borderRadius: 12,
    padding: 10,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 20,
    borderWidth: 1, // Consistent border
    borderColor: '#F1F5F9', // Consistent border color
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontFamily: "Inter_400Regular", // Consistent font
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "#F8FAFC", // Consistent light background for input
    marginRight: 10,
    maxHeight: 100,
    color: '#1E293B', // Consistent text color
  },
  sendButton: {
    backgroundColor: "#6366F1", // Consistent primary blue
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: "#CBD5E1", // Consistent disabled color
  },
});