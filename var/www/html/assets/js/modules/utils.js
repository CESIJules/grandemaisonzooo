export function smoothScrollTo(element, targetPosition, duration, callback) {
    if (!element) return;
    const startPosition = element.scrollTop;
    const distance = targetPosition - startPosition;
    let startTime = null;
    let animationFrameId;

    function animation(currentTime) {
        if (startTime === null) startTime = currentTime;
        const timeElapsed = currentTime - startTime;

        // Ease function (easeInOutQuint)
        const ease = (t, b, c, d) => {
            t /= d / 2;
            if (t < 1) return c / 2 * t * t * t * t * t + b;
            t -= 2;
            return c / 2 * (t * t * t * t * t + 2) + b;
        };

        const nextScrollTop = ease(timeElapsed, startPosition, distance, duration);
        element.scrollTop = nextScrollTop;

        if (timeElapsed < duration) {
            animationFrameId = requestAnimationFrame(animation);
        } else {
            element.scrollTop = targetPosition;
            if (callback) callback();
        }
    }

    animationFrameId = requestAnimationFrame(animation);
}

export function formatTime(seconds) {
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${min}:${sec}`;
}

export function addTiltEffect(card) {
    let rafId = null;

    card.addEventListener('mousemove', (e) => {
        if (rafId) return; // Throttle

        rafId = requestAnimationFrame(() => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;

            // Calculate rotation (max 15 degrees)
            const rotateX = ((y - centerY) / centerY) * -15;
            const rotateY = ((x - centerX) / centerX) * 15;

            card.style.setProperty('--rotate-x', `${rotateX}deg`);
            card.style.setProperty('--rotate-y', `${rotateY}deg`);

            // Calculate shine position
            card.style.setProperty('--shine-x', `${(x / rect.width) * 100}%`);
            card.style.setProperty('--shine-y', `${(y / rect.height) * 100}%`);

            rafId = null;
        });

        // Make movement snappy when following mouse
        card.style.transition = 'transform 0.1s ease-out, box-shadow 0.4s ease';
    });

    card.addEventListener('mouseleave', () => {
        // Reset to center
        card.style.setProperty('--rotate-x', '0deg');
        card.style.setProperty('--rotate-y', '0deg');
        card.style.setProperty('--shine-x', '50%');
        card.style.setProperty('--shine-y', '50%');

        // Smooth return
        card.style.transition = 'transform 0.6s cubic-bezier(0.23, 1, 0.32, 1), box-shadow 0.4s ease';
    });
}

export function setupGlitchEffect(elementId, targetText, originalTextOverride = null) {
    const element = document.getElementById(elementId);
    if (!element) return;

    // Use provided original text or get from DOM (trimmed)
    const originalText = originalTextOverride || element.textContent.trim();
    // Ensure we start clean
    element.textContent = originalText;

    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let interval = null;

    // Identify indices that are different
    const diffIndices = [];
    const maxLength = Math.max(originalText.length, targetText.length);

    for (let i = 0; i < maxLength; i++) {
        if (originalText[i] !== targetText[i]) {
            diffIndices.push(i);
        }
    }

    element.addEventListener('mouseenter', () => {
        let iteration = 0;
        clearInterval(interval);

        interval = setInterval(() => {
            // Build the current string state
            let currentString = "";

            // Construct a temporary string based on target length
            const tempArray = targetText.split('');

            // For each character in the target string
            for (let i = 0; i < targetText.length; i++) {
                // If this index is one that changes
                if (diffIndices.includes(i)) {
                    // Randomize it during animation
                    tempArray[i] = chars[Math.floor(Math.random() * chars.length)];
                } else {
                    // Keep it stable (from target, which matches original at this index)
                    tempArray[i] = targetText[i];
                }
            }

            element.textContent = tempArray.join('');

            // Stop after some iterations
            if (iteration > 8) {
                clearInterval(interval);
                element.textContent = targetText;
            }
            iteration++;
        }, 40);
    });

    element.addEventListener('mouseleave', () => {
        let iteration = 0;
        clearInterval(interval);

        interval = setInterval(() => {
            const tempArray = originalText.split('');

            // Revert logic
            for (let i = 0; i < originalText.length; i++) {
                if (diffIndices.includes(i)) {
                    tempArray[i] = chars[Math.floor(Math.random() * chars.length)];
                } else {
                    tempArray[i] = originalText[i];
                }
            }

            element.textContent = tempArray.join('');

            if (iteration > 8) {
                clearInterval(interval);
                element.textContent = originalText;
            }
            iteration++;
        }, 40);
    });
}
