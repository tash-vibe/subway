import * as THREE from 'three';

export class TextureGenerator {
    constructor() {
        this.canvas = document.createElement('canvas');
        this.canvas.width = 512;
        this.canvas.height = 512;
        this.ctx = this.canvas.getContext('2d');
    }

    createGroundTexture() {
        const { ctx, canvas } = this;
        // asphalt background
        ctx.fillStyle = '#333';
        ctx.fillRect(0, 0, 512, 512);

        // Noise
        for (let i = 0; i < 50000; i++) {
            ctx.fillStyle = Math.random() > 0.5 ? '#444' : '#222';
            ctx.fillRect(Math.random() * 512, Math.random() * 512, 2, 2);
        }

        // Rails
        ctx.fillStyle = '#555'; // Rail color
        ctx.fillRect(100, 0, 10, 512);
        ctx.fillRect(402, 0, 10, 512);
        
        // Sleepers (Wood planks)
        ctx.fillStyle = '#3e2723';
        for(let y=0; y<512; y+=40) {
            ctx.fillRect(80, y, 352, 20);
        }

        return new THREE.CanvasTexture(canvas);
    }

    createWallTexture() {
        const { ctx, canvas } = this;
        // Brick pattern
        ctx.fillStyle = '#5d4037';
        ctx.fillRect(0, 0, 512, 512);
        
        ctx.fillStyle = '#4e342e';
        const brickH = 40;
        const brickW = 80;
        
        for(let y=0; y<512; y+=brickH) {
            const offset = (y/brickH % 2) * (brickW/2);
            for(let x=-brickW; x<512; x+=brickW) {
                ctx.fillRect(x + offset + 2, y + 2, brickW - 4, brickH - 4);
            }
        }
        
        // Graffiti
        ctx.font = 'bold 60px Arial';
        ctx.fillStyle = 'rgba(0, 255, 255, 0.4)';
        ctx.save();
        ctx.translate(256, 256);
        ctx.rotate(-Math.PI/4);
        ctx.fillText("SUBWAY", -100, 0);
        ctx.restore();

        return new THREE.CanvasTexture(canvas);
    }

    createCrateTexture() {
        const { ctx, canvas } = this;
        // Wood layout
        ctx.fillStyle = '#d7ccc8';
        ctx.fillRect(0, 0, 512, 512);
        
        ctx.fillStyle = '#8d6e63';
        ctx.fillRect(0, 0, 512, 512);
        
        // Wood slats
        ctx.strokeStyle = '#5d4037';
        ctx.lineWidth = 5;
        ctx.beginPath();
        // Border
        ctx.strokeRect(0,0,512,512);
        // Cross
        ctx.moveTo(0,0); ctx.lineTo(512,512);
        ctx.moveTo(512,0); ctx.lineTo(0,512);
        ctx.stroke();

        return new THREE.CanvasTexture(canvas);
    }

    createTrainTexture() {
       const { ctx, canvas } = this;
       // Metal body
       ctx.fillStyle = '#b0bec5';
       ctx.fillRect(0, 0, 512, 512);

       // Blue Stripe
       ctx.fillStyle = '#0277bd';
       ctx.fillRect(0, 150, 512, 50);

       // Windows
       ctx.fillStyle = '#263238';
       ctx.fillRect(50, 50, 150, 80);
       ctx.fillRect(312, 50, 150, 80);
       
       // Shine/Rivets
       ctx.fillStyle = '#eceff1';
       for(let x=10; x<512; x+=50) {
           ctx.beginPath();
           ctx.arc(x, 480, 5, 0, Math.PI*2);
           ctx.fill();
       }

       return new THREE.CanvasTexture(canvas); 
    }

    createPlayerSkin() {
        const { ctx, canvas } = this;
        // Denim texture
        ctx.fillStyle = '#1565c0';
        ctx.fillRect(0, 0, 512, 512);
        
        // Fabric pattern
        ctx.fillStyle = 'rgba(255,255,255,0.1)';
        for(let i=0; i<512; i+=4) {
            ctx.fillRect(i, 0, 1, 512);
            ctx.fillRect(0, i, 512, 1);
        }
        
        // Logo
        ctx.fillStyle = '#ffeb3b';
        ctx.beginPath();
        ctx.arc(256, 256, 100, 0, Math.PI*2);
        ctx.fill();
        
        ctx.fillStyle = '#000';
        ctx.font = 'bold 100px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText("SR", 256, 256);
        
        // Let's create a Face Texture instead? 
        // No, mapped on Cylinder body this is weird.
        // Actually the head is separate material 'skinMat, color 0xffccaa'.
        // If we want a face, we need to map a texture to the HEAD sphere.
        
        return new THREE.CanvasTexture(canvas);
    }
    
    createFaceTexture() {
        const { ctx, canvas } = this;
        ctx.fillStyle = '#ffccaa'; // Skin base
        ctx.fillRect(0,0,512,512);
        
        // Eyes
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.ellipse(180, 200, 40, 60, 0, 0, Math.PI*2);
        ctx.ellipse(332, 200, 40, 60, 0, 0, Math.PI*2);
        ctx.fill();
        
        ctx.fillStyle = 'black';
        ctx.beginPath();
        ctx.arc(180, 200, 20, 0, Math.PI*2);
        ctx.arc(332, 200, 20, 0, Math.PI*2);
        ctx.fill();
        
        // Mouth
        ctx.strokeStyle = '#d84315';
        ctx.lineWidth = 10;
        ctx.beginPath();
        ctx.arc(256, 350, 60, 0, Math.PI, false); // Smile
        ctx.stroke();
        
        return new THREE.CanvasTexture(canvas);
    }

    createTrackBedTexture() {
        const { ctx, canvas } = this;
        // Gravel/Ballast
        ctx.fillStyle = '#222';
        ctx.fillRect(0, 0, 512, 512);
        
        // Noise for stones
        for(let i=0; i<80000; i++) {
            ctx.fillStyle = Math.random() > 0.5 ? '#111' : '#333';
            const size = Math.random() * 4 + 1;
            ctx.fillRect(Math.random() * 512, Math.random() * 512, size, size);
        }
        
        // Darken edges
        const grad = ctx.createLinearGradient(0,0,512,0);
        grad.addColorStop(0, 'rgba(0,0,0,0.8)');
        grad.addColorStop(0.2, 'rgba(0,0,0,0)');
        grad.addColorStop(0.8, 'rgba(0,0,0,0)');
        grad.addColorStop(1, 'rgba(0,0,0,0.8)');
        ctx.fillStyle = grad;
        ctx.fillRect(0,0,512,512);

        return new THREE.CanvasTexture(canvas);
    }
    
    createNumberTexture(num) {
        const { ctx, canvas } = this;
        // Background
        ctx.fillStyle = num === 1 ? '#e91e63' : (num === 2 ? '#2196f3' : '#4caf50'); // Pink, Blue, Green backgrounds
        ctx.fillRect(0, 0, 512, 512);
        
        // Border
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 20;
        ctx.strokeRect(10, 10, 492, 492);
        
        // Number
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 300px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(num.toString(), 256, 256);
        
        return new THREE.CanvasTexture(canvas);
    }
}
