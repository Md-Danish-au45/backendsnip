import admin from 'firebase-admin';

// let serviceAccount;
// try {
//   serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
// } catch (e) {
//   console.error('Invalid or missing FIREBASE_SERVICE_ACCOUNT env var', e);
//   process.exit(1);
// }

// Ensure projectId is set
// const projectId =
//   serviceAccount.project_id ||
//   process.env.GOOGLE_CLOUD_PROJECT ||
//   process.env.FIREBASE_PROJECT_ID;

// if (!projectId) {
//   console.error('No projectId found in serviceAccount or environment');
//   process.exit(1);
// }

// Initialize the SDK
// if (!admin.apps.length) {
//   admin.initializeApp({
//     credential: admin.credential.cert({
//       ...serviceAccount,
//       projectId,               // explicitly include it here
//     }),
//     projectId,                 // also set at root
//     // databaseURL: `https://${projectId}.firebaseio.com`,
//   });
// }
try {
  if (!admin.apps.length) {
    admin.initializeApp({
      // The SDK automatically finds the credentials from the environment variable.
    });
  }
} catch (error) {
  console.error('Firebase Admin Initialization Error:', error);
}
/**
 * Verifies a Firebase ID token.
 * @param {string} token The Firebase ID token to verify.
 * @returns {Promise<admin.auth.DecodedIdToken|null>} The decoded token payload if valid, otherwise null.
 */
export const verifyFirebaseToken = async (token) => {
  if (!token) {
    return null;
  }
  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    
    return decodedToken;
  } catch (error) {
    console.error('Error verifying Firebase ID token:', error);
    return null;
  }
};

export default admin;
