document.addEventListener('DOMContentLoaded', () => {
    const html = document.documentElement;
    const themeAnnouncement = document.getElementById('theme-announcement');
    const themeButtons = {
        system: document.getElementById('btn-system'),
        light: document.getElementById('btn-light'),
        dark: document.getElementById('btn-dark')
    };
    const supportedThemes = new Set(Object.keys(themeButtons));

    function normalizeTheme(theme) {
        return supportedThemes.has(theme) ? theme : 'system';
    }

    function getStoredTheme() {
        try {
            return normalizeTheme(localStorage.getItem('theme'));
        } catch (error) {
            return 'system';
        }
    }

    function announceTheme(theme) {
        if (!themeAnnouncement) {
            return;
        }
        const label = theme === 'system'
            ? 'System theme selected'
            : `${theme.charAt(0).toUpperCase()}${theme.slice(1)} theme selected`;
        themeAnnouncement.textContent = label;
    }

    function updateControls(activeTheme) {
        Object.entries(themeButtons).forEach(([theme, button]) => {
            if (!button) {
                return;
            }
            const isActive = theme === activeTheme;
            button.classList.toggle('active', isActive);
            button.setAttribute('aria-pressed', String(isActive));
        });
    }

    function setTheme(theme, shouldAnnounce = true) {
        const nextTheme = normalizeTheme(theme);
        html.setAttribute('data-theme', nextTheme);
        try {
            localStorage.setItem('theme', nextTheme);
        } catch (error) {
            // Ignore storage failures and keep the current in-memory selection.
        }
        updateControls(nextTheme);
        if (shouldAnnounce) {
            announceTheme(nextTheme);
        }
    }

    Object.entries(themeButtons).forEach(([theme, button]) => {
        if (!button) {
            return;
        }
        button.addEventListener('click', () => {
            setTheme(theme);
        });
    });

    setTheme(getStoredTheme(), false);

    // Intersection Observer for scroll animations
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
    };

    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target); // Trigger only once
            }
        });
    }, observerOptions);

    const fadeElements = document.querySelectorAll('.fade-in');
    fadeElements.forEach(el => observer.observe(el));
});
