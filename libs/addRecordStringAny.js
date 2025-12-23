export function addRecordStringAny(r1, r2) {
  let out = r1;

  for (let k in r2) {
    if (k in out) {
      out[k] = [...out[k], ...r2[k]];
    } else {
      out[k] = r2[k];
    }
  }

  return out;
}