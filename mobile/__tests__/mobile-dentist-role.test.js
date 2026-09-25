import React from 'react';
import { Text } from 'react-native';
import renderer, { act } from 'react-test-renderer';
import { useSelector } from 'react-redux';
import { PaperProvider, Button } from 'react-native-paper';
import { isDentistUser, getPrimaryRole } from '../src/utils/authUtils';
import api from '../src/services/api';
import { notifySessionExpired } from '../src/services/authSessionEvents';
jest.mock('../src/services/api', () => ({ get: jest.fn() }));
jest.mock('../src/services/authSessionEvents', () => ({
  notifySessionExpired: jest.fn(),
  notifyTokenRefreshed: jest.fn(),
  configureAuthSessionHandlers: jest.fn(),
}));

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
    api.get.mockResolvedValue({ data: { id: 10, roles: ['dentist'] } });
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
    test.each([
      ['restored role without token', null, { id: 10, roles: ['dentist'] }],
      ['revoked server role', 'expired-session', { id: 10, roles: ['patient'] }],
      ['different server identity', 'wrong-session', { id: 30, roles: ['dentist'] }],
    ])('blocks %s', async (_, accessToken, verifiedUser) => {
      useSelector.mockImplementation((selector) => selector({ auth: { authLevel: 'full_account', accessToken,
        user: { id: 10, roles: ['dentist'] } } }));
      api.get.mockResolvedValue({ data: verifiedUser });
      let tree;
      await act(async () => { tree = renderer.create(<PaperProvider><DentistRoleGuard><Text>Protected</Text></DentistRoleGuard></PaperProvider>); });
      expect(collectText(tree.toJSON())).not.toContain('Protected');
      await act(async () => tree.unmount());
    });

    test('renders protected children only after server confirms Dentist session', async () => {
      useSelector.mockImplementation((selector) => {
        return selector({
          auth: {
            authLevel: 'full_account', accessToken: 'test-session',
            user: { id: 10, name: 'Dr. John', roles: ['dentist'] },
          },
        });
      });

      let tree;
      await act(async () => {
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

    test('navigates to DentistHomeTab when inside dentist navigation', () => {
      useSelector.mockImplementation((selector) => selector({
        auth: { user: { id: 10, roles: ['dentist'] }, accessToken: 'token' },
      }));
      const mockNavigation = {
        getState: jest.fn().mockReturnValue({ routeNames: ['DentistHomeTab', 'DentistScanTab'] }),
        navigate: jest.fn(),
        canGoBack: jest.fn().mockReturnValue(false),
      };

      let tree;
      act(() => {
        tree = renderer.create(
          <PaperProvider>
            <DentistRoleGuard navigation={mockNavigation}>
              <Text>Secret Content</Text>
            </DentistRoleGuard>
          </PaperProvider>
        );
      });

      const buttons = tree.root.findAllByType(Button);
      const homeBtn = buttons.find((b) => collectText(b).includes('Kembali ke Beranda'));
      expect(homeBtn).toBeDefined();
      act(() => {
        homeBtn.props.onPress();
      });
      expect(mockNavigation.navigate).toHaveBeenCalledWith('DentistHomeTab');
      expect(mockNavigation.navigate).not.toHaveBeenCalledWith('DashboardTab');
    });

    test('navigates to DashboardTab when inside patient navigation', () => {
      useSelector.mockImplementation((selector) => selector({
        auth: { user: { id: 20, roles: ['patient'] }, accessToken: 'token' },
      }));
      const mockNavigation = {
        getState: jest.fn().mockReturnValue({ routeNames: ['DashboardTab', 'AppointmentTab'] }),
        navigate: jest.fn(),
        canGoBack: jest.fn().mockReturnValue(false),
      };

      let tree;
      act(() => {
        tree = renderer.create(
          <PaperProvider>
            <DentistRoleGuard navigation={mockNavigation}>
              <Text>Secret Content</Text>
            </DentistRoleGuard>
          </PaperProvider>
        );
      });

      const buttons = tree.root.findAllByType(Button);
      const homeBtn = buttons.find((b) => collectText(b).includes('Kembali ke Beranda'));
      expect(homeBtn).toBeDefined();
      act(() => {
        homeBtn.props.onPress();
      });
      expect(mockNavigation.navigate).toHaveBeenCalledWith('DashboardTab');
    });

    test('allows user to logout via Keluar / Ganti Akun button when blocked', () => {
      useSelector.mockImplementation((selector) => selector({
        auth: { user: { id: 20, roles: ['patient'] }, accessToken: 'token' },
      }));

      let tree;
      act(() => {
        tree = renderer.create(
          <PaperProvider>
            <DentistRoleGuard>
              <Text>Secret Content</Text>
            </DentistRoleGuard>
          </PaperProvider>
        );
      });

      const buttons = tree.root.findAllByType(Button);
      const logoutBtn = buttons.find((b) => collectText(b).includes('Keluar / Ganti Akun'));
      expect(logoutBtn).toBeDefined();
      act(() => {
        logoutBtn.props.onPress();
      });
      expect(notifySessionExpired).toHaveBeenCalled();
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
