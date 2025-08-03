import { databases } from '@/appwrite';
import { getDeviceId } from '@/utils/getDevice';
import { scheduleMedicationNotification } from "@/utils/notifications";
import { Inter_400Regular, Inter_600SemiBold, useFonts } from "@expo-google-fonts/inter";
import { FontAwesome5, Ionicons, MaterialIcons } from '@expo/vector-icons';
import DateTimePicker from "@react-native-community/datetimepicker";
import { ID } from 'appwrite';
import React, { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from "react-native-safe-area-context";

const DATABASE_ID = process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID!;
const COLLECTION_ID = process.env.EXPO_PUBLIC_APPWRITE_COLLECTION_ID!;

export default function medication() {
    
    const [medicationName, setMedicationName] = useState('');
    const [dosageQuantity, setDosageQuantity] = useState('');
    const [dosageUnit, setDosageUnit] = useState('');
    const [time, setTime] = useState('');
    const [day, setDay] = useState('');
    const [quantity, setQuantity] = useState('');
    const [trackPage, setTrackPage] = useState(1);
    const [medicationList, setMedicationList] = useState<{ medicationName: string; dosage: string }[]>([]);
    const [show, setShow] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [fontsLoaded] = useFonts({
        Inter_400Regular,
        Inter_600SemiBold,
    });

    if (!fontsLoaded) {
        return null;
    }

    const handleNext = async () => {
        
        if(trackPage === 1) {
            if (!medicationName.trim()) {
                alert("Please Enter a Medication");
                return;
            }
            setTrackPage(2);
            return;
        }

        if(trackPage === 2) {
            if (!dosageQuantity.trim()) {
                alert("Please Enter a Dosage Quantity");
                return;
            }
            if (!dosageUnit.trim()) {
                alert("Please Enter a Unit");
                return;
            }
            setTrackPage(3);
            return;
        }
        
        if(trackPage === 3) {
            if(!time.trim()){
                alert("Please Enter a Time")
                return;
            }
            
            setTrackPage(4);
            return;
        }

        if(trackPage === 4) {
            if(!day.trim()){
                alert("Please Enter a Day")
                return;
            }
            const validDays = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday", "all"];

            if(!validDays.includes(day.toLowerCase().trim())){
                alert("Please Enter a Valid Day e.g. Monday");
                return;
            }
            
            setTrackPage(5);
            return;
        }

        if(trackPage === 5) {
            if (!quantity.trim()) {
                alert("Please Enter a Quantity");
                return;
            }
            if (isNaN(Number(quantity.trim()))) {
                alert("Ensure Your Quantity is Numeric");
                return;
            }
            const userId = await getDeviceId();
            const newMedication = {
                medicationName: medicationName.trim().charAt(0).toUpperCase() + medicationName.trim().toLowerCase().slice(1),
                dosage: dosageQuantity.trim() + dosageUnit.trim().toLowerCase(),
                time: time.trim(),
                quantity: Number(quantity),
                day: day.trim().charAt(0).toUpperCase() + day.trim().toLowerCase().slice(1),
                userId: userId,
            }
            try {
                setIsSubmitting(true);
                const documentId = ID.unique()
                await databases.createDocument(
                    DATABASE_ID,
                    COLLECTION_ID,
                    documentId,
                    newMedication
                );

                await scheduleMedicationNotification(newMedication.medicationName, newMedication.time, String(newMedication.quantity), newMedication.day, documentId)
                setMedicationList([...medicationList, newMedication]);
            }
            catch(error){
                console.error("Error saving medication:", error);
                alert("Failed to save medication. Try again later");
                return;
            }
            finally{
                setIsSubmitting(false);
            }
            setTrackPage(6);
            return;
        }

        if(trackPage === 6) {
            setTrackPage(1);
            setMedicationName('');
            setDosageQuantity('');
            setDosageUnit('');
            setTime('');
            setQuantity('');
            setDay('');
        }
    };

    const handleBack = async () => {
        setTrackPage(trackPage - 1);
    }

    const onChange = (_event: any, selectedDate?: Date) => {
        setShow(false);
        if(selectedDate) {
            const hours = selectedDate.getHours().toString().padStart(2, "0");
            const minutes = selectedDate.getMinutes().toString().padStart(2, "0");
            setTime(`${hours}:${minutes}`);
        }
    }

    const getStepIcon = () => {
        const iconProps = { size: 24, color: '#FFFFFF' };
        switch(trackPage) {
            case 1: return <FontAwesome5 name="pills" {...iconProps} />;
            case 2: return <Ionicons name="eyedrop-outline" {...iconProps} />;
            case 3: return <Ionicons name="time-outline" {...iconProps} />;
            case 4: return <Ionicons name="calendar-outline" {...iconProps} />;
            case 5: return <MaterialIcons name="content-copy" {...iconProps} />;
            case 6: return <Ionicons name="checkmark-circle-outline" {...iconProps} />;
            default: return <FontAwesome5 name="pills" {...iconProps} />;
        }
    };

    const getStepTitle = () => {
        switch(trackPage) {
            case 1: return "Medication Name";
            case 2: return "Dosage";
            case 3: return "Time";
            case 4: return "Schedule";
            case 5: return "Quantity";
            case 6: return "Success";
            default: return "Add Medication";
        }
    };

    if (isSubmitting) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingContainer}>
                    <View style={styles.loadingCard}>
                        <ActivityIndicator size="large" color="#6366F1" />
                        <Text style={styles.loadingText}>Adding Medication...</Text>
                    </View>
                </View>
            </SafeAreaView>
        );
    }

    
    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView 
                style={styles.keyboardAvoidingView}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
            >
                <ScrollView 
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    {/* Progress Bar */}
                    <View style={styles.progressContainer}>
                        <View style={styles.progressBar}>
                            <View style={[styles.progressFill, { width: `${(trackPage / 6) * 100}%` }]} />
                        </View>
                        <Text style={styles.progressText}>Step {trackPage} of 6</Text>
                    </View>

                    {/* Header */}
                    <View style={styles.header}>
                        <View style={styles.iconContainer}>
                            {getStepIcon()}
                        </View>
                        <Text style={styles.title}>Add Medication</Text>
                        <Text style={styles.stepTitle}>{getStepTitle()}</Text>
                    </View>

                    {/* Content Card */}
                    <View style={styles.contentCard}>
                        {trackPage === 1 && (
                            <View style={styles.stepContent}>
                                <Text style={styles.label}>What Medication Would You Like to Add?</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="e.g. Ibuprofen"
                                    placeholderTextColor="#94A3B8"
                                    value={medicationName}
                                    onChangeText={setMedicationName}
                                />
                            </View>
                        )}

                        {trackPage === 2 && (
                            <View style={styles.stepContent}>
                                <Text style={styles.label}>What Dosage Should The Medication Require?</Text>
                                <View style={styles.dosageContainer}>
                                    <TextInput
                                        style={[styles.input, styles.dosageInput]}
                                        placeholder="100"
                                        placeholderTextColor="#94A3B8"
                                        value={dosageQuantity}
                                        onChangeText={setDosageQuantity}
                                        keyboardType='numeric'
                                    />
                                    <TextInput
                                        style={[styles.input, styles.unitInput]}
                                        placeholder="mg"
                                        placeholderTextColor="#94A3B8"
                                        value={dosageUnit}
                                        onChangeText={setDosageUnit}
                                        autoCapitalize="none"
                                    />
                                </View>
                                <TouchableOpacity onPress={() => {setDosageQuantity("0"), setDosageUnit("mg")}}>
                                    <Text style={[styles.helperText, styles.input, {color: "#94A3B8", padding: 8}]}>
                                        No Dosage
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        {trackPage === 3 && (
                            <View style={styles.stepContent}>
                                <Text style={styles.label}>What Time Should You Take This Medication?</Text>
                                <TouchableOpacity 
                                    style={styles.timeButton}
                                    onPress={() => setShow(true)}
                                    activeOpacity={0.7}
                                >
                                    <Ionicons name="time-outline" size={20} color="#6366F1" />
                                    <Text style={styles.timeButtonText}>
                                        {time ? `Selected: ${time}` : "Select Time"}
                                    </Text>
                                </TouchableOpacity>

                                {show && (
                                    <DateTimePicker
                                        mode="time"
                                        value={new Date()}
                                        display={Platform.OS === "ios" ? "spinner" : "default"}
                                        onChange={onChange}
                                    />
                                )}
                            </View>
                        )}

                        {trackPage === 4 && (
                            <View style={styles.stepContent}>
                                <Text style={styles.label}>What Day Would You Like to Take This?</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="e.g. Monday or All"
                                    placeholderTextColor="#94A3B8"
                                    value={day}
                                    onChangeText={setDay}
                                />
                                <Text style={styles.helperText}>
                                    Enter a specific day (Monday, Tuesday, etc.) or "All" for daily
                                </Text>
                            </View>
                        )}

                        {trackPage === 5 && (
                            <View style={styles.stepContent}>
                                <Text style={styles.label}>How Many Quantities do You Hold?</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="e.g. 30"
                                    placeholderTextColor="#94A3B8"
                                    value={quantity}
                                    onChangeText={setQuantity}
                                    keyboardType='numeric'
                                />
                                <Text style={styles.helperText}>
                                    Total number of pills/doses available
                                </Text>
                            </View>
                        )}

                        {trackPage === 6 && (
                            <View style={styles.stepContent}>
                                <View style={styles.successContainer}>
                                    <View style={styles.successIcon}>
                                        <Ionicons name="checkmark-circle" size={64} color="#10B981" />
                                    </View>
                                    <Text style={styles.successTitle}>Medication Added!</Text>
                                    <Text style={styles.successMessage}>
                                        Your medication has been successfully scheduled
                                    </Text>
                                </View>
                            </View>
                        )}
                    </View>
                </ScrollView>

                {/* Action Buttons */}
                <View style={styles.actionContainer}>
                    {trackPage > 1 && trackPage < 6 && (
                        <TouchableOpacity 
                            style={styles.backButton}
                            onPress={handleBack}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="arrow-back" size={20} color="#64748B" />
                            <Text style={styles.backButtonText}>Back</Text>
                        </TouchableOpacity>
                    )}
                    
                    <TouchableOpacity 
                        style={[styles.nextButton, trackPage > 1 && trackPage < 6 && styles.nextButtonWithBack]}
                        onPress={handleNext}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.nextButtonText}>
                            {trackPage === 5 ? "Add Medication" : 
                             trackPage === 6 ? "Add Another" : "Next"}
                        </Text>
                        {trackPage < 6 && <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />}
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    )
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    keyboardAvoidingView: {
        flex: 1,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
    },
    progressContainer: {
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 10,
    },
    progressBar: {
        height: 4,
        backgroundColor: '#E2E8F0',
        borderRadius: 2,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#6366F1',
        borderRadius: 2,
    },
    progressText: {
        fontSize: 12,
        fontFamily: "Inter_400Regular",
        color: '#64748B',
        textAlign: 'center',
        marginTop: 8,
    },
    header: {
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 24,
    },
    iconContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#6366F1',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    title: {
        fontSize: 28,
        fontFamily: "Inter_600SemiBold",
        color: '#1E293B',
        marginBottom: 4,
    },
    stepTitle: {
        fontSize: 16,
        fontFamily: "Inter_400Regular",
        color: '#64748B',
    },
    contentCard: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        marginHorizontal: 20,
        marginBottom: 20,
        borderRadius: 16,
        paddingHorizontal: 24,
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
        minHeight: 200,
    },
    stepContent: {
        flex: 1,
        justifyContent: 'center',
    },
    label: {
        fontSize: 20,
        fontFamily: "Inter_600SemiBold",
        color: '#1E293B',
        textAlign: 'center',
        marginBottom: 12,
        lineHeight: 28,
    },
    input: {
        borderWidth: 2,
        borderColor: "#E2E8F0",
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        fontFamily: "Inter_400Regular",
        backgroundColor: '#FFFFFF',
        color: '#1E293B',
    },
    dosageContainer: {
        flexDirection: 'row',
        gap: 12,
    },
    dosageInput: {
        flex: 2,
    },
    unitInput: {
        flex: 1,
    },
    timeButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F8FAFC',
        borderWidth: 2,
        borderColor: '#E2E8F0',
        borderRadius: 12,
        padding: 16,
        gap: 12,
    },
    timeButtonText: {
        fontSize: 16,
        fontFamily: "Inter_600SemiBold",
        color: '#1E293B',
    },
    helperText: {
        fontSize: 14,
        fontFamily: "Inter_400Regular",
        color: '#64748B',
        textAlign: 'center',
        marginTop: 12,
        lineHeight: 20,
    },
    successContainer: {
        alignItems: 'center',
    },
    successIcon: {
        marginBottom: 24,
    },
    successTitle: {
        fontSize: 24,
        fontFamily: "Inter_600SemiBold",
        color: '#1E293B',
        marginBottom: 12,
        textAlign: 'center',
    },
    successMessage: {
        fontSize: 16,
        fontFamily: "Inter_400Regular",
        color: '#64748B',
        textAlign: 'center',
        lineHeight: 24,
    },
    actionContainer: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        paddingVertical: 20,
        gap: 12,
        backgroundColor: '#F8FAFC',
    },
    backButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F8FAFC',
        borderWidth: 2,
        borderColor: '#E2E8F0',
        borderRadius: 12,
        paddingVertical: 16,
        paddingHorizontal: 24,
        gap: 8,
        flex: 1,
    },
    backButtonText: {
        fontSize: 16,
        fontFamily: "Inter_600SemiBold",
        color: '#64748B',
    },
    nextButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#6366F1',
        borderRadius: 12,
        paddingVertical: 16,
        paddingHorizontal: 24,
        gap: 8,
        flex: 1,
    },
    nextButtonWithBack: {
        flex: 2,
    },
    nextButtonText: {
        fontSize: 16,
        fontFamily: "Inter_600SemiBold",
        color: '#FFFFFF',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    loadingCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 40,
        alignItems: 'center',
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
    loadingText: {
        fontSize: 18,
        fontFamily: "Inter_600SemiBold",
        color: '#1E293B',
        marginTop: 16,
    },
});