export function rgba(color, alpha) {
  return `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${alpha})`;
}

export function rgbaO(color, alpha) {
  return `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`;
}

export function lerpColor(a, b, t) {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}

export function hexToRgb(hex) {
  // Expand shorthand (#RGB, #RGBA) to full form (#RRGGBB, #RRGGBBAA)
  const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])([a-f\d])?$/i;

  const fullHex = hex.replace(
    shorthandRegex,
    (_, r, g, b, a) =>
      r + r +
      g + g +
      b + b +
      (a ? a + a : "")
  );

  // Parse #RRGGBB or #RRGGBBAA
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})?$/i.exec(fullHex);

  if (!result) {
    return null;
  }

  const color = {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  };

  if (result[4]) {
    color.a = parseInt(result[4], 16) / 255;
  } else {
    color.a = 1;
  }

  return color;
}