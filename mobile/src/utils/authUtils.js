/**
 * Authentication and role utility functions for mobile client.
 */

/**
 * Checks whether the given user object has the Dentist role.
 * Supports various role representations:
 * - user.roles: string[] (e.g. ['dentist', 'patient'])
 * - user.role: string (e.g. 'dentist')
 *
 * @param {Object|null|undefined} user
 * @returns {boolean}
 */
export const isDentistUser = (user) => {
  if (!user || typeof user !== 'object') {
    return false;
  }

  if (Array.isArray(user.roles)) {
    return user.roles.some(
      (role) => typeof role === 'string' && role.toLowerCase() === 'dentist'
    );
  }

  if (typeof user.role === 'string') {
    return user.role.toLowerCase() === 'dentist';
  }

  return false;
};

/**
 * Returns the primary role of a user ('dentist' | 'patient' | 'guest').
 *
 * @param {Object|null|undefined} user
 * @returns {'dentist' | 'patient' | 'guest'}
 */
export const getPrimaryRole = (user) => {
  if (!user || typeof user !== 'object') {
    return 'guest';
  }

  if (isDentistUser(user)) {
    return 'dentist';
  }

  return 'patient';
};
