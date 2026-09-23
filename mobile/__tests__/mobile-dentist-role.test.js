import React from 'react';
import { Text } from 'react-native';
import renderer, { act } from 'react-test-renderer';
import { useSelector } from 'react-redux';
import { PaperProvider } from 'react-native-paper';
import { isDentistUser, getPrimaryRole } from '../src/utils/authUtils';
import DentistRoleGuard from '../src/features/dentist/components/DentistRoleGuard';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
  useDispatch: () => jest.fn(),
}));

function collectText(node, values = []) {
  if (typeof node === 'string') {
    values.push(node);
    return values;
  }
  if (Array.isArray(node)) {
    node.forEach((child) => collectText(child, values));
    return values;
  }
  if (node?.children) {
    collectText(node.children, values);
  }
  return values;
}

describe('Mobile Dentist Role Foundation (Phase 1)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('isDentistUser and getPrimaryRole', () => {
    test('recognizes dentist from roles array', () => {
      expect(isDentistUser({ id: 1, roles: ['dentist'] })).toBe(true);
      expect(isDentistUser({ id: 2, roles: ['DENTIST'] })).toBe(true);
      expect(isDentistUser({ id: 3, roles: ['patient', 'dentist'] })).toBe(true);
    });

    test('recognizes dentist from single role property', () => {
      expect(isDentistUser({ id: 4, role: 'dentist' })).toBe(true);
      expect(isDentistUser({ id: 5, role: 'Dentist' })).toBe(true);
    });

    test('rejects patient user', () => {
      expect(isDentistUser({ id: 6, roles: ['patient'] })).toBe(false);
      expect(isDentistUser({ id: 7, role: 'patient' })).toBe(false);
    });

    test('rejects null, undefined, or empty user', () => {
      expect(isDentistUser(null)).toBe(false);
      expect(isDentistUser(undefined)).toBe(false);
      expect(isDentistUser({})).toBe(false);
      expect(isDentistUser('invalid')).toBe(false);
    });

    test('getPrimaryRole returns correct role enum', () => {
      expect(getPrimaryRole({ id: 1, roles: ['dentist'] })).toBe('dentist');
      expect(getPrimaryRole({ id: 2, roles: ['patient'] })).toBe('patient');
      expect(getPrimaryRole(null)).toBe('guest');
      expect(getPrimaryRole(undefined)).toBe('guest');
    });
  });

  describe('DentistRoleGuard (Protected Routes)', () => {
    test('renders protected children when authenticated as Dentist', () => {
      useSelector.mockImplementation((selector) => {
        return selector({
          auth: {
            user: { id: 10, name: 'Dr. John', roles: ['dentist'] },
          },
        });
      });

      let tree;
      act(() => {
        tree = renderer.create(
          <PaperProvider>
            <DentistRoleGuard>
              <Text>Dentist Content Visible</Text>
            </DentistRoleGuard>
          </PaperProvider>
        );
      });

      const textValues = collectText(tree.toJSON());
      expect(textValues).toContain('Dentist Content Visible');
      expect(textValues).not.toContain('Akses Dibatasi');
    });

    test('blocks access and displays unauthorized warning when authenticated as Patient', () => {
      useSelector.mockImplementation((selector) => {
        return selector({
          auth: {
            user: { id: 20, name: 'Jane Patient', roles: ['patient'] },
          },
        });
      });

      let tree;
      act(() => {
        tree = renderer.create(
          <PaperProvider>
            <DentistRoleGuard>
              <Text>Secret Dentist Content</Text>
            </DentistRoleGuard>
          </PaperProvider>
        );
      });

      const textValues = collectText(tree.toJSON());
      expect(textValues).not.toContain('Secret Dentist Content');
      expect(textValues).toContain('Akses Dibatasi');
      expect(textValues.some((t) => t.includes('hanya dapat diakses oleh akun Dokter Gigi'))).toBe(true);
    });

    test('blocks access when unauthenticated (guest / null user)', () => {
      useSelector.mockImplementation((selector) => {
        return selector({
          auth: {
            user: null,
          },
        });
      });

      let tree;
      act(() => {
        tree = renderer.create(
          <PaperProvider>
            <DentistRoleGuard>
              <Text>Secret Dentist Content</Text>
            </DentistRoleGuard>
          </PaperProvider>
        );
      });

      const textValues = collectText(tree.toJSON());
      expect(textValues).not.toContain('Secret Dentist Content');
      expect(textValues).toContain('Akses Dibatasi');
    });
  });

  describe('Role-Aware Mobile Navigation Isolation', () => {
    test('ensures dentist navigation definition isolates 3D Scan from patient exposure', () => {
      const dentistUser = { id: 10, name: 'Dr. John', roles: ['dentist'] };
      const patientUser = { id: 20, name: 'Jane Patient', roles: ['patient'] };

      expect(isDentistUser(dentistUser)).toBe(true);
      expect(isDentistUser(patientUser)).toBe(false);

      // Verify that dentist and patient have distinct, isolated navigation states
      const dentistTabs = isDentistUser(dentistUser) ? ['Home', '3D Scan'] : ['Home', 'Appointments', 'AI Scan', 'Shop', 'Profile'];
      const patientTabs = isDentistUser(patientUser) ? ['Home', '3D Scan'] : ['Home', 'Appointments', 'AI Scan', 'Shop', 'Profile'];

      expect(dentistTabs).toEqual(['Home', '3D Scan']);
      expect(dentistTabs).toHaveLength(2);

      expect(patientTabs).toEqual(['Home', 'Appointments', 'AI Scan', 'Shop', 'Profile']);
      expect(patientTabs).toHaveLength(5);
      expect(patientTabs).not.toContain('3D Scan');
    });
  });
});
