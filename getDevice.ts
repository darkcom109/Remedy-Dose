import * as SecureStore from 'expo-secure-store';
import uuid from 'react-native-uuid';

export async function getDeviceId() {
  let deviceId = await SecureStore.getItemAsync('deviceId');
  if (!deviceId) {
    deviceId = uuid.v4().toString(); // .toString() in case it's a UUID object
    await SecureStore.setItemAsync('deviceId', deviceId);
  }
  return deviceId;
}
