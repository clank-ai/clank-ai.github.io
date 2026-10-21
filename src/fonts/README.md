# Clank Cells

`clank-cells-400.woff2` and `clank-cells-700.woff2` are JetBrains Mono 2.242 (Regular and Bold), cut down to the
characters a terminal draws its frames with: arrows, technical symbols, box drawing, blocks, geometric shapes and
dingbats (U+2190-21FF, U+2300-23FF, U+2500-25FF, U+2700-27FF). The self-hosted JetBrains Mono from
`@fontsource-variable/jetbrains-mono` leaves these out, and without them the console demo's lines would not meet.

Made with fontTools, from the `jetbrains-mono@1.0.6` npm package's `fonts/webfonts/` files:

```
pyftsubset JetBrainsMono-Regular.woff2 --unicodes="U+2190-21FF,U+2300-23FF,U+2500-25FF,U+2700-27FF" \
  --flavor=woff2 --layout-features='' --no-hinting --output-file=clank-cells-400.woff2
```

(the same for `JetBrainsMono-Bold.woff2`, into `clank-cells-700.woff2`). JetBrains Mono is under the SIL Open Font
License 1.1: `OFL-JetBrains-Mono.txt`.
