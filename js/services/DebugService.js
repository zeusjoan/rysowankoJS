export class DebugService {
    constructor() {
        this.isEnabled = false;
        this.createDebugPanel();
    }

    createDebugPanel() {
        const panel = document.createElement('div');
        panel.id = 'debugPanel';
        panel.style.cssText = `
            position: fixed;
            top: 45px;
            right: 10px;
            background: rgba(0, 0, 0, 0.8);
            color: #fff;
            padding: 10px;
            border-radius: 4px;
            font-family: monospace;
            font-size: 12px;
            max-width: 300px;
            max-height: calc(100vh - 60px);
            overflow-y: auto;
            z-index: 1000;
            display: none;
            box-shadow: 0 2px 5px rgba(0,0,0,0.2);
        `;

        const toggleButton = document.createElement('button');
        toggleButton.textContent = 'Debug Mode';
        toggleButton.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            padding: 5px 10px;
            background: #2196F3;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            z-index: 1001;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
            font-family: Arial, sans-serif;
        `;
        toggleButton.onclick = () => this.toggleDebug();

        document.body.appendChild(panel);
        document.body.appendChild(toggleButton);
    }

    toggleDebug() {
        this.isEnabled = !this.isEnabled;
        const panel = document.getElementById('debugPanel');
        panel.style.display = this.isEnabled ? 'block' : 'none';
    }

    log(category, data) {
        if (!this.isEnabled) return;

        const panel = document.getElementById('debugPanel');
        const entry = document.createElement('div');
        entry.style.marginBottom = '5px';
        entry.style.borderBottom = '1px solid rgba(255,255,255,0.2)';
        entry.style.paddingBottom = '5px';

        const timestamp = new Date().toLocaleTimeString();
        const categorySpan = document.createElement('span');
        categorySpan.style.color = '#4CAF50';
        categorySpan.textContent = `[${category}] `;

        const timeSpan = document.createElement('span');
        timeSpan.style.color = '#FFC107';
        timeSpan.textContent = `${timestamp}: `;

        const dataSpan = document.createElement('span');
        dataSpan.textContent = JSON.stringify(data, null, 2);

        entry.appendChild(categorySpan);
        entry.appendChild(timeSpan);
        entry.appendChild(dataSpan);

        panel.insertBefore(entry, panel.firstChild);

        // Ogranicz liczbę wpisów
        while (panel.children.length > 50) {
            panel.removeChild(panel.lastChild);
        }
    }

    clear() {
        const panel = document.getElementById('debugPanel');
        if (panel) {
            panel.innerHTML = '';
        }
    }
}
