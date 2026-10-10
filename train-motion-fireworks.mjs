
// Native color palette as defined in Swift scene
const COLORS = ['#ffcf69', '#f17860', '#56c7bc', '#b59ae8', '#ff91ba'];

/**
 * Generates train-motion-fireworks particles.
 * @param {Array} slots - Array of 5 rectangles {x,y,width,height}. Must not be mutated.
 * @param {number} unit - Scale unit for calculations.
 * @param {number} burst - Burst factor clamped to [0,1]. Non-finite -> 0.
 * @returns {Array} Array of 110 particles {x,y,radius,alpha,color}.
 */
function trainMotionFireworks(slots, unit, burst) {
    // Clamp burst to [0, 1], non-finite becomes 0
    const b = Number.isFinite(burst) && !Number.isNaN(burst) ? Math.min(Math.max(burst, 0), 1) : 0;

    // Validate slots length (should be exactly 5 based on task description "slots exactly five rectangles")
    if (!Array.isArray(slots) || slots.length !== 5) {
        throw new Error('Slots must be an array of exactly 5 rectangles');
    }

    // Ensure slots are not mutated by creating a copy or just reading directly (task says "must not mutate")
    // We assume input is immutable as per test case usage, but we won't modify it.

    const particles = [];

    for (let car = 0; car < 5; car++) {
        const slot = slots[car];
        const centerX = slot.x + slot.width / 2;
        const centerY = slot.y + slot.height / 2;

        for (let n = 0; n < 22; n++) {
            // angle = n * 2*pi/22 + car*.37
            const angle = (n * 2 * Math.PI / 22) + (car * 0.37);

            // speed = (65 + (n*37)%90)*unit
            const speed = (65 + ((n * 37) % 90)) * unit;

            // distance = speed * burst * 2.7
            const distance = speed * b * 2.7;

            // x = center.x + cos(angle)*distance
            const px = centerX + Math.cos(angle) * distance;

            // y = center.y + sin(angle)*distance + 70*unit*burst*burst
            const py = centerY + Math.sin(angle) * distance + (70 * unit * b * b);

            // radius = (2.5 + n%3)*unit*(1-burst*.5)
            const r = (2.5 + (n % 3)) * unit * (1 - b * 0.5);

            // alpha = 1 - burst
            const a = 1 - b;

            // color = colors[(car+n)%5]
            const c = COLORS[(car + n) % 5];

            particles.push({ x: px, y: py, radius: r, alpha: a, color: c });
        }
    }

    return particles;
}

export { trainMotionFireworks };

