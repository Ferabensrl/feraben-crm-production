import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '../App';
import { useSessionStore } from '../store/session';

jest.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: () => Promise.resolve({ data: { session: null } }),
      onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } }))
    }
  }
}));

describe('App', () => {
  beforeEach(() => {
    useSessionStore.setState({ user: null, isAuthLoading: false });
  });

  test('renders login screen when no user is logged in', async () => {
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>
    );

    expect(await screen.findByText(/Feraben CRM/i)).toBeInTheDocument();
  });
});
