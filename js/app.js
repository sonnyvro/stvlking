document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', function(e) {
        e.preventDefault();
        const camera = document.getElementById('camera');
        const dir = this.getAttribute('data-dir');
        const url = this.getAttribute('href');

        // Pan the room
        camera.classList.add(dir);

        // Transition after animation
        setTimeout(() => {
            window.location.href = url;
        }, 1200);
    });
});
