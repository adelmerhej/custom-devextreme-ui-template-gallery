/* eslint-disable @typescript-eslint/no-unused-vars */

import { defaultUser } from '../utils/default-user';

export async function signIn(email: string, password: string) {
  try {

    const response = await fetch('http://192.168.88.14:5055/api/v1/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Login failed');
    }

    const token = data.token;

    // Send request
    return {
      isOk: true,
      data: { ...defaultUser, email, token },
    };
  } catch {
    return {
      isOk: false,
      message: 'Authentication failed',
    };
  }
}
export async function signOut() {
  try {
    // Send request
    return {
      isOk: true,
    };
  } catch {
    return {
      isOk: false,
      message: 'Failed to sign out',
    };
  }
}

export async function getUser() {
  try {
    // Send request

    return {
      isOk: true,
      data: defaultUser,
    };
  } catch {
    return {
      isOk: false,
    };
  }
}

export async function createAccount(email: string, password: string) {
  try {
    // Send request
    return {
      isOk: true,
    };
  } catch {
    return {
      isOk: false,
      message: 'Failed to create account',
    };
  }
}

export async function changePassword(email: string, recoveryCode?: string) {
  try {
    // Send request
    return {
      isOk: true,
      data: { email },
    };
  } catch {
    return {
      isOk: false,
      message: 'Failed to change password',
    };
  }
}

export async function resetPassword(email: string) {
  try {
    // Send request
    return {
      isOk: true,
    };
  } catch {
    return {
      isOk: false,
      message: 'Failed to reset password',
    };
  }
}
