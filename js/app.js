<script>
    // 1. SMOOTH CONTINUOUS RAIN LOGIC
    const canvas = document.getElementById('rain-canvas');
    const ctx = canvas.getContext('2d');
    function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
    window.onresize = resize; resize();
    let drops = [];
    function createDrop() { return { x: Math.random() * canvas.width, y: -10, speed: 2 + Math.random() * 3 }; }
    function animateRain() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#ff0000'; 
        if (drops.length < 150) drops.push(createDrop());
        drops.forEach(d => {
            if (d.y > canvas.height) { d.y = -10 - Math.random() * 20; d.x = Math.random() * canvas.width; }
            else { d.y += d.speed; ctx.fillRect(d.x, d.y, 2, 6); }
        });
        requestAnimationFrame(animateRain);
    }
    animateRain();

    // 2. AUDIO TERMINAL ENGINE
    const audioEngine = new Audio();
    const volumeSlider = document.getElementById('vol-slider');
    const nowPlayingText = document.getElementById('now-playing');
    let currentTrackElement = null;
    audioEngine.volume = volumeSlider ? volumeSlider.value : 0.5;
    if(volumeSlider) {
        volumeSlider.addEventListener('input', (e) => { audioEngine.volume = e.target.value; });
    }

    document.querySelectorAll('.track').forEach(track => {
        track.addEventListener('click', function() {
            const src = this.getAttribute('data-src');
            const btn = this.querySelector('.play-btn');
            const name = this.querySelector('.track-name').innerText;
            if (currentTrackElement === this && !audioEngine.paused) {
                audioEngine.pause(); btn.innerText = '[ PLAY ]';
                nowPlayingText.innerText = '> STATUS: PAUSED'; this.classList.remove('active');
            } else {
                document.querySelectorAll('.track').forEach(t => {
                    t.querySelector('.play-btn').innerText = '[ PLAY ]';
                    t.classList.remove('active');
                });
                if (currentTrackElement !== this) { audioEngine.src = src; currentTrackElement = this; }
                audioEngine.play(); btn.innerText = '[ STOP ]';
                nowPlayingText.innerText = `> PLAYING: ${name}`; this.classList.add('active');
            }
        });
    });

    // 3. 3D CAMERA & TRANSITION LOGIC
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', function(e) {
            if (this.target === "_blank") return;
            e.preventDefault();
            const camera = document.getElementById('camera');
            const dir = this.getAttribute('data-dir');
            const url = this.getAttribute('href');
            if (dir && camera) camera.classList.add(dir);
            setTimeout(() => { window.location.href = url; }, 1200);
        });
    });

    // DOOR & HOUSE TRANSITION
    const doorVideo = document.getElementById('door-video');
    const doorBtn = document.getElementById('door-btn');
    
    // Initial state for door video
    if(doorVideo) { doorVideo.pause(); doorVideo.currentTime = 0; }

    document.querySelector('.home-btn').addEventListener('click', function() {
        const overlay = document.getElementById('transition-overlay');
        const house = document.getElementById('house-scene');
        if(house) house.style.display = 'block';
        if(overlay) overlay.classList.add('fade-in');
    });

    if(doorBtn) {
        doorBtn.addEventListener('click', function() {
            this.style.display = 'none';
            if(doorVideo) {
                doorVideo.play();
                setTimeout(() => {
                    doorVideo.style.transition = "transform 1.5s ease-in, opacity 1s";
                    doorVideo.style.transform = "scale(4)";
                    doorVideo.style.opacity = "0";
                }, 1500);
            }
            setTimeout(() => { window.location.href = 'inside-house.html'; }, 3000);
        });
    }
</script>
