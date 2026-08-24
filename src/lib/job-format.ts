// Jobs are identified by one combined field, matching the company's cloud
// server file naming convention (e.g. "100001 KAIN - Modern Escape"). The
// only structural rule enforced is that it starts with exactly 6 digits —
// (\D|$) requires the 6th digit be followed by a non-digit or the end of
// the string, so a stray 7-digit run isn't mistaken for a valid number.
const JOB_NAME_FORMAT_RE = /^\d{6}(\D|$)/;

export function isValidJobName(name: string): boolean {
  return JOB_NAME_FORMAT_RE.test(name);
}
