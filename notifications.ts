import { databases } from '@/appwrite';
import * as Notifications from "expo-notifications";
const DATABASE_ID = process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID!;
const COLLECTION_ID = process.env.EXPO_PUBLIC_APPWRITE_COLLECTION_ID!;

Notifications.requestPermissionsAsync().then((status) => {
  if (status.status !== "granted") {
    console.warn("🚫 Notification permissions not granted!");
  }
});

// Configure how notifications are handled when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true, // Allows for notification to be shown
    shouldPlaySound: true, // Enables sound even in the foreground
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
})

Notifications.setNotificationCategoryAsync("medicationsReminder", [
    {
        identifier: "TAKEN",
        buttonTitle: "Taken 💊",
        options: {
            opensAppToForeground: false,
        },
    },
    {
        identifier: "SNOOZE",
        buttonTitle: "Snooze ⏰",
        options: {
            opensAppToForeground: true,
        }
    },
    {
        identifier: "SKIP",
        buttonTitle: "Skip ❌",
        options: {
            opensAppToForeground: false,
        }
    }
]);

export async function scheduleMedicationNotification(medicationName: string, time: string, quantity: string, day: string, medicationId: string) {
  // Parse the time (assuming format like "08:00")
  const [hours, minutes] = time.split(":").map(Number)
  let dayOfTheWeek : number[];
  
  switch(day.toLowerCase()){
    case "sunday" : dayOfTheWeek = [1]; break;
    case "monday" : dayOfTheWeek = [2]; break;
    case "tuesday" : dayOfTheWeek = [3]; break;
    case "wednesday" : dayOfTheWeek = [4]; break;
    case "thursday" : dayOfTheWeek = [5]; break;
    case "friday" : dayOfTheWeek = [6]; break;
    case "saturday" : dayOfTheWeek = [7]; break;
    case "all" : dayOfTheWeek = [1, 2, 3, 4, 5, 6, 7]; break;
    default : dayOfTheWeek = [1, 2, 3, 4, 5, 6, 7]; break;
  }

  for(const day of dayOfTheWeek){
    await Notifications.scheduleNotificationAsync({
        content: {
        title: `Medication Reminder 💊`,
        subtitle: `(Scheduled at ${time})`,
        body: `Time to take your ${medicationName}`,
        sound: "default",
        priority: Notifications.AndroidNotificationPriority.MAX,
        categoryIdentifier: "medicationsReminder", // Do not change to medicationReminder due to UI glitch
        data: {
            medicationId,
            medicationName,
            quantity,
            day,
            time
        }
        },
        trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday: day,
        hour: hours,
        minute: minutes,
        } as const,
        identifier: `medication-${medicationId}-day-${day}`,
    })

    // Schedule missed-dose notification 30 minutes later
    const missedHour = (hours + Math.floor((minutes + 5) / 60)) % 24;
    const missedMinute = (minutes + 5) % 60;

    await Notifications.scheduleNotificationAsync({
        content: {
        title: `Missed Your Dose? 💊`,
        subtitle: `(Scheduled at ${time})`,
        body: `Did you forget to take your ${medicationName}?`,
        sound: "default",
        priority: Notifications.AndroidNotificationPriority.MAX,
        categoryIdentifier: "medicationsReminder",
        data: {
            medicationId,
            medicationName,
            quantity,
            day,
            time
        }
        },
        trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday: day,
        hour: missedHour,
        minute: missedMinute,
        } as const,
        identifier: `missed-${medicationId}-day-${day}`,
    })
  }
}

// LISTEN FOR NOTIFICATIONS

Notifications.addNotificationResponseReceivedListener(async (response) => {
  const actionId = response.actionIdentifier;
  const data = response.notification.request.content.data;

  switch (actionId) {
    case "TAKEN":
        await handleTaken(data);
        break;
    case "SNOOZE":
        await handleSnooze(data);
        break;
    case "SKIP":
        await handleSkip(data);
        break;
    default:
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `Please choose an action 💊`,
          body: `Tap "Taken", "Snooze", or "Skip" to respond.`,
          categoryIdentifier: "medicationsReminder",
          sound: "default",
          priority: Notifications.AndroidNotificationPriority.MAX,
          data,
        },
        trigger: null, // immediate
        identifier: `choose-action-${data.medicationId}-day-${data.day}`
      });
  }
});

export async function handleTaken(data: any){
    try{
        await Notifications.dismissNotificationAsync(`medication-${data.medicationId}-day-${data.day}`);
        await Notifications.dismissNotificationAsync(`snoozed-${data.medicationId}-day-${data.day}`);
        await Notifications.dismissNotificationAsync(`missed-${data.medicationId}-day-${data.day}`);
        await Notifications.cancelScheduledNotificationAsync(`missed-${data.medicationId}-day-${data.day}`);
        await Notifications.dismissNotificationAsync(`choose-action-${data.medicationId}-day-${data.day}`);
        
        const newQuantity = Number(data.quantity) - 1
        
        await databases.updateDocument(
            DATABASE_ID,
            COLLECTION_ID,
            data.medicationId,
            {quantity: newQuantity}
        )

        if(newQuantity > 0 && newQuantity <= 5) {
            await Notifications.scheduleNotificationAsync({
            content: {
                title: `URGENT: You are Low on ${data.medicationName} ⚠️`,
                body: `You only have ${newQuantity} doses left`,
                sound: "default",
                priority: Notifications.AndroidNotificationPriority.MAX,
            },
            trigger: null, // Triggers immediately
            });
        }
        if(newQuantity === 0) {
            await Notifications.scheduleNotificationAsync({
            content: {
                title: `URGENT: You have No ${data.medicationName} ⚠️`,
                body: `You need to refill on ${data.medicationName}`,
                sound: "default",
                priority: Notifications.AndroidNotificationPriority.MAX,
            },
            trigger: null, // Triggers immediately
            });
        }
    }
    catch(error){
        console.warn(error);
    }
}

export async function handleSnooze(data: any) {
  try {
    await Notifications.dismissNotificationAsync(`medication-${data.medicationId}-day-${data.day}`);
    await Notifications.dismissNotificationAsync(`snoozed-${data.medicationId}-day-${data.day}`);
    await Notifications.cancelScheduledNotificationAsync(`missed-${data.medicationId}-day-${data.day}`);
    await Notifications.dismissNotificationAsync(`choose-action-${data.medicationId}-day-${data.day}`);

    // Optional: Immediate heads-up "snoozed" alert
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `Reminder Snoozed for 5 Minutes 💊`,
        body: `Ensure you take your ${data.medicationName}`,
        sound: "default",
        priority: Notifications.AndroidNotificationPriority.MAX,
      },
      trigger: null, // Triggers immediately
    });

    // Now schedule the actual snoozed notification, with full metadata + category
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `Snoozed Reminder 💊`,
        subtitle: `(Rescheduled from ${data.time})`,
        body: `Time to take your ${data.medicationName}`,
        sound: "default",
        priority: Notifications.AndroidNotificationPriority.MAX,
        categoryIdentifier: "medicationsReminder", // <- This makes the buttons work again!
        data: {
          ...data, // carries over everything, including medicationId, name, time, etc.
        },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 300, // 5 minutes
      },
      identifier: `snoozed-${data.medicationId}-day-${data.day}`
    });

    console.log(`🔁 Snoozed ${data.medicationName} for 5 minutes`);
  } catch (error) {
    console.warn("❌ Failed to schedule snoozed notification:", error);
  }
}

export async function handleSkip(data : any){
    try{
        await Notifications.dismissNotificationAsync(`medication-${data.medicationId}-day-${data.day}`);
        await Notifications.cancelScheduledNotificationAsync(`missed-${data.medicationId}-day-${data.day}`);
        await Notifications.dismissNotificationAsync(`snoozed-${data.medicationId}-day-${data.day}`);
        await Notifications.dismissNotificationAsync(`choose-action-${data.medicationId}-day-${data.day}`);
    }
    catch(error){
        console.warn(error);
    }
}

export async function cancelMedicationNotification(medicationId: string) {
  // Cancel all 7 possible day-based notifications
  const dayIds = [1, 2, 3, 4, 5, 6, 7].map(
    (day) => `medication-${medicationId}-day-${day}`
  );
  const missedIds = [1, 2, 3, 4, 5, 6, 7].map(
    (day) => `missed-${medicationId}-day-${day}`
  );
  const snoozedIds = [1, 2, 3, 4, 5, 6, 7].map(
    (day) => `snoozed-${medicationId}-day-${day}`
  );

  for (const id of dayIds) {
    try {
      await Notifications.cancelScheduledNotificationAsync(id);
      console.log(`✅ Cancelled notification: ${id}`);
    } catch (e) {
      console.warn(`⚠️ Failed to cancel notification ${id}`, e);
    }
  }

  for (const id of missedIds) {
    try {
      await Notifications.cancelScheduledNotificationAsync(id);
      console.log(`✅ Cancelled notification: ${id}`);
    } catch (e) {
      console.warn(`⚠️ Failed to cancel notification ${id}`, e);
    }
  }

  for (const id of snoozedIds) {
    try {
      await Notifications.cancelScheduledNotificationAsync(id);
      console.log(`✅ Cancelled notification: ${id}`);
    } catch (e) {
      console.warn(`⚠️ Failed to cancel notification ${id}`, e);
    }
  }
}


