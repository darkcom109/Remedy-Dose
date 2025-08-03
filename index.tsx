import { databases, Query } from '@/appwrite';
import { getDeviceId } from '@/utils/getDevice';
import { cancelMedicationNotification } from '@/utils/notifications';
import { Inter_400Regular, Inter_600SemiBold, useFonts } from "@expo-google-fonts/inter";
import { FontAwesome5, Ionicons, MaterialIcons } from '@expo/vector-icons';
import type { Models } from "appwrite";
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const DATABASE_ID = process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID!;
const COLLECTION_ID = process.env.EXPO_PUBLIC_APPWRITE_COLLECTION_ID!;

export default function index() {
  const [medications, setMedications] = useState<Models.Document[]>([]);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedMedication, setSelectedMedication] = useState<Models.Document | null>(null);

  const fetchMedications = async() => {
    try{
      const deviceId = await getDeviceId();
      const response = await databases.listDocuments(DATABASE_ID, COLLECTION_ID, [Query.equal("userId", deviceId)]);
      return response.documents;
    }
    catch(error){
      console.error("Error fetching medications", error);
      return [];
    }
  }

  useFocusEffect(
    useCallback(
      () => {
      const loadMeds = async() => {
        const meds = await fetchMedications();
        setMedications(meds);
    };

    loadMeds();
    }, [])
  );

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
  })

  if (!fontsLoaded){
    return null;
  }

  // NEED TO MODIFY FOR PUSH NOTIFICATIONS (POSSIBLY)
  
  const deleteMedication = async (documentId: string) => {
    Alert.alert(
      "Delete Medication",
      "Are you sure you want to delete this medication?",
      [
        {text: "Cancel", style:"cancel"}, 
        {text: "Delete", style: "destructive",
          onPress: async() => {
            try {
              await databases.deleteDocument(DATABASE_ID, COLLECTION_ID, documentId);
              await cancelMedicationNotification(documentId);
              setMedications((prev) => prev.filter((med) => med.$id !== documentId));
            }
            catch(error){
              console.error("Error deleting medication: ", error);
            }
          }
        }
      ], 
      {cancelable: true}
    )
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.title}>Your Medications</Text>
      </View>
      <Text style={styles.totalText}>Total Medications: {medications.length}</Text>
      
      {medications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconContainer}>
            <MaterialIcons name="medication" size={64} color="#E0E7FF" />
          </View>
          <Text style={styles.emptyTitle}>No Medications Yet</Text>
          <Text style={styles.emptySubtitle}>
            Add your first medication to get started with tracking
          </Text>
        </View>
      ) : (
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {medications.map((med, index) => (
            <View key={med.$id} style={[styles.medicationCard, {marginTop: index === 0 ? 0 : 16}]}>
              <View style={styles.cardHeader}>
                <View style={styles.medicationNameContainer}>
                  <View style={styles.pillIcon}>
                    <FontAwesome5 name="pills" size={18} color="#FFFFFF"/>
                  </View>
                  <Text style={styles.medicationName}>{med.medicationName}</Text>
                </View>

                {/* Delete button */}

                <TouchableOpacity 
                  onPress={() => deleteMedication(med.$id)}
                  style={[styles.deleteButton]}
                  activeOpacity={0.7}
                >
                  <Ionicons name="trash-outline" size={20} color="#EF4444"/>
                </TouchableOpacity>
              </View>

              <View style={styles.cardContent}>
                <View style={styles.infoRow}>
                  <View style={styles.infoItem}>
                    <View style={styles.iconContainer}>
                      <Ionicons name="eyedrop-outline" size={16} color="#6366F1"/>
                    </View>
                    <View>
                      <Text style={styles.infoLabel}>Dosage</Text>
                      { med.dosage === "0mg" ? (<Text style={styles.infoValue}>N/A</Text>): (<Text style={styles.infoValue}>{med.dosage}</Text>) }
                    </View>
                  </View>
                  <View style={styles.infoItem}>
                    <View style={styles.iconContainer}>
                      <MaterialIcons name="content-copy" size={16} color="#8B5CF6"/>
                    </View>
                    <View>
                      <Text style={styles.infoLabel}>Quantity</Text>
                      <Text style={styles.infoValue}>{med.quantity}</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.scheduleContainer}>
                  <View style={styles.scheduleItem}>
                    <View style={styles.iconContainer}>
                      <Ionicons name="calendar-outline" size={16} color="#10B981"/>
                    </View>
                    <Text style={styles.scheduleText}>
                      {med.day === "All" ? "Every day" : `Every ${med.day}`}
                    </Text>
                  </View>
                  
                  <View style={[styles.scheduleItem, {marginLeft: 30}]}>
                    <View style={styles.iconContainer}>
                      <Ionicons name="time-outline" size={16} color="#F59E0B"/>
                    </View>
                    <Text style={styles.scheduleText}>{med.time}</Text>
                  </View>
                </View>
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 25,
  },
  title: {
    fontSize: 28,
    fontFamily: "Inter_600SemiBold",
    color: '#1E293B',
    textAlign: 'center',
  },
  totalText: {
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    fontSize: 14,
    marginBottom: 10,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 24,
    fontFamily: "Inter_600SemiBold",
    color: '#1E293B',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 24,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  medicationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  medicationNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  pillIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  medicationName: {
    fontSize: 20,
    fontFamily: "Inter_600SemiBold",
    color: '#1E293B',
    flex: 1,
  },
  deleteButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardContent: {
    gap: 16,
  },
  infoRow: {
    flexDirection: 'row',
    gap: 20,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: '#64748B',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: '#1E293B',
  },
  scheduleContainer: {
    flexDirection: 'row',
    gap: 20,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  scheduleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  scheduleText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: '#475569',
  },
});