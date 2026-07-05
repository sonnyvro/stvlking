// ===============================
// SONNYVRO // STVLKING
// APP.JS
// Version 1.1
// ===============================

const flash = document.getElementById("flash");

// Random lightning
function lightningStrike() {

    flash.style.animation = "none";
    flash.offsetHeight; // restart animation
    flash.style.animation = "lightningFlash .35s";

    // Next strike in 4–12 seconds
    const next = Math.random() * 8000 + 4000;
    setTimeout(lightningStrike, next);
}

// Start lightning after page loads
window.addEventListener("load", () => {

    const first = Math.random() * 5000 + 2000;
    setTimeout(lightningStrike, first);

});

// Mouse glow
document.addEventListener("mousemove", (e) => {

    document.documentElement.style.setProperty(
        "--mouse-x",
        e.clientX + "px"
    );

    document.documentElement.style.setProperty(
        "--mouse-y",
        e.clientY + "px"
    );

});
