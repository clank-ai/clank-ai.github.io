/**
 * Clank's logo, as data: the mark (an open bracket around a diamond, on a 32-unit grid) and the
 * wordmark ("clank" in Instrument Sans SemiBold, outlined, so it looks the same everywhere).
 * Logo.astro and Mark.astro draw them; the brand page shows how they are used.
 */

/** The open bracket: drawn as a stroke, 3.6 units wide, with mitred corners. */
export const MARK_OUTER = 'M22.4 9.6 16 3.2 3.2 16 16 28.8l6.4-6.4';
export const MARK_STROKE = 3.6;
/** The diamond it holds: the console's own mark for Clank and for its gates. */
export const MARK_INNER = 'M16 10.2 21.8 16 16 21.8 10.2 16Z';

/** The wordmark in font units (y grows downward, the baseline at 0). */
export const WORDMARK = {
  d: "M288.0 10.0Q211.3 10.0 152.5 -24.2Q93.7 -58.3 60.2 -118.5Q26.7 -178.7 26.7 -255.7Q26.7 -332.7 60.2 -392.3Q93.7 -452.0 152.5 -486.0Q211.3 -520.0 287.7 -520.0Q351.3 -520.0 402.2 -496.3Q453.0 -472.7 485.8 -430.5Q518.7 -388.3 528.0 -331.7H406.7Q396.0 -372.7 365.0 -395.7Q334.0 -418.7 289.7 -418.7Q249.3 -418.7 219.7 -398.7Q190.0 -378.7 174.0 -342.0Q158.0 -305.3 158.0 -255.7Q158.0 -206.0 174.0 -169.0Q190.0 -132.0 219.8 -111.7Q249.7 -91.3 290.0 -91.3Q333.7 -91.3 365.0 -114.2Q396.3 -137.0 407.0 -178.0H528.3Q518.7 -121.7 485.5 -79.5Q452.3 -37.3 401.7 -13.7Q351.0 10.0 288.0 10.0ZM606.7 0.0V-720.0H733.3V0.0ZM1173.0 0.0Q1167.7 -20.3 1165.5 -44.3Q1163.3 -68.3 1163.3 -101.7H1159.0V-343.7Q1159.0 -383.7 1136.5 -404.5Q1114.0 -425.3 1067.7 -425.3Q1023.0 -425.3 996.5 -408.8Q970.0 -392.3 964.0 -361.3H843.0Q851.3 -432.0 911.0 -476.0Q970.7 -520.0 1072.0 -520.0Q1177.0 -520.0 1231.0 -472.3Q1285.0 -424.7 1285.0 -333.3V-101.7Q1285.0 -77.7 1288.3 -52.8Q1291.7 -28.0 1298.7 0.0ZM996.0 10.0Q919.0 10.0 873.5 -28.5Q828.0 -67.0 828.0 -132.0Q828.0 -201.7 879.0 -243.0Q930.0 -284.3 1023.3 -298.0L1182.0 -322.0V-242.0L1044.0 -220.7Q998.7 -213.7 976.3 -196.0Q954.0 -178.3 954.0 -146.3Q954.0 -116.7 974.8 -101.3Q995.7 -86.0 1033.0 -86.0Q1086.7 -86.0 1122.8 -113.2Q1159.0 -140.3 1159.0 -179.3L1172.7 -102.3Q1152.7 -47.3 1107.2 -18.7Q1061.7 10.0 996.0 10.0ZM1400.7 0.0V-510.0H1523.7V-390.0H1527.3V0.0ZM1759.0 0.0V-322.0Q1759.0 -369.3 1735.0 -393.0Q1711.0 -416.7 1664.7 -416.7Q1624.7 -416.7 1593.5 -398.7Q1562.3 -380.7 1544.8 -349.0Q1527.3 -317.3 1527.3 -274.7L1514.3 -397.0Q1539.7 -453.3 1589.8 -486.7Q1640.0 -520.0 1710.0 -520.0Q1793.3 -520.0 1839.5 -473.2Q1885.7 -426.3 1885.7 -348.3V0.0ZM2000.7 0.0V-726.7H2127.3V0.0ZM2329.7 0.0 2098.0 -265.0 2323.0 -510.0H2475.0L2215.3 -242.0L2221.7 -289.0L2485.0 0.0Z",
  minX: 26.7,
  maxX: 2485.0,
  top: -726.7,
};

/** The lockup: the mark, a gap of 9 units, then the wordmark, its ascenders 21 units tall. */
export const LOCKUP = (() => {
  const scale = 21 / -WORDMARK.top;
  const x = 41 - WORDMARK.minX * scale;
  const width = Math.ceil(41 + (WORDMARK.maxX - WORDMARK.minX) * scale + 1);
  return { scale, x, baseline: 26.5, width, height: 32 };
})();
