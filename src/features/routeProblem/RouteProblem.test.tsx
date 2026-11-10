import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { ready as languageReady } from '../../i18n/i18n';

vi.mock('../../core/context/ThemeContext', async () => {
  const { themes } = await import('../../core/themes');
  return { useTheme: () => ({ theme: themes.light }) };
});
const track = vi.hoisted(() => vi.fn());
vi.mock('../../core/analytics', async (original) => ({ ...(await original<typeof import('../../core/analytics')>()), track }));

import { getRecentErrors } from '../feedback/diagnostics';
import { NotFoundPage, RouteErrorPage, RouteProblem, problemKind } from './RouteProblem';

function Broken({ message }: { message: string }): never {
  throw new Error(message);
}

const open = (path: string, crash = 'boom') => {
  const router = createMemoryRouter(
    [
      {
        path: '/',
        errorElement: <RouteErrorPage landmark />,
        children: [
          { path: 'tasks', element: <p>Tasks screen</p> },
          { path: 'broken', element: <Broken message={crash} />, errorElement: <RouteErrorPage /> },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
    { initialEntries: [path] },
  );
  return render(<RouterProvider router={router} />);
};

beforeAll(() => languageReady);

describe('problemKind', () => {
  it('tells a missing page, a stale build and any other failure apart', () => {
    expect(problemKind({ status: 404, statusText: 'Not Found', internal: true, data: '' })).toBe('notFound');
    expect(problemKind({ status: 500, statusText: 'Server Error', internal: true, data: '' })).toBe('error');
    expect(problemKind(new TypeError('Failed to fetch dynamically imported module: https://gylio.app/assets/LegalPage-abc.js'))).toBe('update');
    expect(problemKind(new TypeError('error loading dynamically imported module'))).toBe('update');
    expect(problemKind(new TypeError('Importing a module script failed.'))).toBe('update');
    expect(problemKind(new Error('Cannot read properties of undefined'))).toBe('error');
    expect(problemKind(undefined)).toBe('error');
  });
});

describe('route problem pages', () => {
  beforeEach(() => {
    track.mockClear();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => { cleanup(); vi.restoreAllMocks(); });

  it('answers an unknown link with a plain page, its own landmark, focus on the heading and a way back', async () => {
    open('/nope-not-a-page');
    const heading = await screen.findByRole('heading', { name: 'This page does not exist' });
    expect(document.activeElement).toBe(heading);
    expect(screen.getByRole('main').contains(heading)).toBe(true);
    expect(screen.queryByText(/Hey developer|Unexpected Application Error/)).toBeNull();
    expect(screen.queryByRole('button', { name: 'Reload' })).toBeNull();
    expect(track).toHaveBeenCalledWith('route_problem', { kind: 'notFound' });

    expect(screen.getByRole('link', { name: 'Go to Tasks' }).getAttribute('href')).toBe('/tasks');
  });

  it('replaces a screen that failed to render, says the data is safe, and keeps the error for a bug report', async () => {
    open('/broken', 'Cannot read properties of undefined (reading "map")');
    expect(await screen.findByRole('heading', { name: 'This screen ran into a problem' })).toBeTruthy();
    expect(screen.getByText(/Your data is still saved on this device/)).toBeTruthy();
    // Inside the tab layout the surrounding page already has the main landmark.
    expect(screen.queryByRole('main')).toBeNull();
    expect(screen.getByRole('button', { name: 'Reload' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Go to Tasks' })).toBeTruthy();
    expect(track).toHaveBeenCalledWith('route_problem', { kind: 'error' });
    expect(getRecentErrors()).toContain('Cannot read properties of undefined (reading "map")');
  });

  it('offers the newer version when a screen file is gone after a deploy', async () => {
    open('/broken', 'Failed to fetch dynamically imported module: https://gylio.app/assets/LegalPage-abc.js');
    expect(await screen.findByRole('heading', { name: 'A newer version is ready' })).toBeTruthy();
    expect(track).toHaveBeenCalledWith('route_problem', { kind: 'update' });
  });

  it('reloads from the Reload button', () => {
    const onReload = vi.fn();
    const router = createMemoryRouter([{ path: '/', element: <RouteProblem kind="error" onReload={onReload} /> }]);
    render(<RouterProvider router={router} />);
    fireEvent.click(screen.getByRole('button', { name: 'Reload' }));
    expect(onReload).toHaveBeenCalledTimes(1);
  });
});
