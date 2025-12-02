import { initLoader } from './modules/loader.js';
import { Navigation } from './modules/navigation.js';
import { AudioPlayer } from './modules/audio-player.js';
import { RadioUI } from './modules/radio-ui.js';
import { Timeline } from './modules/timeline.js';
import { Home } from './modules/home.js';

document.addEventListener('DOMContentLoaded', () => {
    // Initialize Loader
    initLoader();

    // Initialize Modules
    const navigation = new Navigation();
    const audioPlayer = new AudioPlayer();
    const radioUI = new RadioUI();
    const timeline = new Timeline();
    const home = new Home();

    // Expose navigation for other modules if needed via events or global object
    // For now, modules communicate via custom events or direct DOM manipulation where appropriate.
});
