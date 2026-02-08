export class InputManager {
    constructor() {
        this.keys = {
            left: false,
            right: false,
            up: false,
            down: false,
            boost: false // New Action
        };
        this.touchStartX = 0;
        this.touchStartY = 0;
        
        this._onKeyDown = this._onKeyDown.bind(this);
        this._onKeyUp = this._onKeyUp.bind(this);
        this._onTouchStart = this._onTouchStart.bind(this);
        this._onTouchEnd = this._onTouchEnd.bind(this);

        window.addEventListener('keydown', this._onKeyDown);
        window.addEventListener('keyup', this._onKeyUp);
        window.addEventListener('touchstart', this._onTouchStart);
        window.addEventListener('touchend', this._onTouchEnd);
    }

    _onKeyDown(event) {
        switch(event.code) {
            case 'ArrowLeft':
            case 'KeyA':
                this.keys.left = true;
                break;
            case 'ArrowRight':
            case 'KeyD':
                this.keys.right = true;
                break;
            case 'ArrowUp':
            case 'KeyW':
                this.keys.up = true;
                break;
            case 'ArrowDown':
            case 'KeyS':
                this.keys.down = true;
                break;
            case 'Space':
                this.keys.boost = true; // Use Space for Boost
                break;
        }
    }

    _onKeyUp(event) {
        switch(event.code) {
            case 'ArrowLeft':
            case 'KeyA':
                this.keys.left = false;
                break;
            case 'ArrowRight':
            case 'KeyD':
                this.keys.right = false;
                break;
            case 'ArrowUp':
            case 'KeyW':
                this.keys.up = false;
                break;
            case 'ArrowDown':
            case 'KeyS':
                this.keys.down = false;
                break;
            case 'Space':
                this.keys.boost = false;
                break;
        }
    }

    _onTouchStart(event) {
        this.touchStartX = event.changedTouches[0].screenX;
        this.touchStartY = event.changedTouches[0].screenY;
    }

    _onTouchEnd(event) {
        const touchEndX = event.changedTouches[0].screenX;
        const touchEndY = event.changedTouches[0].screenY;
        
        const diffX = touchEndX - this.touchStartX;
        const diffY = touchEndY - this.touchStartY;

        if (Math.abs(diffX) > Math.abs(diffY)) {
            // Horizontal swipe
            if (diffX > 50) this.keys.right = true; // Swipe Right
            if (diffX < -50) this.keys.left = true; // Swipe Left
        } else {
            // Vertical swipe
            if (diffY > 50) this.keys.down = true; // Swipe Down
            if (diffY < -50) this.keys.up = true; // Swipe Up
        }

        // Reset inputs after a short frame to simulate a "press" for swipes
        setTimeout(() => {
            this.keys.left = false;
            this.keys.right = false;
            this.keys.up = false;
            this.keys.down = false;
        }, 100);
    }

    // Accessor to get state and reset "pressed" state if needed
    getAction() {
        // Return a copy to avoid external modification, or just simple check
        // We implement a "just pressed" logic in the Player controller often, 
        // but here we just return the current state.
        // For lanes, we often need "trigger" behavior.
        const state = { ...this.keys };
        // Reset triggers if we want them to be single-frame (optional, depends on implementation)
        // For now, let's keep them as "isDown" and handle "wasDown" in update loop of player
        return state;
    }
}
