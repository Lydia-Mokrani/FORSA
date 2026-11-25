import { describe, it, expect } from 'vitest';
import { getPostLoginRedirect, AuthUser } from './authService';

describe('getPostLoginRedirect', () => {
  const merchantUserPending: AuthUser = {
    id: 'user-1',
    phoneE164: '+213555123456',
    roles: ['CUSTOMER', 'MERCHANT'],
    activeMode: 'merchant',
    status: 'ACTIVE',
    shop: {
      id: 'shop-1',
      name: 'Boulangerie Test',
      verificationStatus: 'PENDING',
    },
  };

  const merchantUserApproved: AuthUser = {
    ...merchantUserPending,
    shop: {
      id: 'shop-1',
      name: 'Boulangerie Test',
      verificationStatus: 'APPROVED',
    },
  };

  const clientUser: AuthUser = {
    id: 'user-2',
    phoneE164: '+213777123456',
    roles: ['CUSTOMER'],
    activeMode: 'customer',
    status: 'ACTIVE',
  };

  it('redirects to / when user logs in with requestedRole CUSTOMER, even if merchant with pending shop', () => {
    const redirect = getPostLoginRedirect(merchantUserPending, 'CUSTOMER');
    expect(redirect).toBe('/');
  });

  it('redirects to / when user logs in with requestedRole CUSTOMER, even if merchant with approved shop', () => {
    const redirect = getPostLoginRedirect(merchantUserApproved, 'CUSTOMER');
    expect(redirect).toBe('/');
  });

  it('redirects to / for standard customer without merchant role', () => {
    const redirect = getPostLoginRedirect(clientUser, 'CUSTOMER');
    expect(redirect).toBe('/');
  });

  it('redirects to /merchant/status when user logs in with requestedRole MERCHANT and shop is pending', () => {
    const redirect = getPostLoginRedirect(merchantUserPending, 'MERCHANT');
    expect(redirect).toBe('/merchant/status');
  });

  it('redirects to /merchant/dashboard when user logs in with requestedRole MERCHANT and shop is approved', () => {
    const redirect = getPostLoginRedirect(merchantUserApproved, 'MERCHANT');
    expect(redirect).toBe('/merchant/dashboard');
  });

  it('redirects to /account/suspended when user is suspended', () => {
    const suspendedUser: AuthUser = {
      ...clientUser,
      status: 'SUSPENDED',
    };
    expect(getPostLoginRedirect(suspendedUser, 'CUSTOMER')).toBe('/account/suspended');
    expect(getPostLoginRedirect(suspendedUser, 'MERCHANT')).toBe('/account/suspended');
  });
});
