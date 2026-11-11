(() => {
    const scriptUrl = document.currentScript.src;
    const typingSound = new Audio(new URL('media/typing.mp3', scriptUrl));
    const correctSound = new Audio(new URL('media/ting.mp3', scriptUrl));
    const wrongSound = new Audio(new URL('media/wrong.mp3', scriptUrl));
    const textTargets = [
        'input:not([type])',
        'input[type="text"]',
        'input[type="search"]',
        'input[type="email"]',
        'input[type="url"]',
        'input[type="tel"]',
        'input[type="password"]',
        'input[type="number"]',
        'textarea',
        '[contenteditable]:not([contenteditable="false"])'
    ].join(', ');
    const startedVideos = new WeakSet();
    const blockedVideos = new WeakSet();
    const visibleVideos = new WeakSet();

    typingSound.preload = 'auto';
    correctSound.preload = 'auto';
    wrongSound.preload = 'auto';

    const syncVideos = (userGesture = false) => {
        document.querySelectorAll('video').forEach((video) => {
            video.autoplay = true;
            video.muted = false;
            video.defaultMuted = false;
            video.playsInline = true;
            video.volume = 1;

            const visible = document.visibilityState !== 'hidden' &&
                video.isConnected &&
                video.getClientRects().length > 0;

            if (!visible) {
                if (visibleVideos.has(video)) {
                    video.pause();
                    startedVideos.delete(video);
                    blockedVideos.delete(video);
                    visibleVideos.delete(video);
                }
                return;
            }

            visibleVideos.add(video);
            if (startedVideos.has(video) && !(userGesture && blockedVideos.has(video))) {
                return;
            }

            startedVideos.add(video);
            blockedVideos.delete(video);
            video.play().catch((error) => {
                if (error.name === 'NotAllowedError') {
                    blockedVideos.add(video);
                    console.info('Lecture automatique bloquée par le navigateur; une interaction avec la page est nécessaire.');
                    return;
                }
                console.error('Impossible de lancer automatiquement la vidéo.', error);
            });
        });
    };

    const stopVideos = () => {
        document.querySelectorAll('video').forEach((video) => video.pause());
    };

    const setupVideoPlayback = () => {
        syncVideos();

        const observer = new MutationObserver((changes) => {
            changes.forEach((change) => {
                change.removedNodes.forEach((node) => {
                    if (node instanceof HTMLVideoElement) {
                        node.pause();
                    } else if (node instanceof Element) {
                        node.querySelectorAll('video').forEach((video) => video.pause());
                    }
                });
            });
            syncVideos();
        });
        observer.observe(document.body, {
            attributes: true,
            attributeFilter: ['class', 'hidden'],
            childList: true,
            subtree: true
        });

        document.addEventListener('pointerdown', () => {
            window.setTimeout(() => syncVideos(true), 0);
        }, true);
        document.addEventListener('keydown', () => {
            window.setTimeout(() => syncVideos(true), 0);
        }, true);
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') {
                stopVideos();
            } else {
                syncVideos();
            }
        });
        window.addEventListener('pagehide', stopVideos);
        window.addEventListener('pageshow', () => syncVideos());
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setupVideoPlayback, { once: true });
    } else {
        setupVideoPlayback();
    }

    window.playAnswerSound = (result) => {
        const sound = result === 'correct' ? correctSound : result === 'wrong' ? wrongSound : null;
        if (!sound) return;

        sound.currentTime = 0;
        sound.play().catch(() => {});
    };

    if (window.parent !== window) {
        const reportFrameHeight = () => {
            const height = Math.ceil(Math.max(
                document.documentElement.scrollHeight,
                document.body?.scrollHeight || 0
            ));
            window.parent.postMessage({ type: 'freak-day-frame-resize', height }, '*');
        };

        const observeFrameContent = () => {
            document.body.style.minHeight = '0';
            const resizeObserver = new ResizeObserver(reportFrameHeight);
            resizeObserver.observe(document.documentElement);
            resizeObserver.observe(document.body);

            const mutationObserver = new MutationObserver(reportFrameHeight);
            mutationObserver.observe(document.body, {
                attributes: true,
                childList: true,
                characterData: true,
                subtree: true
            });

            window.addEventListener('load', reportFrameHeight);
            document.addEventListener('load', reportFrameHeight, true);
            reportFrameHeight();
        };

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', observeFrameContent, { once: true });
        } else {
            observeFrameContent();
        }
    }

    document.addEventListener('keydown', (event) => {
        if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;
        if (event.key.length !== 1 && event.key !== 'Backspace') return;

        const target = event.target;
        if (!(target instanceof Element) || !target.closest(textTargets)) return;

        typingSound.currentTime = 0;
        typingSound.play().catch(() => {});
    }, true);
})();
