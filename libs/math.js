export function getExternalTangentPoints(x1, y1, r1, x2, y2, r2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const d = Math.hypot(dx, dy);

    if (d < Math.abs(r1 - r2)) {
        return null;
    }
    if (d === 0 && r1 === r2) {
        return null;
    }

    const vx = dx / d;
    const vy = dy / d;

    const res = [];
    for (const sign of [+1, -1]) {
        const alpha = Math.acos((r1 - r2) / d) * sign;

        const sinA = Math.sin(alpha);
        const cosA = Math.cos(alpha);

        const rx = vx * cosA - vy * sinA;
        const ry = vx * sinA + vy * cosA;

        const p1 = {
            x: x1 + r1 * rx,
            y: y1 + r1 * ry
        };
        const p2 = {
            x: x2 + r2 * rx,
            y: y2 + r2 * ry
        };
        res.push({p1, p2});
    }
    return res;
}

export function lerp(a, b, t) {
	return a + (b - a) * t;
}