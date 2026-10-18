import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App.tsx';

function getNav() {
  return screen.getByRole('navigation', { name: 'ניווט ראשי' });
}

describe('App', () => {
  it('renders the home screen before a game starts', () => {
    render(<App />);

    expect(screen.getByRole('heading', { level: 1, name: 'סיימון' })).toBeInTheDocument();
    // The numbers sit in <bdi> elements, so match on the paragraph's full text.
    expect(
      screen.getByText((_, el) => el?.tagName === 'P' && el.textContent === 'שלב 1 מתוך 10'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'התחל משחק' })).toBeInTheDocument();
    for (const label of ['ירוק', 'אדום', 'צהוב', 'כחול']) {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument();
    }
  });

  it('places the colors in the mockup layout', () => {
    render(<App />);

    expect(screen.getByRole('button', { name: 'ירוק' })).toHaveAttribute('data-position', 'top-left');
    expect(screen.getByRole('button', { name: 'אדום' })).toHaveAttribute('data-position', 'top-right');
    expect(screen.getByRole('button', { name: 'צהוב' })).toHaveAttribute('data-position', 'bottom-left');
    expect(screen.getByRole('button', { name: 'כחול' })).toHaveAttribute('data-position', 'bottom-right');
  });

  it('has exactly two navigation options', () => {
    render(<App />);

    const items = within(getNav()).getAllByRole('button');
    expect(items.map((item) => item.textContent)).toEqual(['בית', 'אודות']);
  });

  it('switches between home and about without changing the URL', async () => {
    const user = userEvent.setup();
    const startUrl = window.location.href;
    render(<App />);
    const nav = within(getNav());

    expect(nav.getByRole('button', { name: 'בית' })).toHaveAttribute('aria-current', 'page');

    await user.click(nav.getByRole('button', { name: 'אודות' }));
    expect(screen.getByRole('heading', { level: 1, name: 'אודות' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'על המשחק' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /10\s*המשחקים האחרונים/ })).toBeInTheDocument();
    expect(screen.getByText('עדיין אין משחקים שמורים.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'מחק היסטוריה' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'התחל משחק' })).not.toBeInTheDocument();
    expect(nav.getByRole('button', { name: 'אודות' })).toHaveAttribute('aria-current', 'page');
    expect(window.location.href).toBe(startUrl);

    await user.click(nav.getByRole('button', { name: 'בית' }));
    expect(screen.getByRole('button', { name: 'התחל משחק' })).toBeInTheDocument();
    expect(nav.getByRole('button', { name: 'בית' })).toHaveAttribute('aria-current', 'page');
    expect(window.location.href).toBe(startUrl);
  });
});
