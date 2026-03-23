import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
  CognitoUserSession,
} from 'amazon-cognito-identity-js';
import { cognitoConfig } from '../config';

const poolData = {
  UserPoolId: cognitoConfig.UserPoolId,
  ClientId: cognitoConfig.ClientId,
};

if (!poolData.UserPoolId || !poolData.ClientId) {
  console.warn(
    "Cognito User Pool ID and Client ID are not configured. Authentication will not work."
  );
}

const userPool = new CognitoUserPool(poolData);

export const getCurrentUser = (): Promise<CognitoUserSession | null> => {
  return new Promise((resolve) => {
    const cognitoUser = userPool.getCurrentUser();

    if (!cognitoUser) {
      return resolve(null);
    }

    cognitoUser.getSession((err: Error | null, session: CognitoUserSession | null) => {
      if (err) {
        console.error("Error getting session:", err);
        return resolve(null);
      }
      if (session && session.isValid()) {
        resolve(session);
      } else {
        resolve(null);
      }
    });
  });
};

export const confirmSignUp = (username: string, code: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const cognitoUser = new CognitoUser({
      Username: username,
      Pool: userPool,
    });

    cognitoUser.confirmRegistration(code, true, (err, result) => {
      if (err) {
        return reject(err);
      }
      resolve(result as string);
    });
  });
};

export const resendConfirmationCode = (username: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const cognitoUser = new CognitoUser({
      Username: username,
      Pool: userPool,
    });

    cognitoUser.resendConfirmationCode((err, result) => {
      if (err) {
        return reject(err);
      }
      resolve();
    });
  });
};


export { userPool, CognitoUser, AuthenticationDetails, CognitoUserSession };
